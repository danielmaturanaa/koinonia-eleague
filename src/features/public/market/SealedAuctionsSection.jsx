import { useEffect, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { FormFeedback } from '../../admin/FormFeedback.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { DataState, formatDate, gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { PlayerChat } from './PlayerChat.jsx';
import { PlayerPicker } from './PlayerPicker.jsx';
import { ReadyControl } from './ReadyControl.jsx';
import { useAutoRefresh } from './PollsSection.jsx';

const STATUS_LABEL = { open: 'ABIERTA', resolved: 'FIRMADO', no_sale: 'SIN VENTA', cancelled: 'CANCELADA' };

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), ms);
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

function BidPanel({ auction, onChanged, teams = [], clubs: allowedClubs = null }) {
  const { isAdmin, user, teamId } = useAuth();
  const teamIds = user?.teamIds ?? [];
  const clubs = allowedClubs ?? (isAdmin && !teamIds.length ? [] : teamIds);
  const [chosen, setChosen] = useState(clubs.includes(teamId) ? teamId : clubs[0] ?? '');
  const mine = auction.myBids.find(bid => bid.teamId === chosen) ?? null;
  const minimum = Math.max(auction.minBid, mine ? mine.amount + 1 : 0);
  const [amount, setAmount] = useState(String(minimum));
  // Con oferta registrada el formulario se esconde; vuelve solo si quiere subirla.
  const [raising, setRaising] = useState(false);
  const bid = useApiMutation((body, signal) => endpoints.sealedAuctionAction(auction.id, 'bids', body, signal), { onSuccess: () => { setRaising(false); onChanged(); } });
  useEffect(() => { setAmount(String(minimum)); }, [minimum]);
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
        <button type="button" className="link-button" onClick={() => setRaising(true)}>SUBIR</button>
      </div>
      {mine.outbid && <p className="poll-confirm warn">⚠️ HAY UNA OFERTA MÁS FUERTE QUE LA TUYA.</p>}
      <ReadyControl auction={auction} teamId={chosen} onChanged={onChanged}/>
    </div>;
  }
  const tooLow = Number(amount) < minimum;
  const tooHigh = auction.maxBid != null && Number(amount) > auction.maxBid;
  return <form className="poll-auction-form sealed-bid" onSubmit={submit}>
    {selector}
    <label>{mine ? 'SUBIR MI OFERTA (GP)' : 'MI OFERTA (GP)'}
      <input type="number" min={minimum} max={auction.maxBid ?? undefined} step="1" required value={amount} onChange={event => setAmount(event.target.value)}/>
    </label>
    <p className="poll-hint sealed-bid-help">
      ENTRE <b>{gp(minimum)}</b>{auction.maxBid != null ? <> Y <b>{gp(auction.maxBid)}</b></> : null} · 🔒 SECRETA: NADIE VE TU MONTO, SE RETIENE Y SE DEVUELVE SI NO GANAS.
    </p>
    <div className="mini-actions">
      <button type="submit" disabled={bid.loading || tooLow || tooHigh}>{mine ? 'CONFIRMAR NUEVA OFERTA' : 'OFERTAR'}</button>
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
function Participation({ rows, isModerator }) {
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
    <ul aria-label="ESTADO DE CADA CLUB">
      {rows.map(row => {
        const [label, tone] = STATE_LABEL[row.state] ?? [String(row.state).toUpperCase(), 'pendiente'];
        const name = String(row.name).toUpperCase();
        return <li key={row.teamId} className={`state-${tone}`} aria-label={`${name}: ${label ?? 'PENDIENTE'}`}>
          <i className="sealed-dot" aria-hidden="true"/><span>{name}</span>{label && <small>{label}</small>}
        </li>;
      })}
    </ul>
  </div>;
}

