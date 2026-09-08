import { readFileSync } from 'node:fs';

async function proxyBase() {
  if (process.env.SMOKE_BASE_URL) return process.env.SMOKE_BASE_URL.replace(/\/$/, '');
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const configuredPort = env.match(/^API_PROXY_PORT=(\d+)$/m)?.[1];
  const candidates = [...new Set([configuredPort, '5175', '5185'].filter(Boolean).map(port => `http://127.0.0.1:${port}/api`))];
  for (const candidate of candidates) {
    try {
      const response = await fetch(`${candidate}/health`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return candidate;
    } catch {
      // Continúa con el siguiente puerto local conocido.
    }
  }
  return candidates[0];
}

const base = await proxyBase();
const results = [];

async function probe(label, path) {
  try {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(12000) });
    const payload = await response.json().catch(() => null);
    const status = response.ok ? 'OK' : response.status === 404 ? 'NO PUBLICADO' : 'ERROR';
    results.push({ endpoint: label, http: response.status, estado: status });
    return response.ok ? payload : null;
  } catch (error) {
    results.push({ endpoint: label, http: '—', estado: `ERROR: ${error.message}` });
    return null;
  }
}

await probe('health', '/health');
await probe('home', '/home');
await probe('activity', '/activity?page=1&pageSize=2');

const teams = await probe('teams', '/teams?page=1&pageSize=2');
const teamId = teams?.data?.[0]?.id;
if (teamId) {
  await probe('team detail', `/teams/${teamId}`);
  await probe('team squad', `/teams/${teamId}/squad`);
  await probe('team matches', `/teams/${teamId}/matches`);
  await probe('team history', `/history/team/${teamId}?page=1&pageSize=2`);
}

await probe('national teams', '/national-teams?page=1&pageSize=2');
await probe('squad rankings', '/rankings/squads?page=1&pageSize=2');
await probe('divisions', '/divisions');

const players = await probe('players', '/players?page=1&pageSize=2');
const playerId = players?.data?.[0]?.id;
if (playerId) await probe('player detail', `/players/${playerId}`);

const tournaments = await probe('tournaments', '/tournaments?page=1&pageSize=2');
const tournamentId = tournaments?.data?.[0]?.id;
if (tournamentId) {
  await probe('tournament detail', `/tournaments/${tournamentId}`);
  await probe('standings', `/tournaments/${tournamentId}/standings`);
  await probe('fixtures', `/tournaments/${tournamentId}/fixtures`);
  await probe('bracket', `/tournaments/${tournamentId}/bracket`);
  await probe('scorers', `/tournaments/${tournamentId}/scorers`);
}

const matches = await probe('matches', '/matches?page=1&pageSize=2');
const matchId = matches?.data?.[0]?.id;
if (matchId) await probe('match detail', `/matches/${matchId}`);

await probe('transfers', '/market/transfers?page=1&pageSize=2');
await probe('trades', '/market/trades?page=1&pageSize=2');
await probe('free agents', '/market/free-agents?page=1&pageSize=2');

console.table(results);
const failures = results.filter(item => item.estado.startsWith('ERROR'));
if (failures.length) {
  console.error(`Prueba de humo fallida: ${failures.length} endpoint(s) con error.`);
  process.exitCode = 1;
} else {
  const unavailable = results.filter(item => item.estado === 'NO PUBLICADO').length;
  console.log(`Prueba de humo superada: ${results.length - unavailable}/${results.length} disponibles; ${unavailable} documentados aún no publicados.`);
}
