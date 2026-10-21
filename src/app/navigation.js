// Menú principal: seis áreas (siete para quien tiene club o es admin). Las demás pantallas cuelgan de una de ellas.
export function navigationFor({ teamId = null, isAdmin = false } = {}) {
  return [
    { label: 'Inicio', path: '/' },
    { label: 'Partidos', path: '/partidos' },
    { label: 'Torneos', path: '/torneos' },
    { label: 'Jugadores', path: '/equipos/jugadores' },
    { label: 'Mercado', path: '/transferencias' },
    ...(teamId ? [{ label: 'Mi club', path: `/equipos/${teamId}` }] : []),
    ...(isAdmin ? [{ label: 'Admin', path: '/admin' }] : []),
  ];
}

const LEAGUE_VIEWS = new Set(['/torneos', '/calculadora', '/clasificacion', '/equipos', '/equipos/rankings', '/equipos/plantillas', '/equipos/presupuestos', '/equipos/presidentes', '/equipos/directores-tecnicos', '/equipos/emblemas', '/equipos/selecciones']);

/** A qué ítem del menú pertenece la pantalla actual (null si no cuelga de ninguno, como Reglas o Notificaciones). */
export function activeNavigationPath(route, teamId = null) {
  if (route.name === 'home' || route.name === 'newsArticle' || route.path === '/noticias') return '/';
  if (route.name === 'player' || route.name === 'card' || route.path.startsWith('/equipos/jugadores')) return '/equipos/jugadores';
  if (route.name === 'team') return teamId && route.teamId === teamId ? `/equipos/${teamId}` : '/torneos';
  if (route.path === '/partidos' || route.path.startsWith('/partidos/') || route.name === 'match' || route.path === '/sanciones') return '/partidos';
  if (LEAGUE_VIEWS.has(route.path)) return '/torneos';
  if (route.path === '/transferencias') return '/transferencias';
  if (route.path === '/admin' || route.path === '/personas') return '/admin';
  return null;
}

export const sectionContent = {
  '/partidos': ['CENTRO DE PARTIDOS', 'Calendario completo de la liga, encuentros en vivo y próximos cruces.'],
  '/partidos/jugados': ['PARTIDOS JUGADOS', 'Historial de encuentros finalizados con acceso a cada acta.'],
  '/partidos/calendario': ['CALENDARIO', 'Partidos de la liga repartidos por día.'],
  '/partidos/pendientes': ['PRÓXIMOS PARTIDOS', 'Programación pendiente organizada por torneo y fecha.'],
  '/clasificacion': ['TORNEOS', 'Tabla, goleadores y playoffs de cada torneo.'],
  '/equipos/rankings': ['RANKINGS Y DIVISIONES', 'Valor de planteles y estructura divisional.'],
  '/equipos/plantillas': ['PLANTILLAS', 'Jugadores titulares, suplentes, dorsales y orden de plantel.'],
  '/equipos/presupuestos': ['PRESUPUESTOS', 'Saldos GP y movimientos económicos de cada institución.'],
  '/equipos/presidentes': ['PRESIDENTES', 'Directorio de responsables de los clubes participantes.'],
  '/equipos/directores-tecnicos': ['DIRECTORES TÉCNICOS', 'Cuerpos técnicos registrados en la liga.'],
  '/equipos/emblemas': ['EMBLEMAS', 'Galería oficial de clubes y selecciones.'],
  '/equipos/selecciones': ['SELECCIONES', 'Equipos nacionales y clubes responsables.'],
  '/equipos/jugadores': ['JUGADORES', 'Buscador y fichas individuales de futbolistas.'],
  '/equipos/jugadores/importar': ['AGREGAR JUGADORES', 'Importación desde eFootballDB y alta manual.'],
  '/transferencias': ['MERCADO', 'Agentes libres, jugadores no inscritos y últimos movimientos.'],
  '/notificaciones': ['NOTIFICACIONES', 'Tus avisos y cómo quieres recibirlos.'],
  '/admin': ['SALA DE CONTROL', 'Herramientas de administración de la liga.'],
  '/sanciones': ['SANCIONES', 'Expulsiones y suspensiones registradas en las actas.'],
  '/torneos': ['TORNEOS', 'Tabla, goleadores y playoffs de cada torneo.'],
  '/calculadora': ['CALCULADORA', 'Probabilidades, escenarios y qué necesita cada equipo.'],
  '/noticias': ['ACTIVIDAD DE LA LIGA', 'Novedades generadas por la actividad oficial de Koinonia e-League.'],
  '/personas': ['PERSONAS Y PERMISOS', 'Quién ha entrado a la web, sus equipos y sus permisos.'],
  '/reglas': ['REGLAS DEL TORNEO', 'Reglamento oficial, condiciones de competencia y criterios deportivos de Koinonia e-League.'],
};
