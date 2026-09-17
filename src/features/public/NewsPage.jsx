import { useAutomaticNews } from '../news/useAutomaticNews.js';
import { NewsArtwork } from '../../components/NewsArtwork.jsx';
import { DataState, PageHeader, formatDate } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';
import { endpoints } from '../../api/endpoints.js';

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
  const tokenQuery = useApiQuery(signal => endpoints.newsTokens(signal));
  const state = { loading, error, data: news };
  const tokens = Array.isArray(tokenQuery.data) ? tokenQuery.data : [];
  const llmPrompt = `Escribe plantillas breves para noticias de una liga de eFootball. Devuelve solo propuestas para etiqueta, titular y cuerpo. Usa exclusivamente los tokens entre llaves que correspondan; no inventes datos ni cambies el nombre de los tokens. Una variante que use un token sin dato disponible no será publicada.\n\nTOKENS DISPONIBLES:\n${tokens.map(item => `${item.token}: ${item.description}`).join('\n')}`;

  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="PERIÓDICO AUTOMÁTICO DE LA LIGA" title="NOTICIAS"/><details className="news-how-to"><summary>¿CÓMO USAR PLANTILLAS?</summary><p>Inserta tokens exactamente como aparecen. Puedes copiar esta guía y pegarla en cualquier LLM para pedir nuevas variantes.</p>{tokenQuery.loading ? <p>CARGANDO TOKENS…</p> : <><ul>{tokens.map(item => <li key={item.token}><code>{item.token}</code> — {item.description}</li>)}</ul><textarea readOnly value={llmPrompt} aria-label="Instrucción para generar plantillas con IA"/></>}</details><DataState query={state}/>{!state.loading && !state.error && <div className="news-feed">{news.length ? news.map(item => <article className={`news-card news-${item.type}-${item.subtype}`} data-image={item.imageUrl ?? ''} key={item.id}><NewsArtwork item={item} teams={teams}/><div><time>{item.publishedAt ? formatDate(item.publishedAt) : 'FECHA NO PUBLICADA'}</time><b>{item.label}</b><h2>{item.headline}</h2><p>{item.body}</p>{item.body2 && <p className="news-story-angle">{item.body2}</p>}<MatchActa item={item}/></div></article>) : <p className="empty-copy">NO HAY EVENTOS CON DATOS SUFICIENTES PARA GENERAR NOTICIAS.</p>}</div>}</section></main>;
}
