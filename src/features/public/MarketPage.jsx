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
import { MyClubPanel, clubFigures, signingBlocker, signingNotes } from './market/MyClubPanel.jsx';
import { OffersInbox, ProposeOffers } from './market/OffersSection.jsx';
import { PollsSection } from './market/PollsSection.jsx';
import { ForSaleSection } from './market/ForSaleSection.jsx';
import { AuctionHistory } from './market/AuctionHistory.jsx';
import { SealedAuctionsSection } from './market/SealedAuctionsSection.jsx';
import { gpLabel } from '../../utils/money.js';
import { GpInput } from '../../components/GpInput.jsx';
import { Button, Icon, Screen } from '../../ui/index.js';
import { PlayersPage } from './PlayersPage.jsx';
import { WatchlistTab } from '../teams/WatchlistTab.jsx';

const asList = value => Array.isArray(value) ? value : [];

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
    if (window.confirm(`¿Registrar esta transferencia por ${gpLabel(Number(form.gpAmount))}?`)) mutation.execute({ ...form, gpAmount: Number(form.gpAmount) });
  };
  return <form className="admin-form market-form" onSubmit={submit}>
    <label>EQUIPO DE ORIGEN<select name="fromTeamId" value={form.fromTeamId} onChange={change}><TeamOptions teams={teams}/></select></label>
    <label>JUGADOR<select name="playerId" required value={form.playerId} onChange={change}><PlayerOptions players={players} teamId={form.fromTeamId}/></select></label>
    <label>EQUIPO DE DESTINO<select name="toTeamId" required value={form.toTeamId} onChange={change}><TeamOptions teams={teams.filter(team => team.id !== form.fromTeamId)}/></select></label>
    <label>MONTO GP<GpInput name="gpAmount" required value={form.gpAmount} onChange={change}/></label>
    <Button type="submit" disabled={mutation.loading || !form.fromTeamId || !form.playerId || !form.toTeamId || form.gpAmount === ''}>REGISTRAR TRANSFERENCIA</Button>
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
    if (window.confirm('¿Registrar este trueque y sus montos GP adicionales?')) mutation.execute(payload);
  };
  return <form className="admin-form market-form" onSubmit={submit}>
    <label>EQUIPO A<select name="fromTeamId" value={form.fromTeamId} onChange={change}><TeamOptions teams={teams}/></select></label>
    <label>JUGADOR A<select name="fromPlayerId" required value={form.fromPlayerId} onChange={change}><PlayerOptions players={players} teamId={form.fromTeamId}/></select></label>
    <label>EQUIPO B<select name="toTeamId" value={form.toTeamId} onChange={change}><TeamOptions teams={teams.filter(team => team.id !== form.fromTeamId)}/></select></label>
    <label>JUGADOR B<select name="toPlayerId" required value={form.toPlayerId} onChange={change}><PlayerOptions players={players} teamId={form.toTeamId}/></select></label>
    <label>GP ADICIONAL DE A<GpInput name="gpFrom" value={form.gpFrom} onChange={change}/></label>
    <label>GP ADICIONAL DE B<GpInput name="gpTo" value={form.gpTo} onChange={change}/></label>
    <Button type="submit" disabled={mutation.loading || !form.fromTeamId || !form.toTeamId || !form.fromPlayerId || !form.toPlayerId}>REGISTRAR TRUEQUE</Button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

