import { useEffect, useState } from 'react';
import { useAutomaticNews } from '../news/useAutomaticNews.js';
import { formatDate } from '../public/DataStates.jsx';
import { NewsArtwork } from '../../components/NewsArtwork.jsx';
import { newsPath, rememberNews } from '../news/newsCache.js';

const STORY_LIMIT = 8;
const newsDate = item => item?.publishedAt ?? item?.date;

// Historias estilo Instagram: avance automático con barras de progreso, pausa al
// mantener presionado o al pasar el mouse, y toques a los lados para navegar.
function NewsStories({ items, teams }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const current = items[Math.min(index, count - 1)];
  const go = step => setIndex(value => (value + step + count) % count);
  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);
  useEffect(() => {
    const onKey = event => {
      if (event.target.closest?.('input, textarea, select, [role="dialog"]')) return;
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  if (!current) return null;
  return <section className="news-stories" aria-roledescription="carrusel" aria-label="Noticias destacadas" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className={`news-story ${paused ? 'paused' : ''}`}>
      <div className="news-story-media">
        <div className="news-story-progress" aria-hidden="true">{items.map((item, position) => <span key={item.id ?? position} className={position < index ? 'done' : position === index ? 'active' : ''}>{position === index && <i key={index} onAnimationEnd={() => go(1)}/>}</span>)}</div>
        <NewsArtwork item={current} teams={teams}/>
        <button type="button" className="news-story-nav prev" onClick={() => go(-1)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} aria-label="Noticia anterior"><span>‹</span></button>
        <button type="button" className="news-story-nav next" onClick={() => go(1)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} aria-label="Noticia siguiente"><span>›</span></button>
      </div>
      <div className="news-story-copy">
        <p><b>{current.label}</b>{newsDate(current) && <time>{formatDate(newsDate(current))}</time>}</p>
        <h2><a href={`#${newsPath(current)}`}>{current.headline}</a></h2>
        {current.subtitle && <h3>{current.subtitle}</h3>}
        {current.body && <p className="news-story-excerpt">{current.body}</p>}
        <a className="news-story-read" href={`#${newsPath(current)}`}>LEER NOTICIA COMPLETA →</a>
        <small className="news-story-count">{index + 1} / {count}</small>
      </div>
    </div>
    <ol className="news-story-rail">{items.map((item, position) => <li key={item.id ?? position}><button type="button" className={position === index ? 'active' : ''} aria-current={position === index} onClick={() => setIndex(position)}><NewsArtwork item={item} teams={teams}/><span><small>{item.label}</small><b>{item.headline}</b></span></button></li>)}</ol>
  </section>;
}

export function HomePage({ teams = [], navigate }) {
  const { news, loading } = useAutomaticNews();
  useEffect(() => { rememberNews(news); }, [news]);
  const stories = news.slice(0, STORY_LIMIT);
  return <main className="newspaper home-news">
    <header className="home-news-masthead"><h1><span>KOINONIA <em>e-LEAGUE</em> NEWS</span></h1><p>FÚTBOL VIRTUAL. PASIÓN REAL.</p>{newsDate(news[0]) && <small>ÚLTIMA HORA · {formatDate(newsDate(news[0]))}</small>}</header>
    {stories.length ? <NewsStories items={stories} teams={teams}/> : <div className="arcade-state">{loading ? 'CARGANDO NOTICIAS…' : 'AÚN NO HAY NOTICIAS PUBLICADAS.'}</div>}
    {news.length > 0 && <button type="button" className="home-news-all" onClick={() => navigate('/noticias')}>VER TODAS LAS NOTICIAS →</button>}
  </main>;
}
