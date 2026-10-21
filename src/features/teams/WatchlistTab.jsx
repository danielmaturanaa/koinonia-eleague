import { useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { Button, Chip, EmptyState, Icon, Notice, PlayerAvatar, useToast } from '../../ui/index.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();

/** Jugadores que el club vigila: avisa cuando quedan libres, cambian de club, se ponen en venta, cambian de valor o les queda un torneo. */
export function WatchlistTab({ team }) {
  const toast = useToast();
  const list = useApiQuery(signal => endpoints.teamWatchlist(team.id, signal), [team.id]);
  const [search, setSearch] = useState('');
  const results = useApiQuery(signal => search.trim().length >= 2 ? endpoints.players({ q: search.trim(), pageSize: 8 }, signal) : Promise.resolve({ data: [] }), [search]);
  const rows = Array.isArray(list.data) ? list.data : [];
  const watched = new Set(rows.map(row => row.playerId));
  const message = useRef('');
  const act = useApiMutation((operation, signal) => operation(signal), { onSuccess: () => { toast({ tone: 'success', title: message.current }); list.retry(); } });
  const run = (operation, text) => { message.current = text; act.execute(operation); };
  const found = (Array.isArray(results.data) ? results.data : []).filter(player => player.team?.id !== team.id);
  const alerting = rows.filter(row => row.alerts.length);
  return <section className="watchlist-tab">
    <header><h2>SEGUIMIENTO <Chip tone="navy">{rows.length}</Chip></h2><p>MARCA JUGADORES (DE OTROS CLUBES O LIBRES) Y AQUÍ TE AVISAMOS CUANDO ALGO CAMBIE: QUEDA LIBRE, CAMBIA DE CLUB, SE PONE EN VENTA, CAMBIA DE VALOR O LE QUEDA UN SOLO TORNEO.</p></header>
    <div className="watchlist-search">
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="BUSCAR JUGADOR PARA SEGUIR" aria-label="Buscar jugador para seguir"/>
      {found.length > 0 && <ul className="watch-results">{found.map(player => <li key={player.id} className="watch-row">
        <PlayerAvatar src={player.faceUrl} name={player.name}/>
        <span className="watch-info"><b className="watch-name">{player.name}</b><span className="watch-meta"><Chip tone="navy">{player.position}</Chip><span>{gp(player.gpValue)}</span><span>{player.team ? upper(player.team.name) : 'LIBRE'}</span></span></span>
        <Button size="sm" icon={watched.has(player.id) ? 'check' : 'star'} disabled={watched.has(player.id) || act.loading} onClick={() => run(signal => endpoints.watchPlayer(team.id, player.id, signal), `SIGUES A ${upper(player.name)}`)}>{watched.has(player.id) ? 'SIGUIENDO' : 'SEGUIR'}</Button>
      </li>)}</ul>}
    </div>
    {act.error && <Notice tone="error">{act.error.message}</Notice>}
    {!(list.data && rows.length === 0) && <DataState query={list}/>}
    {list.data && rows.length === 0 && <EmptyState icon="search" title="TODAVÍA NO SIGUES A NADIE">BUSCA UN JUGADOR ARRIBA Y TE AVISAMOS CUANDO CAMBIE ALGO.</EmptyState>}
    {alerting.length > 0 && <div className="watchlist-seen"><span><Icon name="bell"/> {alerting.length} CON NOVEDADES</span><Button variant="ghost" size="sm" onClick={() => run(signal => endpoints.watchlistSeen(team.id, {}, signal), 'TODO VISTO')}>DAR TODO POR VISTO</Button></div>}
    <ul className="watchlist-list">{rows.map(row => <li key={row.playerId} className={`watch-row ${row.alerts.length ? 'has-alerts' : ''}`}>
      <PlayerAvatar src={row.faceUrl} name={row.name}/>
      <span className="watch-info">
        <b className="watch-name">{row.name}</b>
        <span className="watch-meta"><Chip tone="navy">{row.position}</Chip><span>VALE {gp(row.gpValue)}</span><span>{row.freeAgent ? 'AGENTE LIBRE' : upper(row.holder.name)}</span>{row.forSale && <Chip tone="yellow">EN VENTA</Chip>}{row.lastSeason && <Chip tone="yellow">ÚLTIMO TORNEO</Chip>}</span>
        {row.alerts.map(alert => <span key={alert.key} className={`watchlist-alert ${alert.key}`}><Icon name="bell" size={12}/> {alert.text}</span>)}
      </span>
      <span className="watch-actions">
        {row.alerts.length > 0 && <Button size="sm" onClick={() => run(signal => endpoints.watchlistSeen(team.id, { playerId: row.playerId }, signal), 'VISTO')}>VISTO</Button>}
        <Button variant="ghost" size="sm" className="danger" onClick={() => run(signal => endpoints.unwatchPlayer(team.id, row.playerId, signal), `DEJASTE DE SEGUIR A ${upper(row.name)}`)}>DEJAR DE SEGUIR</Button>
      </span>
    </li>)}</ul>
  </section>;
}
