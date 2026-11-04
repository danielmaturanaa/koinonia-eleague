import { useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { FormFeedback } from '../../admin/FormFeedback.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { DataState, gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';

const asList = value => Array.isArray(value) ? value : [];

/** Preacuerdo: abre la encuesta de fichaje por quien sale libre cuando termine el torneo. Si se cierra, se paga ya y no se deshace. */
function PreagreeButton({ row, myTeamId, onDone }) {
  const open = useApiMutation((body, signal) => endpoints.openPoll(body, signal), { onSuccess: onDone });
  return <>
    <button type="button" className="for-sale-offer" disabled={open.loading}
      title={`Abre la encuesta por ${gp(row.player.gpValue)}. Si se cierra, se paga ya y llega cuando termine el torneo; no se puede deshacer.`}
      onClick={() => open.execute({ playerId: row.player.id, teamId: myTeamId })}>PREACORDAR</button>
    <FormFeedback mutation={open}/>
  </>;
}

function LeavingRow({ row, canOffer, myTeamId, onChanged }) {
  const preagreed = row.preagreedBy;
  return <article className="for-sale-row">
    <a href={`#/jugadores/${encodeURIComponent(row.player.id)}?from=mercado`} className="offer-player">
      <PlayerFace src={row.player.faceUrl} name={row.player.name}/>
      <span><b>{row.player.name}</b><small>{[row.player.position, row.player.nationality].filter(Boolean).join(' · ')} · {row.reason}</small></span>
    </a>
    <span className="for-sale-team">{row.team.emoji ?? '⚽'} {row.team.name}</span>
    <strong>{gp(row.player.gpValue)}</strong>
    {preagreed
      ? <span className="for-sale-team" title="Preacuerdo cerrado: llega cuando termine el torneo y no se puede deshacer">PREACORDADO · {preagreed.emoji ?? '⚽'} {preagreed.name}</span>
      : <>
        {canOffer && <a className="for-sale-offer" href={`#/transferencias?tab=ofertas&jugador=${encodeURIComponent(row.player.id)}&club=${encodeURIComponent(row.team.id)}`}>HACER OFERTA</a>}
        {canOffer && row.leavesFree && <PreagreeButton row={row} myTeamId={myTeamId} onDone={onChanged}/>}
      </>}
  </article>;
}

/** Todos los jugadores que se van de su club: pidieron salir, se negaron a renovar o no quieren seguir. De todos los equipos. */
export function LeavingSection({ teams, revision }) {
  const { teamId: myTeamId } = useAuth();
  const [teamFilter, setTeamFilter] = useState('');
  const list = useApiQuery(signal => endpoints.playersLeaving(signal), [revision]);
  const rows = asList(list.data);
  const shown = teamFilter ? rows.filter(row => row.team.id === teamFilter) : rows;
  const counts = rows.reduce((map, row) => map.set(row.team.id, (map.get(row.team.id) ?? 0) + 1), new Map());
  return <section className="market-section market-for-sale">
    <header><h2>SE QUIEREN IR <small>{rows.length}</small></h2><p>Jugadores que se van de su club. Su club no cobra por ellos: se pueden traspasar o canjear ahora, y si nadie los cierra salen libres cuando termine el torneo. A quien sale libre se le puede <b>preacordar</b>: se abre la encuesta de fichaje y, si se cierra, se paga ya, no se deshace y llega cuando termine el torneo.</p></header>
    <div className="poll-filters">
      <label>EQUIPO<select value={teamFilter} onChange={event => setTeamFilter(event.target.value)}>
        <option value="">TODOS LOS EQUIPOS ({rows.length})</option>
        {teams.filter(team => counts.has(team.id)).map(team => <option key={team.id} value={team.id}>{team.name} ({counts.get(team.id)})</option>)}
      </select></label>
    </div>
    <DataState query={list} empty={null}/>
    {!list.loading && !list.error && (shown.length
      ? <div className="for-sale-list">{shown.map(row => <LeavingRow key={`${row.team.id}-${row.player.id}`} row={row} canOffer={Boolean(myTeamId) && row.team.id !== myTeamId} myTeamId={myTeamId} onChanged={list.retry}/>)}</div>
      : <p className="empty-copy">{teamFilter ? 'Ese equipo no tiene jugadores que se quieran ir.' : 'Nadie se quiere ir por ahora.'}</p>)}
  </section>;
}
