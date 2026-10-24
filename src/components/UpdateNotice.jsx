import { useEffect, useState } from 'react';

const BUNDLE = /\/assets\/index-[\w-]+\.js/;
const CHECK_EVERY = 5 * 60 * 1000;

/** Avisa cuando se publicó una versión nueva de la página: un celular que dejó la pestaña abierta días sigue con el código viejo. */
export function UpdateNotice() {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const current = [...document.scripts].map(script => script.src.match(BUNDLE)?.[0]).find(Boolean);
    // En desarrollo no hay paquete con hash: nada que comparar.
    if (!current) return undefined;
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const html = await (await fetch(`/?v=${Date.now()}`, { cache: 'no-store' })).text();
        const latest = html.match(BUNDLE)?.[0];
        if (latest && latest !== current) setStale(true);
      } catch { /* sin red: se reintenta en la próxima vuelta */ }
    };
    const timer = setInterval(check, CHECK_EVERY);
    document.addEventListener('visibilitychange', check);
    check();
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, []);
  if (!stale) return null;
  return <div className="update-notice" role="status">
    <span>HAY UNA VERSIÓN NUEVA DE LA PÁGINA</span>
    <button type="button" onClick={() => window.location.reload()}>ACTUALIZAR</button>
  </div>;
}
