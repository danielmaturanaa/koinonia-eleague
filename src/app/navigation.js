// Menú principal "modo carrera": cuatro áreas (más Admin). Todo lo demás cuelga de una de ellas.
//  Inicio = la central de tu club · Liga = tabla, partidos, clubes, estadios y más · Mercado = buscar y fichar · Mi club.
export function navigationFor({ teamId = null, isAdmin = false } = {}) {
  return [
    { label: 'Inicio', path: '/', icon: 'home' },
    { label: 'Liga', path: '/liga', icon: 'trophy' },
    { label: 'Mercado', path: '/transferencias', icon: 'handshake' },
    ...(teamId ? [{ label: 'Mi club', path: `/equipos/${teamId}`, icon: 'shirt' }] : []),
    ...(isAdmin ? [{ label: 'Admin', path: '/admin', icon: 'cog' }] : []),
  ];
}

// Rutas que viven dentro de Liga (las viejas siguen andando y se muestran como una pestaña de Liga).
export const LEAGUE_PATHS = new Set(['/liga', '/torneos', '/calculadora', '/clasificacion', '/partidos', '/partidos/jugados', '/partidos/pendientes', '/partidos/calendario', '/sanciones',
  '/equipos', '/equipos/rankings', '/equipos/plantillas', '/equipos/presupuestos', '/equipos/presidentes', '/equipos/directores-tecnicos', '/equipos/emblemas', '/equipos/selecciones', '/equipos/estadios']);

/** A qué ítem del menú pertenece la pantalla actual (null si no cuelga de ninguno, como Reglas o Notificaciones). */
export function activeNavigationPath(route, teamId = null) {
  if (route.name === 'home' || route.name === 'newsArticle' || route.path === '/noticias') return '/';
  if (route.name === 'player' || route.name === 'card' || route.path.startsWith('/equipos/jugadores') || route.path === '/transferencias') return '/transferencias';
  if (route.name === 'team') return teamId && route.teamId === teamId ? `/equipos/${teamId}` : '/liga';
  if (route.name === 'match' || LEAGUE_PATHS.has(route.path)) return '/liga';
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
  '/equipos/estadios': ['ESTADIOS', 'Catálogo de estadios de la liga: fotos, aforo, precio y dueño.'],
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
