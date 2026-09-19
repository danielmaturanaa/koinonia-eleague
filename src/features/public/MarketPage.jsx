import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { EntityLink } from '../../components/EntityLink.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { teamBalance } from '../../utils/teamPresentation.js';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, PageHeader, formatDate, gp } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const asList = value => Array.isArray(value) ? value : [];

function relatedName(item, side, type, index) {
  const camel = `${side}${type}`;
  const snake = `${side}_${type.toLowerCase()}`;
  const embedded = item[camel] ?? item[snake];
  const id = embedded?.id ?? item[`${camel}Id`] ?? item[`${snake}_id`];
  return embedded?.name ?? item[`${camel}Name`] ?? item[`${snake}_name`] ?? index.get(id)?.name;
}

export async function loadAllPlayers(signal) {
  const first = await endpoints.players({ page: 1, pageSize: 100 }, signal);
  const pages = first.pagination?.totalPages ?? 1;
  const rest = pages > 1 ? await Promise.all(Array.from({ length: pages - 1 }, (_, index) => endpoints.players({ page: index + 2, pageSize: 100 }, signal))) : [];
  return { data: [...asList(first.data), ...rest.flatMap(page => asList(page.data))] };
}

function TeamOptions({ teams }) {
  return <><option value="">SELECCIONAR</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</>;
}

function PlayerOptions({ players, teamId }) {
  const available = teamId ? players.filter(player => (player.team?.id ?? player.teamId) === teamId) : players;
  return <><option value="">SELECCIONAR</option>{available.map(player => <option key={player.id} value={player.id}>{player.name} · {player.team?.name ?? 'LIBRE'}</option>)}</>;
}

function TransferForm({ teams, players, onChanged }) {
  const [form, setForm] = useState({ playerId: '', fromTeamId: '', toTeamId: '', gpAmount: '' });
  const mutation = useApiMutation((body, signal) => endpoints.createTransfer(body, signal), { onSuccess: onChanged });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value, ...(event.target.name === 'fromTeamId' ? { playerId: '' } : {}) }));
  const submit = event => {
    event.preventDefault();
    if (window.confirm(`¿REGISTRAR ESTA TRANSFERENCIA POR ${Number(form.gpAmount).toLocaleString('es-CL')} GP?`)) mutation.execute({ ...form, gpAmount: Number(form.gpAmount) });
  };
  return <form className="admin-form market-form" onSubmit={submit}>
    <label>EQUIPO DE ORIGEN<select name="fromTeamId" value={form.fromTeamId} onChange={change}><TeamOptions teams={teams}/></select></label>
    <label>JUGADOR<select name="playerId" required value={form.playerId} onChange={change}><PlayerOptions players={players} teamId={form.fromTeamId}/></select></label>
    <label>EQUIPO DE DESTINO<select name="toTeamId" required value={form.toTeamId} onChange={change}><TeamOptions teams={teams.filter(team => team.id !== form.fromTeamId)}/></select></label>
    <label>MONTO GP<input name="gpAmount" required type="number" min="0" step="1" value={form.gpAmount} onChange={change}/></label>
    <button className="action-button" disabled={mutation.loading || !form.fromTeamId || !form.playerId || !form.toTeamId || form.gpAmount === ''}>REGISTRAR TRANSFERENCIA</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function TradeForm({ teams, players, onChanged }) {
  const [form, setForm] = useState({ fromTeamId: '', toTeamId: '', fromPlayerId: '', toPlayerId: '', gpFrom: '', gpTo: '' });
  const mutation = useApiMutation((body, signal) => endpoints.createTrade(body, signal), { onSuccess: onChanged });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value, ...(event.target.name === 'fromTeamId' ? { fromPlayerId: '' } : {}), ...(event.target.name === 'toTeamId' ? { toPlayerId: '' } : {}) }));
  const submit = event => {
    event.preventDefault();
    const payload = { fromTeamId: form.fromTeamId, toTeamId: form.toTeamId, fromPlayerId: form.fromPlayerId, toPlayerId: form.toPlayerId, ...(form.gpFrom ? { gpFrom: Number(form.gpFrom) } : {}), ...(form.gpTo ? { gpTo: Number(form.gpTo) } : {}) };
    if (window.confirm('¿REGISTRAR ESTE TRUEQUE Y SUS MONTOS GP ADICIONALES?')) mutation.execute(payload);
  };
  return <form className="admin-form market-form" onSubmit={submit}>
    <label>EQUIPO A<select name="fromTeamId" value={form.fromTeamId} onChange={change}><TeamOptions teams={teams}/></select></label>
    <label>JUGADOR A<select name="fromPlayerId" required value={form.fromPlayerId} onChange={change}><PlayerOptions players={players} teamId={form.fromTeamId}/></select></label>
    <label>EQUIPO B<select name="toTeamId" value={form.toTeamId} onChange={change}><TeamOptions teams={teams.filter(team => team.id !== form.fromTeamId)}/></select></label>
    <label>JUGADOR B<select name="toPlayerId" required value={form.toPlayerId} onChange={change}><PlayerOptions players={players} teamId={form.toTeamId}/></select></label>
    <label>GP ADICIONAL DE A<input name="gpFrom" type="number" min="0" step="1" value={form.gpFrom} onChange={change}/></label>
    <label>GP ADICIONAL DE B<input name="gpTo" type="number" min="0" step="1" value={form.gpTo} onChange={change}/></label>
    <button className="action-button" disabled={mutation.loading || !form.fromTeamId || !form.toTeamId || !form.fromPlayerId || !form.toPlayerId}>REGISTRAR TRUEQUE</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function MarketAdmin({ teams, players, onChanged }) {
  const [tab, setTab] = useState('transfer');
  return <section className="market-admin"><nav><button className={tab === 'transfer' ? 'active' : ''} onClick={() => setTab('transfer')}>NUEVA TRANSFERENCIA</button><button className={tab === 'trade' ? 'active' : ''} onClick={() => setTab('trade')}>NUEVO TRUEQUE</button></nav>{tab === 'transfer' ? <TransferForm teams={teams} players={players} onChanged={onChanged}/> : <TradeForm teams={teams} players={players} onChanged={onChanged}/>}</section>;
}