export function MarketAdmin({ teams, players, onChanged }) {
  const [tab, setTab] = useState('transfer');
  return <section className="market-admin"><nav><button className={tab === 'transfer' ? 'active' : ''} onClick={() => setTab('transfer')}>NUEVA TRANSFERENCIA</button><button className={tab === 'trade' ? 'active' : ''} onClick={() => setTab('trade')}>NUEVO TRUEQUE</button></nav>{tab === 'transfer' ? <TransferForm teams={teams} players={players} onChanged={onChanged}/> : <TradeForm teams={teams} players={players} onChanged={onChanged}/>}</section>;
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
      <Button variant="positive" disabled={!teamId || short || buy.loading} onClick={() => { if (window.confirm(`¿${team.name} COMPRA A ${player.name} POR ${gp(player.price)}?`)) buy.execute(teamId); }}>COMPRAR · {gp(player.price)}</Button>
    </div>
    {short && <small className="signing-warning">Saldo insuficiente para comprarlo.</small>}
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
      <Button variant="positive" disabled={Boolean(blocker) || open.loading} onClick={() => open.execute({ playerId: player.playerId, teamId: myTeamId })}>ABRIR ENCUESTA · {gp(player.price)}</Button>
    </div>
    {blocker && <small className="signing-warning">{blocker}</small>}
    {!blocker && signingNotes(figures, player.price).map(note => <small key={note} className="signing-note">{note}</small>)}
    <FormFeedback mutation={open}/>
  </div>;
}

/** "Pedir subasta": el presi marca libres que quiere ver en subasta. El conteo de clubes es público. */
function InterestButton({ player, interest }) {
  const { teamId: myTeamId } = useAuth();
  const count = interest.demand.find(row => row.playerId === player.playerId)?.count ?? 0;
  const mine = interest.mine.includes(player.playerId);
  if (!player.playerId) return null;
  return <button type="button" className={`interest-toggle ${mine ? 'on' : ''}`} aria-pressed={mine} disabled={!myTeamId || interest.busy}
    title={myTeamId ? (mine ? 'YA NO LO PIDES EN SUBASTA' : 'Pedir que salga a subasta') : 'Solo los presis piden subastas'}
    aria-label={`${mine ? 'Quitar pedido de subasta' : 'Pedir subasta'} de ${player.name ?? 'este jugador'}${count ? ` (lo piden ${count} clubes)` : ''}`}
    onClick={() => interest.toggle(player.playerId, !mine)}>
    {/* Martillo, no estrella: la estrella es "Seguir" (Mi club > Seguimiento). */}
    <Icon name="gavel" size={14}/><span>{mine ? 'PEDIDA' : 'PEDIR'}</span>{count > 0 && <small>{count}</small>}
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
    {canAct && <button type="button" className="market-player-action" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'CERRAR' : myTeamId ? '🗳️ ABRIR ENCUESTA' : 'FICHAR'}</button>}
    {open && !myTeamId && isAdmin && <SigningForm player={player} teams={teams} onDone={() => { setOpen(false); onChanged(); }}/>}
    {open && myTeamId && <PollForm player={player} myTeamId={myTeamId} figures={club?.figures} marketOpen={club?.marketOpen} onDone={() => { setOpen(false); onChanged(); }}/>}
  </article>;
}

/** Buscar un agente libre por nombre y abrirle una encuesta ahí mismo. Sin texto, muestra los más caros. */
function PollSearch({ teams, club, interest, onChanged }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [text]);
  const players = useApiQuery(signal => query ? endpoints.playerDirectory({ status: 'free', sort: 'price_desc', pageSize: PREVIEW, q: query }, signal) : Promise.resolve({ data: [] }), [query]);
  const rows = asList(players.data);
  return <section className="market-section poll-search">
    <header><h2>ABRIR UNA ENCUESTA</h2><p>Escribe el nombre del agente libre. También puedes abrirla desde su ficha.</p></header>
    <label className="poll-search-box"><span className="sr-only">BUSCAR AGENTE LIBRE</span>
      <input type="search" value={text} placeholder="🔎 BUSCAR AGENTE LIBRE (EJ.: MBAPPÉ)" autoComplete="off" onChange={event => setText(event.target.value)}/>
    </label>
    {query && <DataState query={players} empty={null}/>}
    {query && !players.loading && !players.error && (rows.length
      ? <div className="market-player-list">{rows.map(player => <MarketPlayer key={player.playerId ?? `${player.pesId}-${player.variation}`} player={player} teams={teams} club={club} interest={interest} onChanged={() => { players.retry(); onChanged?.(); }}/>)}</div>
      : <p className="empty-copy">NO HAY AGENTES LIBRES QUE COINCIDAN CON «{query.toUpperCase()}».</p>)}
  </section>;
}

