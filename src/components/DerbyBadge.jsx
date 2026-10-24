import { Icon } from '../ui/index.js';

/** Marca de clásico en cualquier tarjeta de partido (el servidor manda `derby` y `officialDerby`). */
// `compact`: solo la llama (con un parpadeo suave), para tarjetas angostas donde el texto tapa la fecha.
export function DerbyBadge({ match, compact = false }) {
  if (!match?.derby) return null;
  const title = match.officialDerby ? 'Clásico oficial: los dos clubes se eligieron' : 'Clásico';
  if (compact) return <span className={`derby-badge compact ${match.officialDerby ? 'official' : ''}`} title={title} aria-label={title} role="img"><Icon name="fire" size={12}/></span>;
  return <span className={`derby-badge ${match.officialDerby ? 'official' : ''}`} title={title}><Icon name="fire" size={11}/>Clásico</span>;
}