function TransferActions({ item, onChanged }) {
  const mutation = useApiMutation((operation, signal) => endpoints[`${operation}Transfer`](item.id, signal), { onSuccess: onChanged });
  // El listado público solo trae traspasos aprobados y no envía status.
  const status = String(item.status ?? 'approved').toLowerCase();
  const act = operation => {
    if (window.confirm(`¿${operation === 'approve' ? 'APROBAR' : operation === 'reject' ? 'RECHAZAR' : 'REVERSAR'} ESTA TRANSFERENCIA?`)) mutation.execute(operation);
  };
  return <><div className="mini-actions">{status === 'pending' && <><button onClick={() => act('approve')}>APROBAR</button><button className="danger" onClick={() => act('reject')}>RECHAZAR</button></>}{['approved','completed'].includes(status) && <button className="danger" onClick={() => act('reverse')}>REVERSAR</button>}</div><FormFeedback mutation={mutation}/></>;
}


function TradeActions({ item, onChanged }) {
  const mutation = useApiMutation((operation, signal) => endpoints[`${operation}Trade`](item.id, signal), { onSuccess: onChanged });
  const status = String(item.status ?? 'pending').toLowerCase();
  if (status !== 'pending') return null;
  const act = operation => {
    if (window.confirm(`¿${operation === 'approve' ? 'APROBAR' : 'RECHAZAR'} ESTE TRUEQUE?`)) mutation.execute(operation);
  };
  return <><div className="mini-actions"><button onClick={() => act('approve')}>APROBAR</button><button className="danger" onClick={() => act('reject')}>RECHAZAR</button></div><FormFeedback mutation={mutation}/></>;
}

const PREVIEW = 8;

