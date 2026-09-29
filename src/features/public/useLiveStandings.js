import { useEffect } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useApiQuery } from './useApiQuery.js';

const LIVE_REFRESH_MS = 12000;

// La tabla siempre se consulta como proyección: si no hay partidos en curso la
// API devuelve los mismos números oficiales, sin necesidad de dos fuentes.
export function useLiveStandings(tournamentId, groupLabel = null) {
  const query = useApiQuery(signal => tournamentId ? endpoints.standings(tournamentId, {
    ...(groupLabel ? { group: groupLabel } : {}), live: 1,
  }, signal) : Promise.resolve({ data: [] }), [tournamentId, groupLabel]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') query.retry();
    };
    const timer = window.setInterval(refresh, LIVE_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [query.retry]);

  return query;
}
