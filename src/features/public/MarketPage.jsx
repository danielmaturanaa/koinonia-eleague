import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { EntityLink } from '../../components/EntityLink.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { teamBalance } from '../../utils/teamPresentation.js';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, OverallBadge, PageHeader, formatDate, gp } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';
import { MyClubPanel, clubFigures, signingBlocker } from './market/MyClubPanel.jsx';
import { OffersInbox, ProposeOffers } from './market/OffersSection.jsx';
import { PollsSection } from './market/PollsSection.jsx';
import { AuctionHistory } from './market/AuctionHistory.jsx';
import { SealedAuctionsSection } from './market/SealedAuctionsSection.jsx';
import { AuctionSimulator } from './market/AuctionSimulator.jsx';

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
  const team = teams.find(item => item.id === teamId);
  const balance = team ? teamBalance(team) : null;
  const short = balance !== null && player.price != null && balance < player.price;
  return <div className="signing-form">
    <select value={teamId} onChange={event => setTeamId(event.target.value)} aria-label="Equipo que ficha"><option value="">¿QUÉ EQUIPO LO FICHA?</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}{teamBalance(item) !== null ? ` · saldo ${gp(teamBalance(item))}` : ''}</option>)}</select>
    <div className="button-row">
      <button type="button" className="action-button positive" disabled={!teamId || short || buy.loading} onClick={() => { if (window.confirm(`¿${team.name} COMPRA A ${player.name} POR ${gp(player.price)}?`)) buy.execute(teamId); }}>COMPRAR · {gp(player.price)}</button>
    </div>
    {short && <small className="signing-warning">SALDO INSUFICIENTE PARA COMPRARLO.</small>}
    <FormFeedback mutation={buy}/>
  </div>;
}

/* Presidentes: no compran directo; abren una encuesta que votan los demás clubes. */
function PollForm({ player, myTeamId, figures, marketOpen, onDone }) {
  const open = useApiMutation((body, signal) => endpoints.openPoll(body, signal), { onSuccess: onDone });
  const blocker = signingBlocker(figures, player.price, marketOpen);
  return <div className="signing-form">
    <p className="poll-hint">SE ABRE UNA ENCUESTA POR {gp(player.price)}. SI NADIE PIDE SUBASTA Y LLEGA AL MÍNIMO DE VOTOS, CONFIRMAS LA COMPRA.</p>
    <div className="button-row">
      <button type="button" className="action-button positive" disabled={Boolean(blocker) || open.loading} onClick={() => open.execute({ playerId: player.playerId, teamId: myTeamId })}>ABRIR ENCUESTA · {gp(player.price)}</button>
    </div>
    {blocker && <small className="signing-warning">{blocker}</small>}
    <FormFeedback mutation={open}/>
  </div>;
}

/** "Me interesa": el presi marca libres que quiere ver en subasta. El conteo de clubes es público. */
function InterestButton({ player, interest }) {
  const { teamId: myTeamId } = useAuth();
  const count = interest.demand.find(row => row.playerId === player.playerId)?.count ?? 0;
  const mine = interest.mine.includes(player.playerId);
  if (!player.playerId) return null;
  return <button type="button" className={`interest-toggle ${mine ? 'on' : ''}`} aria-pressed={mine} disabled={!myTeamId || interest.busy}
    title={myTeamId ? (mine ? 'YA NO ME INTERESA' : 'ME INTERESA: QUIERO VERLO EN SUBASTA') : 'SOLO LOS PRESIS MARCAN INTERÉS'}
    onClick={() => interest.toggle(player.playerId, !mine)}>
    {mine ? '★' : '☆'}{count > 0 && <small>{count}</small>}
  </button>;
}

function useInterest(revision) {
  const query = useApiQuery(signal => endpoints.marketInterest(signal).catch(() => ({ data: { mine: [], demand: [] } })), [revision]);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.data) setState(query.data); }, [query.data]);
  const toggle = (playerId, interested) => {
    setBusy(true);
    endpoints.setMarketInterest({ playerId, interested }).then(response => setState(response.data)).catch(() => {}).finally(() => setBusy(false));
  };
  return { mine: state?.mine ?? [], demand: state?.demand ?? [], toggle, busy };
}

/** Los libres que más clubes quieren ver en subasta (el admin ve cuáles). */
function DemandPanel({ interest }) {
  const { isAdmin } = useAuth();
  const top = interest.demand.slice(0, 6);
  if (!top.length) return null;
  return <section className="market-section market-demand"><header><h2>🔥 LOS MÁS PEDIDOS <small>{interest.demand.length}</small></h2><p>LIBRES QUE LOS CLUBES QUIEREN VER EN SUBASTA. MARCA ☆ EN LOS QUE TE INTERESAN.</p></header>
    <ol className="demand-list">{top.map(row => <li key={row.playerId}>
      <PlayerFace src={row.faceUrl} name={row.name}/>
      <span><b>{row.name}</b><small>{row.position} · {gp(row.gpValue)}{isAdmin && row.teams ? ` · ${String(row.teams).toUpperCase()}` : ''}</small></span>
      <strong>{row.count} {row.count === 1 ? 'CLUB' : 'CLUBES'}</strong>
    </li>)}</ol>
  </section>;
}

