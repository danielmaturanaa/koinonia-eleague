// Ligas con calendario diario: cada día agrupa varias fechas de partidos simultáneos y,
// con equipos impares, cada equipo descansa en una de ellas. A partir del fixture
// completo se calcula quién queda libre por turno y cuánto lleva jugado cada uno.

const dayKey = (tournamentId, day) => `${tournamentId}:${day}`;

export function chileToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

export function scheduleDateLabel(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`)).replace(/[.,]/g, '').toUpperCase();
}

export function buildDailyIndex(fixtures) {
  const participants = new Map();
  const days = new Map();
  for (const match of fixtures) {
    if (!match.schedule) continue;
    const tournamentId = match.tournament?.id;
    if (!participants.has(tournamentId)) participants.set(tournamentId, new Set());
    [match.homeTeam?.id, match.awayTeam?.id].forEach(id => participants.get(tournamentId).add(id));
    const key = dayKey(tournamentId, match.schedule.day);
    if (!days.has(key)) days.set(key, { tournamentId, day: match.schedule.day, date: match.schedule.date, matches: [] });
    days.get(key).matches.push(match);
  }
  for (const entry of days.values()) {
    const teamIds = [...participants.get(entry.tournamentId)];
    const turnNumbers = [...new Set(entry.matches.map(match => match.schedule.turn))].sort((a, b) => a - b);
    entry.turns = turnNumbers.map(turn => {
      const games = entry.matches.filter(match => match.schedule.turn === turn);
      const playing = new Set(games.flatMap(match => [match.homeTeam?.id, match.awayTeam?.id]));
      return { turn, round: games[0].roundNumber, resting: teamIds.filter(id => !playing.has(id)) };
    });
    entry.progress = teamIds.map(teamId => {
      const own = entry.matches.filter(match => match.homeTeam?.id === teamId || match.awayTeam?.id === teamId);
      return { teamId, played: own.filter(match => match.status === 'finished').length, total: own.length };
    });
  }
  return { get: (tournamentId, day) => days.get(dayKey(tournamentId, day)) ?? null };
}
