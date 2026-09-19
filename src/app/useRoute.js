import { useCallback, useEffect, useState } from 'react';
import { sectionContent } from './navigation.js';

function currentPath() {
  const path = window.location.hash.replace(/^#/, '') || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function parseRoute(fullPath) {
  const [path, search = ''] = fullPath.split('?');
  return { ...matchRoute(path), query: Object.fromEntries(new URLSearchParams(search)) };
}

function matchRoute(path) {
  if (path === '/resultados' || path === '/multipartido') return { name: 'section', path: '/partidos' };
  if (path === '/clasificacion/rankings') return { name: 'section', path: '/equipos/rankings' };
  const cardMatch = path.match(/^\/efootball\/(\d+)$/);
  if (cardMatch) return { name: 'card', path, pesId: Number(cardMatch[1]) };
  const playerMatch = path.match(/^\/jugadores\/([^/]+)$/);
  if (playerMatch) return { name: 'player', path, playerId: decodeURIComponent(playerMatch[1]) };
  const teamMatch = path.match(/^\/equipos\/([^/]+)$/);
  const reservedTeamSections = new Set(['plantillas', 'presupuestos', 'presidentes', 'directores-tecnicos', 'emblemas', 'selecciones', 'jugadores', 'rankings']);
  if (teamMatch && !reservedTeamSections.has(teamMatch[1])) {
    return { name: 'team', path, teamId: decodeURIComponent(teamMatch[1]) };
  }
  const matchMatch = path.match(/^\/partidos\/([^/]+)$/);
  const reservedMatchSections = new Set(['jugados', 'pendientes']);
  if (matchMatch && !reservedMatchSections.has(matchMatch[1])) {
    return { name: 'match', path, matchId: decodeURIComponent(matchMatch[1]) };
  }
  const scoreboardMatch = path.match(/^\/marcador\/([^/]+)$/);
  if (scoreboardMatch) return { name: 'scoreboard', path, matchId: decodeURIComponent(scoreboardMatch[1]) };
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
          : route.name === 'match'
            ? 'Gestión de partido'
            : route.name === 'player'
              ? 'Ficha de jugador'
            : route.name === 'card'
              ? 'Carta eFootball'
            : route.name === 'scoreboard'
              ? 'Marcador en vivo'
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
