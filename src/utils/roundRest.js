// Quién queda libre en cada fecha de una liga, a partir de su fixture completo:
// los participantes que no juegan ningún partido de esa fecha.
export function restingByRound(fixtures) {
  const participants = new Map();
  const playing = new Map();
  for (const match of fixtures) {
    if (match.stage === 'playoffs' || match.roundNumber == null) continue;
    const tournamentId = match.tournament?.id;
    if (!participants.has(tournamentId)) participants.set(tournamentId, new Map());
    const key = `${tournamentId}:${match.roundNumber}`;
    if (!playing.has(key)) playing.set(key, new Set());
    for (const team of [match.homeTeam, match.awayTeam]) {
      participants.get(tournamentId).set(team.id, team);
      playing.get(key).add(team.id);
    }
  }
  // null si no se conoce el fixture de esa fecha; [] si juegan todos.
  return match => {
    const busy = playing.get(`${match.tournament?.id}:${match.roundNumber}`);
    if (!busy) return null;
    return [...participants.get(match.tournament.id).values()].filter(team => !busy.has(team.id));
  };
}
