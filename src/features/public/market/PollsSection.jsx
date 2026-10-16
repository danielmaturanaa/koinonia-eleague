import { useEffect, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { FormFeedback } from '../../admin/FormFeedback.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { DataState, formatDate, gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';

const ACTIVE = ['open', 'awaiting', 'disputed'];
const STATUS_LABEL = {
  open: 'ABIERTA', awaiting: 'ESPERA CONFIRMACIÓN', disputed: 'EN SUBASTA',
  bought: 'COMPRADO', auctioned: 'SUBASTADO', declined: 'DESCARTADA', cancelled: 'CANCELADA',
};

/* Vuelve a pedir los datos cada `ms` mientras la pestaña esté visible. */
export function useAutoRefresh(retry, ms = 10000) {
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') retry(); }, ms);
    return () => window.clearInterval(timer);
  }, [retry, ms]);
}

function Voters({ title, votes, tone }) {
  return <div className={`poll-voters ${tone}`}><b>{title} · {votes.length}</b>{votes.length
    ? <ul>{votes.map(vote => <li key={`${vote.teamId}-${vote.votedAt}`}>{vote.teamEmoji ?? '⚽'} {vote.teamName ?? 'CLUB'}{vote.presidentName ? <small> · {vote.presidentName}</small> : null}</li>)}</ul>
    : <span>NADIE TODAVÍA</span>}</div>;
}

function AuctionPanel({ poll, teams, onChanged }) {
  const { isAdmin, user } = useAuth();
  const owns = teamId => Boolean(user?.teamIds?.includes(teamId));
  const mine = poll.involvedTeamIds.filter(owns);
  const [teamId, setTeamId] = useState(mine[0] ?? poll.involvedTeamIds[0] ?? '');
  const [price, setPrice] = useState(String(poll.price));
  const claim = useApiMutation((body, signal) => endpoints.claimAuction(body, signal), { onSuccess: onChanged });
  const resolve = useApiMutation((decision, signal) => endpoints.resolveAuction(poll.id, decision, signal), { onSuccess: onChanged });
  const nameOf = id => teams.find(team => team.id === id)?.name ?? 'CLUB';
  const canClaim = isAdmin || mine.length > 0;
  // Valida otro club de la subasta (no el que anotó) o un admin.
  const canValidate = poll.auction && (isAdmin || poll.involvedTeamIds.some(id => id !== poll.auction.team.id && owns(id)));

  if (poll.auction) {
    return <div className="poll-auction">
      <p><b>RESULTADO ANOTADO:</b> {poll.auction.team.emoji ?? '⚽'} {poll.auction.team.name} POR {gp(poll.auction.price)}. FALTA QUE OTRO CLUB DE LA SUBASTA LO VALIDE.</p>
      {canValidate && <div className="mini-actions">
        <button disabled={resolve.loading} onClick={() => resolve.execute('accept')}>SÍ, ASÍ QUEDÓ</button>
        <button className="danger" disabled={resolve.loading} onClick={() => resolve.execute('reject')}>NO FUE ASÍ</button>
      </div>}
      <FormFeedback mutation={resolve}/>
    </div>;
  }
  if (!canClaim) return <p className="poll-hint">HAY INTERESADOS: LA COMPRA ESTÁ BLOQUEADA HASTA QUE SE RESUELVA LA SUBASTA.</p>;
  const submit = event => {
    event.preventDefault();
    claim.execute({ playerId: poll.player.id, teamId, price: Number(price) });
  };
  return <form className="poll-auction-form" onSubmit={submit}>
    <p className="poll-hint">LA SUBASTA SE HACE ENTRE USTEDES. QUIEN GANÓ ANOTA AQUÍ EL RESULTADO Y OTRO CLUB LO VALIDA. EL PRECIO SOLO PUEDE SUBIR.</p>
    <label>CLUB GANADOR<select value={teamId} onChange={event => setTeamId(event.target.value)}>
      {poll.involvedTeamIds.map(id => <option key={id} value={id}>{nameOf(id)}</option>)}
    </select></label>
    <label>MONTO GP<input type="number" min={poll.price} step="1" required value={price} onChange={event => setPrice(event.target.value)}/></label>
    <button className="action-button" disabled={claim.loading || !teamId || Number(price) < poll.price}>ANOTAR RESULTADO</button>
    <FormFeedback mutation={claim}/>
  </form>;
}

