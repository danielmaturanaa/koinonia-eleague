import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

const ToastContext = createContext(() => {});
const MAX_VISIBLE = 4;
const TONE_ICON = { success: 'check', error: 'warning', info: 'bell', money: 'coin' };

/** Avisos efímeros arriba a la derecha. Uso: `const toast = useToast(); toast({ tone, title, body })`. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const nextId = useRef(1);
  const dismiss = useCallback(id => setItems(list => list.filter(item => item.id !== id)), []);
  const push = useCallback(({ tone = 'info', title, body, icon, href, timeout = 5000 }) => {
    const id = nextId.current++;
    setItems(list => [...list.slice(-(MAX_VISIBLE - 1)), { id, tone, title, body, href, icon: icon ?? TONE_ICON[tone] ?? 'bell' }]);
    if (timeout) window.setTimeout(() => dismiss(id), timeout);
    return id;
  }, [dismiss]);
  const value = useMemo(() => push, [push]);
  return <ToastContext.Provider value={value}>
    {children}
    <div className="ui-toasts" aria-live="polite" aria-relevant="additions">
      {items.map(item => <div key={item.id} className={`ui-toast ui-toast--${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'}>
        <Icon name={item.icon} size={20}/>
        {item.href
          ? <a className="ui-toast__link" href={item.href} onClick={() => dismiss(item.id)}><b>{item.title}</b>{item.body && <p>{item.body}</p>}</a>
          : <div><b>{item.title}</b>{item.body && <p>{item.body}</p>}</div>}
        <button type="button" aria-label="Cerrar aviso" onClick={() => dismiss(item.id)}>✕</button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
