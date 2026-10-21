import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { playSound } from '../../audio/synth.js';
import { useToast } from '../../ui/index.js';
import { soundAllowed, soundFor } from './notificationSound.js';
import { categoryIcon } from './categories.js';

const EMPTY = { unread: 0, byCategory: {}, byTeam: [], latest: null };
const POLL_MS = 15000;
const MAX_TOASTS = 3;

const NotificationsContext = createContext({ summary: EMPTY, version: 0, refresh: () => {}, markRead: async () => 0, markAll: async () => 0 });
export const useNotifications = () => useContext(NotificationsContext);

/**
 * Latido de los avisos: pide el resumen cada 15 s (y al volver a la pestaña), avisa con un toast lo que llegó y deja que
 * la campana y las pantallas se refresquen cuando algo cambia (`version`).
 */
export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [summary, setSummary] = useState(EMPTY);
  const [version, setVersion] = useState(0);
  const known = useRef(null); // ids ya conocidos; null hasta la primera carga (lo que había al entrar no se anuncia)
  const previous = useRef({ unread: -1, latestId: null });
  const busy = useRef(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const announce = useCallback(async () => {
    const items = (await endpoints.notifications({ unread: 1, limit: 10 }))?.data ?? [];
    const fresh = items.filter(item => !known.current.has(item.id));
    items.forEach(item => known.current.add(item.id));
    fresh.slice(0, MAX_TOASTS).reverse().forEach(item => toastRef.current({ tone: 'info', icon: categoryIcon(item.category), title: item.title, body: (item.body ?? '').split('\n')[0], href: item.deeplink?.startsWith('#') ? item.deeplink : `#${item.deeplink ?? '/notificaciones'}`, timeout: 8000, sound: false }));
    if (fresh.length > MAX_TOASTS) toastRef.current({ tone: 'info', title: `${fresh.length - MAX_TOASTS} AVISOS MÁS`, href: '#/notificaciones', timeout: 6000, sound: false });
    // Un solo sonido por tanda (el del aviso más urgente), solo si sus preferencias lo permiten.
    if (fresh.length) {
      const prefs = (await endpoints.notificationPreferences().catch(() => null))?.data ?? null;
      // Los avisos de prioridad baja (lo que hizo otro club, cambios de valor) no suenan.
      const audible = fresh.filter(item => item.priority !== 'low' && soundAllowed(prefs, item.category));
      const top = audible.find(item => item.priority === 'high') ?? audible[0];
      if (top) playSound(soundFor(top));
    }
  }, []);

  const refresh = useCallback(async () => {
    // Una sola consulta a la vez: el latido, el regreso a la pestaña y "marcar leído" no se pisan ni repiten avisos.
    if (busy.current) return;
    busy.current = true;
    try {
      const next = (await endpoints.notificationSummary())?.data ?? EMPTY;
      const before = previous.current;
      previous.current = { unread: next.unread, latestId: next.latest?.id ?? null };
      if (known.current === null) {
        const items = (await endpoints.notifications({ unread: 1, limit: 100 }))?.data ?? [];
        known.current = new Set(items.map(item => item.id));
      } else if (next.unread > before.unread || (next.latest?.id && next.latest.id !== before.latestId)) {
        await announce();
      }
      if (next.unread !== before.unread || next.latest?.id !== before.latestId) setVersion(value => value + 1);
      setSummary(next);
    } catch { /* sin red o sesión vencida: el próximo latido lo reintenta */ }
    finally { busy.current = false; }
  }, [announce]);

  useEffect(() => {
    if (!user) return undefined;
    known.current = null;
    previous.current = { unread: -1, latestId: null };
    refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [user, refresh]);

  const markRead = useCallback(async ids => {
    const response = await endpoints.markNotificationsRead({ ids });
    await refresh();
    return response?.data?.read ?? 0;
  }, [refresh]);
  const markAll = useCallback(async (scope = {}) => {
    const response = await endpoints.markNotificationsRead(scope.category ? { category: scope.category } : { all: true });
    await refresh();
    return response?.data?.read ?? 0;
  }, [refresh]);

  const value = useMemo(() => ({ summary, version, refresh, markRead, markAll }), [summary, version, refresh, markRead, markAll]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
