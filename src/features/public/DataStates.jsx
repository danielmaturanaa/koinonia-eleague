export function DataState({ query, empty = 'NO HAY REGISTROS PUBLICADOS.' }) {
  if (query.loading) return <div className="arcade-state compact">CARGANDO DATOS...</div>;
  if (query.error) return <div className="data-error"><b>{query.error.status === 404 ? 'NO DISPONIBLE EN LA API ACTUAL' : 'NO FUE POSIBLE CARGAR'}</b><span>{query.error.message}</span><button onClick={query.retry}>REINTENTAR</button></div>;
  if (Array.isArray(query.data) && !query.data.length) return <p className="empty-copy data-empty">{empty}</p>;
  return null;
}

export function PageHeader({ kicker, title, children }) {
  return <header className="data-page-header"><p>{kicker}</p><h1>{title}</h1>{children}</header>;
}

export function Pagination({ pagination, page, onPage }) {
  if (!pagination) return null;
  const totalPages = pagination.totalPages ?? Math.max(1, Math.ceil((pagination.total ?? 0) / (pagination.pageSize ?? 20)));
  return <nav className="pagination" aria-label="Paginación"><button disabled={page <= 1} onClick={() => onPage(page - 1)}>◀ ANTERIOR</button><span>PÁGINA {page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>SIGUIENTE ▶</button></nav>;
}

export const formatDate = value => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const gp = value => typeof value === 'number' ? `${value.toLocaleString('es-CL')} GP` : '—';
