import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const values = Object.fromEntries(readFileSync(new URL('./.env', import.meta.url), 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5174');
  if (request.method === 'OPTIONS') return response.writeHead(204).end();
  if (!request.url?.startsWith('/api/')) return response.writeHead(404).end();
  try {
    const upstream = await fetch(new URL(request.url.slice('/api/'.length), `${values.API_BASE_URL.replace(/\/$/, '')}/`), { headers: { 'X-API-Key': values.API_KEY, Accept: 'application/json' } });
    response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' });
    response.end(await upstream.text());
  } catch {
    response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: { message: 'No fue posible contactar la API.' } }));
  }
}).listen(5175, '127.0.0.1', () => console.log('API proxy ready at http://127.0.0.1:5175'));
