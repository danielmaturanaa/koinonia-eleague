import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { EntityLink } from '../../components/EntityLink.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

// Reputación del presi ante los agentes libres (la calcula el servidor: core/reputation.js de cheeto).
const PARTS = [
  ['stay', 'Duración de sus jugadores'],
  ['homegrown', 'Formados en casa'],
  ['cleanStreak', 'Racha sin liberar'],
  ['releases', 'Liberaciones'],
  ['promises', 'Promesas de subasta'],
];

const signed = value => value > 0 ? `+${value.toLocaleString('es-CL')}` : value < 0 ? `−${Math.abs(value).toLocaleString('es-CL')}` : '0';
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
// Lo que pasó en toda la historia de la liga, aunque el puntaje haya partido de cero en la fecha de corte.
const historyNote = history => history && (history.releases || history.contractBreaks || history.promisesKept || history.promisesBroken)
  ? `${plural(history.releases, 'liberado', 'liberados')} · ${plural(history.contractBreaks, 'rescisión', 'rescisiones')} · ${history.promisesKept} promesas cumplidas · ${history.promisesBroken} rotas`
  : null;
const sinceLabel = value => { const date = value ? new Date(String(value).replace(' ', 'T')) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : null; };
const tone = score => score >= 70 ? 'high' : score >= 50 ? 'mid' : 'low';

function partNote(key, stats) {
  if (key === 'stay') return `${stats.averageStay.toLocaleString('es-CL')} torneos en promedio`;
  if (key === 'homegrown') return `${stats.homegrown} con 5+ torneos seguidos`;
  if (key === 'cleanStreak') return `${stats.cleanStreak} torneos`;
  if (key === 'releases') return `${stats.releases} ${stats.releases === 1 ? 'liberado' : 'liberados'} · ${stats.countedReleases ?? stats.releases} cuentan · ${stats.recentReleases} recientes`;
  return `${stats.promisesKept} cumplidas · ${stats.promisesBroken} rotas`;
}

/** Resumen para el hover del presi: puntaje, lugar en el ranking y de dónde sale. */
export function ReputationSummary({ reputation, clubCount }) {
  if (!reputation) return null;
  return <div className="reputation-summary">
    <p className="reputation-summary-title"><span><b>REPUTACIÓN</b><small>#{reputation.rank}{clubCount ? ` DE ${clubCount}` : ''} DE LA LIGA</small></span><strong className={`reputation-score ${tone(reputation.score)}`}>{reputation.score}</strong></p>
    <ul className="reputation-parts">{PARTS.map(([key, label]) => <li key={key}><span>{label}<small>{partNote(key, reputation.stats)}</small></span><em className={reputation.parts[key] < 0 ? 'negative' : reputation.parts[key] > 0 ? 'positive' : ''}>{signed(reputation.parts[key])}</em></li>)}</ul>
    {historyNote(reputation.history) && <p className="reputation-summary-hint">HISTORIA COMPLETA: {historyNote(reputation.history).toUpperCase()}</p>}
    <p className="reputation-summary-hint">BASE 50 · ENTRE 5 Y 95</p>
  </div>;
}

const PART_SHORT = { stay: 'Duración', homegrown: 'Formados', cleanStreak: 'Racha', releases: 'Liberaciones', promises: 'Promesas', contractBreaks: 'Rescisiones' };
const EVENT_ICON = { promise_kept: '🤝', promise_broken: '💔', release: '🚪', contract_break: '✂️', bankruptcy: '🟥' };
const eventDate = value => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : ''; };

/** Cada cosa que movió la reputación de un club: lo que cuenta hoy y, aparte, la historia de antes del corte. */
function ReputationDetail({ row }) {
  const detail = useApiQuery(signal => endpoints.reputationDetail(row.team.id, signal), [row.team.id]);
  const [view, setView] = useState('current');
  const data = detail.data;
  const parts = [...PARTS.map(([key]) => key), ...(row.parts.contractBreaks ? ['contractBreaks'] : [])];
  const events = data ? (view === 'current' ? data.current : data.history) : [];
  return <div className="reputation-detail">
    <div className="reputation-breakdown">{parts.map(key => <div key={key} className={row.parts[key] < 0 ? 'negative' : row.parts[key] > 0 ? 'positive' : ''}>
      <small>{PART_SHORT[key]}</small><b>{signed(row.parts[key])}</b>{PARTS.some(([part]) => part === key) && <em>{partNote(key, row.stats)}</em>}
    </div>)}<div className="reputation-breakdown-total"><small>Base 50 +</small><b>= {row.score}</b></div></div>
    <div className="reputation-views" role="tablist" aria-label="Qué mirar">
      <button type="button" role="tab" aria-selected={view === 'current'} className={view === 'current' ? 'on' : ''} onClick={() => setView('current')}>CUENTA HOY{data ? ` (${data.current.length})` : ''}</button>
      <button type="button" role="tab" aria-selected={view === 'history'} className={view === 'history' ? 'on' : ''} onClick={() => setView('history')}>HISTORIA{data ? ` (${data.history.length})` : ''}</button>
    </div>
    {view === 'history' && <p className="reputation-intro">Liberaciones de antes del cambio de modalidad{sinceLabel(data?.since) ? ` (${sinceLabel(data.since)})` : ''}: los agentes libres las recuerdan, pero ya no restan.</p>}
    {!data ? <p className="reputation-intro">{detail.error ? 'No se pudo cargar el detalle.' : 'CARGANDO…'}</p>
      : events.length ? <ul className="reputation-events">{events.map((event, index) => <li key={`${event.kind}-${event.at}-${index}`} className={`event-${event.kind}`}>
        <span className="reputation-event-icon" aria-hidden="true">{EVENT_ICON[event.kind] ?? '•'}</span>
        <span className="reputation-event-text">{event.text}<small>{eventDate(event.at)}</small></span>
        {view === 'current' && <b className={event.points < 0 ? 'negative' : event.points > 0 ? 'positive' : ''}>{event.points ? signed(event.points) : 'no cuenta'}</b>}
      </li>)}</ul>
      : <p className="reputation-intro">{view === 'current' ? 'Nada todavía: solo la duración de sus jugadores y su racha.' : 'Sin historia anterior al corte.'}</p>}
  </div>;
}

