import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { EntityLink } from '../../components/EntityLink.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { Scoreboard } from '../../components/Scoreboard.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { matchRoundLabel } from '../../utils/matchPresentation.js';
import { SanctionPanel } from '../admin/MatchAdminPanel.jsx';
import { DataState, formatDate } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

// Goles agrupados por jugador; los minutos solo aparecen si el acta los registró.
function groupedGoals(goals, teamId) {
  return Object.values(goals.filter(goal => goal.teamId === teamId).reduce((groups, goal) => {
    const key = `${goal.playerId ?? goal.playerName}:${goal.isOwnGoal ? 1 : 0}`;
    groups[key] ??= { ...goal, count: 0, minutes: [] };
    groups[key].count += 1;
    if (goal.minute) groups[key].minutes.push(goal.minute);
    return groups;
  }, {}));
}

function Incidents({ match }) {
  const goals = Array.isArray(match.goals) ? match.goals : [];
  const redCards = Array.isArray(match.redCards) ? match.redCards : [];
  const side = teamId => <ul>
    {groupedGoals(goals, teamId).map(goal => <li key={goal.id}><span aria-hidden="true">⚽</span><EntityLink to="player" id={goal.playerId}>{goal.playerName ?? 'JUGADOR'}</EntityLink>{goal.count > 1 && <small>×{goal.count}</small>}{goal.minutes.length > 0 && <small>{goal.minutes.map(minute => `${minute}'`).join(', ')}</small>}{Boolean(goal.isOwnGoal) && <em>AUTOGOL</em>}</li>)}
    {redCards.filter(card => card.teamId === teamId).map(card => <li key={card.id} className="incident-red"><span aria-hidden="true">🟥</span><EntityLink to="player" id={card.playerId}>{card.playerName}</EntityLink>{card.minute != null && <small>{card.minute}'</small>}</li>)}
  </ul>;
  const empty = !goals.length && !redCards.length;
  return <section className="match-card-panel"><h2>INCIDENCIAS</h2>
    {empty ? <p className="empty-copy">{match.status === 'pending' ? 'EL PARTIDO AÚN NO COMIENZA.' : 'SIN GOLES NI TARJETAS REGISTRADAS.'}</p>
      : <div className="match-incidents"><div><h3>{match.homeTeam?.name}</h3>{side(match.homeTeam?.id)}</div><div><h3>{match.awayTeam?.name}</h3>{side(match.awayTeam?.id)}</div></div>}
  </section>;
}

const byOrder = (left, right) => (left.squadOrder ?? 999) - (right.squadOrder ?? 999);
const isStarter = player => typeof player.isStarter === 'boolean' ? player.isStarter : player.section ? player.section === 'starters' : Number(player.squadOrder) <= 11;

function Lineup({ team }) {
  const squad = useApiQuery(signal => team?.id ? endpoints.teamSquad(team.id, signal) : Promise.resolve({ data: [] }), [team?.id]);
  const starters = (Array.isArray(squad.data) ? squad.data : []).filter(isStarter).sort(byOrder);
  return <div className="match-lineup"><h3><TeamMark team={team}/>{team?.name}</h3>
    {squad.loading ? <p className="empty-copy">CARGANDO…</p> : starters.length ? <ol>{starters.map(player => <li key={player.id}><b>{player.jerseyNumber ?? '–'}</b><PlayerFace src={player.faceUrl} name={player.name}/><EntityLink to="player" id={player.id}>{player.name}</EntityLink><small>{player.position ?? ''}</small></li>)}</ol> : <p className="empty-copy">SIN TITULARES DEFINIDOS.</p>}
  </div>;
}

function HeadToHead({ match, resolveTeam }) {
  const homeId = match.homeTeam?.id;
  const awayId = match.awayTeam?.id;
  const history = useApiQuery(signal => homeId ? endpoints.teamMatches(homeId, signal) : Promise.resolve({ data: [] }), [homeId]);
  const meetings = (Array.isArray(history.data) ? history.data : [])
    .filter(item => item.id !== match.id && item.status === 'finished' && [item.homeTeam?.id, item.awayTeam?.id].includes(awayId))
    .sort((left, right) => String(right.finishedAt ?? '').localeCompare(String(left.finishedAt ?? '')));
  const tally = meetings.reduce((sum, item) => {
    const own = item.homeTeam?.id === homeId ? item.homeScore : item.awayScore;
    const rival = item.homeTeam?.id === homeId ? item.awayScore : item.homeScore;
    if (own > rival) sum.home += 1; else if (own < rival) sum.away += 1; else sum.draw += 1;
    return sum;
  }, { home: 0, draw: 0, away: 0 });
  return <section className="match-card-panel"><h2>CARA A CARA <small>{meetings.length} PARTIDO{meetings.length === 1 ? '' : 'S'}</small></h2>
    {history.loading ? <p className="empty-copy">CARGANDO…</p> : meetings.length ? <>
      <div className="h2h-tally"><span><TeamMark team={resolveTeam(match.homeTeam)}/><b>{tally.home}</b><small>VICTORIAS</small></span><span><b>{tally.draw}</b><small>EMPATES</small></span><span><TeamMark team={resolveTeam(match.awayTeam)}/><b>{tally.away}</b><small>VICTORIAS</small></span></div>
      <ul className="h2h-list">{meetings.slice(0, 5).map(item => <li key={item.id}><EntityLink to="match" id={item.id}><small>{item.tournament?.name ?? 'TORNEO'}{item.finishedAt ? ` · ${formatDate(item.finishedAt)}` : ''}</small><span>{item.homeTeam?.name} <strong>{item.homeScore} - {item.awayScore}</strong> {item.awayTeam?.name}</span></EntityLink></li>)}</ul>
    </> : <p className="empty-copy">NUNCA SE HAN ENFRENTADO.</p>}
  </section>;
}

// Centro de partido: marcador con sus controles, incidencias, alineaciones y
// cara a cara. Las sanciones administrativas quedan plegadas al final.
export function MatchCenterPage({ matchId, teams = [], navigate }) {
  const [revision, setRevision] = useState(0);
  const detail = useApiQuery(signal => endpoints.match(matchId, signal), [matchId, revision]);
  const match = detail.data;
  const teamIndex = new Map(teams.map(team => [team.id, team]));
  const resolveTeam = team => team ? { ...team, ...(teamIndex.get(team.id) ?? {}) } : team;
  const bump = () => setRevision(value => value + 1);
  // En vivo, las incidencias se refrescan al mismo ritmo que el marcador (goles cargados desde Discord).
  useEffect(() => {
    if (match?.status !== 'live') return undefined;
    const interval = window.setInterval(detail.retry, 12000);
    return () => window.clearInterval(interval);
  }, [match?.status, detail.retry]);
  return <main className="newspaper data-page"><section className="data-paper match-center">
    <div className="match-center-bar"><button className="back-button" onClick={() => navigate('/partidos')}>← PARTIDOS</button>{match && <span>{match.tournament?.name ?? 'TORNEO'} · {matchRoundLabel(match)}</span>}<button className="match-center-fullscreen" onClick={() => navigate(`/marcador/${encodeURIComponent(matchId)}`)}>⛶ PANTALLA COMPLETA</button></div>
    {!match && <DataState query={detail}/>}
    <div className="match-center-score"><Scoreboard matchId={matchId} mode="manage" density="full" teams={teams} refreshKey={revision} onChanged={bump} showActa={false}/></div>
    {match && <>
      <div className="match-center-grid">
        <Incidents match={match}/>
        <HeadToHead match={match} resolveTeam={resolveTeam}/>
      </div>
      <section className="match-card-panel"><h2>ALINEACIONES <small>TITULARES ACTUALES DE CADA CLUB</small></h2><div className="match-lineups"><Lineup team={resolveTeam(match.homeTeam)}/><Lineup team={resolveTeam(match.awayTeam)}/></div></section>
      <details className="match-corrections"><summary>SANCIONES Y CORRECCIONES</summary><div><SanctionPanel key={`${match.id}-${revision}`} match={match} onChanged={bump}/></div></details>
    </>}
  </section></main>;
}