function MarketPlayer({ player, teams, onChanged, club, interest }) {
  const { isAdmin, teamId: myTeamId } = useAuth();
  const canAct = isAdmin || Boolean(myTeamId);
  const [open, setOpen] = useState(false);
  const href = player.playerId
    ? `#/jugadores/${encodeURIComponent(player.playerId)}?from=mercado`
    : `#/efootball/${player.pesId}?${player.variation ? `v=${player.variation}&` : ''}from=mercado`;
  return <article className={`market-player ${open ? 'open' : ''}`}>
    <a href={href} className="market-player-link"><PlayerFace src={player.faceUrl} name={player.name}/><span><b>{player.name}</b><small>{[player.position, player.nationality, player.age ? `${player.age} AÑOS` : null].filter(Boolean).join(' · ')}</small><OverallBadge value={player.overall}/></span><strong>{gp(player.price)}</strong></a>
    {interest && <InterestButton player={player} interest={interest}/>}
    {canAct && <button type="button" className="market-player-action" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'CERRAR' : isAdmin ? 'FICHAR' : 'ABRIR ENCUESTA'}</button>}
    {open && isAdmin && <SigningForm player={player} teams={teams} onDone={() => { setOpen(false); onChanged(); }}/>}
    {open && !isAdmin && <PollForm player={player} myTeamId={myTeamId} figures={club?.figures} marketOpen={club?.marketOpen} onDone={() => { setOpen(false); onChanged(); }}/>}
  </article>;
}

function PlayerList({ title, hint, status, teams, allHref, club, onChanged, interest }) {
  const players = useApiQuery(signal => endpoints.playerDirectory({ status, sort: 'price_desc', pageSize: PREVIEW }, signal), [status]);
  const rows = asList(players.data);
  return <section className="market-section"><header><h2>{title} {players.pagination?.total != null && <small>{players.pagination.total.toLocaleString('es-CL')}</small>}</h2><p>{hint}</p></header>
    <DataState query={players}/>
    {!players.loading && !players.error && (rows.length ? <div className="market-player-list">{rows.map(player => <MarketPlayer key={player.playerId ?? `${player.pesId}-${player.variation}`} player={player} teams={teams} club={club} interest={interest} onChanged={() => { players.retry(); onChanged?.(); }}/>)}</div> : <p className="empty-copy">NO HAY JUGADORES EN ESTA LISTA.</p>)}
    <a className="market-see-all" href={allHref}>VER TODOS EN JUGADORES →</a>
  </section>;
}

function PendingTrades({ trades, players, teams, onChanged }) {
  const { isAdmin } = useAuth();
  const pending = asList(trades.data).filter(item => String(item.status ?? '').toLowerCase() === 'pending');
  if (!pending.length) return null;
  const playersById = new Map(asList(players.data).map(player => [player.id, player]));
  const teamsById = new Map(teams.map(team => [team.id, team]));
  return <section className="market-section market-pending"><header><h2>PENDIENTES DE APROBACIÓN <small>{pending.length}</small></h2></header>
    {pending.map(item => <article className="market-item" key={item.id}><b>{relatedName(item, 'from', 'Player', playersById) ?? 'Jugador'} ⇄ {relatedName(item, 'to', 'Player', playersById) ?? 'Jugador'}</b><span>{relatedName(item, 'from', 'Team', teamsById) ?? 'Origen'} / {relatedName(item, 'to', 'Team', teamsById) ?? 'Destino'}</span>{isAdmin && <TradeActions item={item} onChanged={onChanged}/>}</article>)}
  </section>;
}

const TAB_KEY = 'mercado-pestana';
const readTab = () => { try { return window.sessionStorage.getItem(TAB_KEY) ?? 'subastas'; } catch { return 'subastas'; } };

/** Promesas de tu club: cuántas cumpliste y rompiste (pesa en tu reputación ante los jugadores libres). */
function PromiseRecord({ teamId, revision }) {
  const promises = useApiQuery(signal => teamId ? endpoints.teamPromises(teamId, signal).catch(() => ({ data: null })) : Promise.resolve({ data: null }), [teamId, revision]);
  const data = promises.data;
  if (!data) return null;
  const { kept, broken } = data.record ?? { kept: 0, broken: 0 };
  const active = data.active ?? [];
  if (!kept && !broken && !active.length) return null;
  return <details className="promise-record">
    <summary>📜 PROMESAS · <b className="ok">✅ {kept} CUMPLIDAS</b> · <b className={broken ? 'bad' : ''}>💔 {broken} ROTAS</b>{active.length ? ` · ${active.length} PENDIENTES` : ''}</summary>
    {active.length > 0 && <ul>{active.map((item, index) => <li key={index}><b>{item.playerName}:</b> {item.text}</li>)}</ul>}
    <p className="poll-hint">ROMPER UNA PROMESA BAJA TU REPUTACIÓN: LOS JUGADORES LIBRES SE ACUERDAN.</p>
  </details>;
}