function PollCard({ poll, teams, onChanged }) {
  const { isAdmin, user, canEditTeam } = useAuth();
  const act = useApiMutation((action, body, signal) => endpoints.pollAction(poll.id, action, body, signal), { onSuccess: onChanged });
  const confirms = poll.votes.filter(vote => vote.vote === 'confirm');
  const objections = poll.votes.filter(vote => vote.vote === 'auction');
  const active = ACTIVE.includes(poll.status);
  const marketOpen = poll.window?.status === 'open';
  const ownsBuyer = Boolean(user?.teamIds?.includes(poll.team.id));
  const canDecide = canEditTeam(poll.team.id);
  const isPresident = Boolean(user?.teamIds?.length) || isAdmin;
  const buyerPaid = poll.status === 'auctioned' && poll.auction ? poll.auction.price : poll.price;

  return <article className={`poll-card status-${poll.status}`}>
    <header>
      <PlayerFace src={poll.player.faceUrl} name={poll.player.name}/>
      <div>
        <b>{poll.player.name}</b>
        <small>{poll.player.position} · {poll.team.emoji ?? '⚽'} {poll.team.name} LO QUIERE POR {gp(buyerPaid)}</small>
      </div>
      <span className="poll-status">{STATUS_LABEL[poll.status] ?? poll.status.toUpperCase()}</span>
    </header>
    <div className="poll-votes">
      <Voters title={`DELE NOMÁS (${confirms.length}/${poll.window?.minConfirmations ?? '?'})`} votes={confirms} tone="yes"/>
      <Voters title="VAMOS A SUBASTA" votes={objections} tone="no"/>
    </div>
    {poll.window && <p className="poll-meta">{marketOpen ? `EL MERCADO CIERRA ${formatDate(poll.window.closesAt).toUpperCase()}` : 'MERCADO CERRADO: LOS VOTOS QUEDARON CONGELADOS.'}{poll.myVote ? ` · TU VOTO: ${poll.myVote === 'confirm' ? 'DELE NOMÁS' : 'VAMOS A SUBASTA'}` : ''}</p>}

    {active && marketOpen && isPresident && <div className="mini-actions poll-vote-actions">
      <button className={poll.myVote === 'confirm' ? 'chosen' : ''} disabled={act.loading} onClick={() => act.execute('vote', { choice: 'confirm' })}>🟢 DELE NOMÁS{poll.myVote === 'confirm' ? ' · RETIRAR' : ''}</button>
      {!ownsBuyer && <button className={`danger ${poll.myVote === 'auction' ? 'chosen' : ''}`} disabled={act.loading} onClick={() => act.execute('vote', { choice: 'auction' })}>🔴 VAMOS A SUBASTA{poll.myVote === 'auction' ? ' · RETIRAR' : ''}</button>}
    </div>}

    {poll.status === 'awaiting' && canDecide && <div className="poll-confirm">
      <p>{poll.team.name.toUpperCase()}: ¿CONFIRMAS LA COMPRA POR {gp(poll.price)}?</p>
      <div className="mini-actions">
        <button disabled={act.loading} onClick={() => { if (window.confirm(`¿CONFIRMAS LA COMPRA DE ${poll.player.name} POR ${gp(poll.price)}?`)) act.execute('confirm'); }}>✅ CONFIRMO LA COMPRA</button>
        <button className="danger" disabled={act.loading} onClick={() => act.execute('decline')}>AL FINAL NO</button>
      </div>
    </div>}
    {poll.status === 'awaiting' && !canDecide && <p className="poll-hint">LUZ VERDE: FALTA QUE EL PRESI DE {poll.team.name.toUpperCase()} CONFIRME LA COMPRA.</p>}

    {poll.status === 'disputed' && <AuctionPanel poll={poll} teams={teams} onChanged={onChanged}/>}

    {active && ownsBuyer && <button type="button" className="poll-cancel" disabled={act.loading} onClick={() => act.execute('cancel')}>CANCELAR ENCUESTA</button>}
    <FormFeedback mutation={act}/>
  </article>;
}

