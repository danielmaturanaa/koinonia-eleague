const teamId = team => team?.id ?? team?.teamId ?? team?.team_id;

export function resolveNewsParticipants(item, teams = []) {
  if (!item) return { team: null, opponent: null, primaryIsAway: false };

  const index = new Map(teams.map(team => [teamId(team), team]));
  const homeTeam = item.original?.homeTeam;
  const awayTeam = item.original?.awayTeam;
  const homeScore = Number(item.original?.homeScore);
  const awayScore = Number(item.original?.awayScore);
  const hasResult = item.sourceType === 'match'
    && item.original?.homeScore !== null && item.original?.awayScore !== null
    && Number.isFinite(homeScore) && Number.isFinite(awayScore);
  const primaryIsAway = Boolean(hasResult && awayScore > homeScore);
  const matchPrimary = primaryIsAway ? awayTeam : homeTeam;
  const matchSecondary = primaryIsAway ? homeTeam : awayTeam;
  const rawTeam = item.sourceType === 'match' ? matchPrimary
    : item.sourceType === 'transfer' ? item.original?.toTeam ?? item.original?.destinationTeam
      : item.original?.team ?? item.original?.player?.team ?? item.original?.redCard?.team;
  const rawOpponent = item.sourceType === 'match' ? matchSecondary
    : item.sourceType === 'transfer' ? item.original?.fromTeam ?? item.original?.originTeam : null;
  const merge = candidate => candidate
    ? { ...candidate, ...(index.get(teamId(candidate)) ?? {}) }
    : null;

  return { team: merge(rawTeam), opponent: merge(rawOpponent), primaryIsAway };
}
