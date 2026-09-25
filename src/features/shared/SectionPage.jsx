import { sectionContent } from '../../app/navigation.js';

export function SectionPage({ path }) {
  const known = Boolean(sectionContent[path]);
  const [title, description] = sectionContent[path] ?? ['SECCIÓN NO ENCONTRADA', 'La dirección no corresponde a ninguna sección de la liga.'];
  return <main className="newspaper section-page"><section className="section-paper">
    <p className="section-kicker">KOINONIA e-LEAGUE · CENTRO DE DATOS</p>
    <h1>{title}</h1>
    <div className="section-divider"><span>◆</span></div>
    <p>{description}</p>
    {known ? <aside><b>PRÓXIMAMENTE</b><span>Esta sección todavía no tiene datos publicados.</span></aside> : <a className="action-button" href="#/">← VOLVER AL INICIO</a>}
  </section></main>;
}
