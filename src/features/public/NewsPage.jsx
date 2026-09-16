import { useAutomaticNews } from '../news/useAutomaticNews.js';
import { NewsArtwork } from '../../components/NewsArtwork.jsx';
import { DataState, PageHeader, formatDate } from './DataStates.jsx';

const goalName = goal => goal?.player?.name ?? goal?.playerName ?? 'Gol sin jugador';
const goalTeam = goal => goal?.scoringTeam?.name ?? goal?.team?.name ?? goal?.teamName ?? 'Equipo no informado';
const cardName = card => card?.player?.name ?? card?.playerName ?? 'Jugador no informado';
const cardTeam = card => card?.team?.name ?? card?.teamName ?? 'Equipo no informado';

function MatchActa({ item }) {
  if (item.sourceType !== 'match') return null;
  const goals = item.original?.goals ?? [];
  const redCards = item.original?.redCards ?? [];
  const match = item.original;
  const teamGoals = team => goals.filter(goal => (goal.teamId ?? goal.scoringTeamId ?? goal.scoringTeam?.id ?? goal.team?.id) === team?.id);
  const column = (label, team) => <div className="news-acta-team"><small>{label}</small><strong>{team?.name ?? 'EQUIPO'}</strong><ul>{teamGoals(team).length ? teamGoals(team).map((goal, index) => <li key={goal.id ?? index}>⚽ {goalName(goal)}</li>) : <li className="news-acta-empty">Sin goles registrados</li>}</ul></div>;

  return <div className="news-match-acta">
    <b>ACTA DEL PARTIDO</b>{column('LOCAL', match.homeTeam)}{column('VISITA', match.awayTeam)}
    {redCards.length > 0 && <p className="news-acta-red">🟥 Sancionados: {redCards.map(card => `${cardName(card)} · ${cardTeam(card)}`).join(' / ')}</p>}
  </div>;
}

export function NewsPage({ teams = [] }) {
  const { news, loading, error } = useAutomaticNews();
  const state = { loading, error, data: news };

  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="PERIÓDICO AUTOMÁTICO DE LA LIGA" title="NOTICIAS"/><DataState query={state}/>{!state.loading && !state.error && <div className="news-feed">{news.length ? news.map(item => <article className={`news-card news-${item.type}-${item.subtype}`} data-image={item.image?.id ?? ''} key={item.id}><NewsArtwork item={item} teams={teams}/><div><time>{item.date ? formatDate(item.date) : 'FECHA NO PUBLICADA'}</time><b>{item.label}</b><h2>{item.headline}</h2><p>{item.body}</p>{item.body2 && <p className="news-story-angle">{item.body2}</p>}<MatchActa item={item}/></div></article>) : <p className="empty-copy">NO HAY EVENTOS CON DATOS SUFICIENTES PARA GENERAR NOTICIAS.</p>}</div>}</section></main>;
}
