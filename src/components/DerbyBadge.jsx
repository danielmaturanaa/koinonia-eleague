import { Icon } from '../ui/index.js';

/** Marca de clásico en cualquier tarjeta de partido (el servidor manda `derby` y `officialDerby`). */
export function DerbyBadge({ match }) {
  if (!match?.derby) return null;
  const title = match.officialDerby ? 'Clásico oficial: los dos clubes se tienen de rival' : 'Clásico';
  return <span className={`derby-badge ${match.officialDerby ? 'official' : ''}`} title={title}><Icon name="fire" size={11}/>Clásico</span>;
}
