import { sectionContent } from '../../app/navigation.js';

export function SectionPage({ path }) {
  const [title, description] = sectionContent[path] ?? ['SECCIÓN NO ENCONTRADA', 'Selecciona una opción disponible en el menú principal.'];
  return <main className="newspaper section-page"><section className="section-paper">
    <p className="section-kicker">KOINONIA e-LEAGUE · CENTRO DE DATOS</p>
    <h1>{title}</h1>
    <div className="section-divider"><span>◆</span></div>
    <p>{description}</p>
    <aside><b>ESTRUCTURA PREPARADA</b><span>Esta sección ya cuenta con navegación propia y recibirá sus datos oficiales en la siguiente fase.</span></aside>
  </section></main>;
}
