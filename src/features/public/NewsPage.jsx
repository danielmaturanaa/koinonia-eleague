import { useAutomaticNews } from '../news/useAutomaticNews.js';
import { NewsArtwork } from '../../components/NewsArtwork.jsx';
import { DataState, PageHeader, formatDate } from './DataStates.jsx';

export function NewsPage({ teams = [] }) {
  const { news, loading, error } = useAutomaticNews();
  const state = { loading, error, data: news };

  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="PERIÓDICO AUTOMÁTICO DE LA LIGA" title="NOTICIAS"/><DataState query={state}/>{!state.loading && !state.error && <div className="news-feed">{news.length ? news.map(item => <article className={`news-card news-${item.image}`} data-image={item.image} key={item.id}><NewsArtwork item={item} teams={teams}/><div><time>{item.date ? formatDate(item.date) : 'FECHA NO PUBLICADA'}</time><b>{item.label}</b><h2>{item.headline}</h2><p>{item.body}</p></div></article>) : <p className="empty-copy">NO HAY EVENTOS CON DATOS SUFICIENTES PARA GENERAR NOTICIAS.</p>}</div>}</section></main>;
}
