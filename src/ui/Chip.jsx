import { Icon } from './Icon.jsx';

/** Etiqueta corta. tone: neutral | navy | red | green | yellow. */
export function Chip({ tone = 'neutral', icon, className = '', children }) {
  return <span className={`ui-chip ui-chip--${tone} ${className}`}>{icon && <Icon name={icon} size={11}/>}{children}</span>;
}
