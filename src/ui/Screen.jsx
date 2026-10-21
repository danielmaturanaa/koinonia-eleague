import { createContext, useContext, useRef } from 'react';
import { Tabs } from './Tabs.jsx';

// Dentro de una Screen, las páginas antiguas que se reutilizan como pestaña no pintan su propio encabezado ni su papel.
const EmbeddedContext = createContext(false);
export const useEmbedded = () => useContext(EmbeddedContext);

/**
 * Plantilla única de pantalla (estilo menú de FIFA): franja con el nombre del área, título grande, una frase de qué se
 * hace aquí y, como mucho, una fila de pestañas. Todo lo de adentro va en tarjetas.
 * tabs: [{ id, label, badge }] · actions: botones a la derecha del título.
 */
export function Screen({ kicker, title, intro, tabs = null, active = null, onTab, actions = null, hero = null, className = '', children }) {
  const root = useRef(null);
  // Al cambiar de pestaña, si ya bajaste, la pantalla vuelve a mostrar las pestañas arriba.
  const changeTab = id => {
    onTab?.(id);
    const top = root.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) root.current.scrollIntoView({ block: 'start' });
  };
  return <main className={`screen ${className}`} ref={root}>
    <header className="screen-head">
      {hero}
      <div className="screen-head-copy">
        {kicker && <p className="screen-kicker">{kicker}</p>}
        <h1>{title}</h1>
        {intro && <p className="screen-intro">{intro}</p>}
      </div>
      {actions && <div className="screen-actions">{actions}</div>}
    </header>
    {tabs && tabs.length > 1 && <Tabs className="screen-tabs" tabs={tabs} value={active} onChange={changeTab} label={`Secciones de ${String(title).toLowerCase()}`}/>}
    <div className="screen-body"><EmbeddedContext.Provider value={true}>{children}</EmbeddedContext.Provider></div>
  </main>;
}

/** Tarjeta grande y apretable (las del menú de FIFA): ícono, título, el dato importante y una línea de detalle. */
export function Tile({ href, onClick, icon = null, title, value = null, detail = null, tone = 'paper', badge = null, size = 'md', children }) {
  const Tag = href ? 'a' : onClick ? 'button' : 'div';
  return <Tag className={`tile tile--${tone} tile--${size}`} {...(href ? { href } : {})} {...(onClick ? { type: 'button', onClick } : {})}>
    <span className="tile-head">{icon}<b>{title}</b>{badge > 0 && <em className="tile-badge">{badge}</em>}</span>
    {value !== null && <strong className="tile-value">{value}</strong>}
    {detail && <small className="tile-detail">{detail}</small>}
    {children}
    {(href || onClick) && <i className="tile-go" aria-hidden="true">›</i>}
  </Tag>;
}
