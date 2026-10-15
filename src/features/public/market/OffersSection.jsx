import { useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { FormFeedback } from '../../admin/FormFeedback.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { DataState, gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { useAutoRefresh } from './PollsSection.jsx';

const RELEASE_SHARE = 0.2;
const asList = value => Array.isArray(value) ? value : [];
const teamLabel = team => team ? `${team.emoji ?? '⚽'} ${team.name}` : 'CLUB';

function OfferRow({ offer, onChanged }) {
  const kind = offer.kind === 'trade' ? 'Trade' : 'Transfer';
  const mutation = useApiMutation((operation, signal) => endpoints[`${operation}${kind}`](offer.id, signal), { onSuccess: onChanged });
  const incoming = offer.direction === 'incoming';
  const text = offer.kind === 'trade'
    ? `${offer.fromPlayer?.name ?? 'JUGADOR'} ⇄ ${offer.toPlayer?.name ?? 'JUGADOR'}${offer.gpFrom ? ` · +${gp(offer.gpFrom)} DE ${offer.fromTeam?.name ?? ''}` : ''}${offer.gpTo ? ` · +${gp(offer.gpTo)} DE ${offer.toTeam?.name ?? ''}` : ''}`
    : `${offer.player?.name ?? 'JUGADOR'} · ${gp(offer.gpAmount)}`;
  return <article className="market-item offer-row">
    <b>{offer.kind === 'trade' ? 'TRUEQUE' : 'TRASPASO'} · {text}</b>
    <span>{teamLabel(offer.fromTeam)} → {teamLabel(offer.toTeam)}</span>
    <div className="mini-actions">
      {offer.canAccept && <button disabled={mutation.loading} onClick={() => { if (window.confirm('¿ACEPTAS ESTA OFERTA?')) mutation.execute('approve'); }}>ACEPTAR</button>}
      {(incoming ? offer.canAccept : offer.canWithdraw) && <button className="danger" disabled={mutation.loading} onClick={() => mutation.execute('reject')}>{incoming ? 'RECHAZAR' : 'RETIRAR'}</button>}
    </div>
    <FormFeedback mutation={mutation}/>
  </article>;
}

export function OffersInbox({ revision, onChanged }) {
  const offers = useApiQuery(signal => endpoints.marketOffers(signal), [revision]);
  useAutoRefresh(offers.retry, 15000);
  const rows = asList(offers.data);
  const unavailable = offers.error?.status === 404;
  const incoming = rows.filter(row => row.direction === 'incoming');
  const outgoing = rows.filter(row => row.direction === 'outgoing');
  const refresh = () => { offers.retry(); onChanged?.(); };
  return <section className="market-section market-offers">
    <header><h2>OFERTAS <small>{incoming.length + outgoing.length}</small></h2><p>TRASPASOS Y TRUEQUES PENDIENTES DE TU CLUB.</p></header>
    {unavailable && <p className="empty-copy">LAS OFERTAS TODAVÍA NO ESTÁN DISPONIBLES EN LA API.</p>}
    {offers.error && !unavailable && <DataState query={offers}/>}
    {!offers.error && !offers.loading && !rows.length && <p className="empty-copy">NO TIENES OFERTAS PENDIENTES.</p>}
    {incoming.length > 0 && <><h3 className="market-subtitle">RECIBIDAS</h3>{incoming.map(offer => <OfferRow key={`${offer.kind}-${offer.id}`} offer={offer} onChanged={refresh}/>)}</>}
    {outgoing.length > 0 && <><h3 className="market-subtitle">ENVIADAS</h3>{outgoing.map(offer => <OfferRow key={`${offer.kind}-${offer.id}`} offer={offer} onChanged={refresh}/>)}</>}
  </section>;
}

const playerOptions = squad => <><option value="">SELECCIONAR</option>{asList(squad).map(player => <option key={player.id} value={player.id}>{player.name} · {player.position} · {gp(player.gpValue)}</option>)}</>;

function useSquad(teamId) {
  const query = useApiQuery(signal => teamId ? endpoints.teamSquad(teamId, signal) : Promise.resolve({ data: [] }), [teamId]);
  return { squad: asList(query.data), loading: query.loading };
}

function TransferProposal({ myTeamId, rivals, onDone }) {
  const [form, setForm] = useState({ side: 'buy', otherTeamId: '', playerId: '', gpAmount: '' });
  const buying = form.side === 'buy';
  const mySquad = useSquad(myTeamId);
  const otherSquad = useSquad(form.otherTeamId);
  const mutation = useApiMutation((body, signal) => endpoints.createTransfer(body, signal), { onSuccess: onDone });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value, ...(['side', 'otherTeamId'].includes(event.target.name) ? { playerId: '' } : {}) }));
  const squad = buying ? otherSquad.squad : mySquad.squad;
  const player = squad.find(item => item.id === form.playerId);
  const submit = event => {
    event.preventDefault();
    const body = { playerId: form.playerId, gpAmount: Number(form.gpAmount), proposerTeamId: myTeamId,
      fromTeamId: buying ? form.otherTeamId : myTeamId, toTeamId: buying ? myTeamId : form.otherTeamId };
    if (window.confirm(`¿PROPONER ${buying ? 'COMPRAR' : 'VENDER'} A ${player?.name ?? 'ESTE JUGADOR'} POR ${gp(body.gpAmount)}?`)) mutation.execute(body);
  };
  return <form className="admin-form market-form" onSubmit={submit}>
    <label>QUIERO<select name="side" value={form.side} onChange={change}><option value="buy">COMPRAR UN JUGADOR</option><option value="sell">VENDER UN JUGADOR MÍO</option></select></label>
    <label>{buying ? 'CLUB DUEÑO' : 'CLUB COMPRADOR'}<select name="otherTeamId" required value={form.otherTeamId} onChange={change}><option value="">SELECCIONAR</option>{rivals.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    <label>JUGADOR<select name="playerId" required value={form.playerId} onChange={change}>{playerOptions(squad)}</select></label>
    <label>MONTO GP{player ? ` (VALE ${player.gpValue?.toLocaleString('es-CL')})` : ''}<input name="gpAmount" required type="number" min="0" step="1" value={form.gpAmount} onChange={change}/></label>
    <button className="action-button" disabled={mutation.loading || !form.otherTeamId || !form.playerId || form.gpAmount === ''}>PROPONER TRASPASO</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function TradeProposal({ myTeamId, rivals, onDone }) {
  const [form, setForm] = useState({ otherTeamId: '', fromPlayerId: '', toPlayerId: '', gpFrom: '', gpTo: '' });
  const mySquad = useSquad(myTeamId);
  const otherSquad = useSquad(form.otherTeamId);
  const mutation = useApiMutation((body, signal) => endpoints.createTrade(body, signal), { onSuccess: onDone });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value, ...(event.target.name === 'otherTeamId' ? { toPlayerId: '' } : {}) }));
  const submit = event => {
    event.preventDefault();
    const body = { fromTeamId: myTeamId, toTeamId: form.otherTeamId, fromPlayerId: form.fromPlayerId, toPlayerId: form.toPlayerId,
      ...(form.gpFrom ? { gpFrom: Number(form.gpFrom) } : {}), ...(form.gpTo ? { gpTo: Number(form.gpTo) } : {}) };
    if (window.confirm('¿PROPONER ESTE TRUEQUE?')) mutation.execute(body);
  };
  return <form className="admin-form market-form" onSubmit={submit}>
    <label>CLUB CON EL QUE TRUECAS<select name="otherTeamId" required value={form.otherTeamId} onChange={change}><option value="">SELECCIONAR</option>{rivals.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    <label>JUGADOR QUE OFRECES<select name="fromPlayerId" required value={form.fromPlayerId} onChange={change}>{playerOptions(mySquad.squad)}</select></label>
    <label>JUGADOR QUE PIDES<select name="toPlayerId" required value={form.toPlayerId} onChange={change}>{playerOptions(otherSquad.squad)}</select></label>
    <label>GP QUE AGREGAS TÚ<input name="gpFrom" type="number" min="0" step="1" value={form.gpFrom} onChange={change}/></label>
    <label>GP QUE AGREGA EL OTRO CLUB<input name="gpTo" type="number" min="0" step="1" value={form.gpTo} onChange={change}/></label>
    <button className="action-button" disabled={mutation.loading || !form.otherTeamId || !form.fromPlayerId || !form.toPlayerId}>PROPONER TRUEQUE</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function ReleaseForm({ myTeamId, onDone }) {
  const [playerId, setPlayerId] = useState('');
  const mySquad = useSquad(myTeamId);
  const mutation = useApiMutation((body, signal) => endpoints.releasePlayer(playerId, body, signal), { onSuccess: onDone });
  const player = mySquad.squad.find(item => item.id === playerId);
  const refund = player ? Math.round((player.gpValue ?? 0) * RELEASE_SHARE) : null;
  const submit = event => {
    event.preventDefault();
    if (window.confirm(`¿LIBERAR A ${player.name}? TU CLUB RECIBE ${gp(refund)} Y EL JUGADOR QUEDA LIBRE.`)) mutation.execute({ teamId: myTeamId });
  };
  return <form className="admin-form market-form" onSubmit={submit}>
    <label>JUGADOR A LIBERAR<select value={playerId} required onChange={event => setPlayerId(event.target.value)}>{playerOptions(mySquad.squad)}</select></label>
    <p className="poll-hint">AL LIBERAR RECIBES SOLO EL 20% DEL VALOR DEL JUGADOR{refund !== null ? `: ${gp(refund)}` : ''}. EL JUGADOR QUEDA COMO AGENTE LIBRE PARA TODA LA LIGA.</p>
    <button className="action-button danger" disabled={mutation.loading || !playerId}>LIBERAR JUGADOR</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

export function ProposeOffers({ teams, onChanged }) {
  const { teamId: myTeamId } = useAuth();
  const [tab, setTab] = useState('transfer');
  if (!myTeamId) return null;
  const rivals = teams.filter(team => team.id !== myTeamId && (team.kind ?? 'club') === 'club');
  return <section className="market-section market-propose">
    <header><h2>PROPONER UNA OPERACIÓN</h2><p>LA OTRA PARTE LA VE EN SU BANDEJA Y DEBE ACEPTARLA. LOS TRASPASOS Y TRUEQUES SOLO SE PUEDEN PROPONER CON EL MERCADO ABIERTO.</p></header>
    <nav className="market-tabs" aria-label="Tipo de operación">
      <button className={tab === 'transfer' ? 'active' : ''} onClick={() => setTab('transfer')}>TRASPASO</button>
      <button className={tab === 'trade' ? 'active' : ''} onClick={() => setTab('trade')}>TRUEQUE</button>
      <button className={tab === 'release' ? 'active' : ''} onClick={() => setTab('release')}>LIBERAR</button>
    </nav>
    {tab === 'transfer' && <TransferProposal myTeamId={myTeamId} rivals={rivals} onDone={onChanged}/>}
    {tab === 'trade' && <TradeProposal myTeamId={myTeamId} rivals={rivals} onDone={onChanged}/>}
    {tab === 'release' && <ReleaseForm myTeamId={myTeamId} onDone={onChanged}/>}
  </section>;
}
