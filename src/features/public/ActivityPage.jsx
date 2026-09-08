import { useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { DataState, PageHeader, Pagination, formatDate } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

export function ActivityPage({ sanctionsOnly = false }) {
  const [page, setPage] = useState(1);
  const activity = useApiQuery(signal => endpoints.activity({ page, pageSize: 30 }, signal), [page]);
  const rows = useMemo(() => {
    const list = Array.isArray(activity.data) ? activity.data : [];
    if (!sanctionsOnly) return list;
    return list.filter(item => /red|card|sanction|susp/i.test(`${item.type} ${JSON.stringify(item)}`));
  }, [activity.data, sanctionsOnly]);

  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="REGISTRO CRONOLÓGICO" title={sanctionsOnly ? 'SANCIONES' : 'ACTIVIDAD DE LA LIGA'}/><DataState query={activity}/>{!activity.loading && !activity.error && <div className="timeline">{rows.length ? rows.map(item => <article key={item.id}><time>{formatDate(item.occurredAt ?? item.createdAt)}</time><div><b>{String(item.type ?? 'ACTIVIDAD').replaceAll('_', ' ')}</b><span>{item.match ? `${item.match.homeTeam?.name ?? ''} ${item.match.homeScore ?? ''}–${item.match.awayScore ?? ''} ${item.match.awayTeam?.name ?? ''}` : item.message ?? item.description ?? 'Movimiento registrado en la liga.'}</span></div></article>) : <p className="empty-copy">{sanctionsOnly ? 'NO HAY SANCIONES EN LA ACTIVIDAD DISPONIBLE.' : 'NO HAY ACTIVIDAD PUBLICADA.'}</p>}</div>}<Pagination pagination={activity.pagination} page={page} onPage={setPage}/></section></main>;
}
