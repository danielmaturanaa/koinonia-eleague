import { useEffect, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { FormFeedback } from '../../admin/FormFeedback.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { DataState, formatDate, gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { PlayerChat } from './PlayerChat.jsx';
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

function BidPanel({ auction, onChanged, teams = [] }) {
  const { isAdmin, user, teamId } = useAuth();
  const teamIds = user?.teamIds ?? [];
  const clubs = isAdmin && !teamIds.length ? [] : teamIds;
  const [chosen, setChosen] = useState(teamId ?? clubs[0] ?? '');
  const mine = auction.myBids.find(bid => bid.teamId === chosen) ?? null;
  const minimum = Math.max(auction.minBid, mine ? mine.amount + 1 : 0);
  const [amount, setAmount] = useState(String(minimum));
  const bid = useApiMutation((body, signal) => endpoints.sealedAuctionAction(auction.id, 'bids', body, signal), { onSuccess: onChanged });
  const withdraw = useApiMutation((body, signal) => endpoints.sealedAuctionAction(auction.id, 'bids/withdraw', body, signal), { onSuccess: onChanged });
  useEffect(() => { setAmount(String(minimum)); }, [minimum]);
  if (!chosen && !isAdmin) return null;
  if (!chosen) return <p className="poll-hint">PARA OFERTAR NECESITAS UN CLUB VINCULADO.</p>;
  const submit = event => {
    event.preventDefault();
    bid.execute({ teamId: chosen, amount: Number(amount) });
  };
  return <form className="poll-auction-form sealed-bid" onSubmit={submit}>
    {clubs.length > 1 && <label>CLUB<select value={chosen} onChange={event => setChosen(event.target.value)}>
      {clubs.map(id => <option key={id} value={id}>{(teams.find(team => team.id === id)?.name ?? id).toUpperCase()}</option>)}
    </select></label>}
    <label>{mine ? 'SUBIR MI OFERTA (GP)' : 'MI OFERTA (GP)'}
      <input type="number" min={minimum} max={auction.maxBid ?? undefined} step="1" required value={amount} onChange={event => setAmount(event.target.value)}/>
    </label>
    {auction.maxBid != null && <p className="poll-hint"><b>MÍNIMA {gp(minimum)} · MÁXIMA {gp(auction.maxBid)}</b> (1,5 VECES EL VALOR DEL JUGADOR).</p>}
    <p className="poll-hint">LA OFERTA ES SECRETA. LA PLATA QUEDA RETENIDA EN TU SALDO HASTA EL CIERRE Y LA PUEDES RETIRAR ANTES. SI GANAS, PAGAS TU OFERTA; SI NO, TE LA DEVUELVEN ENTERA.</p>
    <div className="mini-actions">
      <button type="submit" disabled={bid.loading || Number(amount) < minimum || (auction.maxBid != null && Number(amount) > auction.maxBid)}>{mine ? 'SUBIR OFERTA' : 'OFERTAR'}</button>
      {mine && <button type="button" className="danger" disabled={withdraw.loading} onClick={() => { if (window.confirm('¿RETIRARTE DE ESTA SUBASTA? RECUPERAS TU SALDO RETENIDO.')) withdraw.execute({ teamId: chosen }); }}>RETIRARSE DE LA SUBASTA</button>}
    </div>
    {mine && <p className="poll-hint">SI TE RETIRAS RECUPERAS TU SALDO RETENIDO Y SALES DE ESTA SUBASTA.</p>}
    <FormFeedback mutation={bid}/>
    <FormFeedback mutation={withdraw}/>
  </form>;
}

/** Solo el presi moderador ve este botón: el servidor también rechaza a cualquier otro. */
function ModeratorActions({ auction, onChanged }) {
  const act = useApiMutation((action, signal) => endpoints.sealedAuctionAction(auction.id, action, {}, signal), { onSuccess: onChanged });
  return <div className="sealed-moderator-actions">
    <p className="poll-hint">ERES EL MODERADOR: SOLO TÚ PUEDES CERRAR O CANCELAR LA SUBASTA ANTES DE LA HORA. SI LA CIERRAS, EL JUGADOR ELEGIRÁ CON LAS OFERTAS ACTUALES.</p>
    <div className="mini-actions">
      {auction.canResolve && <button disabled={act.loading} onClick={() => { if (window.confirm(`¿RESOLVER AHORA LA SUBASTA DE ${auction.player.name}? EL JUGADOR FIRMARÁ CON EL CLUB QUE MEJOR LE CALCE.`)) act.execute('resolve'); }}>RESOLVER AHORA</button>}
      {auction.canCancel && <button className="danger" disabled={act.loading} onClick={() => { if (window.confirm(`¿CANCELAR LA SUBASTA DE ${auction.player.name}? SE DEVUELVE TODA LA PLATA RETENIDA Y EL JUGADOR SIGUE LIBRE.`)) act.execute('cancel'); }}>CANCELAR SUBASTA</button>}
    </div>
    <FormFeedback mutation={act}/>
  </div>;
}

function AuctionCard({ auction, now, onChanged, teams = [] }) {
  const { isAdmin, user } = useAuth();
  const open = auction.status === 'open';
  const outbid = auction.myBids.some(bid => bid.outbid);
  const isPresident = Boolean(user?.teamIds?.length) || isAdmin;
  const isModerator = Boolean(auction.moderator?.isMe);
  const closing = open && Date.parse(auction.closesAt) - now < 5 * 60 * 1000;
  return <article className={`poll-card sealed-card status-${auction.status}`}>
    <header>
      <PlayerFace src={auction.player.faceUrl} name={auction.player.name}/>
      <div>
        <b>{auction.player.name}</b>
        <small>{auction.player.position} · VALE {gp(auction.player.gpValue)} · OFERTA MÍNIMA {gp(auction.minBid)}{auction.maxBid != null ? ` · MÁXIMA ${gp(auction.maxBid)}` : ''}</small>
      </div>
      <span className="poll-status">{STATUS_LABEL[auction.status] ?? auction.status.toUpperCase()}</span>
    </header>

    {open && <div className={`sealed-clock ${closing ? 'closing' : ''}`}>
      <b>{countdown(auction.closesAt, now)}</b>
      <small>CIERRA {formatDate(auction.closesAt).toUpperCase()}{auction.extensions ? ` · EXTENDIDA ${auction.extensions} ${auction.extensions === 1 ? 'VEZ' : 'VECES'}` : ''}</small>
    </div>}
    {auction.moderator && <p className="poll-meta sealed-moderator">⚖️ MODERADOR: <b>{auction.moderator.name.toUpperCase()}</b>{auction.moderator.teamName ? ` (${auction.moderator.teamName.toUpperCase()})` : ''}</p>}
    {open && closing && <p className="poll-hint">QUEDAN MENOS DE 5 MINUTOS: UNA OFERTA NUEVA EXTIENDE EL RELOJ.</p>}
    {open && <p className="poll-meta">{auction.bidCount} {auction.bidCount === 1 ? 'OFERTA' : 'OFERTAS'} · NADIE VE CUÁNTO PUSO EL OTRO</p>}

    {open && auction.myBids.map(bid => <div key={bid.teamId} className={`sealed-mine ${bid.outbid ? 'outbid' : ''}`}>
      <b>TU OFERTA: {gp(bid.amount)}</b>
      {bid.outbid && <span>⚠️ HAY UNA OFERTA MÁS FUERTE</span>}
    </div>)}

    {open && isModerator && <p className="poll-confirm">ERES EL MODERADOR DE ESTA SUBASTA: NO PUEDES OFERTAR, SOLO CERRARLA.</p>}
    {open && isPresident && !isModerator && <BidPanel auction={auction} onChanged={onChanged} teams={teams}/>}
    {open && isPresident && !isModerator && <PlayerChat auction={auction} teams={teams}/>}
    {open && !isPresident && <p className="poll-hint">SOLO LOS PRESIDENTES CON CLUB PUEDEN OFERTAR.</p>}
    {open && (auction.canResolve || auction.canCancel) && <ModeratorActions auction={auction} onChanged={onChanged}/>}

    {!open && auction.winner && <p className="poll-confirm sealed-result"><b>🚨 {auction.player.name.toUpperCase()} FIRMA POR {auction.winner.name.toUpperCase()} · {gp(auction.winner.amount)}</b></p>}
    {!open && !auction.winner && auction.status === 'no_sale' && <p className="poll-hint">🤷 NADIE CONVENCIÓ AL JUGADOR: SIGUE LIBRE.</p>}
    {auction.status === 'cancelled' && <p className="poll-hint">SUBASTA CANCELADA: SE DEVOLVIÓ TODA LA PLATA RETENIDA.</p>}
    {!open && auction.status !== 'cancelled' && <p className="poll-hint">LAS RAZONES DE LA DECISIÓN SALEN EN LA NOTICIA DEL FICHAJE.</p>}
  </article>;
}

function OpenAuctionForm({ onChanged }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [minBid, setMinBid] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [moderatorId, setModeratorId] = useState('');
  const presidents = useApiQuery(signal => endpoints.presidents({}, signal), []);
  const moderators = (Array.isArray(presidents.data) ? presidents.data : []).filter(item => item.discordUserId && item.teamId);
  const players = useApiQuery(signal => endpoints.playerDirectory({ status: 'free', sort: 'price_desc', pageSize: 30, q: search }, signal), [search]);
  const rows = (Array.isArray(players.data) ? players.data : []).filter(player => player.playerId);
  const open = useApiMutation((body, signal) => endpoints.openSealedAuction(body, signal), { onSuccess: () => { setPlayerId(''); setMinBid(''); setClosesAt(''); setModeratorId(''); onChanged(); } });
  const submit = event => {
    event.preventDefault();
    open.execute({
      playerId,
      moderatorPresidentId: moderatorId,
      ...(minBid !== '' ? { minBid: Number(minBid) } : {}),
      ...(closesAt ? { closesAt: new Date(closesAt).toISOString() } : {}),
    });
  };
  return <form className="admin-form market-form sealed-open" onSubmit={submit}>
    <label>BUSCAR AGENTE LIBRE
      <span className="sealed-search"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="NOMBRE"/>
        <button type="button" className="action-button" onClick={() => setSearch(query.trim())}>BUSCAR</button></span>
    </label>
    <label>JUGADOR<select required value={playerId} onChange={event => setPlayerId(event.target.value)}>
      <option value="">SELECCIONAR</option>
      {rows.map(player => <option key={player.playerId} value={player.playerId}>{player.name} · {player.position} · {gp(player.price)}</option>)}
    </select></label>
    <label>PRESI MODERADOR
      <select required value={moderatorId} onChange={event => setModeratorId(event.target.value)}>
        <option value="">SELECCIONAR</option>
        {moderators.map(item => <option key={item.id} value={item.id}>{item.name.toUpperCase()} · {(item.teamName ?? '').toUpperCase()}</option>)}
      </select>
    </label>
    <label>OFERTA MÍNIMA (OPCIONAL)<input type="number" min="0" step="1" value={minBid} onChange={event => setMinBid(event.target.value)} placeholder="SU VALOR"/></label>
    <label>CIERRE (OPCIONAL)<input type="datetime-local" value={closesAt} onChange={event => setClosesAt(event.target.value)}/></label>
    <p className="poll-hint">EL MODERADOR ES EL ÚNICO QUE PUEDE CERRAR LA SUBASTA ANTES DE LA HORA, Y SU CLUB NO PUEDE OFERTAR. ELIGE A ALGUIEN QUE NO ESTÉ INTERESADO EN EL JUGADOR.</p>
    <p className="poll-hint">SI NO PONES CIERRE, DURA 24 HORAS. NUNCA PASA DEL CIERRE DEL MERCADO. EL JUGADOR NO DEBE TENER UNA ENCUESTA ABIERTA.</p>
    <button className="action-button positive" disabled={open.loading || !playerId || !moderatorId}>ABRIR SUBASTA</button>
    <FormFeedback mutation={open}/>
  </form>;
}

export function SealedAuctionsSection({ revision, onChanged, teams = [] }) {
  const { isAdmin } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const auctions = useApiQuery(signal => endpoints.sealedAuctions(showAll ? {} : { active: 1 }, signal), [revision, showAll]);
  useAutoRefresh(auctions.retry, 15000);
  const now = useNow();
  const rows = Array.isArray(auctions.data) ? auctions.data : [];
  const refresh = () => { auctions.retry(); onChanged?.(); };
  const unavailable = auctions.error?.status === 404;
  if (unavailable) {
    return <section className="market-section market-sealed"><header><h2>SUBASTAS</h2><p>SUBASTAS PRÓXIMAMENTE.</p></header></section>;
  }
  return <section className="market-section market-sealed">
    <header>
      <h2>SUBASTAS <small>{rows.filter(row => row.status === 'open').length}</small></h2>
      <p>OFERTAS SELLADAS: NADIE VE LO QUE PONE EL OTRO Y LA PLATA QUEDA RETENIDA. AL CIERRE, EL JUGADOR ELIGE EL CLUB QUE MEJOR LE CALZA: NO SOLO GANA EL QUE MÁS PAGA.</p>
    </header>
    {isAdmin && <details className="sealed-admin"><summary>ABRIR UNA SUBASTA</summary><OpenAuctionForm onChanged={refresh}/></details>}
    <label className="sealed-toggle"><input type="checkbox" checked={showAll} onChange={event => setShowAll(event.target.checked)}/> VER TAMBIÉN LAS TERMINADAS</label>
    {auctions.loading && auctions.data === null && <div className="arcade-state compact">CARGANDO SUBASTAS...</div>}
    {auctions.error && <DataState query={auctions}/>}
    {!auctions.error && !auctions.loading && !rows.length && <p className="empty-copy">NO HAY SUBASTAS {showAll ? 'REGISTRADAS' : 'ABIERTAS'} POR AHORA.</p>}
    <div className="poll-list sealed-list">{rows.map(auction => <AuctionCard key={auction.id} auction={auction} now={now} onChanged={refresh} teams={teams}/>)}</div>
  </section>;
}
