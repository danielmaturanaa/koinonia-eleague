import { Icon } from '../ui/index.js';

/** Marca de clásico en cualquier tarjeta de partido (el servidor manda `derby` y `officialDerby`). */
// `corner`: pestaña en la esquina de una tarjeta de partido (no tapa la fecha ni el estadio del pie).
export function DerbyBadge({ match, corner = false }) {
  if (!match?.derby) return null;
  const title = match.officialDerby ? 'Clásico oficial: los dos clubes se eligieron' : 'Clásico';
  if (corner) return <span className={`derby-badge corner ${match.officialDerby ? 'official' : ''}`} title={title}><Icon name="fire" size={11}/>Clásico</span>;
  return <span className={`derby-badge ${match.officialDerby ? 'official' : ''}`} title={title}><Icon name="fire" size={11}/>Clásico</span>;
}