function SigningForm({ player, teams, onDone }) {
  const [teamId, setTeamId] = useState('');
  const buy = useApiMutation((id, signal) => endpoints.buyPlayer(player.playerId, id, signal), { onSuccess: onDone });
  const assign = useApiMutation((id, signal) => endpoints.assignPlayer(player.playerId, { teamId: id }, signal), { onSuccess: onDone });
  const team = teams.find(item => item.id === teamId);
  const balance = team ? teamBalance(team) : null;
  const short = balance !== null && player.price != null && balance < player.price;
  return <div className="signing-form">
    <select value={teamId} onChange={event => setTeamId(event.target.value)} aria-label="Equipo que ficha"><option value="">¿QUÉ EQUIPO LO FICHA?</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}{teamBalance(item) !== null ? ` · saldo ${gp(teamBalance(item))}` : ''}</option>)}</select>
    <div className="button-row">
      <button type="button" className="action-button positive" disabled={!teamId || short || buy.loading || assign.loading} onClick={() => { if (window.confirm(`¿${team.name} COMPRA A ${player.name} POR ${gp(player.price)}?`)) buy.execute(teamId); }}>COMPRAR · {gp(player.price)}</button>
      <button type="button" className="action-button" disabled={!teamId || buy.loading || assign.loading} onClick={() => { if (window.confirm(`¿ASIGNAR GRATIS A ${player.name} A ${team.name}?`)) assign.execute(teamId); }}>ASIGNAR GRATIS</button>
    </div>
    {short && <small className="signing-warning">SALDO INSUFICIENTE PARA COMPRARLO.</small>}
    <FormFeedback mutation={buy.error || buy.success ? buy : assign}/>
  </div>;
}

function MarketPlayer({ player, teams, onChanged }) {
  const [open, setOpen] = useState(false);
  const href = player.playerId ? `#/jugadores/${encodeURIComponent(player.playerId)}` : `#/efootball/${player.pesId}${player.variation ? `?v=${player.variation}` : ''}`;
  return <article className={`market-player ${open ? 'open' : ''}`}>
    <a href={href} className="market-player-link"><PlayerFace src={player.faceUrl} name={player.name}/><span><b>{player.name}</b><small>{[player.position, player.nationality, player.age ? `${player.age} AÑOS` : null].filter(Boolean).join(' · ')}</small></span><strong>{gp(player.price)}</strong></a>
    {player.status === 'free'
      ? <button type="button" className="market-player-action" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'CERRAR' : 'FICHAR'}</button>
      : <a href={href} className="market-player-action">INSCRIBIR</a>}
    {open && <SigningForm player={player} teams={teams} onDone={() => { setOpen(false); onChanged(); }}/>}
  </article>;
}

function PlayerList({ title, hint, status, teams, allHref }) {
  const players = useApiQuery(signal => endpoints.playerDirectory({ status, sort: 'price_desc', pageSize: PREVIEW }, signal), [status]);
  const rows = asList(players.data);
  return <section className="market-section"><header><h2>{title} {players.pagination?.total != null && <small>{players.pagination.total.toLocaleString('es-CL')}</small>}</h2><p>{hint}</p></header>
    <DataState query={players}/>
    {!players.loading && !players.error && (rows.length ? <div className="market-player-list">{rows.map(player => <MarketPlayer key={player.playerId ?? `${player.pesId}-${player.variation}`} player={player} teams={teams} onChanged={players.retry}/>)}</div> : <p className="empty-copy">NO HAY JUGADORES EN ESTA LISTA.</p>)}
    <a className="market-see-all" href={allHref}>VER TODOS EN JUGADORES →</a>
  </section>;
}

const MOVE_TAGS = { purchase: 'FICHAJE', assignment: 'ASIGNACIÓN', transfer: 'TRASPASO', release: 'LIBERACIÓN', trade: 'TRUEQUE' };

function MoveLine({ move, managing, onChanged }) {
  const player = <EntityLink to="player" id={move.player?.id}>{move.player?.name}</EntityLink>;
  const team = value => value ? <EntityLink to="team" id={value.id}>{value.name}</EntityLink> : 'AGENTE LIBRE';
  const text = {
    purchase: <>{team(move.toTeam)} ficha a {player}{move.origin === 'new' ? ' (desde eFootballDB)' : ' (agente libre)'}</>,
    assignment: <>{player} asignado a {team(move.toTeam)}</>,
    transfer: <>{player}: {team(move.fromTeam)} → {team(move.toTeam)}</>,
    release: <>{team(move.fromTeam)} libera a {player}</>,
    trade: <>{player} ⇄ <EntityLink to="player" id={move.givenPlayer?.id}>{move.givenPlayer?.name}</EntityLink> · {team(move.fromTeam)} / {team(move.toTeam)}</>,
  }[move.type];
  const amount = move.type === 'trade' ? (move.gpPaid || move.gpReceived ? gp(move.gpPaid || move.gpReceived) : '') : move.gpAmount ? gp(move.gpAmount) : '';
  return <li className={`move-line move-${move.type}`}><b>{MOVE_TAGS[move.type]}</b><span>{text}</span><small>{amount}{amount && move.date ? ' · ' : ''}{move.date ? formatDate(move.date) : ''}</small>{managing && move.type === 'transfer' && <TransferActions item={move} onChanged={onChanged}/>}</li>;
}

