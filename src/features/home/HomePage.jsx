import { useAutomaticNews } from '../news/useAutomaticNews.js';
import { formatDate } from '../public/DataStates.jsx';

function SecondaryNews({ item }) {
  if (!item) return <article className="small-story automatic-small-story"><h3>ACTUALIZACIÓN</h3><h4>ESPERANDO NUEVAS NOTICIAS</h4><p>La portada se actualizará cuando la API publique un nuevo evento.</p></article>;
  return <article className={`small-story automatic-small-story news-${item.image}`} data-image={item.image}><h3>{item.label}</h3><time>{item.date ? formatDate(item.date) : 'FECHA NO PUBLICADA'}</time><h4>{item.headline}</h4><p>{item.body}</p></article>;
}

export function HomePage({ tournament, lead }) {
  const { news, loading } = useAutomaticNews();
  const latest = news[0];
  const fallbackHeadline = lead ? `${lead.homeTeam.name} VS ${lead.awayTeam.name}` : 'LA LIGA EN PREPARACIÓN';
  const fallbackBody = lead ? `La fecha ${lead.roundNumber ?? 'actual'} enfrentará a ${lead.homeTeam.name} y ${lead.awayTeam.name}.` : 'La liga aún no tiene partidos próximos publicados.';
  return <main className="newspaper"><section className="main-edition">
    <header className="newspaper-header"><h1><span>KOINONIA <em>e-LEAGUE</em> NEWS</span></h1><p>FÚTBOL VIRTUAL. PASIÓN REAL.</p><div className="edition-date">ÚLTIMA HORA<br/><time>{latest?.date ? formatDate(latest.date) : tournament?.name ?? 'CARGANDO LIGA'}</time></div></header>
    <article className="lead-story"><h2 className="automatic-news-headline"><span className="headline-team">{latest?.label ?? (loading ? 'ACTUALIZANDO' : 'KOINONIA e-LEAGUE')}</span><span className="headline-result">{latest?.headline ?? fallbackHeadline}</span></h2><div className="lead-columns"><div className="lead-copy"><p>{latest?.body ?? fallbackBody}</p><blockquote>“Fútbol como antes,<br/>amigos como siempre.”</blockquote></div><figure className="lead-photo" role="img" aria-label="Portada deportiva de Koinonia e-League"/></div></article>
  </section><section className="secondary-stories">
    <SecondaryNews item={news[1]}/><SecondaryNews item={news[2]}/><SecondaryNews item={news[3]}/>
  </section></main>;
}
