import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { AudioControls } from '../../audio/AudioControls.jsx';
import { Button, EmptyState, Notice, Tabs, useToast } from '../../ui/index.js';
import { PageHeader } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { CATEGORIES } from './categories.js';
import { NotificationItem } from './NotificationItem.jsx';
import { useNotifications } from './NotificationsProvider.jsx';

const TABS = [{ id: 'avisos', label: 'AVISOS' }, { id: 'preferencias', label: 'PREFERENCIAS' }];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function Feed({ navigate }) {
  const { summary, version, markRead, markAll } = useNotifications();
  const [category, setCategory] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [extra, setExtra] = useState([]);
  const [exhausted, setExhausted] = useState(false);
  const first = useApiQuery(signal => endpoints.notifications({ category: category || undefined, unread: unreadOnly ? 1 : undefined, limit: 30 }, signal), [category, unreadOnly, version]);
  useEffect(() => { setExtra([]); setExhausted(false); }, [category, unreadOnly, version]);
  const items = [...(Array.isArray(first.data) ? first.data : []), ...extra];
  const more = async () => {
    const last = items.at(-1);
    const page = (await endpoints.notifications({ category: category || undefined, unread: unreadOnly ? 1 : undefined, limit: 30, before: last.createdAt }))?.data ?? [];
    setExtra(current => [...current, ...page]);
    if (page.length < 30) setExhausted(true);
  };
  const open = async item => {
    navigate(item.deeplink.replace(/^#/, ''));
    if (!item.read) await markRead([item.id]).catch(() => {});
  };
  return <section className="notif-feed">
    <div className="notif-toolbar">
      <div className="bell-chips" role="group" aria-label="Filtrar por categoría">
        <button type="button" className={category === '' ? 'on' : ''} aria-pressed={category === ''} onClick={() => setCategory('')}>TODOS</button>
        {CATEGORIES.map(([id, label]) => <button type="button" key={id} className={category === id ? 'on' : ''} aria-pressed={category === id} onClick={() => setCategory(id)}>{label}{summary.byCategory[id] > 0 && <i>{summary.byCategory[id]}</i>}</button>)}
      </div>
      <div className="notif-actions">
        <label><input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)}/> SOLO SIN LEER</label>
        {summary.unread > 0 && <Button variant="ghost" size="sm" onClick={() => markAll(category ? { category } : {}).catch(() => {})}>MARCAR TODO LEÍDO</Button>}
      </div>
    </div>
    {items.length === 0 && !first.loading
      ? <EmptyState icon="bell" title="SIN AVISOS">CUANDO PASE ALGO EN TU CLUB (UNA OFERTA, UN CONTRATO, UN COBRO) LO VAS A VER AQUÍ.</EmptyState>
      : <ul className="notif-list">{items.map(item => <NotificationItem key={item.id} item={item} onOpen={open} showClub={summary.byTeam.length > 1}/>)}</ul>}
    {items.length >= 30 && !exhausted && items.length % 30 === 0 && <Button variant="ghost" onClick={() => more().catch(() => {})}>VER MÁS</Button>}
  </section>;
}

