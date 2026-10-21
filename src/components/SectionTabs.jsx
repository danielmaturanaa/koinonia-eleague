// Barra de secciones hermanas de una misma área del sitio (enlaces, no pestañas de contenido): así ninguna ruta queda sin entrada de menú.
const LEAGUE_TABS = [
  ['/torneos', 'TORNEOS'], ['/calculadora', 'CALCULADORA'], ['/equipos', 'CLUBES'], ['/equipos/rankings', 'RANKINGS'], ['/equipos/plantillas', 'PLANTILLAS'],
  ['/equipos/presupuestos', 'PRESUPUESTOS'], ['/equipos/presidentes', 'PRESIDENTES'], ['/equipos/directores-tecnicos', 'DTs'], ['/equipos/emblemas', 'EMBLEMAS'],
];

/** Área "Torneos": torneos, calculadora y el directorio de clubes con sus vistas (rankings, plantillas, presupuestos, presidentes, DTs, emblemas). */
export function LeagueSectionTabs({ current }) {
  return <nav className="classification-view-tabs league-section-tabs" aria-label="Secciones de la liga">
    {LEAGUE_TABS.map(([path, label]) => <a key={path} href={`#${path}`} className={current === path ? 'active' : ''} aria-current={current === path ? 'page' : undefined}>{label}</a>)}
  </nav>;
}
