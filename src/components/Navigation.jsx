import { useEffect, useState } from 'react';
import { navigationItems } from '../app/navigation.js';
import { Icon } from './Icon.jsx';

export function Navigation({ route, navigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [route.path]);

  const goTo = path => {
    setMenuOpen(false);
    navigate(path);
  };

  return <aside className="menu-column">
    <button className="mobile-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="league-navigation" onClick={() => setMenuOpen(open => !open)}>
      <span className="hamburger-icon" aria-hidden="true"><i/><i/><i/></span>
      <b>MENÚ</b>
    </button>
    <nav id="league-navigation" className={menuOpen ? 'mobile-open' : ''} aria-label="Menú de la liga">{navigationItems.map(item => {
    const active = item.path === '/'
      ? route.path === '/'
      : route.path === item.path || route.path.startsWith(`${item.path}/`);
    return <div className={`nav-box ${active ? 'selected' : ''} ${item.children ? 'with-children' : ''}`} key={item.label}>
      <button className="nav-primary" aria-current={active ? 'page' : undefined} onClick={() => goTo(item.path)}>
        <Icon type={item.icon}/><span>{item.label}</span>
      </button>
      {item.children && <div className="nav-children">{item.children.map(child =>
        <button className={route.path === child.path ? 'active' : ''} key={child.path} onClick={() => goTo(child.path)}>
          <span>›</span>{child.label}
        </button>)}</div>}
    </div>;
  })}</nav></aside>;
}
