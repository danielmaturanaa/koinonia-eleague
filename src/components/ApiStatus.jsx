import { useCallback, useEffect, useState } from 'react';
import { endpoints } from '../api/endpoints.js';

export function ApiStatus() {
  const [state, setState] = useState({ status: 'checking', checkedAt: null });

  const check = useCallback(async signal => {
    setState(current => ({ ...current, status: 'checking' }));
    try {
      await endpoints.health(signal);
      setState({ status: 'online', checkedAt: new Date() });
    } catch (error) {
      if (error?.code !== 'REQUEST_ABORTED') setState({ status: 'offline', checkedAt: new Date() });
    }
  }, []);

  useEffect(() => {
    let controller = new AbortController();
    const run = () => {
      controller.abort();
      controller = new AbortController();
      check(controller.signal);
    };
    run();
    const timer = window.setInterval(run, 30000);
    window.addEventListener('online', run);
    window.addEventListener('offline', run);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('online', run);
      window.removeEventListener('offline', run);
    };
  }, [check]);

  const labels = { checking: 'COMPROBANDO API', online: 'API EN LÍNEA', offline: 'API SIN RESPUESTA' };
  const checked = state.checkedAt?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return <button className={`api-status api-${state.status}`} type="button" onClick={() => check(new AbortController().signal)} title={checked ? `Última comprobación: ${checked}` : 'Comprobando conexión'} aria-live="polite"><i/>{labels[state.status]}</button>;
}
