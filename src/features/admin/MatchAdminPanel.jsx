import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';

const teamId = team => team?.id ?? '';

function StatusPanel({ match, onChanged }) {
  const mutation = useApiMutation((operation, signal) => endpoints[`${operation}Match`](match.id, signal), { onSuccess: onChanged });
  const operations = match.status === 'pending' ? [['start','INICIAR'],['cancel','CANCELAR']]
    : match.status === 'live' ? [['finish','FINALIZAR'],['cancel','CANCELAR'],['reset','REVERTIR']]
    : match.status === 'cancelled' ? [['reset','REVERTIR']]
    : [['reopen','REABRIR']];
  const run = operation => {
    const label = operations.find(item => item[0] === operation)?.[1] ?? operation;
    const message = operation === 'reset' ? '¿REVERTIR ESTE PARTIDO A PENDIENTE 0-0? SE BORRARÁN LOS GOLES Y TARJETAS REGISTRADOS.' : `¿${label} ESTE PARTIDO?`;
    if (window.confirm(message)) mutation.execute(operation);
  };
  return <section className="match-admin-section"><p>ESTADO ACTUAL: <b>{String(match.status).toUpperCase()}</b></p><div className="admin-action-grid status-actions">{operations.map(([operation, label]) => <button className={`action-button ${operation === 'cancel' || operation === 'reset' ? 'danger' : ''}`} disabled={mutation.loading} key={operation} onClick={() => run(operation)}>{label} PARTIDO</button>)}</div><FormFeedback mutation={mutation}/></section>;
}

function SanctionPanel({ match, onChanged }) {
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

export function MatchAdminPanel({ match, onChanged }) {
  const [tab, setTab] = useState('status');
  const tabs = [['status','ESTADO'],['sanction','CASTIGO']];
  return <section className="match-admin"><nav>{tabs.map(([value, label]) => <button className={tab === value ? 'active' : ''} key={value} onClick={() => setTab(value)}>{label}</button>)}</nav>{tab === 'status' && <StatusPanel match={match} onChanged={onChanged}/>} {tab === 'sanction' && <SanctionPanel match={match} onChanged={onChanged}/>}</section>;
}
