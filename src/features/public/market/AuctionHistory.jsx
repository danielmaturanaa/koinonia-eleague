import { useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { DataState, formatDate, gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { useAutoRefresh } from './PollsSection.jsx';
import { AuctionReveal, revealLength } from './AuctionReveal.jsx';
import { Stars } from './stars.jsx';
import { serverNow } from './serverClock.js';

const TRAIT_LABEL = {
  ganador: ['GANADOR', 'Quiere títulos y un club importante.'],
  titular: ['TITULAR', 'Quiere jugar siempre y huye de donde ya hay alguien en su puesto.'],
  sociable: ['SOCIABLE', 'Le importa con quién juega: paisanos, gente de su edad y que se complementen.'],
  mercenario: ['MERCENARIO', 'Se va con el que más paga.'],
  ego: ['EGO', 'Quiere ser la figura, no compartir protagonismo.'],
  leal: ['LEAL AL PROYECTO', 'Prefiere un club estable y un presi que cumple.'],
};
const FACTOR_LABEL = {
  dinero: 'DINERO', minutos: 'MINUTOS', companeros: 'COMPAÑEROS', dt: 'ENTRENADOR',
  prestigio: 'PRESTIGIO', proyecto: 'PROYECTO', reputacion: 'REPUTACIÓN DEL PRESI',
};
const INTEREST = { caliente: ['🔥 CALIENTE', 'hot'], tibio: ['🌤️ TIBIO', 'warm'], frio: ['🧊 FRÍO', 'cold'] };
const NO_SALE_LABEL = {
  sin_ofertas: 'Nadie ofertó por él: sigue libre.',
  nadie_convence: 'Ningún club lo convenció: sigue libre.',
  sin_club_valido: 'Los clubes que lo convencían ya no podían pagarlo: sigue libre.',
};

/** Detalle técnico de cómo decidió el jugador: rasgos, pesos y la nota de cada club en cada tema. */
function Breakdown({ result }) {
  if (!result?.ranking?.length) return null;
  const factors = Object.keys(FACTOR_LABEL);
  return <div className="sealed-breakdown">
    <p className="poll-hint">Cómo vio el jugador a cada club, de 0 a 5 estrellas por tema. Con todo eso sale el encaje, que multiplica la oferta: gana el valor final más alto.</p>
    <div className="sealed-traits">
      {(result.traits ?? []).map(trait => <span key={trait}><b>{TRAIT_LABEL[trait]?.[0] ?? String(trait).toUpperCase()}</b> {TRAIT_LABEL[trait]?.[1]}</span>)}
    </div>
    <div className="table-wrap sealed-table">
      <table>
        <thead><tr><th>TEMA</th>{result.ranking.map(row => <th key={row.teamId}>{row.teamName?.toUpperCase()}</th>)}</tr></thead>
        <tbody>
          {factors.map(factor => <tr key={factor}>
            <td>{FACTOR_LABEL[factor]}</td>
            {result.ranking.map(row => <td key={row.teamId}>{row.notes?.[factor] == null ? '—' : <Stars note={row.notes[factor]} factor={factor}/>}</td>)}
          </tr>)}
          <tr className="sum"><td>EN TOTAL</td>{result.ranking.map(row => <td key={row.teamId}><Stars note={row.total} factor="total"/></td>)}</tr>
          <tr className="sum"><td>OFERTA</td>{result.ranking.map(row => <td key={row.teamId}>{gp(row.offer)}</td>)}</tr>
          <tr><td>ENCAJE</td>{result.ranking.map(row => <td key={row.teamId}>×{Number(row.fit).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>)}</tr>
          <tr className="sum"><td>VALOR FINAL</td>{result.ranking.map(row => <td key={row.teamId}><b>{gp(row.value)}</b></td>)}</tr>
          <tr><td>INTERÉS</td>{result.ranking.map(row => {
            const [label, tone] = INTEREST[row.interest] ?? [String(row.interest ?? '').toUpperCase(), 'warm'];
            return <td key={row.teamId}><span className={`interest ${tone}`}>{label}</span></td>;
          })}</tr>
        </tbody>
      </table>
    </div>
    {result.disqualified?.length > 0 && <p className="poll-hint">DESCARTADOS AL CERRAR: {result.disqualified.map(item => `${item.reason}`).join(' · ').toUpperCase()}</p>}
  </div>;
}

function HistoryRow({ auction, teams }) {
  const [open, setOpen] = useState(false);
  const [replay, setReplay] = useState(null);
  const hasDetail = Boolean(auction.result?.ranking?.length);
  const reason = auction.result?.reason;
  return <article className={`sealed-history-item status-${auction.status}`}>
    <header>
      <div>
        <b>{auction.player.name}</b>
        <small>{auction.player.position} · {formatDate(auction.closesAt).toUpperCase()}</small>
      </div>
      {auction.winner
        ? <p className="poll-confirm"><b>🚨 FIRMÓ POR {auction.winner.name.toUpperCase()} · {gp(auction.winner.amount)}</b></p>
        : <p className="poll-hint">🤷 {NO_SALE_LABEL[reason] ?? 'NADIE LO FICHÓ: SIGUE LIBRE.'}</p>}
    </header>
    {hasDetail && <div className="mini-actions">
      <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'OCULTAR EL DETALLE' : 'VER CÓMO SE DECIDIÓ'}</button>
      <button type="button" onClick={() => setReplay(serverNow())}>▶ VER LA REVELACIÓN</button>
    </div>}
    {open && <Breakdown result={auction.result}/>}
    {replay && <AuctionReveal auction={auction} startAt={replay} teams={teams} onClose={() => setReplay(null)}
      onSkip={() => setReplay(serverNow() - revealLength(auction.result?.ranking?.length ?? 1))}/>}
  </article>;
}

/** Historial de subastas terminadas, con el detalle técnico de cómo decidió el jugador. */
export function AuctionHistory({ revision, teams = [] }) {
  const auctions = useApiQuery(signal => endpoints.sealedAuctions({}, signal), [revision]);
  useAutoRefresh(auctions.retry, 60000);
  if (auctions.error?.status === 404) return null;
  // Las que todavía se están revelando en vivo no aparecen aquí (sería un spoiler).
  const rows = (Array.isArray(auctions.data) ? auctions.data : []).filter(item => (item.status === 'resolved' || item.status === 'no_sale')
    && !(item.revealEndsAt && Date.parse(item.revealEndsAt) > Date.now()));
  return <section className="market-section market-sealed-history">
    <header>
      <h2>HISTORIAL DE SUBASTAS <small>{rows.length}</small></h2>
      <p>Las subastas terminadas, con el detalle técnico de cómo decidió cada jugador. La historia corta sale en la noticia del fichaje.</p>
    </header>
    {auctions.loading && auctions.data === null && <div className="arcade-state compact">CARGANDO HISTORIAL...</div>}
    {auctions.error && <DataState query={auctions}/>}
    {!auctions.error && !auctions.loading && !rows.length && <p className="empty-copy">Todavía no hay subastas terminadas.</p>}
    <div className="sealed-history-list">{rows.map(auction => <HistoryRow key={auction.id} auction={auction} teams={teams}/>)}</div>
  </section>;
}
