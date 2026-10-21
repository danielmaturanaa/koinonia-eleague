import { useEffect, useState } from 'react';
import { useAuth } from '../app/AuthGate.jsx';
import { activeNavigationPath, navigationFor } from '../app/navigation.js';

export function Navigation({ route, navigate, teams = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { teamId, isAdmin } = useAuth();
  const navigationItems = navigationFor({ teamId, isAdmin });
  const activeItemPath = activeNavigationPath(route, teamId);

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