const TAB_KEY = 'mercado-pestana';
const readTab = () => { try { return window.sessionStorage.getItem(TAB_KEY) ?? 'buscar'; } catch { return 'buscar'; } };

/** Promesas de tu club: cuántas cumpliste y rompiste (pesa en tu reputación ante los jugadores libres). */
function PromiseRecord({ teamId, revision }) {
  const promises = useApiQuery(signal => teamId ? endpoints.teamPromises(teamId, signal).catch(() => ({ data: null })) : Promise.resolve({ data: null }), [teamId, revision]);
  const data = promises.data;
  if (!data) return null;
  const { kept, broken } = data.record ?? { kept: 0, broken: 0 };
  const active = data.active ?? [];
  if (!kept && !broken && !active.length) return null;
  return <details className="promise-record">
    <summary>PROMESAS · <b className="ok">{kept} CUMPLIDAS</b> · <b className={broken ? 'bad' : ''}>{broken} ROTAS</b>{active.length ? ` · ${active.length} PENDIENTES` : ''}</summary>
    {active.length > 0 && <ul>{active.map((item, index) => <li key={index}><b>{item.playerName}:</b> {item.text}{item.status === 'voting' ? ' · 🗳️ EN VOTACIÓN EN DISCORD' : ''}</li>)}</ul>}
    <p className="poll-hint">Romper una promesa baja tu reputación: los jugadores libres se acuerdan. Las de palabra (capitanía, penales, tiros libres…) las juzgan los presis votando en Discord.</p>
  </details>;
}

const INTRO = {
  buscar: 'Busca cualquier jugador de la liga o de eFootball. En su ficha le haces una oferta, le hablas o lo sigues.',
  subastas: 'Los agentes libres más pedidos se subastan en sobre cerrado: nadie ve lo que ofrecen los demás.',
  libres: 'Para fichar a un agente libre se abre una encuesta y los demás presis la confirman.',
  ofertas: 'Las ofertas que te hicieron y las que hiciste. Aquí aceptas, rechazas o contraofertas.',
  venta: 'Jugadores que sus clubes quieren vender. Toca «Hacer oferta» en el que te guste.',
  seguidos: 'Los jugadores que sigues. Te avisamos si cambian de club, quedan libres o los ponen a la venta.',
  historial: 'Todos los fichajes y subastas que ya pasaron.',
};

const when = value => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }) : null;
};

