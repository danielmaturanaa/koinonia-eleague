import { Icon } from './Icon.jsx';

/** Botón único del sitio. variant: primary | positive | danger | ghost · size: md | sm. */
export function Button({ variant = 'primary', size = 'md', icon, className = '', children, type = 'button', ...props }) {
  return <button type={type} className={`ui-btn ui-btn--${variant} ui-btn--${size} ${className}`} {...props}>
    {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14}/>}
    {children}
  </button>;
}