/** Tu estado de un vistazo: oferta, listo y temperatura. */
function YourState({ auction, clubs, teams, heat }) {
  const ready = new Set(auction.myReadyTeamIds ?? []);
  return <div className="sealed-yours" aria-label="TU ESTADO">
    {clubs.map(id => {
      const bid = auction.myBids.find(item => item.teamId === id);
      return <div className="sealed-yours-row" key={id}>
        {clubs.length > 1 && <b>{clubLabel(teams, id)}</b>}
        <span className={bid ? 'ok' : 'wait'}>{bid ? `TU OFERTA ${gp(bid.amount)}` : 'SIN OFERTA TODAVÍA'}</span>
        <span className={ready.has(id) ? 'ok' : 'wait'}>{ready.has(id) ? '🏁 LISTO' : 'NO LISTO'}</span>
        {clubs.indexOf(id) === 0 && heat && <span className="heat">🌡 {heat.temperature}° {String(heat.label).toUpperCase()}</span>}
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
    <p className="poll-hint"><b>ERES EL MODERADOR:</b> SOLO TÚ PUEDES CERRAR O CANCELAR ANTES DE LA HORA.</p>
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
  const isModerator = Boolean(auction.moderator?.isMe);
  const canPlay = open && playingClubs.length > 0;
  const closing = open && Date.parse(auction.closesAt) - now < 5 * 60 * 1000;
  const [heat, setHeat] = useState(null);
  const moderator = auction.moderator;
  return <article className={`poll-card sealed-card status-${auction.status}`}>
    <header className="sealed-head">
      <PlayerFace src={auction.player.faceUrl} name={auction.player.name}/>
      <div className="sealed-title">
        <b>{auction.player.name}</b>
        <small>{auction.player.position} · VALE {gp(auction.player.gpValue)}</small>
        {moderator && <small className="sealed-moderator">⚖️ MODERA <b>{moderator.name.toUpperCase()}</b>{moderator.teamName ? ` (${moderator.teamName.toUpperCase()})` : ''}{isModerator ? ' · ERES TÚ' : ''}</small>}
      </div>
      {open
        ? <div className={`sealed-clock ${closing ? 'closing' : ''}`}>
          <b>{countdown(auction.closesAt, now)}</b>
          <small>CIERRA {formatDate(auction.closesAt).toUpperCase()}{auction.extensions ? ` · EXTENDIDA ${auction.extensions}×` : ''}</small>
        </div>
        : <span className="poll-status">{STATUS_LABEL[auction.status] ?? auction.status.toUpperCase()}</span>}
    </header>
    {open && closing && <p className="poll-hint warn">QUEDAN MENOS DE 5 MINUTOS: UNA OFERTA NUEVA EXTIENDE EL RELOJ.</p>}
    {canPlay && <YourState auction={auction} clubs={playingClubs} teams={teams} heat={heat}/>}

    {open && <div className={`sealed-body ${canPlay ? 'with-chat' : ''}`}>
      <div className="sealed-side">
        <Participation rows={auction.participation} isModerator={isModerator}/>
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

    {!open && auction.winner && <p className="poll-confirm sealed-result"><b>🚨 {auction.player.name.toUpperCase()} FIRMA POR {auction.winner.name.toUpperCase()} · {gp(auction.winner.amount)}</b></p>}
    {!open && !auction.winner && auction.status === 'no_sale' && <p className="poll-hint">🤷 NADIE CONVENCIÓ AL JUGADOR: SIGUE LIBRE.</p>}
    {auction.status === 'cancelled' && <p className="poll-hint">SUBASTA CANCELADA: SE DEVOLVIÓ TODA LA PLATA RETENIDA.</p>}
    {!open && auction.status !== 'cancelled' && <p className="poll-hint">LAS RAZONES DE LA DECISIÓN SALEN EN LA NOTICIA DEL FICHAJE.</p>}
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
    <p className="poll-hint sealed-bounds"><b>OFERTA MÍNIMA 0,5× Y MÁXIMA 1,5× EL VALOR DEL JUGADOR.</b></p>
    <label>CIERRE (OPCIONAL)<input type="datetime-local" value={closesAt} onChange={event => setClosesAt(event.target.value)}/></label>
    <p className="poll-hint">EL MODERADOR ES EL ÚNICO QUE PUEDE CERRAR LA SUBASTA ANTES DE LA HORA. TAMBIÉN PUEDE OFERTAR; SI LO HACE, SOLO CIERRA CUANDO TODOS ESTÉN LISTOS. SIN CIERRE, DURA 24 HORAS (NUNCA MÁS QUE EL MERCADO).</p>
    <button className="action-button positive" disabled={open.loading || !playerId || !moderatorId}>ABRIR SUBASTA</button>
    <FormFeedback mutation={open}/>
  </form>;
}

export function SealedAuctionsSection({ revision, onChanged, teams = [] }) {
  const { isAdmin } = useAuth();
  const auctions = useApiQuery(signal => endpoints.sealedAuctions({ active: 1 }, signal), [revision]);
  useAutoRefresh(auctions.retry, 15000);
  const now = useNow();
  const rows = Array.isArray(auctions.data) ? auctions.data : [];
  const refresh = () => { auctions.retry(); onChanged?.(); };
  const unavailable = auctions.error?.status === 404;
  if (unavailable) {
    return <section className="market-section market-sealed"><header><h2>SUBASTAS</h2><p>SUBASTAS PRÓXIMAMENTE.</p></header></section>;
  }
  const openRows = rows.filter(row => row.status === 'open');
  const emptyLine = !auctions.error && !auctions.loading && !rows.length;
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
  </section>;
}
