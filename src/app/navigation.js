export const navigationItems = [
  { label: 'Inicio', icon: 'ball', path: '/' },
  { label: 'Partidos', icon: 'pitch', path: '/partidos' },
  {
    label: 'Clasificación', icon: 'chart', path: '/clasificacion',
    children: [
      { label: 'Torneo', path: '/clasificacion' },
      { label: 'Rankings', path: '/clasificacion/rankings' },
    ],
  },
  {
    label: 'Equipos', icon: 'shirt', path: '/equipos',
    children: [
      { label: 'Plantillas', path: '/equipos/plantillas' },
      { label: 'Presupuestos', path: '/equipos/presupuestos' },
      { label: 'Presidente', path: '/equipos/presidentes' },
      { label: 'DT', path: '/equipos/directores-tecnicos' },
      { label: 'Emblemas', path: '/equipos/emblemas' },
      { label: 'Selecciones', path: '/equipos/selecciones' },
      { label: 'Jugadores', path: '/equipos/jugadores' },
    ],
  },
  { label: 'Transferencias', icon: 'arrows', path: '/transferencias' },
  { label: 'Torneos', icon: 'cup', path: '/torneos' },
  { label: 'Noticias', icon: 'news', path: '/noticias' },
];

export const sectionContent = {
  '/partidos': ['CENTRO DE PARTIDOS', 'Calendario completo de la liga, encuentros en vivo y próximos cruces.'],
  '/partidos/jugados': ['PARTIDOS JUGADOS', 'Historial de encuentros finalizados con acceso a cada acta.'],
  '/partidos/pendientes': ['PRÓXIMOS PARTIDOS', 'Programación pendiente organizada por torneo y fecha.'],
  '/clasificacion': ['CLASIFICACIÓN', 'Tablas, goleadores y rankings oficiales de la competencia.'],
  '/clasificacion/rankings': ['RANKINGS Y DIVISIONES', 'Valor de planteles y estructura divisional.'],
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
};
