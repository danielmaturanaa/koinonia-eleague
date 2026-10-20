import { useEffect, useState, useSyncExternalStore } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { FormFeedback } from '../../admin/FormFeedback.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { DataState, formatDate, gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { AuctionReveal } from './AuctionReveal.jsx';
import { serverNow, syncServerTime } from './serverClock.js';
import { PlayerChat } from './PlayerChat.jsx';
import { PlayerPicker } from './PlayerPicker.jsx';
import { ReadyControl } from './ReadyControl.jsx';
import { useAutoRefresh } from './PollsSection.jsx';

const STATUS_LABEL = { open: 'ABIERTA', resolved: 'FIRMADO', no_sale: 'SIN VENTA', cancelled: 'CANCELADA' };

// La revelación y las subastas que se vieron abiertas viven fuera del componente: si la página se vuelve a montar
// (refrescos de datos), el show no se corta a la mitad ni se pierde el cierre que estabas mirando.
const revealStore = { current: null, dismissed: new Set(), listeners: new Set() };
const subscribeReveal = listener => { revealStore.listeners.add(listener); return () => revealStore.listeners.delete(listener); };
const setReveal = value => { revealStore.current = value; revealStore.listeners.forEach(listener => listener()); };
const useReveal = () => useSyncExternalStore(subscribeReveal, () => revealStore.current);
// El show se abre solo 10 s antes de la hora (con cuenta regresiva adentro) para todos los que estén en la página.
const AUTO_OPEN_BEFORE_MS = 10_000;
const isRevealing = (auction, now) => auction.status !== 'open' && auction.revealAt && now < Date.parse(auction.revealEndsAt);

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(serverNow()), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
  return now;
}

