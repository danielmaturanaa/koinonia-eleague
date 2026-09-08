import { useCallback, useEffect, useState } from 'react';
import { sectionContent } from './navigation.js';

function currentPath() {
  const path = window.location.hash.replace(/^#/, '') || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function parseRoute(path) {
  if (path === '/resultados') return { name: 'section', path: '/partidos' };
  const teamMatch = path.match(/^\/equipos\/([^/]+)$/);
  const reservedTeamSections = new Set(['plantillas', 'presupuestos', 'presidentes', 'directores-tecnicos', 'emblemas', 'selecciones', 'jugadores']);
  if (teamMatch && !reservedTeamSections.has(teamMatch[1])) {
    return { name: 'team', path, teamId: decodeURIComponent(teamMatch[1]) };
  }
  if (path === '/') return { name: 'home', path };
  if (path === '/equipos') return { name: 'teams', path };
  return { name: 'section', path };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(currentPath()));

  useEffect(() => {
    const update = () => setRoute(parseRoute(currentPath()));
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    const title = route.name === 'home'
      ? 'Inicio'
      : route.name === 'teams'
        ? 'Equipos'
        : route.name === 'team'
          ? 'Ficha de equipo'
          : sectionContent[route.path]?.[0] ?? 'Koinonia e-League';
    document.title = `${title} | Koinonia e-League`;
  }, [route]);

  const navigate = useCallback(path => {
    if (currentPath() === path) {
      setRoute(parseRoute(path));
      return;
    }
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
