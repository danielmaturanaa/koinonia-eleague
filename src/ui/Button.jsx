import { playSound } from '../audio/synth.js';
import { Icon } from './Icon.jsx';

/** Botón único del sitio. variant: primary | positive | danger | ghost · size: md | sm. Suena un clic suave (si los efectos están encendidos). */
export function Button({ variant = 'primary', size = 'md', icon, className = '', children, type = 'button', onClick, ...props }) {
  return <button type={type} className={`ui-btn ui-btn--${variant} ui-btn--${size} ${className}`} onClick={onClick ? event => { playSound('click'); onClick(event); } : undefined} {...props}>
    {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14}/>}
    {children}
  </button>;
}
