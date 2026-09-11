import { useLayoutEffect, useRef } from 'react';
import { useAutomaticNews } from '../news/useAutomaticNews.js';
import { formatDate } from '../public/DataStates.jsx';
import { NewsArtwork } from '../../components/NewsArtwork.jsx';
import { RecolorableNewsScene } from '../../components/RecolorableNewsScene.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { resolveNewsParticipants } from '../news/newsParticipants.js';

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

function SecondaryNews({ item, teams }) {
  if (!item) return <article className="small-story automatic-small-story"><h3>ACTUALIZACIÓN</h3><h4>ESPERANDO NUEVAS NOTICIAS</h4><p>La portada se actualizará cuando la API publique un nuevo evento.</p></article>;
  return <article className={`small-story automatic-small-story news-${item.type}-${item.subtype}`} data-image={item.image?.id ?? ''}><h3>{item.label}</h3><div className="secondary-news-content"><NewsArtwork item={item} teams={teams}/><div><time>{item.date ? formatDate(item.date) : 'FECHA NO PUBLICADA'}</time><h4>{item.headline}</h4><p>{item.body}</p></div></div></article>;
}

export function HomePage({ tournament, lead, teams = [] }) {
  const { news, loading } = useAutomaticNews();
  const latest = news[0];
  const { team: newsTeam, opponent: newsOpponent } = resolveNewsParticipants(latest, teams);
  const fallbackHeadline = lead ? `${lead.homeTeam.name} VS ${lead.awayTeam.name}` : 'LA LIGA EN PREPARACIÓN';
  const fallbackBody = lead ? `La fecha ${lead.roundNumber ?? 'actual'} enfrentará a ${lead.homeTeam.name} y ${lead.awayTeam.name}.` : 'La liga aún no tiene partidos próximos publicados.';
  return <main className="newspaper"><section className="main-edition">
    <header className="newspaper-header"><h1><span>KOINONIA <em>e-LEAGUE</em> NEWS</span></h1><p>FÚTBOL VIRTUAL. PASIÓN REAL.</p><div className="edition-date">ÚLTIMA HORA<br/><time>{latest?.date ? formatDate(latest.date) : tournament?.name ?? 'CARGANDO LIGA'}</time></div></header>
    <article className="lead-story"><h2 className="automatic-news-headline"><span className="headline-team">{latest?.label ?? (loading ? 'ACTUALIZANDO' : 'KOINONIA e-LEAGUE')}</span><FittedHeadline>{latest?.headline ?? fallbackHeadline}</FittedHeadline></h2><div className="lead-columns"><div className="lead-copy"><p>{latest?.body ?? fallbackBody}</p><blockquote>“Fútbol como antes,<br/>amigos como siempre.”</blockquote></div><figure className="lead-photo" role="img" aria-label="Portada deportiva de Koinonia e-League">{latest?.image && <RecolorableNewsScene scene={latest.image} team={newsTeam} opponent={newsOpponent} alt="" className="lead-news-scene"/>}{latest?.sourceType === 'match' && latest?.type !== 'draw' && newsTeam && <span className="lead-winner-crest" title={`Ganador: ${newsTeam.name}`}><TeamMark team={newsTeam}/></span>}</figure></div></article>
  </section><section className="secondary-stories">
    <SecondaryNews item={news[1]} teams={teams}/><SecondaryNews item={news[2]} teams={teams}/><SecondaryNews item={news[3]} teams={teams}/>
  </section></main>;
}
