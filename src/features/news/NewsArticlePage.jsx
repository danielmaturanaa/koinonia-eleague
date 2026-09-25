import { useEffect, useState } from 'react';
import { NewsArtwork } from '../../components/NewsArtwork.jsx';
import { formatDate } from '../public/DataStates.jsx';
import { useAutomaticNews } from './useAutomaticNews.js';
import { cachedNews, findNews, newsPath, rememberNews } from './newsCache.js';

const newsDate = item => item?.publishedAt ?? item?.date;

function useNewsItem(id) {
  const [state, setState] = useState(() => ({ item: cachedNews(id), loading: !cachedNews(id), error: null }));
  useEffect(() => {
    const cached = cachedNews(id);
    if (cached) { setState({ item: cached, loading: false, error: null }); return undefined; }
    const controller = new AbortController();
    setState({ item: null, loading: true, error: null });
    findNews(id, controller.signal)
      .then(item => setState({ item, loading: false, error: null }))
      .catch(error => { if (!controller.signal.aborted) setState({ item: null, loading: false, error }); });
    return () => controller.abort();
  }, [id]);
  return state;
}

export function NewsArticlePage({ newsId, teams = [], navigate }) {
  const { item, loading, error } = useNewsItem(newsId);
  const { news } = useAutomaticNews(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => { rememberNews(news); }, [news]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [newsId]);
  useEffect(() => { if (item?.headline) document.title = `${item.headline} | Koinonia e-League`; }, [item]);
  const more = news.filter(other => other.id !== item?.id).slice(0, 4);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: item.headline, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    } catch {
      // Compartir cancelado o portapapeles bloqueado: no hay nada que hacer.
    }
  };
  return <main className="newspaper news-article-page">
    <div className="news-article-actions"><button type="button" className="back-button" onClick={() => navigate('/noticias')}>← TODAS LAS NOTICIAS</button>{item && <button type="button" className="action-button" onClick={share}>{copied ? '✓ ENLACE COPIADO' : '↗ COMPARTIR'}</button>}</div>
    {loading ? <div className="arcade-state">CARGANDO NOTICIA…</div> : error ? <div className="arcade-state">NO SE PUDO CARGAR LA NOTICIA.</div> : !item ? <div className="arcade-state">ESTA NOTICIA YA NO ESTÁ DISPONIBLE.</div> : <article className="news-article">
      <header><p><b>{item.label}</b>{newsDate(item) && <time>{formatDate(newsDate(item))}</time>}</p><h1>{item.headline}</h1>{item.subtitle && <h2>{item.subtitle}</h2>}</header>
      <figure className="news-article-figure"><NewsArtwork item={item} teams={teams}/></figure>
      <div className="news-article-body">{item.body && <p>{item.body}</p>}{item.body2 && <p className="news-story-angle">{item.body2}</p>}</div>
    </article>}
    {more.length > 0 && <section className="news-article-more"><h2>MÁS NOTICIAS</h2><div>{more.map(other => <a key={other.id} href={`#${newsPath(other)}`}><NewsArtwork item={other} teams={teams}/><span><small>{other.label}</small><b>{other.headline}</b></span></a>)}</div></section>}
  </main>;
}
