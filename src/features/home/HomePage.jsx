import { useLayoutEffect, useRef, useState } from 'react';
import { useAutomaticNews } from '../news/useAutomaticNews.js';
import { formatDate } from '../public/DataStates.jsx';
import { NewsArtwork } from '../../components/NewsArtwork.jsx';

function FittedHeadline({ children }) {
  const headlineRef = useRef(null);
  useLayoutEffect(() => {
    const node = headlineRef.current;
    if (!node) return undefined;
    const fit = () => {
      node.style.fontSize = '';
      if (window.innerWidth <= 900) return;
      let minimum = 24;
      let maximum = 42;
      while (maximum - minimum > .5) {
        const candidate = (minimum + maximum) / 2;
        node.style.fontSize = `${candidate}px`;
        if (node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1) minimum = candidate;
        else maximum = candidate;
      }
      node.style.fontSize = `${minimum}px`;
    };
    const frame = window.requestAnimationFrame(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(node.parentElement);
    document.fonts?.ready.then(fit);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, [children]);
  return <span ref={headlineRef} className="headline-result">{children}</span>;
}

function NewsModal({ item, teams, onClose }) {
  if (!item) return null;
  return <div className="news-detail-backdrop" role="presentation" onClick={onClose}><article className="news-detail-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}><button className="news-detail-close" onClick={onClose} aria-label="Cerrar noticia">×</button><NewsArtwork item={item} teams={teams}/><time>{item.publishedAt ?? item.date ? formatDate(item.publishedAt ?? item.date) : 'FECHA NO PUBLICADA'}</time><h2>{item.headline}</h2>{item.subtitle && <h3>{item.subtitle}</h3>}<p>{item.body}</p>{item.body2 && <p className="news-story-angle">{item.body2}</p>}</article></div>;
}

function SecondaryNews({ item, teams, onOpen }) {
  if (!item) return <article className="small-story automatic-small-story"><h3>ACTUALIZACIÓN</h3><h4>ESPERANDO NUEVAS NOTICIAS</h4><p>La portada se actualizará cuando la API publique un nuevo evento.</p></article>;
  return <article className={`small-story automatic-small-story news-${item.type}-${item.subtype}`} data-image={item.image?.id ?? ''}><h3>{item.label}</h3><div className="secondary-news-content"><NewsArtwork item={item} teams={teams}/><div><time>{item.publishedAt ?? item.date ? formatDate(item.publishedAt ?? item.date) : 'FECHA NO PUBLICADA'}</time><h4>{item.headline}</h4><p>{item.subtitle ?? item.body}</p><button className="news-read-more" onClick={() => onOpen(item)}>LEER NOTICIA COMPLETA</button></div></div></article>;
}

export function HomePage({ tournament, lead, teams = [] }) {
  const [selectedNews, setSelectedNews] = useState(null);
  const { news, loading } = useAutomaticNews();
  const latest = news[0];
  const fallbackHeadline = lead ? `${lead.homeTeam.name} VS ${lead.awayTeam.name}` : 'LA LIGA EN PREPARACIÓN';
  const fallbackBody = lead ? `La fecha ${lead.roundNumber ?? 'actual'} enfrentará a ${lead.homeTeam.name} y ${lead.awayTeam.name}.` : 'La liga aún no tiene partidos próximos publicados.';
  return <main className="newspaper"><section className="main-edition">
    <header className="newspaper-header"><h1><span>KOINONIA <em>e-LEAGUE</em> NEWS</span></h1><p>FÚTBOL VIRTUAL. PASIÓN REAL.</p><div className="edition-date">ÚLTIMA HORA<br/><time>{latest?.publishedAt ?? latest?.date ? formatDate(latest.publishedAt ?? latest.date) : tournament?.name ?? 'CARGANDO LIGA'}</time></div></header>
    <article className="lead-story"><h2 className="automatic-news-headline"><span className="headline-team">{latest?.label ?? (loading ? 'ACTUALIZANDO' : 'KOINONIA e-LEAGUE')}</span><FittedHeadline>{latest?.headline ?? fallbackHeadline}</FittedHeadline></h2><div className="lead-columns"><div className="lead-copy"><p>{latest?.subtitle ?? latest?.body ?? fallbackBody}</p><button className="news-read-more lead-read-more" onClick={() => latest && setSelectedNews(latest)}>LEER NOTICIA COMPLETA</button></div><figure className="lead-photo" role="img" aria-label="Portada deportiva de Koinonia e-League">{latest && <NewsArtwork item={latest} teams={teams}/>}</figure></div></article>
  </section><section className="secondary-stories">
    <SecondaryNews item={news[1]} teams={teams} onOpen={setSelectedNews}/><SecondaryNews item={news[2]} teams={teams} onOpen={setSelectedNews}/>
  </section><NewsModal item={selectedNews} teams={teams} onClose={() => setSelectedNews(null)}/></main>;
}
