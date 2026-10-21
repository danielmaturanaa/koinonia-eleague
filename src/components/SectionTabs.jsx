// Barras de secciones hermanas de una misma área del sitio (enlaces, no pestañas de contenido): así ninguna ruta queda sin entrada de menú.
const LEAGUE_TABS = [['/torneos', 'TORNEOS'], ['/calculadora', 'CALCULADORA']];
const CLUB_TABS = [
  ['/equipos', 'CLUBES'], ['/equipos/estadios', 'ESTADIOS'], ['/equipos/rankings', 'RANKINGS'], ['/equipos/plantillas', 'PLANTILLAS'],
  ['/equipos/presupuestos', 'PRESUPUESTOS'], ['/equipos/presidentes', 'PRESIDENTES'], ['/equipos/directores-tecnicos', 'DTs'], ['/equipos/emblemas', 'EMBLEMAS'],
];

/** Barra del área: Torneos (torneos y calculadora) o Equipos (clubes, estadios, rankings, plantillas, presupuestos, presidentes, DTs, emblemas). */
export function LeagueSectionTabs({ current }) {
  const tabs = LEAGUE_TABS.some(([path]) => path === current) ? LEAGUE_TABS : CLUB_TABS;
  return <nav className="classification-view-tabs league-section-tabs" aria-label={tabs === LEAGUE_TABS ? 'Secciones de torneos' : 'Secciones de equipos'}>
    {tabs.map(([path, label]) => <a key={path} href={`#${path}`} className={current === path ? 'active' : ''} aria-current={current === path ? 'page' : undefined}>{label}</a>)}
  </nav>;
}
