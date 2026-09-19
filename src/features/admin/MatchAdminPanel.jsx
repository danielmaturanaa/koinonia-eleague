import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';

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
    const body = sanctionedTeamId === homeId ? { homeScore: 0, awayScore: 3 } : { homeScore: 3, awayScore: 0 };
    if (window.confirm(`¿APLICAR CASTIGO 0-3 A ${sanctionedName?.toUpperCase()}? EL PARTIDO QUEDA FINALIZADO.`)) mutation.execute(body);
  };
  return <form className="admin-form match-sanction-form" onSubmit={submit}>
    <label>EQUIPO SANCIONADO<select value={sanctionedTeamId} onChange={event => setSanctionedTeamId(event.target.value)}><option value={homeId}>{match.homeTeam?.name}</option><option value={awayId}>{match.awayTeam?.name}</option></select></label>
    <p className="match-sanction-hint">EL EQUIPO SANCIONADO PIERDE 0-3 Y EL PARTIDO QUEDA FINALIZADO DE INMEDIATO. ÚSALO PARA NO-SHOWS U OTRAS SANCIONES ADMINISTRATIVAS, NO PARA CARGAR EL RESULTADO DE UN PARTIDO JUGADO.</p>
    <button className="action-button danger" disabled={mutation.loading}>APLICAR CASTIGO 0-3</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}