function Preferences() {
  const toast = useToast();
  const query = useApiQuery(signal => endpoints.notificationPreferences(signal), []);
  const [prefs, setPrefs] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { if (query.data) setPrefs(query.data); }, [query.data]);
  const save = async patch => {
    setError(null);
    try {
      const response = await endpoints.setNotificationPreferences(patch);
      setPrefs(current => ({ ...current, ...response.data }));
      toast({ tone: 'success', title: 'PREFERENCIAS GUARDADAS' });
    } catch (failure) { setError(failure); }
  };
  if (!prefs) return <p className="empty-copy">{query.error ? query.error.message : 'CARGANDO PREFERENCIAS…'}</p>;
  const quietValue = value => (value === null || value === undefined ? '' : String(value));
  const setQuiet = (from, to) => save({ quietFrom: from === '' ? null : Number(from), quietTo: to === '' ? null : Number(to) });
  return <section className="notif-prefs">
    <p className="notif-note">ELIGE QUÉ AVISOS QUIERES POR CADA CANAL. LA WEB, DISCORD (MENSAJE DIRECTO DEL BOT) Y LOS SONIDOS YA FUNCIONAN. EL SONIDO SUENA CUANDO TIENES LA WEB ABIERTA.</p>
    {prefs.discordDmBlocked && <Notice tone="error">DISCORD NO NOS DEJA ESCRIBIRTE POR MENSAJE DIRECTO. ACTIVA «PERMITIR MENSAJES DIRECTOS DE MIEMBROS DEL SERVIDOR» EN LOS AJUSTES DE PRIVACIDAD DEL SERVIDOR; CON EL PRÓXIMO AVISO SE RESTABLECE SOLO. MIENTRAS TANTO TODO SE VE EN LA CAMPANA.</Notice>}
    <table className="notif-prefs-table">
      <thead><tr><th scope="col">CATEGORÍA</th><th scope="col">WEB</th><th scope="col">DISCORD</th><th scope="col">SONIDO</th></tr></thead>
      <tbody>{CATEGORIES.map(([id, label]) => <tr key={id}>
        <th scope="row">{label}</th>
        {['web', 'discord', 'sound'].map(channel => <td key={channel}>
          <input type="checkbox" aria-label={`${label}: ${channel}`} checked={prefs.categories[id]?.[channel] ?? true} disabled={prefs.muted}
            onChange={event => save({ categories: { [id]: { [channel]: event.target.checked } } })}/>
        </td>)}
      </tr>)}</tbody>
    </table>
    <div className="notif-quiet">
      <label className="notif-mute"><input type="checkbox" checked={prefs.muted} onChange={event => save({ muted: event.target.checked })}/> SILENCIAR TODOS LOS AVISOS</label>
      <div className="notif-hours">
        <span>NO MOLESTAR (HORA DE CHILE)</span>
        <label>DESDE <select value={quietValue(prefs.quietFrom)} onChange={event => setQuiet(event.target.value, event.target.value === '' ? '' : quietValue(prefs.quietTo) || '8')}>
          <option value="">SIN HORARIO</option>{HOURS.map(hour => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>
        <label>HASTA <select value={quietValue(prefs.quietTo)} disabled={prefs.quietFrom === null} onChange={event => setQuiet(quietValue(prefs.quietFrom), event.target.value)}>
          {HOURS.map(hour => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>
      </div>
      <small>EL HORARIO DE SILENCIO CORTA DISCORD Y SONIDOS; LA CAMPANA DE LA WEB SIGUE ACUMULANDO.</small>
    </div>
    {error && <Notice tone="error">{error.message}</Notice>}
    <section className="notif-audio">
      <h3>AUDIO DE ESTE NAVEGADOR</h3>
      <p>EL VOLUMEN Y EL SILENCIO SON DE ESTE DISPOSITIVO; LAS CATEGORÍAS DE ARRIBA DECIDEN QUÉ AVISOS SUENAN.</p>
      <AudioControls/>
    </section>
  </section>;
}

/** Todos tus avisos y cómo quieres recibirlos. */
export function NotificationsPage({ navigate, initialTab = 'avisos' }) {
  const [tab, setTab] = useState(TABS.some(item => item.id === initialTab) ? initialTab : 'avisos');
  useEffect(() => { if (TABS.some(item => item.id === initialTab)) setTab(initialTab); }, [initialTab]);
  return <main className="newspaper data-page"><section className="data-paper notifications-page">
    <PageHeader kicker="CENTRAL DE AVISOS" title="NOTIFICACIONES"/>
    <Tabs tabs={TABS} value={tab} onChange={setTab} label="Secciones de notificaciones"/>
    {tab === 'avisos' ? <Feed navigate={navigate}/> : <Preferences/>}
  </section></main>;
}
