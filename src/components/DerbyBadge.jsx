import { Icon } from '../ui/index.js';
import { rivalryOf } from '../utils/rivalry.js';

/** Marca de rivalidad en cualquier lista de partidos: clásico, superclásico, derbi o el nombre propio de la rivalidad. */
export function DerbyBadge({ match }) {
  const rivalry = rivalryOf(match);
  if (!rivalry) return null;
  return <span className={`derby-badge rivalry-${rivalry.kind}${rivalry.both ? ' rivalry-both' : ''}`} title={rivalry.streak?.text ?? rivalry.label}><Icon name={rivalry.icon} size={11}/>{rivalry.label}</span>;
}