function PendingTrades({ trades, players, teams, onChanged }) {
  const pending = asList(trades.data).filter(item => String(item.status ?? '').toLowerCase() === 'pending');
  if (!pending.length) return null;
  const playersById = new Map(asList(players.data).map(player => [player.id, player]));
  const teamsById = new Map(teams.map(team => [team.id, team]));
  return <section className="market-section market-pending"><header><h2>PENDIENTES DE APROBACIÓN <small>{pending.length}</small></h2></header>
    {pending.map(item => <article className="market-item" key={item.id}><b>{relatedName(item, 'from', 'Player', playersById) ?? 'Jugador'} ⇄ {relatedName(item, 'to', 'Player', playersById) ?? 'Jugador'}</b><span>{relatedName(item, 'from', 'Team', teamsById) ?? 'Origen'} / {relatedName(item, 'to', 'Team', teamsById) ?? 'Destino'}</span><TradeActions item={item} onChanged={onChanged}/></article>)}
  </section>;
}

export function MarketPage({ teams }) {
  const [managing, setManaging] = useState(false);
  const [revision, setRevision] = useState(0);
  const moves = useApiQuery(signal => endpoints.marketMoves({ limit: 12 }, signal), [revision]);
  const trades = useApiQuery(signal => endpoints.trades({ page: 1, pageSize: 100 }, signal), [revision]);
  const hasPending = asList(trades.data).some(item => String(item.status ?? '').toLowerCase() === 'pending');
  const players = useApiQuery(signal => managing || hasPending ? loadAllPlayers(signal) : Promise.resolve({ data: [] }), [managing, hasPending, revision]);
  const refresh = () => setRevision(value => value + 1);
  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="JUGADORES DISPONIBLES" title="MERCADO"><button className="page-action" onClick={() => setManaging(value => !value)}>{managing ? 'CERRAR GESTIÓN' : '⚙ GESTIONAR'}</button></PageHeader>
    {managing && <section className="market-section market-manual"><header><h2>REGISTRAR OPERACIÓN MANUAL</h2><p>Los traspasos y trueques normalmente se hacen por Discord; usa esto solo para corregir o registrar algo a mano.</p></header><MarketAdmin teams={teams} players={asList(players.data)} onChanged={refresh}/></section>}
    <div className="market-layout">
      <div className="market-main">
        <PlayerList key={`free-${revision}`} title="AGENTES LIBRES" hint="Inscritos en la liga y sin equipo: se pueden comprar o asignar." status="free" teams={teams} allHref="#/equipos/jugadores?status=free"/>
        <PlayerList key={`unregistered-${revision}`} title="NO INSCRITOS" hint="Nadie los tiene y aún no están en la liga. Las cartas más valiosas de eFootballDB." status="unregistered" teams={teams} allHref="#/equipos/jugadores?status=unregistered"/>
      </div>
      <aside className="market-side">
        <PendingTrades trades={trades} players={players} teams={teams} onChanged={refresh}/>
        <section className="market-section"><header><h2>ÚLTIMOS MOVIMIENTOS</h2></header><DataState query={moves}/>{!moves.loading && !moves.error && (asList(moves.data).length ? <ul className="move-feed">{asList(moves.data).map(move => <MoveLine key={move.id} move={move} managing={managing} onChanged={refresh}/>)}</ul> : <p className="empty-copy">SIN MOVIMIENTOS REGISTRADOS.</p>)}</section>
      </aside>
    </div>
  </section></main>;
}