function countdown(closesAt, now) {
  const left = Date.parse(closesAt) - now;
  if (!Number.isFinite(left)) return '—';
  if (left <= 0) return 'CERRANDO...';
  const total = Math.floor(left / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  return days ? `${days} D ${clock}` : clock;
}

const clubLabel = (teams, id) => (teams.find(team => team.id === id)?.name ?? id).toUpperCase();
// La API guarda created_at como "AAAA-MM-DD HH:MM:SS" en UTC (sin zona).
const parseUtc = value => (value ? Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${String(value).replace(' ', 'T')}Z`) : NaN);
const crestOf = (teams, id) => {
  const team = teams.find(item => item.id === id);
  return team?.imageUrl ?? team?.image_url ?? team?.logoUrl ?? null;
};
const initials = name => String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();

function BidPanel({ auction, onChanged, teams = [], clubs: allowedClubs = null }) {
  const { isAdmin, user, teamId } = useAuth();
  const teamIds = user?.teamIds ?? [];
  const clubs = allowedClubs ?? (isAdmin && !teamIds.length ? [] : teamIds);
  const [chosen, setChosen] = useState(clubs.includes(teamId) ? teamId : clubs[0] ?? '');
  const mine = auction.myBids.find(bid => bid.teamId === chosen) ?? null;
  // Se puede subir o bajar (al bajar se devuelve la diferencia), siempre entre el mínimo y el máximo.
  const minimum = auction.minBid;
  const [amount, setAmount] = useState(String(mine?.amount ?? minimum));
  // Con oferta registrada el formulario se esconde; vuelve solo si quiere cambiarla.
  const [raising, setRaising] = useState(false);
  const bid = useApiMutation((body, signal) => endpoints.sealedAuctionAction(auction.id, 'bids', body, signal), { onSuccess: () => { setRaising(false); onChanged(); } });
  useEffect(() => { setAmount(String(mine?.amount ?? minimum)); }, [minimum, mine?.amount, raising]);
  if (!chosen && !isAdmin) return null;
  if (!chosen) return <p className="poll-hint">PARA OFERTAR NECESITAS UN CLUB VINCULADO.</p>;
  const submit = event => {
    event.preventDefault();
    bid.execute({ teamId: chosen, amount: Number(amount) });
  };
  const selector = clubs.length > 1 && <label className="sealed-club">CLUB<select value={chosen} onChange={event => setChosen(event.target.value)}>
    {clubs.map(id => <option key={id} value={id}>{clubLabel(teams, id)}</option>)}
  </select></label>;
  if (mine && !raising) {
    return <div className="sealed-done" role="status">
      {selector}
      <div className="sealed-done-main">
        <span className="sealed-done-check" aria-hidden="true">✓</span>
        <div><b>OFERTA REGISTRADA</b><strong>{gp(mine.amount)}</strong></div>
        <button type="button" className="link-button" onClick={() => setRaising(true)}>CAMBIAR</button>
      </div>
      {mine.outbid && <p className="poll-confirm warn">⚠️ HAY UNA OFERTA MÁS FUERTE QUE LA TUYA.</p>}
      <ReadyControl auction={auction} teamId={chosen} onChanged={onChanged}/>
    </div>;
  }
  const tooLow = Number(amount) < minimum;
  const same = Boolean(mine) && Number(amount) === mine.amount;
  const tooHigh = auction.maxBid != null && Number(amount) > auction.maxBid;
  return <form className="poll-auction-form sealed-bid" onSubmit={submit}>
    {selector}
    <label>{mine ? `CAMBIAR MI OFERTA (HOY ${gp(mine.amount)})` : 'MI OFERTA (GP)'}
      <input type="number" min={minimum} max={auction.maxBid ?? undefined} step="1" required value={amount} onChange={event => setAmount(event.target.value)}/>
    </label>
    {auction.player?.gpValue > 0 && <p className="poll-hint sealed-bid-help">📄 SI GANAS: CONTRATO DE 2 TORNEOS CON SUELDO DE <b>{gp(Math.max(10_000, Math.round(auction.player.gpValue * 0.1 / 10_000) * 10_000))}</b> POR TORNEO (10% DE SU VALOR), QUE SE COBRA AL TERMINAR CADA TORNEO DE LIGA. PUEDES CAMBIAR LOS AÑOS EN LA PESTAÑA NÓMINA ANTES DEL PRIMER COBRO.</p>}
    <p className="poll-hint sealed-bid-help">
      ENTRE <b>{gp(minimum)}</b>{auction.maxBid != null ? <> Y <b>{gp(auction.maxBid)}</b></> : null} · 🔒 SECRETA: NADIE VE TU MONTO, SE RETIENE Y SE DEVUELVE SI NO GANAS.
    </p>
    <div className="mini-actions">
      <button type="submit" disabled={bid.loading || tooLow || tooHigh || same}>{mine ? (Number(amount) < mine.amount ? 'BAJAR MI OFERTA' : 'SUBIR MI OFERTA') : 'OFERTAR'}</button>
      {mine && <button type="button" className="danger" onClick={() => setRaising(false)}>CANCELAR</button>}
    </div>
    <FormFeedback mutation={bid}/>
  </form>;
}

const STATE_LABEL = {
  listo: ['🏁 LISTO', 'listo'],
  oferto: ['OFERTÓ', 'oferto'],
  no_participa: ['NO PARTICIPA', 'no_participa'],
  pendiente: [null, 'pendiente'],
};

/** Un solo resumen y fichas compactas: la etiqueta solo aparece cuando el club ya decidió algo. Es público; los montos no. */
function Participation({ rows, isModerator, teams = [] }) {
  if (!rows?.length) return null;
  const count = state => rows.filter(row => row.state === state).length;
  const bid = count('oferto') + count('listo');
  const ready = count('listo');
  const pieces = [
    // Los listos ya cuentan entre los que ofertaron: se muestran entre paréntesis, no como otro grupo.
    [bid, 'OFERTARON', 'OFERTÓ', ready > 0 ? ` (${ready} ${ready === 1 ? 'LISTO' : 'LISTOS'})` : ''],
    [count('no_participa'), 'NO PARTICIPAN', 'NO PARTICIPA', ''],
    [count('pendiente'), 'PENDIENTES', 'PENDIENTE', ''],
  ].filter(([n]) => n > 0).map(([n, plural, singular, extra]) => `${n} ${n === 1 ? singular : plural}${extra}`);
  const everyoneReady = bid > 0 && count('listo') >= bid;
  return <div className="sealed-participation">
    <p className="poll-meta"><b>{pieces.join(' · ')}</b></p>
    {isModerator && everyoneReady && <p className="poll-confirm sealed-all-ready">🏁 TODOS ESTÁN LISTOS: PUEDES CERRAR.</p>}
    <ul className="stage-crests" aria-label="ESTADO DE CADA CLUB">
      {rows.map(row => {
        const [label, tone] = STATE_LABEL[row.state] ?? [String(row.state).toUpperCase(), 'pendiente'];
        const name = String(row.name).toUpperCase();
        const crest = crestOf(teams, row.teamId);
        return <li key={`${row.teamId}-${row.state}`} className={`crest state-${tone}`} aria-label={`${name}: ${label ?? 'PENDIENTE'}`} title={`${name}${label ? ` · ${label}` : ''}`}>
          <span className="crest-badge" aria-hidden="true">{crest ? <img src={crest} alt="" loading="lazy"/> : (row.emoji ?? initials(row.name))}{row.state === 'listo' && <i className="crest-check">✓</i>}</span>
          <span className="crest-name">{name}</span>
          {label && <small>{label}</small>}
        </li>;
      })}
    </ul>
  </div>;
}

/** Guía de 3 pasos: qué hiciste y qué te falta (ofertar → conversar → estoy listo), con la temperatura del jugador. */
function Steps({ auction, clubs, teams, heat }) {
  const ready = new Set(auction.myReadyTeamIds ?? []);
  return <div className="stage-steps" aria-label="TUS PASOS">
    {clubs.map(id => {
      const bid = auction.myBids.find(item => item.teamId === id);
      const talked = clubs.indexOf(id) === 0 && heat ? heat : null;
      const steps = [
        { key: 'oferta', label: bid ? `OFERTASTE ${gp(bid.amount)}` : 'HAZ TU OFERTA', done: Boolean(bid) },
        { key: 'chat', label: talked?.finished ? 'LE RESPONDISTE TODO' : talked ? `CONVERSA CON ÉL${talked.answered ? ` · ${talked.answered} RESPONDIDA${talked.answered > 1 ? 'S' : ''}` : ''}` : 'CONVERSA CON ÉL', done: Boolean(talked?.finished) },
        { key: 'listo', label: ready.has(id) ? 'ESTÁS LISTO' : 'MARCA «ESTOY LISTO»', done: ready.has(id) },
      ];
      const current = steps.findIndex(step => !step.done);
      return <div className="stage-steps-row" key={id}>
        {clubs.length > 1 && <b className="stage-steps-club">{clubLabel(teams, id)}</b>}
        <ol>
          {steps.map((step, index) => <li key={step.key} className={step.done ? 'done' : index === current ? 'current' : ''}>
            <i aria-hidden="true">{step.done ? '✓' : index + 1}</i><span>{step.label}</span>
          </li>)}
        </ol>
        {talked && <span className="stage-heat">🌡 {talked.temperature}° {String(talked.label).toUpperCase()}</span>}
      </div>;
    })}
  </div>;
}

/** "No participar": enlace discreto; si ya hay oferta, confirma en el mismo lugar (el servidor la retira y devuelve el saldo). */
function PassControl({ auction, clubId, name, onChanged }) {
  const [confirming, setConfirming] = useState(false);
  const pass = useApiMutation((body, signal) => endpoints.sealedAuctionAction(auction.id, 'pass', body, signal), { onSuccess: () => { setConfirming(false); onChanged(); } });
  const hasBid = auction.myBids.some(bid => bid.teamId === clubId);
  const label = `NO PARTICIPAR${name ? ` CON ${name}` : ''}`;
  return <div className="sealed-pass">
    {confirming
      ? <span className="sealed-confirm" role="group" aria-label="CONFIRMAR NO PARTICIPAR">
        ¿RETIRAR TU OFERTA Y NO PARTICIPAR?
        <button type="button" disabled={pass.loading} onClick={() => pass.execute({ teamId: clubId, pass: true })}>SÍ</button>
        <button type="button" onClick={() => setConfirming(false)}>NO</button>
      </span>
      : <button type="button" className="link-button muted" disabled={pass.loading} onClick={() => (hasBid ? setConfirming(true) : pass.execute({ teamId: clubId, pass: true }))}>{label}</button>}
    <FormFeedback mutation={pass}/>
  </div>;
}

function PassedNotice({ auction, clubId, name, onChanged }) {
  const back = useApiMutation((body, signal) => endpoints.sealedAuctionAction(auction.id, 'pass', body, signal), { onSuccess: onChanged });
  return <div className="sealed-passed" role="status">
    <span>🚫 {name ? `${name} NO PARTICIPA` : 'NO PARTICIPAS'} EN ESTA SUBASTA.</span>
    <button type="button" className="link-button" disabled={back.loading} onClick={() => back.execute({ teamId: clubId, pass: false })}>VOLVER A PARTICIPAR</button>
    <FormFeedback mutation={back}/>
  </div>;
}

/** Solo el presi moderador ve estos botones: el servidor también rechaza a cualquier otro. */
function ModeratorActions({ auction, onChanged }) {
  const act = useApiMutation((action, signal) => endpoints.sealedAuctionAction(auction.id, action, {}, signal), { onSuccess: onChanged });
  const blocked = auction.resolveBlockedReason;
  return <div className="sealed-moderator-actions">
    <p className="poll-hint"><b>⚖️ ERES EL MODERADOR</b></p>
    <div className="mini-actions">
      {auction.canResolve && <button disabled={act.loading || Boolean(blocked)} onClick={() => { if (window.confirm(`¿RESOLVER AHORA LA SUBASTA DE ${auction.player.name}? EL JUGADOR FIRMARÁ CON EL CLUB QUE MEJOR LE CALCE.`)) act.execute('resolve'); }}>RESOLVER AHORA</button>}
      {auction.canCancel && <button className="danger" disabled={act.loading} onClick={() => { if (window.confirm(`¿CANCELAR LA SUBASTA DE ${auction.player.name}? SE DEVUELVE TODA LA PLATA RETENIDA Y EL JUGADOR SIGUE LIBRE.`)) act.execute('cancel'); }}>CANCELAR SUBASTA</button>}
    </div>
    {blocked && <p className="poll-hint warn">{String(blocked).toUpperCase()}</p>}
    <FormFeedback mutation={act}/>
  </div>;
}

function AuctionCard({ auction, now, onChanged, teams = [] }) {
  const { isAdmin, user } = useAuth();
  const myClubs = user?.teamIds ?? [];
  const passedIds = auction.myPassedTeamIds ?? [];
  const playingClubs = myClubs.filter(id => !passedIds.includes(id));
  const passedClubs = myClubs.filter(id => passedIds.includes(id));
  const open = auction.status === 'open';
  const revealing = isRevealing(auction, now);
  const isModerator = Boolean(auction.moderator?.isMe);
  const canPlay = open && playingClubs.length > 0;
  const closing = open && Date.parse(auction.closesAt) - now < 5 * 60 * 1000;
  const [heat, setHeat] = useState(null);
  const moderator = auction.moderator;
  const startedAt = parseUtc(auction.openedAt);
  const endsAt = Date.parse(auction.closesAt);
  const elapsed = Number.isFinite(startedAt) && endsAt > startedAt ? Math.min(1, Math.max(0, (now - startedAt) / (endsAt - startedAt))) : null;
  const heatLevel = heat ? (heat.temperature >= 60 ? 'hot' : heat.temperature >= 40 ? 'warm' : 'cold') : null;
  return <article className={`poll-card sealed-card stage status-${auction.status} ${closing ? 'is-closing' : ''} ${heatLevel ? `heat-${heatLevel}` : ''}`}>
    <header className="stage-hero">
      <div className="stage-spot" aria-hidden="true"/>
      <p className="stage-kicker">
        <span className="stage-live">{open ? '● EN VIVO' : revealing ? '🔴 REVELACIÓN EN VIVO' : STATUS_LABEL[auction.status] ?? auction.status.toUpperCase()}</span>
        <span>🔨 SUBASTA SELLADA</span>
        {moderator && <span className="stage-moderator">⚖️ MODERA {moderator.name.toUpperCase()}{isModerator ? ' (TÚ)' : ''}</span>}
      </p>
      <div className="stage-player">
        <div className="stage-ring"><PlayerFace src={auction.player.faceUrl} name={auction.player.name}/></div>
        <div className="stage-name">
          <h3>{auction.player.name}</h3>
          <p className="stage-chips">
            <span>{auction.player.position}</span>
            <span>VALE {gp(auction.player.gpValue)}</span>
            {open && <span>OFERTAS {gp(auction.minBid)} – {auction.maxBid != null ? gp(auction.maxBid) : '∞'}</span>}
          </p>
        </div>
      </div>
      {revealing && <div className="stage-clock closing" role="timer">
        <small>{now < Date.parse(auction.revealAt) ? 'LA DECISIÓN EN VIVO EN' : 'DECIDIENDO AHORA'}</small>
        <b>{now < Date.parse(auction.revealAt) ? countdown(auction.revealAt, now) : '🔴'}</b>
        <button type="button" className="action-button positive" onClick={() => { revealStore.dismissed.delete(auction.id); setReveal({ auction, startAt: Date.parse(auction.revealAt) }); }}>VER EN VIVO</button>
      </div>}
      {open && <div className={`stage-clock ${closing ? 'closing' : ''}`} role="timer" aria-label={`CIERRA EN ${countdown(auction.closesAt, now)}`}>
        <small>{closing ? '⏱ ÚLTIMOS MINUTOS' : 'CIERRA EN'}</small>
        <b>{countdown(auction.closesAt, now)}</b>
        {elapsed != null && <span className="stage-progress" aria-hidden="true"><i style={{ width: `${Math.round(elapsed * 100)}%` }}/></span>}
        <small>{formatDate(auction.closesAt).toUpperCase()}{auction.extensions ? ` · EXTENDIDA ${auction.extensions}×` : ''}</small>
      </div>}
    </header>
    {open && closing && <p className="stage-alert" role="status">⚡ QUEDAN MENOS DE 5 MINUTOS: UNA OFERTA NUEVA EXTIENDE EL RELOJ.</p>}
    {canPlay && <Steps auction={auction} clubs={playingClubs} teams={teams} heat={heat}/>}

    {open && <div className={`sealed-body ${canPlay ? 'with-chat' : ''}`}>
      <div className="sealed-side">
        <Participation rows={auction.participation} isModerator={isModerator} teams={teams}/>
        {canPlay && <BidPanel auction={auction} onChanged={onChanged} teams={teams} clubs={playingClubs}/>}
        {passedClubs.map(id => <PassedNotice key={id} auction={auction} clubId={id} name={myClubs.length > 1 ? clubLabel(teams, id) : null} onChanged={onChanged}/>)}
        {canPlay && playingClubs.map(id => <PassControl key={id} auction={auction} clubId={id} name={myClubs.length > 1 ? clubLabel(teams, id) : null} onChanged={onChanged}/>)}
        {myClubs.length === 0 && <p className="poll-hint">{isAdmin ? 'PARA OFERTAR NECESITAS UN CLUB VINCULADO.' : 'SOLO LOS PRESIDENTES CON CLUB PUEDEN OFERTAR.'}</p>}
        {(auction.canResolve || auction.canCancel) && <ModeratorActions auction={auction} onChanged={onChanged}/>}
      </div>
      {canPlay && <div className="sealed-chat">
        <PlayerChat auction={auction} teams={teams} clubs={playingClubs} onChanged={onChanged} onHeat={setHeat}/>
      </div>}
    </div>}

    {revealing && <p className="stage-alert" role="status">🔒 LA SUBASTA CERRÓ. EL JUGADOR REVELA SU DECISIÓN EN VIVO, A LA MISMA HORA PARA TODOS.</p>}
    {!open && !revealing && auction.winner && <p className="poll-confirm sealed-result"><b>🚨 {auction.player.name.toUpperCase()} FIRMA POR {auction.winner.name.toUpperCase()} · {gp(auction.winner.amount)}</b></p>}
    {!open && !revealing && !auction.winner && auction.status === 'no_sale' && <p className="poll-hint">🤷 NADIE CONVENCIÓ AL JUGADOR: SIGUE LIBRE.</p>}
    {auction.status === 'cancelled' && <p className="poll-hint">SUBASTA CANCELADA: SE DEVOLVIÓ TODA LA PLATA RETENIDA.</p>}
    {!open && !revealing && auction.status !== 'cancelled' && <p className="poll-hint">LAS RAZONES DE LA DECISIÓN SALEN EN LA NOTICIA DEL FICHAJE.</p>}
  </article>;
}

function OpenAuctionForm({ onChanged }) {
  const [picked, setPicked] = useState(null);
  const [closesAt, setClosesAt] = useState('');
  const [moderatorId, setModeratorId] = useState('');
  const presidents = useApiQuery(signal => endpoints.presidents({}, signal), []);
  const moderators = (Array.isArray(presidents.data) ? presidents.data : []).filter(item => item.discordUserId && item.teamId);
  const playerId = picked?.playerId ?? '';
  const open = useApiMutation((body, signal) => endpoints.openSealedAuction(body, signal), { onSuccess: () => { setPicked(null); setClosesAt(''); setModeratorId(''); onChanged(); } });
  const submit = event => {
    event.preventDefault();
    open.execute({
      playerId,
      moderatorPresidentId: moderatorId,
      ...(closesAt ? { closesAt: new Date(closesAt).toISOString() } : {}),
    });
  };
  return <form className="admin-form market-form sealed-open" onSubmit={submit}>
    <PlayerPicker value={picked} onChange={setPicked} label="AGENTE LIBRE"/>
    <label>PRESI MODERADOR
      <select required value={moderatorId} onChange={event => setModeratorId(event.target.value)}>
        <option value="">SELECCIONAR</option>
        {moderators.map(item => <option key={item.id} value={item.id}>{item.name.toUpperCase()} · {(item.teamName ?? '').toUpperCase()}</option>)}
      </select>
    </label>
    <p className="poll-hint sealed-bounds"><b>OFERTA MÍNIMA 0,7× Y MÁXIMA 1,25× EL VALOR DEL JUGADOR.</b></p>
    <label>CIERRE (OPCIONAL)<input type="datetime-local" value={closesAt} onChange={event => setClosesAt(event.target.value)}/></label>
    <p className="poll-hint">EL MODERADOR ES EL ÚNICO QUE PUEDE CERRAR LA SUBASTA ANTES DE LA HORA. TAMBIÉN PUEDE OFERTAR; SI LO HACE, SOLO CIERRA CUANDO TODOS ESTÉN LISTOS. SIN CIERRE, DURA 24 HORAS (NUNCA MÁS QUE EL MERCADO).</p>
    <button className="action-button positive" disabled={open.loading || !playerId || !moderatorId}>ABRIR SUBASTA</button>
    <FormFeedback mutation={open}/>
  </form>;
}

export function SealedAuctionsSection({ revision, onChanged, teams = [] }) {
  const { isAdmin } = useAuth();
  const auctions = useApiQuery(signal => endpoints.sealedAuctions({ active: 1 }, signal), [revision]);
  const now = useNow();
  const rows = Array.isArray(auctions.data) ? auctions.data : [];
  useEffect(() => { if (rows[0]?.serverNow) syncServerTime(rows[0].serverNow); }, [auctions.data]);
  // Al entrar a una subasta abierta, la sala queda encuadrada en la pantalla (sin tener que bajar).
  const firstOpenId = rows.find(row => row.status === 'open')?.id ?? null;
  useEffect(() => {
    if (!firstOpenId) return;
    const node = document.querySelector('.sealed-card.stage');
    // Debajo del encabezado del sitio y de las pestañas (las dos quedan fijas arriba).
    const tabs = document.querySelector('.market-tabs');
    const offset = (tabs ? tabs.getBoundingClientRect().height : 60) + 71 + 10;
    const top = node ? node.getBoundingClientRect().top + window.scrollY - offset : null;
    if (top != null && window.scrollY < top - 40) window.scrollTo({ top, behavior: 'smooth' });
  }, [firstOpenId]);
  const refresh = () => { auctions.retry(); onChanged?.(); };
  const unavailable = auctions.error?.status === 404;
  if (unavailable) {
    return <section className="market-section market-sealed"><header><h2>SUBASTAS</h2><p>SUBASTAS PRÓXIMAMENTE.</p></header></section>;
  }
  const openRows = rows.filter(row => row.status === 'open' || isRevealing(row, now));
  const emptyLine = !auctions.error && !auctions.loading && !rows.length;
  // Revelación en vivo: el servidor fija la hora; la página la abre sola poco antes para todos a la vez.
  const reveal = useReveal();
  useEffect(() => {
    if (reveal) return;
    const due = rows.find(row => isRevealing(row, now) && now >= Date.parse(row.revealAt) - AUTO_OPEN_BEFORE_MS && !revealStore.dismissed.has(row.id));
    if (due) setReveal({ auction: due, startAt: Date.parse(due.revealAt) });
  }, [rows, now, reveal]);
  // Cerca de la hora se refresca seguido para no perderse el inicio.
  const soon = rows.some(row => isRevealing(row, now));
  useAutoRefresh(auctions.retry, soon ? 4000 : 15000);
  return <section className={`market-section market-sealed ${emptyLine ? 'is-empty' : ''}`}>
    <header>
      <h2>SUBASTAS <small>{openRows.length}</small></h2>
      {emptyLine
        ? <p>NO HAY SUBASTAS ABIERTAS. LAS TERMINADAS ESTÁN EN EL HISTORIAL.</p>
        : <p>AL CIERRE EL JUGADOR ELIGE EL CLUB QUE MEJOR LE CALZA: NO SOLO GANA EL QUE MÁS PAGA.</p>}
    </header>
    {isAdmin && <details className="sealed-admin"><summary>ABRIR UNA SUBASTA</summary><OpenAuctionForm onChanged={refresh}/></details>}
    {auctions.loading && auctions.data === null && <div className="sealed-skeleton" aria-hidden="true"><i/><i/><i/></div>}
    {auctions.error && <DataState query={auctions}/>}
    <div className="poll-list sealed-list">{rows.map(auction => <AuctionCard key={auction.id} auction={auction} now={now} onChanged={refresh} teams={teams}/>)}</div>
    {reveal && <AuctionReveal key={reveal.auction.id} auction={reveal.auction} startAt={reveal.startAt} teams={teams}
      onClose={() => { revealStore.dismissed.add(reveal.auction.id); setReveal(null); onChanged?.(); }}/>}
  </section>;
}
