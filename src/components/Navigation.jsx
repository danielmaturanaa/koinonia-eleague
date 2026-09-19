import { useEffect, useState } from 'react';
import { navigationItems } from '../app/navigation.js';
import { TeamMark } from './TeamMark.jsx';

// En escritorio, pasar el mouse (o el foco) por Equipos despliega los clubes.
function TeamsMenu({ teams, navigate }) {
  if (!teams.length) return null;
  const sorted = [...teams].sort((left, right) => left.name.localeCompare(right.name, 'es'));
  return <div className="nav-dropdown" role="menu" aria-label="Equipos de la liga">
    <div className="nav-dropdown-grid">{sorted.map(team => <button type="button" role="menuitem" key={team.id} onClick={() => navigate(`/equipos/${encodeURIComponent(team.id)}`)}><TeamMark team={team}/><span>{team.name}</span></button>)}</div>
    <button type="button" role="menuitem" className="nav-dropdown-all" onClick={() => navigate('/equipos')}>VER TODOS LOS EQUIPOS →</button>
  </div>;
}

export function Navigation({ route, navigate, teams = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeItemPath = navigationItems
    .filter(item => item.path === '/' ? route.path === '/' : route.path === item.path || route.path.startsWith(`${item.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0]?.path;

  useEffect(() => setMenuOpen(false), [route.path]);

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
      const link = <button className={`nav-link ${active ? 'selected' : ''}`} key={item.path} aria-current={active ? 'page' : undefined} aria-haspopup={item.path === '/equipos' ? 'menu' : undefined} onClick={() => go(item.path)}>{item.label}</button>;
      return item.path === '/equipos' ? <div className="nav-item-with-menu" key={item.path}>{link}<TeamsMenu teams={teams} navigate={go}/></div> : link;
    })}</nav>
  </div>;
}
