import { useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { DataState, gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { Button } from '../../../ui/index.js';

const asList = value => Array.isArray(value) ? value : [];

/** El presi elige un jugador de su plantel para publicarlo a la venta. */
function PublishForm({ teamId, listedIds, onDone }) {
  const [playerId, setPlayerId] = useState('');
  const squad = useApiQuery(signal => endpoints.teamSquad(teamId, signal), [teamId]);
  const options = asList(squad.data).filter(player => !listedIds.has(player.id));
  const publish = useApiMutation((id, signal) => endpoints.setForSale(teamId, id, signal), { onSuccess: () => { setPlayerId(''); onDone(); } });
  return <form className="for-sale-form" onSubmit={event => { event.preventDefault(); if (playerId) publish.execute(playerId); }}>
    <label>PONER A LA VENTA<select value={playerId} onChange={event => setPlayerId(event.target.value)}>
      <option value="">ELEGIR JUGADOR DE TU PLANTEL</option>
      {options.map(player => <option key={player.id} value={player.id}>{player.name} · {player.position} · {gp(player.gpValue)}</option>)}
    </select></label>
    <Button variant="positive" type="submit" disabled={!playerId || publish.loading}>🏷️ PUBLICAR</Button>
    {publish.error && <p className="form-feedback error" role="alert">{publish.error.message}</p>}
  </form>;
}

function ForSaleRow({ row, mine, canOffer, onChanged }) {
  const remove = useApiMutation(signal => endpoints.unsetForSale(row.team.id, row.player.id, signal), { onSuccess: onChanged });
  return <article className="for-sale-row">
    <a href={`#/jugadores/${encodeURIComponent(row.player.id)}?from=mercado`} className="offer-player">
      <PlayerFace src={row.player.faceUrl} name={row.player.name}/>
      <span><b>{row.player.name}</b><small>{[row.player.position, row.player.nationality].filter(Boolean).join(' · ')}</small></span>
    </a>
    <span className="for-sale-team">{row.team.emoji ?? '⚽'} {row.team.name}</span>
    <strong>{gp(row.player.gpValue)}</strong>
    {mine && <button type="button" className="for-sale-remove" disabled={remove.loading} onClick={() => remove.execute()}>QUITAR</button>}
    {!mine && canOffer && <a className="for-sale-offer" href={`#/transferencias?tab=ofertas&jugador=${encodeURIComponent(row.player.id)}&club=${encodeURIComponent(row.team.id)}`}>HACER OFERTA</a>}
  </article>;
}

/** Jugadores que los clubes publicaron a la venta. Es solo informativo: para comprarlo, se hace una oferta. */
export function ForSaleSection({ teams, revision, onChanged }) {
  const { teamId: myTeamId, user } = useAuth();
  const [teamFilter, setTeamFilter] = useState('');
  const list = useApiQuery(signal => endpoints.playersForSale(signal), [revision]);
  const rows = asList(list.data);
  const shown = teamFilter ? rows.filter(row => row.team.id === teamFilter) : rows;
  const myTeams = new Set(user?.teamIds ?? []);
  const counts = rows.reduce((map, row) => map.set(row.team.id, (map.get(row.team.id) ?? 0) + 1), new Map());
  const refresh = () => { list.retry(); onChanged?.(); };
  return <section className="market-section market-for-sale">
    <header><h2>A LA VENTA <small>{rows.length}</small></h2><p>JUGADORES QUE SUS CLUBES ESTÁN DISPUESTOS A VENDER.</p></header>
    {myTeamId && <PublishForm teamId={myTeamId} listedIds={new Set(rows.filter(row => row.team.id === myTeamId).map(row => row.player.id))} onDone={refresh}/>}
    <div className="poll-filters">
      <label>EQUIPO<select value={teamFilter} onChange={event => setTeamFilter(event.target.value)}>
        <option value="">TODOS LOS EQUIPOS ({rows.length})</option>
        {teams.filter(team => counts.has(team.id)).map(team => <option key={team.id} value={team.id}>{team.name} ({counts.get(team.id)})</option>)}
      </select></label>
    </div>
    <DataState query={list} empty={null}/>
    {!list.loading && !list.error && (shown.length
      ? <div className="for-sale-list">{shown.map(row => <ForSaleRow key={`${row.team.id}-${row.player.id}`} row={row} mine={myTeams.has(row.team.id)} canOffer={Boolean(myTeamId)} onChanged={refresh}/>)}</div>
      : <p className="empty-copy">{teamFilter ? 'ESE EQUIPO NO TIENE JUGADORES A LA VENTA.' : 'NINGÚN CLUB TIENE JUGADORES A LA VENTA.'}</p>)}
  </section>;
}
