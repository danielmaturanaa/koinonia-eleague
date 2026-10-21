import { ICON_PATHS } from './icons.js';

/** Icono pixel-art. Hereda el color del texto; sin `title` es decorativo (aria-hidden). */
export function Icon({ name, size = 16, title, className = '' }) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return <svg className={`ui-icon ${className}`} width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" fill="currentColor" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : 'true'} focusable="false">
    {title && <title>{title}</title>}
    <path d={path}/>
  </svg>;
}
