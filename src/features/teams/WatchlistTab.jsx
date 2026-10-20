import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();

/** Jugadores que el club vigila: avisa cuando quedan libres, cambian de club, se ponen en venta, cambian de valor o les queda un torneo. */
export function WatchlistTab({ team }) {
  const list = useApiQuery(signal => endpoints.teamWatchlist(team.id, signal), [team.id]);
  const [search, setSearch] = useState('');
  const results = useApiQuery(signal => search.trim().length >= 2 ? endpoints.players({ q: search.trim(), pageSize: 8 }, signal) : Promise.resolve({ data: [] }), [search]);
  const rows = Array.isArray(list.data) ? list.data : [];
  const watched = new Set(rows.map(row => row.playerId));
  const act = useApiMutation((operation, signal) => operation(signal), { onSuccess: () => list.retry() });
  const found = (Array.isArray(results.data) ? results.data : []).filter(player => player.team?.id !== team.id);
  const alerting = rows.filter(row => row.alerts.length);
  return <section className="watchlist-tab">
    <header><h2>SEGUIMIENTO <small>{rows.length}</small></h2><p>MARCA JUGADORES (DE OTROS CLUBES O LIBRES) Y AQUÍ TE AVISAMOS CUANDO ALGO CAMBIE: QUEDA LIBRE, CAMBIA DE CLUB, SE PONE EN VENTA, CAMBIA DE VALOR O LE QUEDA UN SOLO TORNEO.</p></header>
    <div className="watchlist-search">
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="BUSCAR JUGADOR PARA SEGUIR" aria-label="Buscar jugador para seguir"/>
      {found.length > 0 && <ul className="watch-results">{found.map(player => <li key={player.id} className="watch-row">
        <span className="watch-photo"><PlayerFace src={player.faceUrl} name={player.name}/></span>
        <span className="watch-info"><b className="watch-name">{player.name}</b><span className="watch-meta"><i className="watch-pos">{player.position}</i><span>{gp(player.gpValue)}</span><span>{player.team ? upper(player.team.name) : 'LIBRE'}</span></span></span>
        <button type="button" className="watch-btn" disabled={watched.has(player.id) || act.loading} onClick={() => act.execute(signal => endpoints.watchPlayer(team.id, player.id, signal))}>{watched.has(player.id) ? '✓ SIGUIENDO' : '☆ SEGUIR'}</button>
      </li>)}</ul>}
    </div>
    <FormFeedback mutation={act}/>
    {!(list.data && rows.length === 0) && <DataState query={list}/>}
    {list.data && rows.length === 0 && <p className="empty-copy data-empty">TODAVÍA NO SIGUES A NADIE. BUSCA UN JUGADOR ARRIBA.</p>}
    {alerting.length > 0 && <div className="watchlist-seen"><span>🔔 {alerting.length} CON NOVEDADES</span><button type="button" className="ghost" onClick={() => act.execute(signal => endpoints.watchlistSeen(team.id, {}, signal))}>DAR TODO POR VISTO</button></div>}
    <ul className="watchlist-list">{rows.map(row => <li key={row.playerId} className={`watch-row ${row.alerts.length ? 'has-alerts' : ''}`}>
      <span className="watch-photo"><PlayerFace src={row.faceUrl} name={row.name}/></span>
      <span className="watch-info">
        <b className="watch-name">{row.name}</b>
        <span className="watch-meta"><i className="watch-pos">{row.position}</i><span>VALE {gp(row.gpValue)}</span><span>{row.freeAgent ? 'AGENTE LIBRE' : upper(row.holder.name)}</span>{row.forSale && <em>EN VENTA</em>}{row.lastSeason && <em>ÚLTIMO TORNEO</em>}</span>
        {row.alerts.map(alert => <span key={alert.key} className={`watchlist-alert ${alert.key}`}>🔔 {alert.text}</span>)}
      </span>
      <span className="watch-actions">
        {row.alerts.length > 0 && <button type="button" className="watch-btn" onClick={() => act.execute(signal => endpoints.watchlistSeen(team.id, { playerId: row.playerId }, signal))}>VISTO</button>}
        <button type="button" className="watch-btn quiet" onClick={() => act.execute(signal => endpoints.unwatchPlayer(team.id, row.playerId, signal))}>DEJAR DE SEGUIR</button>
      </span>
    </li>)}</ul>
  </section>;
}
