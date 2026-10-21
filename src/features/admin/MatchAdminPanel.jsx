import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';
import { Button } from '../../ui/index.js';

const teamId = team => team?.id ?? '';

// Castigo administrativo 0-3 (no-show u otras sanciones). El resto del acta se
// maneja desde el marcador del partido.
export function SanctionPanel({ match, onChanged }) {
  const homeId = teamId(match.homeTeam);
  const awayId = teamId(match.awayTeam);
  const [sanctionedTeamId, setSanctionedTeamId] = useState(homeId);
  const mutation = useApiMutation((body, signal) => endpoints.setMatchResult(match.id, body, signal), { onSuccess: onChanged });
  const sanctionedName = sanctionedTeamId === homeId ? match.homeTeam?.name : match.awayTeam?.name;
  const submit = event => {
    event.preventDefault();
    const body = sanctionedTeamId === homeId ? { homeScore: 0, awayScore: 3, sanctionedTeamId } : { homeScore: 3, awayScore: 0, sanctionedTeamId };
    if (window.confirm(`¿APLICAR CASTIGO 0-3 A ${sanctionedName?.toUpperCase()}? EL PARTIDO QUEDA FINALIZADO.`)) mutation.execute(body);
  };
  return <form className="admin-form match-sanction-form" onSubmit={submit}>
    <label>EQUIPO SANCIONADO<select value={sanctionedTeamId} onChange={event => setSanctionedTeamId(event.target.value)}><option value={homeId}>{match.homeTeam?.name}</option><option value={awayId}>{match.awayTeam?.name}</option></select></label>
    <p className="match-sanction-hint">El equipo sancionado pierde 0-3 y el partido queda finalizado de inmediato. Úsalo para no-shows u otras sanciones administrativas, no para cargar el resultado de un partido jugado.</p>
    <Button variant="danger" type="submit" disabled={mutation.loading}>APLICAR CASTIGO 0-3</Button>
    <FormFeedback mutation={mutation}/>
  </form>;
}
