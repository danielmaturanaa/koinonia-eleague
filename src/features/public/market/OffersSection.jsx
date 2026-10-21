import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { DataState, gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { useAutoRefresh } from './PollsSection.jsx';
import { GpInput } from '../../../components/GpInput.jsx';

const RELEASE_SHARE = 0.2;
// La misma banda que valida el servidor: todo precio queda entre 0,7× y 1,25× el valor del jugador.
const PRICE_MIN = 0.7;
const PRICE_MAX = 1.25;
const priceBand = value => ({ min: Math.ceil(value * PRICE_MIN - 1e-9), max: Math.floor(value * PRICE_MAX + 1e-9) });
const asList = value => Array.isArray(value) ? value : [];
const teamLabel = team => team ? `${team.emoji ?? '⚽'} ${team.name}` : 'CLUB';
const upper = text => String(text ?? '').toUpperCase();

/** Qué falla del precio (o null si está bien). */
function bandProblem(player, price) {
  if (!player || !Number.isFinite(price)) return null;
  const { min, max } = priceBand(player.gpValue ?? 0);
  if (price < min) return `${upper(player.name)} NO PUEDE SALIR POR MENOS DE ${gp(min)} (0,7× SU VALOR).`;
  if (price > max) return `${upper(player.name)} NO PUEDE SALIR POR MÁS DE ${gp(max)} (1,25× SU VALOR).`;
  return null;
}

/** Trueque: se valida el precio implícito del jugador que se revaloriza, igual que en el servidor. */
function tradeProblem(offered, requested, gpFrom, gpTo) {
  if (!offered || !requested) return null;
  const net = gpFrom - gpTo;
  if (net > 0 || (net === 0 && (requested.gpValue ?? 0) >= (offered.gpValue ?? 0))) return bandProblem(requested, (offered.gpValue ?? 0) + net);
  return bandProblem(offered, (requested.gpValue ?? 0) - net);
}

function PlayerChip({ player, note }) {
  if (!player) return <span className="offer-player">JUGADOR</span>;
  return <span className="offer-player">
    <PlayerFace src={player.faceUrl} name={player.name}/>
    <span><b>{player.name}</b><small>{player.position} · VALE {gp(player.gpValue)}{note ? ` · ${note}` : ''}</small></span>
  </span>;
}

/** Responder con otra oferta: otro precio, GP de más o pidiendo a un jugador del que ofreció. La original queda rechazada. */
function CounterForm({ offer, me, other, onDone, onCancel }) {
  const isTrade = offer.kind === 'trade';
  const iAmSeller = !isTrade && me?.id === offer.fromTeam?.id;
  const theirSquad = useSquad(other?.id);
  const [price, setPrice] = useState(isTrade ? 0 : offer.gpAmount ?? 0);
  const [ask, setAsk] = useState(isTrade ? offer.fromPlayer?.id ?? '' : '');
  const [myGp, setMyGp] = useState(0);
  const [theirGp, setTheirGp] = useState(0);
  const asking = isTrade || (iAmSeller && ask);
  const given = isTrade ? offer.toPlayer : offer.player;
  const wanted = theirSquad.squad.find(player => player.id === ask);
  const problem = asking ? tradeProblem(given, wanted, Number(myGp) || 0, Number(theirGp) || 0) : bandProblem(offer.player, Number(price));
  const counter = useApiMutation((body, signal) => (isTrade ? endpoints.counterTrade(offer.id, body, signal) : endpoints.counterTransfer(offer.id, body, signal)), { onSuccess: onDone });
  const send = () => counter.execute(asking ? { askPlayerId: ask, gpFrom: Number(myGp) || 0, gpTo: Number(theirGp) || 0 } : { gpAmount: Number(price) });
  return <div className="offer-counter" role="group" aria-label="CONTRAOFERTA">
    <b>🔁 CONTRAOFERTA</b>
    {!asking && <label>PRECIO QUE PROPONES<GpInput value={price} onChange={event => setPrice(event.target.value)} aria-label="Precio de la contraoferta"/></label>}
    {(isTrade || iAmSeller) && <label>{isTrade ? 'JUGADOR QUE PIDES' : 'PEDIR UN JUGADOR A CAMBIO (OPCIONAL)'}
      <select value={ask} onChange={event => setAsk(event.target.value)}>{isTrade ? null : <option value="">NO, SOLO PLATA</option>}{asList(theirSquad.squad).map(player => <option key={player.id} value={player.id}>{player.name} · {player.position} · {gp(player.gpValue)}</option>)}</select>
    </label>}
    {asking && <div className="offer-counter-gp">
      <label>GP QUE PONES TÚ<GpInput value={myGp} onChange={event => setMyGp(event.target.value)} aria-label="GP que pones"/></label>
      <label>GP QUE PONE {upper(other?.name)}<GpInput value={theirGp} onChange={event => setTheirGp(event.target.value)} aria-label="GP que pone el otro club"/></label>
    </div>}
    {problem && <p className="form-feedback error" role="alert">{problem}</p>}
    <div className="mini-actions">
      <button type="button" disabled={counter.loading || Boolean(problem) || (isTrade && !ask)} onClick={send}>{counter.loading ? 'ENVIANDO…' : 'ENVIAR CONTRAOFERTA'}</button>
      <button type="button" className="ghost" disabled={counter.loading} onClick={onCancel}>VOLVER</button>
    </div>
    {counter.error && <p className="form-feedback error" role="alert">{counter.error.message}</p>}
  </div>;
}

function OfferCard({ offer, onChanged, highlighted = false }) {
  const { isAdmin } = useAuth();
  const card = useRef(null);
  useEffect(() => { if (highlighted) card.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [highlighted]);
  const kind = offer.kind === 'trade' ? 'Trade' : 'Transfer';
  const mutation = useApiMutation((operation, signal) => endpoints[`${operation}${kind}`](offer.id, signal), { onSuccess: onChanged });
  const [confirming, setConfirming] = useState('');
  const [countering, setCountering] = useState(false);
  const incoming = offer.direction === 'incoming';
  const outgoing = offer.direction === 'outgoing';
  const counterpart = offer.proposerTeamId === offer.fromTeam?.id ? offer.toTeam : offer.fromTeam;
  const proposer = offer.proposerTeamId === offer.fromTeam?.id ? offer.fromTeam : offer.toTeam;
  // Acepta la contraparte; un admin puede hacerlo en su nombre. Quien la lanzó solo puede retirarla.
  const canAccept = offer.canAccept && !outgoing;
  const acceptLabel = incoming ? 'ACEPTAR' : `ACEPTAR POR ${upper(counterpart?.name)}`;
  const rejectLabel = incoming ? 'RECHAZAR' : outgoing ? 'RETIRAR OFERTA' : 'ANULAR';
  const canReject = incoming ? offer.canReject : outgoing ? offer.canWithdraw : isAdmin;
  const ask = { approve: incoming ? '¿ACEPTAS? SE MUEVEN LOS JUGADORES Y LOS GP AL TIRO.' : `¿ACEPTAR EN NOMBRE DE ${upper(counterpart?.name)}?`,
    reject: incoming ? '¿RECHAZAS ESTA OFERTA?' : outgoing ? '¿RETIRAS TU OFERTA?' : '¿ANULAR ESTA OFERTA?' };

  return <article ref={card} className={`offer-card ${incoming ? 'is-incoming' : ''} ${highlighted ? 'is-highlighted' : ''}`}>
    <header>
      <span className="offer-kind">{offer.kind === 'trade' ? '🔁 TRUEQUE' : '🤝 TRASPASO'}</span>
      <small>LA LANZÓ {upper(teamLabel(proposer))}</small>
    </header>
    {offer.kind === 'trade'
      ? <div className="offer-sides">
        <div><small>{upper(teamLabel(offer.fromTeam))} ENTREGA</small><PlayerChip player={offer.fromPlayer}/>{offer.gpFrom ? <b className="offer-gp">+ {gp(offer.gpFrom)}</b> : null}</div>
        <span className="offer-swap" aria-hidden="true">⇄</span>
        <div><small>{upper(teamLabel(offer.toTeam))} ENTREGA</small><PlayerChip player={offer.toPlayer}/>{offer.gpTo ? <b className="offer-gp">+ {gp(offer.gpTo)}</b> : null}</div>
      </div>
      : <div className="offer-sides">
        <div><small>{upper(teamLabel(offer.fromTeam))} VENDE</small><PlayerChip player={offer.player}/></div>
        <span className="offer-swap" aria-hidden="true">→</span>
        <div><small>{upper(teamLabel(offer.toTeam))} PAGA</small><b className="offer-price">{gp(offer.gpAmount)}</b></div>
      </div>}
    {offer.contractTerms && <p className="offer-terms">📄 CONTRATO ACORDADO CON EL JUGADOR: {offer.kind === 'trade'
      ? [offer.contractTerms.fromPlayer && `${upper(offer.fromPlayer?.name)} → ${offer.contractTerms.fromPlayer.seasons} TORNEOS, +${offer.contractTerms.fromPlayer.raisePercent}%`, offer.contractTerms.toPlayer && `${upper(offer.toPlayer?.name)} → ${offer.contractTerms.toPlayer.seasons} TORNEOS, +${offer.contractTerms.toPlayer.raisePercent}%`].filter(Boolean).join(' · ')
      : `${offer.contractTerms.seasons} TORNEOS, +${offer.contractTerms.raisePercent}% DE AUMENTO`}.</p>}
    <p className="offer-status">{incoming ? '👉 TE TOCA RESPONDER. TAMBIÉN PUEDES HACERLO DESDE DISCORD.' : `⏳ ESPERANDO A ${upper(teamLabel(counterpart))}.`}</p>
    {confirming
      ? <div className="offer-confirm" role="group" aria-label="CONFIRMAR">
        <span>{ask[confirming]}</span>
        <div className="mini-actions">
          <button type="button" className={confirming === 'reject' ? 'danger' : ''} disabled={mutation.loading} onClick={() => mutation.execute(confirming)}>SÍ</button>
          <button type="button" className="ghost" disabled={mutation.loading} onClick={() => setConfirming('')}>VOLVER</button>
        </div>
      </div>
      : countering ? <CounterForm offer={offer} me={counterpart} other={proposer} onDone={() => { setCountering(false); onChanged?.(); }} onCancel={() => setCountering(false)}/>
      : (canAccept || canReject) && <div className="mini-actions">
        {canAccept && <button type="button" onClick={() => setConfirming('approve')}>{acceptLabel}</button>}
        {canAccept && <button type="button" className="ghost" onClick={() => setCountering(true)}>{incoming ? 'CONTRAOFERTAR' : `CONTRAOFERTAR POR ${upper(counterpart?.name)}`}</button>}
        {canReject && <button type="button" className="danger" onClick={() => setConfirming('reject')}>{rejectLabel}</button>}
      </div>}
    {mutation.error && <p className="form-feedback error" role="alert">{mutation.error.message}</p>}
  </article>;
}

export function OffersInbox({ revision, onChanged, highlightId = null }) {
  const offers = useApiQuery(signal => endpoints.marketOffers(signal), [revision]);
  useAutoRefresh(offers.retry, 15000);
  const rows = asList(offers.data);
  const unavailable = offers.error?.status === 404;
  const groups = [
    ['incoming', '👉 TE TOCA RESPONDER'],
    ['outgoing', '⏳ TUS OFERTAS, ESPERANDO RESPUESTA'],
    ['other', '🛡️ OTRAS OFERTAS (ADMIN)'],
  ].map(([direction, title]) => [title, rows.filter(row => row.direction === direction)]).filter(([, items]) => items.length);
  const refresh = () => { offers.retry(); onChanged?.(); };
  return <section className="market-section market-offers">
    <header><h2>OFERTAS <small>{rows.length}</small></h2><p>TRASPASOS Y TRUEQUES PENDIENTES. SON LOS MISMOS QUE EN DISCORD: RESPONDE DONDE QUIERAS.</p></header>
    {unavailable && <p className="empty-copy">LAS OFERTAS TODAVÍA NO ESTÁN DISPONIBLES EN LA API.</p>}
    {offers.error && !unavailable && <DataState query={offers}/>}
    {!offers.error && !offers.loading && !rows.length && <p className="empty-copy">NO HAY OFERTAS PENDIENTES.</p>}
    {groups.map(([title, items]) => <div className="offer-group" key={title}>
      <h3 className="market-subtitle">{title}</h3>
      <div className="offer-list">{items.map(offer => <OfferCard key={`${offer.kind}-${offer.id}`} offer={offer} onChanged={refresh} highlighted={Boolean(highlightId) && offer.id === highlightId}/>)}</div>
    </div>)}
  </section>;
}

const playerOptions = squad => <><option value="">ELEGIR JUGADOR</option>{asList(squad).map(player => <option key={player.id} value={player.id}>{player.name} · {player.position} · {gp(player.gpValue)}</option>)}</>;

function useSquad(teamId) {
  const query = useApiQuery(signal => teamId ? endpoints.teamSquad(teamId, signal) : Promise.resolve({ data: [] }), [teamId]);
  return { squad: asList(query.data), loading: query.loading };
}

/** Jugadores de un club con el contrato vencido: para fichar por otro club tienen que acordar sus condiciones. */
function useExpiredPlayers(teamId) {
  const query = useApiQuery(signal => teamId ? endpoints.teamContracts(teamId, signal).catch(() => ({ data: null })) : Promise.resolve({ data: null }), [teamId]);
  return new Set((query.data?.contracts ?? []).filter(contract => contract.status === 'expired').map(contract => contract.playerId));
}

const TERM_SEASONS = [2, 3, 4, 5, 6];
/** Lo que se le ofrece a un jugador con contrato vencido para que firme con el club que lo recibe. */
function TermsFields({ player, club, terms, onChange }) {
  return <fieldset className="contract-terms">
    <legend>📄 CONTRATO VENCIDO: {upper(player.name)} TIENE QUE ACORDAR CON {upper(club)}</legend>
    <p className="poll-hint">SI NO ACEPTA, EL SISTEMA TE DICE CUÁNTO PIDE. DESPUÉS DE FIRMAR NO SE PUEDE REVENDER HASTA QUE SE COBRE SU PRIMER TORNEO.</p>
    <div className="chips">{TERM_SEASONS.map(n => <button type="button" key={n} className={terms.seasons === n ? 'on' : ''} onClick={() => onChange({ ...terms, seasons: n })}>{n} TORNEOS</button>)}</div>
    <div className="sheet-slider"><input type="range" min="1" max="100" value={terms.raisePercent} onChange={event => onChange({ ...terms, raisePercent: Number(event.target.value) })} aria-label="Aumento de sueldo en porcentaje"/><b>+{terms.raisePercent}%</b></div>
  </fieldset>;
}
const DEFAULT_TERMS = { seasons: 3, raisePercent: 15 };

/** Lo que queda pactado, en una línea, antes de enviar. */
function Summary({ children, problem }) {
  return <div className={`offer-summary ${problem ? 'has-problem' : ''}`}>
    {problem ? <p role="alert">⚠️ {problem}</p> : <p>{children}</p>}
  </div>;
}

function Sent({ text, onAgain }) {
  return <div className="offer-sent" role="status">
    <p>✅ {text}</p>
    <button type="button" className="action-button" onClick={onAgain}>HACER OTRA OFERTA</button>
  </div>;
}

function TransferProposal({ myTeamId, rivals, onDone }) {
  const empty = { side: 'buy', otherTeamId: '', playerId: '', gpAmount: '' };
  const [form, setForm] = useState(empty);
  const [sent, setSent] = useState('');
  const buying = form.side === 'buy';
  const mySquad = useSquad(myTeamId);
  const otherSquad = useSquad(form.otherTeamId);
  const squad = buying ? otherSquad.squad : mySquad.squad;
  const player = squad.find(item => item.id === form.playerId);
  const other = rivals.find(team => team.id === form.otherTeamId);
  const price = form.gpAmount === '' ? NaN : Number(form.gpAmount);
  const band = player ? priceBand(player.gpValue ?? 0) : null;
  const problem = bandProblem(player, price);
  const expiredAtSource = useExpiredPlayers(buying ? form.otherTeamId : myTeamId);
  const needsTerms = Boolean(player && expiredAtSource.has(player.id));
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const mutation = useApiMutation((body, signal) => endpoints.createTransfer(body, signal), {
    onSuccess: () => { setSent(`OFERTA ENVIADA A ${upper(other?.name)}: LE LLEGA A SU BANDEJA Y A DISCORD. SE CONCRETA CUANDO LA ACEPTE.`); setForm(empty); onDone?.(); },
  });
  const set = (name, value) => setForm(current => ({ ...current, [name]: value,
    ...(['side', 'otherTeamId'].includes(name) ? { playerId: '', gpAmount: '' } : {}),
    // Al elegir jugador se propone su valor: después se ajusta dentro de la banda.
    ...(name === 'playerId' ? { gpAmount: String(squad.find(item => item.id === value)?.gpValue ?? '') } : {}) }));
  const ready = form.otherTeamId && player && Number.isFinite(price) && !problem;
  const submit = event => {
    event.preventDefault();
    if (!ready) return;
    mutation.execute({ playerId: form.playerId, gpAmount: price, proposerTeamId: myTeamId, ...(needsTerms ? { contractTerms: terms } : {}),
      fromTeamId: buying ? form.otherTeamId : myTeamId, toTeamId: buying ? myTeamId : form.otherTeamId });
  };
  if (sent) return <Sent text={sent} onAgain={() => { setSent(''); mutation.clear(); }}/>;
  return <form className="admin-form market-form offer-form" onSubmit={submit}>
    <div className="offer-toggle" role="radiogroup" aria-label="QUÉ QUIERES HACER">
      <button type="button" role="radio" aria-checked={buying} className={buying ? 'on' : ''} onClick={() => set('side', 'buy')}>COMPRAR</button>
      <button type="button" role="radio" aria-checked={!buying} className={!buying ? 'on' : ''} onClick={() => set('side', 'sell')}>VENDER</button>
    </div>
    <label>{buying ? 'CLUB AL QUE LE COMPRAS' : 'CLUB AL QUE LE VENDES'}<select required value={form.otherTeamId} onChange={event => set('otherTeamId', event.target.value)}><option value="">ELEGIR CLUB</option>{rivals.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    <label>{buying ? 'JUGADOR QUE QUIERES' : 'JUGADOR TUYO QUE VENDES'}<select required value={form.playerId} disabled={buying && !form.otherTeamId} onChange={event => set('playerId', event.target.value)}>{playerOptions(squad)}</select></label>
    <label>PRECIO EN GP{band ? ` · ENTRE ${gp(band.min)} Y ${gp(band.max)}` : ''}<GpInput required min={band?.min ?? 0} max={band?.max} value={form.gpAmount} disabled={!player} onChange={event => set('gpAmount', event.target.value)}/></label>
    {needsTerms && other && <TermsFields player={player} club={buying ? 'tu club' : other.name} terms={terms} onChange={setTerms}/>}
    {player && other && Number.isFinite(price) && <Summary problem={problem}>
      {buying ? `${upper(other.name)} TE VENDE A ${upper(player.name)} POR ${gp(price)}.` : `LE VENDES ${upper(player.name)} A ${upper(other.name)} POR ${gp(price)}.`} TIENE QUE ACEPTARLO SU PRESI (EN LA WEB O EN DISCORD).
    </Summary>}
    <button className="action-button positive" disabled={mutation.loading || !ready}>{mutation.loading ? 'ENVIANDO…' : 'ENVIAR OFERTA'}</button>
    {mutation.error && <p className="form-feedback error" role="alert">{mutation.error.message}</p>}
  </form>;
}

function TradeProposal({ myTeamId, rivals, onDone }) {
  const empty = { otherTeamId: '', fromPlayerId: '', toPlayerId: '', gpFrom: '', gpTo: '' };
  const [form, setForm] = useState(empty);
  const [sent, setSent] = useState('');
  const mySquad = useSquad(myTeamId);
  const otherSquad = useSquad(form.otherTeamId);
  const other = rivals.find(team => team.id === form.otherTeamId);
  const offered = mySquad.squad.find(item => item.id === form.fromPlayerId);
  const requested = otherSquad.squad.find(item => item.id === form.toPlayerId);
  const gpFrom = Number(form.gpFrom || 0);
  const gpTo = Number(form.gpTo || 0);
  const problem = tradeProblem(offered, requested, gpFrom, gpTo);
  const expiredMine = useExpiredPlayers(myTeamId);
  const expiredTheirs = useExpiredPlayers(form.otherTeamId);
  const needsOfferedTerms = Boolean(offered && expiredMine.has(offered.id));
  const needsRequestedTerms = Boolean(requested && expiredTheirs.has(requested.id));
  const [offeredTerms, setOfferedTerms] = useState(DEFAULT_TERMS);
  const [requestedTerms, setRequestedTerms] = useState(DEFAULT_TERMS);
  const mutation = useApiMutation((body, signal) => endpoints.createTrade(body, signal), {
    onSuccess: () => { setSent(`TRUEQUE ENVIADO A ${upper(other?.name)}: LE LLEGA A SU BANDEJA Y A DISCORD. SE CONCRETA CUANDO LO ACEPTE.`); setForm(empty); onDone?.(); },
  });
  const set = (name, value) => setForm(current => ({ ...current, [name]: value, ...(name === 'otherTeamId' ? { toPlayerId: '' } : {}) }));
  const ready = other && offered && requested && !problem;
  const submit = event => {
    event.preventDefault();
    if (!ready) return;
    mutation.execute({ fromTeamId: myTeamId, toTeamId: form.otherTeamId, fromPlayerId: form.fromPlayerId, toPlayerId: form.toPlayerId,
      ...(gpFrom ? { gpFrom } : {}), ...(gpTo ? { gpTo } : {}),
      ...(needsOfferedTerms || needsRequestedTerms ? { contractTerms: { ...(needsOfferedTerms ? { fromPlayer: offeredTerms } : {}), ...(needsRequestedTerms ? { toPlayer: requestedTerms } : {}) } } : {}) });
  };
  if (sent) return <Sent text={sent} onAgain={() => { setSent(''); mutation.clear(); }}/>;
  return <form className="admin-form market-form offer-form" onSubmit={submit}>
    <label>CLUB CON EL QUE TRUECAS<select required value={form.otherTeamId} onChange={event => set('otherTeamId', event.target.value)}><option value="">ELEGIR CLUB</option>{rivals.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    <label>ENTREGAS<select required value={form.fromPlayerId} onChange={event => set('fromPlayerId', event.target.value)}>{playerOptions(mySquad.squad)}</select></label>
    <label>PIDES<select required value={form.toPlayerId} disabled={!form.otherTeamId} onChange={event => set('toPlayerId', event.target.value)}>{playerOptions(otherSquad.squad)}</select></label>
    <label>GP QUE AGREGAS TÚ (OPCIONAL)<GpInput placeholder="0" value={form.gpFrom} onChange={event => set('gpFrom', event.target.value)}/></label>
    <label>GP QUE AGREGA {other ? upper(other.name) : 'EL OTRO CLUB'} (OPCIONAL)<GpInput placeholder="0" value={form.gpTo} onChange={event => set('gpTo', event.target.value)}/></label>
    {needsOfferedTerms && other && <TermsFields player={offered} club={other.name} terms={offeredTerms} onChange={setOfferedTerms}/>}
    {needsRequestedTerms && other && <TermsFields player={requested} club="tu club" terms={requestedTerms} onChange={setRequestedTerms}/>}
    {offered && requested && <Summary problem={problem}>
      ENTREGAS A {upper(offered.name)}{gpFrom ? ` + ${gp(gpFrom)}` : ''} Y RECIBES A {upper(requested.name)}{gpTo ? ` + ${gp(gpTo)}` : ''}. TIENE QUE ACEPTARLO EL PRESI DE {upper(other?.name)}.
    </Summary>}
    <button className="action-button positive" disabled={mutation.loading || !ready}>{mutation.loading ? 'ENVIANDO…' : 'ENVIAR TRUEQUE'}</button>
    {mutation.error && <p className="form-feedback error" role="alert">{mutation.error.message}</p>}
  </form>;
}

function ReleaseForm({ myTeamId, onDone }) {
  const [playerId, setPlayerId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const mySquad = useSquad(myTeamId);
  const mutation = useApiMutation((body, signal) => endpoints.releasePlayer(playerId, body, signal), { onSuccess: () => { setPlayerId(''); setConfirming(false); onDone?.(); } });
  const player = mySquad.squad.find(item => item.id === playerId);
  const refund = player ? Math.round((player.gpValue ?? 0) * RELEASE_SHARE) : null;
  return <form className="admin-form market-form offer-form" onSubmit={event => { event.preventDefault(); if (player) setConfirming(true); }}>
    <label>JUGADOR A LIBERAR<select value={playerId} required onChange={event => { setPlayerId(event.target.value); setConfirming(false); }}>{playerOptions(mySquad.squad)}</select></label>
    <p className="poll-hint">AL LIBERAR RECIBES SOLO EL 20% DEL VALOR DEL JUGADOR{refund !== null ? `: ${gp(refund)}` : ''}. EL JUGADOR QUEDA COMO AGENTE LIBRE PARA TODA LA LIGA. LOS AGENTES LIBRES SE ACUERDAN: CADA LIBERACIÓN BAJA TU REPUTACIÓN EN LAS SUBASTAS. SI TIENE CONTRATO VIGENTE ES UNA RESCISIÓN: PAGAS EL 50% DE LAS TEMPORADAS QUE FALTAN Y NO RECIBES NADA (MÁS DETALLE EN LA PESTAÑA NÓMINA DEL CLUB).</p>
    {confirming
      ? <div className="offer-confirm" role="group" aria-label="CONFIRMAR">
        <span>¿LIBERAR A {upper(player?.name)}? RECIBES {gp(refund)} Y NO SE PUEDE DESHACER.</span>
        <div className="mini-actions">
          <button type="button" className="danger" disabled={mutation.loading} onClick={() => mutation.execute({ teamId: myTeamId })}>SÍ, LIBERAR</button>
          <button type="button" className="ghost" disabled={mutation.loading} onClick={() => setConfirming(false)}>VOLVER</button>
        </div>
      </div>
      : <button className="action-button danger" disabled={!playerId}>LIBERAR JUGADOR</button>}
    {mutation.error && <p className="form-feedback error" role="alert">{mutation.error.message}</p>}
  </form>;
}

export function ProposeOffers({ teams, marketOpen, onChanged }) {
  const { teamId: myTeamId } = useAuth();
  const [tab, setTab] = useState('transfer');
  if (!myTeamId) return null;
  const rivals = teams.filter(team => team.id !== myTeamId && (team.kind ?? 'club') === 'club' && !team.hidden);
  // Traspasos y trueques solo con el mercado abierto; liberar se puede siempre.
  const closed = marketOpen === false && tab !== 'release';
  return <section className="market-section market-propose">
    <header><h2>PROPONER UNA OPERACIÓN</h2><p>LA OTRA PARTE LA RECIBE EN SU BANDEJA Y EN DISCORD, Y SE CONCRETA SOLO CUANDO LA ACEPTA. EL PRECIO DE CADA JUGADOR VA ENTRE 0,7× Y 1,25× SU VALOR.</p></header>
    <nav className="market-tabs offer-tabs" aria-label="TIPO DE OPERACIÓN">
      <button type="button" className={tab === 'transfer' ? 'active' : ''} onClick={() => setTab('transfer')}>🤝 TRASPASO</button>
      <button type="button" className={tab === 'trade' ? 'active' : ''} onClick={() => setTab('trade')}>🔁 TRUEQUE</button>
      <button type="button" className={tab === 'release' ? 'active' : ''} onClick={() => setTab('release')}>🚪 LIBERAR</button>
    </nav>
    {closed && <p className="empty-copy">EL MERCADO ESTÁ CERRADO: LOS TRASPASOS Y TRUEQUES SE PROPONEN CUANDO SE ABRA.</p>}
    {!closed && tab === 'transfer' && <TransferProposal myTeamId={myTeamId} rivals={rivals} onDone={onChanged}/>}
    {!closed && tab === 'trade' && <TradeProposal myTeamId={myTeamId} rivals={rivals} onDone={onChanged}/>}
    {tab === 'release' && <ReleaseForm myTeamId={myTeamId} onDone={onChanged}/>}
  </section>;
}
