// Proxy de API para Vercel: espeja api-proxy.mjs (el proxy de desarrollo).
// El cliente siempre pide /api/*, así que la API_KEY nunca sale al bundle.

const allowedMethods = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE']);
const allowedMethodsHeader = [...allowedMethods, 'OPTIONS'].join(', ');
const maxBodyBytes = 1024 * 1024;
const upstreamTimeoutMs = 15000;

export const config = { api: { bodyParser: false } };

function apiBaseUrl() {
  const value = process.env.API_BASE_URL;
  if (!value || !process.env.API_KEY) {
    throw new Error('API_BASE_URL y API_KEY deben estar configuradas en el entorno.');
  }
  return new URL(value.endsWith('/') ? value : `${value}/`);
}

function upstreamUrl(requestUrl, apiBase) {
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

async function readBody(request) {
  if (request.body !== undefined && request.body !== null) {
    return Buffer.isBuffer(request.body) ? request.body
      : Buffer.from(typeof request.body === 'string' ? request.body : JSON.stringify(request.body));
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error('El cuerpo de la solicitud supera 1 MB.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    return response.writeHead(204, { Allow: allowedMethodsHeader }).end();
  }

  const method = request.method || 'GET';
  if (!allowedMethods.has(method)) {
    return response.writeHead(405, { Allow: allowedMethodsHeader }).end();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs);
  try {
    const apiBase = apiBaseUrl();
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await readBody(request);
    const upstream = await fetch(upstreamUrl(request.url, apiBase), {
      method,
      headers: {
        'X-API-Key': process.env.API_KEY,
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
}
