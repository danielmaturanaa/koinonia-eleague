export const navigationItems = [
  { label: 'Inicio', path: '/' },
  { label: 'Partidos', path: '/partidos' },
  { label: 'Clasificación', path: '/clasificacion' },
  { label: 'Torneos', path: '/torneos' },
  { label: 'Equipos', path: '/equipos' },
  { label: 'Jugadores', path: '/equipos/jugadores' },
  { label: 'Mercado', path: '/transferencias' },
  // Selecciones se reactiva cuando la competición nacional vuelva a utilizarse.
  { label: 'Noticias', path: '/noticias' },
  { label: 'Reglas', path: '/reglas' },
];

export const sectionContent = {
  '/partidos': ['CENTRO DE PARTIDOS', 'Calendario completo de la liga, encuentros en vivo y próximos cruces.'],
  '/partidos/jugados': ['PARTIDOS JUGADOS', 'Historial de encuentros finalizados con acceso a cada acta.'],
  '/partidos/pendientes': ['PRÓXIMOS PARTIDOS', 'Programación pendiente organizada por torneo y fecha.'],
  '/clasificacion': ['CLASIFICACIÓN', 'Tablas y goleadores de torneos activos y completados.'],
  '/equipos/rankings': ['RANKINGS Y DIVISIONES', 'Valor de planteles y estructura divisional.'],
  '/equipos/plantillas': ['PLANTILLAS', 'Jugadores titulares, suplentes, dorsales y orden de plantel.'],
  '/equipos/presupuestos': ['PRESUPUESTOS', 'Saldos GP y movimientos económicos de cada institución.'],
  '/equipos/presidentes': ['PRESIDENTES', 'Directorio de responsables de los clubes participantes.'],
  '/equipos/directores-tecnicos': ['DIRECTORES TÉCNICOS', 'Cuerpos técnicos registrados en la liga.'],
  '/equipos/emblemas': ['EMBLEMAS', 'Galería oficial de clubes y selecciones.'],
  '/equipos/selecciones': ['SELECCIONES', 'Equipos nacionales y clubes responsables.'],
  '/equipos/jugadores': ['JUGADORES', 'Buscador y fichas individuales de futbolistas.'],
  '/transferencias': ['MERCADO DE FICHAJES', 'Transferencias, trueques y jugadores libres.'],
  '/sanciones': ['SANCIONES', 'Expulsiones y suspensiones registradas en las actas.'],
  '/torneos': ['TORNEOS', 'Ligas, copas, grupos, llaves y movimientos divisionales.'],
  '/noticias': ['ACTIVIDAD DE LA LIGA', 'Novedades generadas por la actividad oficial de Koinonia e-League.'],
  '/reglas': ['REGLAS DEL TORNEO', 'Reglamento oficial, condiciones de competencia y criterios deportivos de Koinonia e-League.'],
};
