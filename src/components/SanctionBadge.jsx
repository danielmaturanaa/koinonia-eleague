// Etiqueta de partido castigado (0-3 administrativo). `match.sanctioned` viene de la API.
export function SanctionBadge({ match, compact = false }) {
  if (!match?.sanctioned) return null;
  const teamName = match.sanctionedTeamId === match.homeTeam?.id ? match.homeTeam?.name
    : match.sanctionedTeamId === match.awayTeam?.id ? match.awayTeam?.name : null;
  return <i className="sanction-badge" title={teamName ? `Castigo 0-3 a ${teamName}` : 'Castigo administrativo 0-3'}>{compact ? 'CASTIGO' : `CASTIGO${teamName ? ` A ${teamName.toUpperCase()}` : ''}`}</i>;
}
