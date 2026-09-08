import { navigationItems } from '../app/navigation.js';
import { Icon } from './Icon.jsx';

export function Navigation({ route, navigate }) {
  return <aside className="menu-column"><nav aria-label="Menú de la liga">{navigationItems.map(item => {
    const active = item.path === '/'
      ? route.path === '/'
      : route.path === item.path || route.path.startsWith(`${item.path}/`);
    return <div className={`nav-box ${active ? 'selected' : ''} ${item.children ? 'with-children' : ''}`} key={item.label}>
      <button className="nav-primary" aria-current={active ? 'page' : undefined} onClick={() => navigate(item.path)}>
        <Icon type={item.icon}/><span>{item.label}</span>{active && <span className="selection-arrow"/>}
      </button>
      {item.children && <div className="nav-children">{item.children.map(child =>
        <button className={route.path === child.path ? 'active' : ''} key={child.path} onClick={() => navigate(child.path)}>
          <span>›</span>{child.label}
        </button>)}</div>}
    </div>;
  })}</nav></aside>;
}