export function PollsSection({ teams, revision, onChanged, children = null }) {
  const [scope, setScope] = useState('market');
  const [teamFilter, setTeamFilter] = useState('');
  const polls = useApiQuery(signal => endpoints.marketPolls(scope === 'all' ? { scope: 'all' } : {}, signal), [revision, scope]);
  useAutoRefresh(polls.retry);
  const all = Array.isArray(polls.data) ? polls.data : [];
  const rows = teamFilter ? all.filter(poll => poll.team?.id === teamFilter) : all;
  const open = rows.filter(poll => ACTIVE.includes(poll.status));
  const closed = rows.filter(poll => !ACTIVE.includes(poll.status));
  const refresh = () => { polls.retry(); onChanged?.(); };
  const unavailable = polls.error?.status === 404;
  // En el filtro solo aparecen los clubes que tienen encuestas (con cuántas).
  const counts = all.reduce((map, poll) => map.set(poll.team?.id, (map.get(poll.team?.id) ?? 0) + 1), new Map());
  const filterTeams = teams.filter(team => counts.has(team.id));
  return <>
    {children}
    <section className="market-section market-polls">
      <header><h2>ENCUESTAS DE COMPRA <small>{rows.length}</small></h2><p>VOTA SI ESTÁS DE ACUERDO O PIDE SUBASTA. SON LAS MISMAS QUE EN DISCORD: VOTA DONDE QUIERAS.</p></header>
      <div className="poll-filters">
        <div className="offer-toggle" role="radiogroup" aria-label="QUÉ ENCUESTAS VER">
          <button type="button" role="radio" aria-checked={scope === 'market'} className={scope === 'market' ? 'on' : ''} onClick={() => setScope('market')}>ESTE MERCADO</button>
          <button type="button" role="radio" aria-checked={scope === 'all'} className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>TODOS LOS MERCADOS</button>
        </div>
        <label>EQUIPO<select value={teamFilter} onChange={event => setTeamFilter(event.target.value)}>
          <option value="">TODOS LOS EQUIPOS ({all.length})</option>
          {filterTeams.map(team => <option key={team.id} value={team.id}>{team.name} ({counts.get(team.id)})</option>)}
        </select></label>
      </div>
      {polls.loading && polls.data === null && <div className="arcade-state compact">CARGANDO ENCUESTAS...</div>}
      {polls.error && !unavailable && <DataState query={polls}/>}
      {unavailable && <p className="empty-copy">LAS ENCUESTAS TODAVÍA NO ESTÁN DISPONIBLES EN LA API.</p>}
      {!polls.error && !polls.loading && !rows.length && <p className="empty-copy">{teamFilter ? 'ESE EQUIPO NO TIENE ENCUESTAS AQUÍ.' : 'NO HAY ENCUESTAS. ABRE UNA BUSCANDO AL JUGADOR ARRIBA.'}</p>}
      {open.length > 0 && <><h3 className="market-subtitle">🗳️ ABIERTAS · {open.length}</h3><div className="poll-list">{open.map(poll => <PollCard key={poll.id} poll={poll} teams={teams} onChanged={refresh}/>)}</div></>}
      {closed.length > 0 && <><h3 className="market-subtitle">📁 CERRADAS · {closed.length}</h3><div className="poll-list">{closed.map(poll => <PollCard key={poll.id} poll={poll} teams={teams} onChanged={refresh}/>)}</div></>}
    </section>
  </>;
}
