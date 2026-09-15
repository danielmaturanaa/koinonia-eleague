export function TeamsSectionTabs({ current, navigate }) {
  return <nav className="classification-view-tabs" aria-label="Secciones de equipos">
    <button className={current === 'clubs' ? 'active' : ''} aria-current={current === 'clubs' ? 'page' : undefined} onClick={() => navigate('/equipos')}>EQUIPOS</button>
  </nav>;
}
