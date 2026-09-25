import { useEffect, useState } from 'react';

const initials = name => String(name ?? '')
  .replace(/\p{Regional_Indicator}/gu, '')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase() || '?';

// Foto del jugador con respaldo: si no hay URL o la imagen falla, muestra sus iniciales.
export function PlayerFace({ src, name, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <span className={`player-photo player-photo-fallback ${className}`} aria-hidden="true">{initials(name)}</span>;
  return <img className={`player-photo ${className}`} src={src} alt="" loading="lazy" draggable={false} onError={() => setFailed(true)}/>;
}