export function MarketPage({ teams }) {
  const { isAdmin, teamId: myTeamId } = useAuth();
  const [managing, setManaging] = useState(false);
  const [revision, setRevision] = useState(0);
  const trades = useApiQuery(signal => endpoints.trades({ page: 1, pageSize: 100 }, signal), [revision]);
  const hasPending = asList(trades.data).some(item => String(item.status ?? '').toLowerCase() === 'pending');
  const players = useApiQuery(signal => managing || hasPending ? loadAllPlayers(signal) : Promise.resolve({ data: [] }), [managing, hasPending, revision]);
  const status = useApiQuery(signal => endpoints.marketStatus(signal), [revision]);
  const profile = useApiQuery(signal => myTeamId ? endpoints.team(myTeamId, signal) : Promise.resolve({ data: null }), [myTeamId, revision]);
  const refresh = () => setRevision(value => value + 1);
  const operates = isAdmin || Boolean(myTeamId);
  const figures = clubFigures(profile.data);
  const marketOpen = status.data ? Boolean(status.data.open) : undefined;
  const club = { figures, marketOpen };
  const myTeam = teams.find(team => team.id === myTeamId);
  const interest = useInterest(revision);
  const [tab, setTabState] = useState(readTab);
  const setTab = value => { setTabState(value); try { window.sessionStorage.setItem(TAB_KEY, value); } catch { /* sin almacenamiento */ } };
  const live = useApiQuery(signal => endpoints.sealedAuctions({ active: 1 }, signal).catch(() => ({ data: [] })), [revision]);
  const liveCount = (Array.isArray(live.data) ? live.data : []).filter(row => row.status === 'open').length;
  const sim = useApiQuery(signal => isAdmin ? endpoints.auctionSimAccess(signal).catch(() => ({ data: { allowed: false } })) : Promise.resolve({ data: { allowed: false } }), [isAdmin]);
  const tabs = [
    ['subastas', '🔨 SUBASTAS', liveCount],
    ['libres', '🧑‍🤝‍🧑 AGENTES LIBRES', null],
    ...(operates ? [['ofertas', '🤝 OFERTAS Y ENCUESTAS', null]] : []),
    ['historial', '📜 HISTORIAL', null],
    ...(sim.data?.allowed ? [['simulador', '🧪 SIMULADOR', null]] : []),
  ];
  const current = tabs.some(([key]) => key === tab) ? tab : 'subastas';
  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="JUGADORES DISPONIBLES" title="MERCADO">{isAdmin && <button className="page-action" onClick={() => setManaging(value => !value)}>{managing ? 'CERRAR GESTIÓN' : '⚙ GESTIONAR'}</button>}</PageHeader>
    {managing && isAdmin && <section className="market-section market-manual"><header><h2>REGISTRAR OPERACIÓN MANUAL</h2><p>Los traspasos y trueques normalmente se hacen por Discord; usa esto solo para corregir o registrar algo a mano.</p></header><MarketAdmin teams={teams} players={asList(players.data)} onChanged={refresh}/></section>}
    {operates && <MyClubPanel team={myTeam} figures={figures} profileQuery={myTeamId ? profile : null} status={status.data} statusQuery={status}/>}
    {myTeamId && <PromiseRecord teamId={myTeamId} revision={revision}/>}
    <nav className="market-tabs" role="tablist" aria-label="SECCIONES DEL MERCADO">
      {tabs.map(([key, label, badge]) => <button key={key} type="button" role="tab" aria-selected={current === key} className={current === key ? 'active' : ''} onClick={() => setTab(key)}>
        {label}{badge ? <span className="market-tab-badge">{badge}</span> : null}
      </button>)}
    </nav>
    <div className="market-tab-panel" role="tabpanel">
      {current === 'subastas' && <SealedAuctionsSection revision={revision} onChanged={refresh} teams={teams}/>}
      {current === 'libres' && <>
        <DemandPanel interest={interest}/>
        <PlayerList key={`free-${revision}`} title="AGENTES LIBRES" hint="Todos los jugadores de eFootballDB están inscritos y sin equipo. Marca ☆ los que quieres ver en subasta." status="free" teams={teams} allHref="#/equipos/jugadores?status=free" club={club} interest={interest} onChanged={refresh}/>
      </>}
      {current === 'ofertas' && <>
        {operates && <PollsSection teams={teams} revision={revision} onChanged={refresh}/>}
        {operates && myTeamId && <OffersInbox revision={revision} onChanged={refresh}/>}
        {operates && myTeamId && <ProposeOffers teams={teams} onChanged={refresh}/>}
        <PendingTrades trades={trades} players={players} teams={teams} onChanged={refresh}/>
      </>}
      {current === 'historial' && <AuctionHistory revision={revision} teams={teams}/>}
      {current === 'simulador' && <AuctionSimulator teams={teams}/>}
    </div>
  </section></main>;
}
