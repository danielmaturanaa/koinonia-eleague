import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const fileValues = Object.fromEntries(readFileSync(new URL('./.env', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'))
  .map(line => {
    const at = line.indexOf('=');
    return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
  }));
const values = { ...fileValues, ...process.env };

if (!values.API_BASE_URL || !values.API_KEY) {
  throw new Error('API_BASE_URL y API_KEY deben estar configuradas en .env');
}

const apiBase = new URL(values.API_BASE_URL.endsWith('/') ? values.API_BASE_URL : `${values.API_BASE_URL}/`);
const port = Number(values.API_PROXY_PORT || 5175);
const allowedOrigin = values.WEB_ORIGIN || 'http://127.0.0.1:5174';
const allowedMethods = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE']);
const allowedMethodsHeader = [...allowedMethods, 'OPTIONS'].join(', ');
const maxBodyBytes = 6 * 1024 * 1024;

function setCors(request, response) {
  const origin = request.headers.origin;
  if (allowedOrigin === '*' || !origin || origin === allowedOrigin) {
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : (origin || allowedOrigin));
  }
  response.setHeader('Access-Control-Allow-Methods', allowedMethodsHeader);
  response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  response.setHeader('Access-Control-Max-Age', '86400');
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error('El cuerpo de la solicitud supera 6 MB.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function upstreamUrl(requestUrl) {
  const incoming = new URL(requestUrl, 'http://proxy.local');
  const suffix = incoming.pathname.slice('/api/'.length);
  const target = suffix === 'health' ? new URL('/health', apiBase.origin) : new URL(suffix, apiBase);
  target.search = incoming.search;

  const apiPath = apiBase.pathname.endsWith('/') ? apiBase.pathname : `${apiBase.pathname}/`;
  if (target.origin !== apiBase.origin || (suffix !== 'health' && !target.pathname.startsWith(apiPath))) {
    const error = new Error('Ruta de API no permitida.');
    error.status = 400;
    throw error;
  }
  return target;
}

createServer(async (request, response) => {
  setCors(request, response);
  if (request.method === 'OPTIONS') return response.writeHead(204).end();
  if (!request.url?.startsWith('/api/')) return response.writeHead(404).end();

  const method = request.method || 'GET';
  if (!allowedMethods.has(method)) {
    return response.writeHead(405, { Allow: allowedMethodsHeader }).end();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await readBody(request);
    const upstream = await fetch(upstreamUrl(request.url), {
      method,
      headers: {
        'X-API-Key': values.API_KEY,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': request.headers['content-type'] || 'application/json' } : {}),
      },
      body,
      signal: controller.signal,
    });
    const headers = { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' };
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) headers['Retry-After'] = retryAfter;
    response.writeHead(upstream.status, headers);
    response.end(await upstream.text());
  } catch (error) {
    const status = error.status || (controller.signal.aborted ? 504 : 502);
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: {
      code: status === 504 ? 'UPSTREAM_TIMEOUT' : status === 413 ? 'PAYLOAD_TOO_LARGE' : 'PROXY_ERROR',
      message: error.message || 'No fue posible contactar la API.',
    } }));
  } finally {
    clearTimeout(timeout);
  }
}).listen(port, '127.0.0.1', () => console.log(`API proxy ready at http://127.0.0.1:${port}`));
