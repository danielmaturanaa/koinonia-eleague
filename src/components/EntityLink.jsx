const paths = {
  team: id => `#/equipos/${encodeURIComponent(id)}`,
  match: id => `#/partidos/${encodeURIComponent(id)}`,
  player: id => `#/jugadores/${encodeURIComponent(id)}`,
};

// Enlace real (<a href="#/...">) para que cada entidad se pueda abrir, compartir
// o abrir en otra pestaña. Sin id se muestra como texto plano.
export function EntityLink({ to, id, className = '', children, ...rest }) {
  if (id === null || id === undefined || id === '') return <span className={className}>{children}</span>;
  return <a className={`entity-link ${className}`} href={paths[to](id)} {...rest}>{children}</a>;
}