/** Explicación de la fórmula y el ranking de todos los presis; al tocar un club se ve el detalle de su puntaje. */
export function ReputationModal({ teamId, onClose }) {
  const ranking = useApiQuery(signal => endpoints.reputation(signal), []);
  const [open, setOpen] = useState(teamId ?? null);
  useEffect(() => {
    const closeWithEscape = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, [onClose]);
  const rows = Array.isArray(ranking.data?.ranking) ? ranking.data.ranking : [];
  const rules = ranking.data?.rules;
  return <div className="person-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="person-modal reputation-modal" role="dialog" aria-modal="true" aria-label="Reputación de los presidentes">
      <header><h2>Reputación de los presidentes</h2><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header>
      <p className="reputation-intro">Es lo que piensan los agentes libres de cada presi cuando eligen club en una subasta. Pesa poco al lado de la oferta y el proyecto, pero puede desempatar. Toca un club para ver de dónde sale su puntaje. Cuenta toda la historia del club, salvo las <b>liberaciones</b> de antes del cambio de modalidad{sinceLabel(rows[0]?.since) ? ` (${sinceLabel(rows[0].since)})` : ''}, que quedan aparte como historia.</p>
      <details className="reputation-how"><summary>¿Cómo se calcula?</summary><ul className="reputation-rules">
        <li><b>Base 50</b>, y el resultado queda entre {rules?.min ?? 5} y {rules?.max ?? 95}.</li>
        <li><b>Duración:</b> +{rules?.perStayTournament ?? 6} por cada torneo que duran en promedio sus jugadores en el club (también los que ya se fueron), hasta {rules?.stayCap ?? 6} torneos.</li>
        <li><b>Formados en casa:</b> +{rules?.perHomegrown ?? 1} por cada jugador que lleva {rules?.homegrownMinTournaments ?? 5} o más torneos seguidos en el club (sin irse y volver), hasta +{rules?.homegrownCap ?? 10}.</li>
        <li><b>Racha sin liberar:</b> +{rules?.perCleanTournament ?? 2} por cada torneo desde su última liberación, hasta +{rules?.cleanCap ?? 10}.</li>
        <li><b>Liberaciones:</b> −{rules?.perRelease ?? 4} cada una, y pesan {Math.round((1 - (rules?.releaseDecay ?? 0.75)) * 100)}% menos por cada torneo que pasa. Liberar a quien duró {rules?.freeReleaseAfterStay ?? 4} torneos o más no resta; soltar a quien llevaba {rules?.quickReleaseMaxTournaments ?? 1} torneo o menos pesa ×{(rules?.quickReleaseFactor ?? 1.5).toLocaleString('es-CL')}. Tope −{rules?.releaseCap ?? 40}.</li>
        <li><b>Promesas:</b> +{rules?.perPromiseKept ?? 3} por cada una cumplida (hasta {rules?.promisesKeptCap ?? 5}) y −{rules?.perPromiseBroken ?? 15} por cada una rota. Arrancar un torneo en números rojos resta lo mismo que una rota.</li>
        <li><b>Rescisiones:</b> −{rules?.perContractBreak ?? 12} cada una, y pesan menos con los torneos.</li>
      </ul></details>
      {ranking.loading ? <p className="reputation-intro">CARGANDO RANKING…</p> : ranking.error ? <p className="reputation-intro">No se pudo cargar el ranking.</p>
        : <ol className="reputation-list">{rows.map(row => {
          const expanded = open === row.team.id;
          const broken = row.stats.promisesBroken + (row.stats.bankruptcies ?? 0);
          return <li key={row.team.id} className={`${row.team.id === teamId ? 'current-team' : ''} ${expanded ? 'is-open' : ''}`}>
            <button type="button" className="reputation-row" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : row.team.id)}>
              <span className="reputation-rank">{row.rank}</span>
              <TeamMark team={row.team}/>
              <span className="reputation-who"><b>{row.team.name}</b><small>{row.president ?? 'SIN PRESI'}</small></span>
              <span className="reputation-tags">
                {row.stats.promisesKept > 0 && <em className="good">🤝 {row.stats.promisesKept}</em>}
                {broken > 0 && <em className="bad">💔 {broken}</em>}
                {row.stats.countedReleases > 0 && <em className="bad">🚪 {row.stats.countedReleases}</em>}
              </span>
              <strong className={`reputation-score ${tone(row.score)}`}>{row.score}</strong>
              <span className="reputation-caret" aria-hidden="true">{expanded ? '▴' : '▾'}</span>
            </button>
            {expanded && <ReputationDetail row={row}/>}
          </li>;
        })}</ol>}
    </section>
  </div>;
}
