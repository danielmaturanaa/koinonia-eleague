import { useEffect } from 'react';
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
  if (key === 'homegrown') return `${stats.homegrown} con 3+ torneos`;
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

/** Explicación de la fórmula y el ranking de todos los presis. */
export function ReputationModal({ teamId, onClose }) {
  const ranking = useApiQuery(signal => endpoints.reputation(signal), []);
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
      <p className="reputation-intro">Es lo que piensan los agentes libres de cada presi cuando eligen club en una subasta. Pesa poco al lado de la oferta y el proyecto deportivo, pero puede desempatar. Todo se cuenta en <b>torneos</b>, no en días.{sinceLabel(rows[0]?.since) && <> El puntaje partió de cero el <b>{sinceLabel(rows[0].since)}</b> con el nuevo sistema de contratos, pero lo que pasó antes no se borra: aparece como <b>historia</b> bajo cada club.</>}</p>
      <ul className="reputation-rules">
        <li><b>Base 50</b>, y el resultado queda entre 5 y 95.</li>
        <li><b>Duración:</b> +{rules?.perStayTournament ?? 6} por cada torneo que duran en promedio sus jugadores en el club (contando también a los que ya se fueron), hasta {rules?.stayCap ?? 6} torneos.</li>
        <li><b>Formados en casa:</b> +{rules?.perHomegrown ?? 1} por cada jugador que llegó sin venir de otro club (agente libre, subasta o plantel inicial) y lleva {rules?.homegrownMinTournaments ?? 3} o más torneos, hasta +{rules?.homegrownCap ?? 10}.</li>
        <li><b>Racha sin liberar:</b> +{rules?.perCleanTournament ?? 2} por cada torneo desde su última liberación, hasta +{rules?.cleanCap ?? 10}.</li>
        <li><b>Liberaciones:</b> −{rules?.perRelease ?? 4} cada una, pero pesan {Math.round((1 - (rules?.releaseDecay ?? 0.75)) * 100)}% menos por cada torneo que pasa: lo reciente pesa más y el presi se puede recuperar. Liberar a un jugador que duró {rules?.freeReleaseAfterStay ?? 4} torneos o más en el club no castiga. Soltar a alguien que llevaba {rules?.quickReleaseMaxTournaments ?? 1} torneo o menos (fichar y botar) pesa ×{(rules?.quickReleaseFactor ?? 1.5).toLocaleString('es-CL')}. Tope −{rules?.releaseCap ?? 40}. En la tabla, «recientes» son las de este torneo y el anterior.</li>
        <li><b>Promesas de subasta:</b> +{rules?.perPromiseKept ?? 3} por cada una cumplida (hasta {rules?.promisesKeptCap ?? 5}) y −{rules?.perPromiseBroken ?? 15} por cada una rota.</li>
      </ul>
      {ranking.loading ? <p className="reputation-intro">CARGANDO RANKING…</p> : ranking.error ? <p className="reputation-intro">No se pudo cargar el ranking.</p> : <div className="reputation-table-wrap"><table className="reputation-table">
        <thead><tr><th>#</th><th>CLUB · PRESI</th>{PARTS.map(([key, label]) => <th key={key} title={label}>{label.split(' ')[0].toUpperCase()}</th>)}<th>TOTAL</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.team.id} className={row.team.id === teamId ? 'current-team' : ''}>
          <td>{row.rank}</td>
          <td><EntityLink to="team" id={row.team.id} className="table-team-link" onClick={onClose}><TeamMark team={row.team}/><span>{row.team.name}<small>{row.president ?? 'SIN PRESI'}</small>{historyNote(row.history) && <small className="reputation-history">HISTORIA: {historyNote(row.history).toUpperCase()}</small>}</span></EntityLink></td>
          {PARTS.map(([key]) => <td key={key} className={row.parts[key] < 0 ? 'negative' : ''} title={partNote(key, row.stats)}>{signed(row.parts[key])}{key === 'releases' && <small className="reputation-count">{row.stats.releases} {row.stats.releases === 1 ? 'LIBERADO' : 'LIBERADOS'}{row.stats.countedReleases != null ? ` · ${row.stats.countedReleases} CUENTAN` : ''}{row.stats.recentReleases ? ` · ${row.stats.recentReleases} RECIENTES` : ''}</small>}</td>)}
          <td><strong className={`reputation-score ${tone(row.score)}`}>{row.score}</strong></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </div>;
}
