import { useEffect, useId, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { Button, EmptyState, Icon } from '../../ui/index.js';
import { useApiQuery } from '../public/useApiQuery.js';
import { CATEGORIES } from './categories.js';
import { NotificationItem } from './NotificationItem.jsx';
import { useNotifications } from './NotificationsProvider.jsx';

const goTo = (navigate, deeplink) => { if (deeplink) navigate(deeplink.replace(/^#/, '')); };

/** Campana del encabezado: contador de avisos sin leer y panel con los últimos, filtrables por categoría. */
export function NotificationBell({ navigate }) {
  const { summary, version, markRead, markAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const rootRef = useRef(null);
  const panelId = useId();
  const list = useApiQuery(signal => open ? endpoints.notifications({ category: category || undefined, limit: 30 }, signal) : Promise.resolve({ data: [] }), [open, category, version]);
  const items = Array.isArray(list.data) ? list.data : [];

  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const openItem = async item => {
    setOpen(false);
    goTo(navigate, item.deeplink);
    if (!item.read) await markRead([item.id]).catch(() => {});
  };
  const chips = [['', 'TODOS', summary.unread], ...CATEGORIES.filter(([id]) => summary.byCategory[id] > 0 || id === category).map(([id, label]) => [id, label, summary.byCategory[id] ?? 0])];
  const count = summary.unread > 99 ? '99+' : summary.unread;
  return <div className="bell" ref={rootRef}>
    <button type="button" className="bell-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId}
      aria-label={summary.unread ? `Avisos: ${summary.unread} sin leer` : 'Avisos'} onClick={() => setOpen(value => !value)}>
      <Icon name="bell" size={22}/>
      {summary.unread > 0 && <span className="bell-badge">{count}</span>}
    </button>
    {open && <section className="bell-panel" id={panelId} role="dialog" aria-label="Avisos">
      <header>
        <h2>AVISOS</h2>
        <div>
          {summary.unread > 0 && <Button variant="ghost" size="sm" onClick={() => markAll(category ? { category } : {}).catch(() => {})}>MARCAR LEÍDO</Button>}
          <Button size="sm" onClick={() => { setOpen(false); navigate('/notificaciones'); }}>VER TODO</Button>
        </div>
      </header>
      {chips.length > 1 && <div className="bell-chips" role="group" aria-label="Filtrar por categoría">
        {chips.map(([id, label, unread]) => <button type="button" key={id || 'all'} className={category === id ? 'on' : ''} aria-pressed={category === id} onClick={() => setCategory(id)}>{label}{unread > 0 && <i>{unread}</i>}</button>)}
      </div>}
      {items.length === 0 && !list.loading
        ? <EmptyState icon="bell" title="SIN AVISOS">Aquí llegan tus ofertas, contratos, finanzas y peticiones.</EmptyState>
        : <ul className="notif-list">{items.map(item => <NotificationItem key={item.id} item={item} onOpen={openItem} showClub={summary.byTeam.length > 1}/>)}</ul>}
    </section>}
  </div>;
}
