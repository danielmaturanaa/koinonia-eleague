import { PlayerFace } from '../components/PlayerFace.jsx';

/** Foto del jugador de tamaño fijo (xs 30 · sm 40 · md 56 · lg 72): el contenedor manda, la imagen siempre llena el círculo. */
export function PlayerAvatar({ src, name, size = 'md', className = '' }) {
  return <span className={`ui-avatar ui-avatar--${size} ${className}`}><PlayerFace src={src} name={name}/></span>;
}
