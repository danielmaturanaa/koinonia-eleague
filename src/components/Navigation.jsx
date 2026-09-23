import { useEffect, useState } from 'react';
import { navigationItems } from '../app/navigation.js';

export function Navigation({ route, navigate, teams = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeItemPath = navigationItems
    .filter(item => item.path === '/' ? route.path === '/' : route.path === item.path || route.path.startsWith(`${item.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0]?.path;

  useEffect(() => {
    setMenuOpen(false);
  }, [route.path]);

  const go = path => {
    setMenuOpen(false);
    document.activeElement?.blur?.();
    navigate(path);
  };

  return <div className="site-nav">
    <button className="mobile-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="league-navigation" aria-label="Menú" onClick={() => setMenuOpen(open => !open)}>
      <span className="hamburger-icon" aria-hidden="true"><i/><i/><i/></span>
    </button>
    <nav id="league-navigation" className={menuOpen ? 'mobile-open' : ''} aria-label="Menú de la liga">{navigationItems.map(item => {
      const active = item.path === activeItemPath;
      return <button className={`nav-link ${active ? 'selected' : ''}`} key={item.path} aria-current={active ? 'page' : undefined} onClick={() => go(item.path)}>{item.label}</button>;
    })}</nav>
  </div>;
}
