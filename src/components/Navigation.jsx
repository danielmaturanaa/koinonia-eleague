import { createPortal } from 'react-dom';
import { useAuth } from '../app/AuthGate.jsx';
import { activeNavigationPath, navigationFor } from '../app/navigation.js';
import { Icon } from '../ui/index.js';

/** Menú principal: arriba en el computador y como barra inferior (estilo app) en el celular. */
export function Navigation({ route, navigate }) {
  const { isAdmin } = useAuth();
  const items = navigationFor({ isAdmin });
  const activePath = activeNavigationPath(route);
  const go = path => {
    document.activeElement?.blur?.();
    navigate(path);
  };
  return <>
    <div className="site-nav">
      <nav id="league-navigation" aria-label="Menú de la liga">{items.map(item => {
        const active = item.path === activePath;
        return <button className={`nav-link ${active ? 'selected' : ''}`} key={item.path} aria-current={active ? 'page' : undefined} onClick={() => go(item.path)}><Icon name={item.icon} size={14}/>{item.label}</button>;
      })}</nav>
    </div>
    {/* Fuera del encabezado (que es sticky): así la barra queda pegada abajo de la pantalla. */}
    {createPortal(<nav className="bottom-nav" aria-label="Menú">{items.map(item => {
      const active = item.path === activePath;
      return <button type="button" key={item.path} className={active ? 'on' : ''} aria-current={active ? 'page' : undefined} onClick={() => go(item.path)}><Icon name={item.icon} size={20}/>{item.label}</button>;
    })}</nav>, document.body)}
  </>;
}