export function MarketPage({ teams, initialTab = null, highlightId = null, prefill = null, query = {}, navigate }) {
  const { isAdmin, teamId: myTeamId } = useAuth();
  const [revision, setRevision] = useState(0);
  const status = useApiQuery(signal => endpoints.marketStatus(signal), [revision]);
  const profile = useApiQuery(signal => myTeamId ? endpoints.team(myTeamId, signal) : Promise.resolve({ data: null }), [myTeamId, revision]);
  const refresh = () => setRevision(value => value + 1);
  const operates = isAdmin || Boolean(myTeamId);
  const figures = clubFigures(profile.data);
  const marketOpen = status.data ? Boolean(status.data.open) : undefined;
  const club = { figures, marketOpen };
  const myTeam = teams.find(team => team.id === myTeamId);
  const interest = useInterest(revision);
  // Enlaces viejos: encuestas → libres.
  const asked = { encuestas: 'libres' }[initialTab] ?? initialTab;
  const [tab, setTabState] = useState(() => asked || readTab());
  useEffect(() => { if (asked) setTabState(asked); }, [asked, highlightId]);
  const setTab = value => {
    setTabState(value);
    try { window.sessionStorage.setItem(TAB_KEY, value); } catch { /* sin almacenamiento */ }
    try { window.history.replaceState(null, '', `#/transferencias?tab=${value}`); } catch { /* sin historial */ }
  };
  const live = useApiQuery(signal => endpoints.sealedAuctions({ active: 1 }, signal).catch(() => ({ data: [] })), [revision]);
  const liveCount = (Array.isArray(live.data) ? live.data : []).filter(row => row.status === 'open').length;
  const offers = useApiQuery(signal => (myTeamId ? endpoints.marketOffers(signal).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })), [myTeamId, revision]);
  const incoming = (Array.isArray(offers.data) ? offers.data : []).filter(offer => offer.direction === 'incoming').length;
  const tabs = [
    { id: 'buscar', label: 'Buscar' },
    { id: 'subastas', label: 'Subastas', badge: liveCount },
    ...(operates ? [{ id: 'libres', label: 'Fichar libres' }, { id: 'ofertas', label: 'Ofertas', badge: incoming }, { id: 'venta', label: 'A la venta' }] : []),
    ...(myTeam ? [{ id: 'seguidos', label: 'Seguidos' }] : []),
    { id: 'historial', label: 'Historial' },
  ];
  const current = tabs.some(item => item.id === tab) ? tab : 'buscar';
  const kicker = status.data ? (status.data.open ? `Mercado abierto${when(status.data.closesAt) ? ` · cierra el ${when(status.data.closesAt)}` : ''}` : 'Mercado cerrado · igual puedes buscar jugadores y hablarles') : 'Mercado';
  // El buscador recibe sus filtros; el comparador llega como vista=comparador (tab ya es la pestaña del mercado).
  const directoryQuery = Object.fromEntries(Object.entries({ ...query, tab: query.vista === 'comparador' || query.tab === 'comparador' ? 'comparador' : undefined }).filter(([key, value]) => value !== undefined && !['id', 'jugador', 'club', 'vista'].includes(key)));
  return <Screen kicker={kicker} title="Mercado" intro={INTRO[current]} tabs={tabs} active={current} onTab={setTab}
    actions={isAdmin ? <a className="ui-btn ui-btn--ghost ui-btn--sm screen-admin-link" href="#/admin?tab=mercado">Administrar mercado</a> : null}>
    {operates && current !== 'buscar' && <MyClubPanel team={myTeam} figures={figures} profileQuery={myTeamId ? profile : null} status={status.data} statusQuery={status}>
      {myTeamId && <PromiseRecord teamId={myTeamId} revision={revision}/>}
    </MyClubPanel>}
    {current === 'buscar' && <PlayersPage key={JSON.stringify(directoryQuery)} teams={teams} initialQuery={directoryQuery}/>}
    {current === 'subastas' && <SealedAuctionsSection revision={revision} onChanged={refresh} teams={teams}/>}
    {current === 'libres' && <PollsSection teams={teams} revision={revision} onChanged={refresh}>
      <PollSearch teams={teams} club={club} interest={interest} onChanged={refresh}/>
    </PollsSection>}
    {current === 'ofertas' && <>
      {/* Si llegas desde la ficha de un jugador, el formulario va primero y con él ya elegido. */}
      {operates && myTeamId && prefill && <ProposeOffers teams={teams} marketOpen={marketOpen} onChanged={refresh} prefill={prefill}/>}
      {operates && <OffersInbox revision={revision} onChanged={refresh} highlightId={highlightId}/>}
      {operates && myTeamId && !prefill && <ProposeOffers teams={teams} marketOpen={marketOpen} onChanged={refresh}/>}
    </>}
    {current === 'venta' && <ForSaleSection teams={teams} revision={revision} onChanged={refresh}/>}
    {current === 'seguidos' && myTeam && <WatchlistTab team={myTeam}/>}
    {current === 'historial' && <AuctionHistory revision={revision} teams={teams}/>}
  </Screen>;
}
