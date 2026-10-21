import { Icon } from './Icon.jsx';

/** Pantalla vacía con una acción clara. */
export function EmptyState({ icon = 'star', title, children, action }) {
  return <div className="ui-empty"><Icon name={icon} size={32}/><b>{title}</b>{children && <p>{children}</p>}{action}</div>;
}

/** Aviso en línea de un resultado (guardado o error); se anuncia a lectores de pantalla. */
export function Notice({ tone = 'success', children }) {
  return <p className={`ui-notice ui-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>;
}
