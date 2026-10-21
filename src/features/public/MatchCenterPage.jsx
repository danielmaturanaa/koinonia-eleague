import { useCallback, useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { EntityLink } from '../../components/EntityLink.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { Scoreboard } from '../../components/Scoreboard.jsx';
import { SanctionBadge } from '../../components/SanctionBadge.jsx';
import { SimulationBanner, SimulationPreview, SimulationReplay, replayEndsAt } from './MatchSimulation.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { matchRoundLabel } from '../../utils/matchPresentation.js';
import { SanctionPanel } from '../admin/MatchAdminPanel.jsx';
import { DataState, formatDate } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';
import { PitchBoard } from '../teams/PitchBoard.jsx';
import { useAuth } from '../../app/AuthGate.jsx';
import { MatchdayPanel } from './MatchdayPanel.jsx';
import { startStadiumAmbience } from '../../audio/synth.js';
import { PixelStadium, useLiveMatchFx, useMatchFx } from './MatchFx.jsx';

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
  return <section className="match-card-panel match-incidents-panel"><h2>INCIDENCIAS</h2>
    {empty ? <p className="empty-copy">{match.status === 'pending' ? 'El partido aún no comienza.' : 'Sin goles ni tarjetas registradas.'}</p>
      : <div className="match-incidents"><div><h3>{match.homeTeam?.name}</h3>{side(match.homeTeam?.id)}</div><div><h3>{match.awayTeam?.name}</h3>{side(match.awayTeam?.id)}</div></div>}
  </section>;
}

const byOrder = (left, right) => (left.squadOrder ?? 999) - (right.squadOrder ?? 999);
const isStarter = player => typeof player.isStarter === 'boolean' ? player.isStarter : player.section ? player.section === 'starters' : Number(player.squadOrder) <= 11;

function Lineup({ team }) {
  const [view, setView] = useState('squad');
  const squad = useApiQuery(signal => team?.id ? endpoints.teamSquad(team.id, signal) : Promise.resolve({ data: [] }), [team?.id]);
  const starters = (Array.isArray(squad.data) ? squad.data : []).filter(isStarter).sort(byOrder);
  return <div className="match-lineup"><div className="match-lineup-watermark" aria-hidden="true"><TeamMark team={team}/></div><h3>{team?.name ?? 'CLUB'}</h3>
    <nav className="match-lineup-tabs" aria-label={`Vista del ${team?.name ?? 'club'}`}><button type="button" className={view === 'squad' ? 'active' : ''} aria-pressed={view === 'squad'} onClick={() => setView('squad')}>PLANTEL</button><button type="button" className={view === 'formation' ? 'active' : ''} aria-pressed={view === 'formation'} onClick={() => setView('formation')}>FORMACIÓN</button></nav>
    {squad.loading ? <p className="empty-copy">CARGANDO…</p> : view === 'formation' ? <PitchBoard team={team} starters={starters} readOnly bare/> : starters.length ? <ol>{starters.map(player => <li key={player.id}><b>{player.jerseyNumber ?? '–'}</b><PlayerFace src={player.faceUrl} name={player.name}/><EntityLink to="player" id={player.id}>{player.name}</EntityLink><small>{player.position ?? ''}</small></li>)}</ol> : <p className="empty-copy">SIN TITULARES DEFINIDOS.</p>}
  </div>;
}

// Vista de la ficha: "clásico" (sin adornos) o "estadio" (las tribunas y la hinchada). Se recuerda en este navegador.
const VIEW_STORAGE_KEY = 'koinonia:match-view';
function useMatchView() {
  const [view, setView] = useState(() => {
    try { return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'clasico' ? 'clasico' : 'estadio'; } catch { return 'estadio'; }
  });
  const choose = next => {
    setView(next);
    try { window.localStorage.setItem(VIEW_STORAGE_KEY, next); } catch { /* sin almacenamiento: solo por esta vez */ }
  };
  return [view, choose];
}

function MatchViewToggle({ view, onChange }) {
  return <div className="match-view-toggle" role="group" aria-label="Vista del partido">
    {[['clasico', 'VISTA CLÁSICA'], ['estadio', 'ESTADIO']].map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => onChange(value)}>{label}</button>)}
  </div>;
}

function HeadToHead({ match, resolveTeam }) {
  const homeId = match.homeTeam?.id;
  const awayId = match.awayTeam?.id;
  const history = useApiQuery(signal => homeId ? endpoints.matches({ team: homeId, opponent: awayId, status: 'finished', order: 'recent', page: 1, pageSize: 100 }, signal) : Promise.resolve({ data: [] }), [homeId, awayId]);
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
      <div className="h2h-tally"><span><div className="h2h-team-watermark" aria-hidden="true"><TeamMark team={resolveTeam(match.homeTeam)}/></div><b>{tally.home}</b><small>VICTORIAS</small></span><span><div className="h2h-team-watermark h2h-team-watermark-empty" aria-hidden="true"/><b>{tally.draw}</b><small>EMPATES</small></span><span><div className="h2h-team-watermark" aria-hidden="true"><TeamMark team={resolveTeam(match.awayTeam)}/></div><b>{tally.away}</b><small>VICTORIAS</small></span></div>
      <ul className="h2h-list">{meetings.map(item => <li key={item.id}><EntityLink to="match" id={item.id}><small>{item.tournament?.name ?? 'TORNEO'}{item.finishedAt ? ` · ${formatDate(item.finishedAt)}` : ''}</small><span><em className="h2h-home-name">{item.homeTeam?.name}</em><strong>{item.homeScore} - {item.awayScore}</strong><em className="h2h-away-name">{item.awayTeam?.name}</em></span></EntityLink></li>)}</ul>
    </> : <p className="empty-copy">NUNCA SE HAN ENFRENTADO.</p>}
  </section>;
}

// Centro de partido: marcador con sus controles, incidencias, alineaciones y
// cara a cara. Las sanciones administrativas quedan plegadas al final.
export function MatchCenterPage({ matchId, teams = [], navigate }) {
  const { canOperateMatches } = useAuth();
  const [revision, setRevision] = useState(0);
  const detail = useApiQuery(signal => endpoints.match(matchId, signal), [matchId, revision]);
  const match = detail.data;
  const teamIndex = new Map(teams.map(team => [team.id, team]));
  const resolveTeam = team => team ? { ...team, ...(teamIndex.get(team.id) ?? {}) } : team;
  const bump = () => setRevision(value => value + 1);
  const simulationQuery = useApiQuery(signal => match?.simulated ? endpoints.matchSimulation(matchId, signal) : Promise.resolve({ data: null }), [matchId, match?.simulated, revision]);
  const simulation = match?.simulated ? simulationQuery.data : null;
  // Transmisión compartida mientras dura (todos ven el mismo minuto) o repetición pedida por quien mira.
  const [localReplay, setLocalReplay] = useState(null);
  const [, setReplayEnded] = useState(0);
  const onSharedReplayEnded = useCallback(() => setReplayEnded(value => value + 1), []);
  const sharedReplay = simulation && simulation.durationSeconds > 0 && Date.now() < replayEndsAt(simulation);
  const replaying = Boolean(simulation && (sharedReplay || localReplay));
  // Mientras llega la simulación no se muestra el marcador final: sería spoiler de la transmisión.
  const loadingSimulation = Boolean(match?.simulated && !simulationQuery.data && simulationQuery.loading);
  // Efectos en 8 bits: la hinchada que salta y el sonido de lo que pasa mientras miras (en vivo o en la transmisión simulada).
  const [view, setView] = useMatchView();
  const stadium = view === 'estadio';
  const [fx, fire] = useMatchFx({ derby: Boolean(match?.derby), stadium });
  useLiveMatchFx(replaying ? null : match, resolveTeam, fire);
  // En modo estadio, el murmullo de la hinchada de fondo mientras el partido está en vivo o en la transmisión.
  const ambience = stadium && (match?.status === 'live' || replaying);
  useEffect(() => (ambience ? startStadiumAmbience() : undefined), [ambience]);
  // En vivo, las incidencias se refrescan al mismo ritmo que el marcador (goles cargados desde Discord).
  useEffect(() => {
    if (match?.status !== 'live') return undefined;
    const interval = window.setInterval(detail.retry, 12000);
    return () => window.clearInterval(interval);
  }, [match?.status, detail.retry]);
  return <main className="newspaper data-page"><section className="data-paper match-center">
    <div className="match-center-bar"><button className="back-button" onClick={() => navigate('/partidos')}>← PARTIDOS</button>{match && <span>{match.tournament?.name ?? 'TORNEO'} · {matchRoundLabel(match)}</span>}<MatchViewToggle view={view} onChange={setView}/><button className="match-center-fullscreen" onClick={() => navigate(`/marcador/${encodeURIComponent(matchId)}`)}>⛶ PANTALLA COMPLETA</button></div>
    {!match && <DataState query={detail}/>}
    {match && (() => {
      const score = loadingSimulation
        ? <div className="match-center-score"><article className="scoreboard scoreboard-full scoreboard-loading"><p>SINTONIZANDO LA TRANSMISIÓN…</p></article></div>
        : replaying
        ? <div className="match-center-score">{sharedReplay
          ? <SimulationReplay match={match} simulation={simulation} resolveTeam={resolveTeam} startsAt={new Date(simulation.replayStartsAt).getTime()} durationSeconds={simulation.durationSeconds} onEvent={fire} onEnded={onSharedReplayEnded}/>
          : <><SimulationReplay key={localReplay.startsAt} onEvent={fire} match={match} simulation={simulation} resolveTeam={resolveTeam} startsAt={localReplay.startsAt} durationSeconds={localReplay.durationSeconds}/><button type="button" className="sim-replay-close" onClick={() => setLocalReplay(null)}>✕ CERRAR REPETICIÓN</button></>}</div>
        : <div className="match-center-score"><Scoreboard matchId={matchId} mode="manage" density="full" teams={teams} refreshKey={revision} onChanged={bump} showActa={false}/>{match.sanctioned && <p className="match-sanction-banner"><SanctionBadge match={match}/> Resultado administrativo 0-3: el partido no se jugó.</p>}{match.simulated && <SimulationBanner match={match} simulation={simulation} onReplay={durationSeconds => setLocalReplay({ startsAt: Date.now(), durationSeconds })}/>}</div>;
      const incidents = !replaying && !loadingSimulation && (match.status === 'pending' ? <SimulationPreview key={revision} match={match} onSimulated={bump}/> : <Incidents match={match}/>);
      const h2h = <div className="match-center-h2h"><HeadToHead match={match} resolveTeam={resolveTeam}/></div>;
      // Estadio: el marcador y el cara a cara afuera (a la izquierda) y el estadio con las incidencias sobre el pasto; la
      // previa, abajo. Durante la transmisión la cancha no muestra incidencias (serían spoiler).
      if (stadium) return <>
        <div className="match-center-arena">
          <div className="match-center-main">{score}{h2h}</div>
          <PixelStadium home={resolveTeam(match.homeTeam)} away={resolveTeam(match.awayTeam)} fx={fx} derby={Boolean(match.derby)}>
            {replaying || loadingSimulation ? <p className="pitch-live-tag">TRANSMISIÓN EN CURSO</p> : <Incidents match={match}/>}
          </PixelStadium>
        </div>
        {match.status === 'pending' && !replaying && <div className="match-center-below"><SimulationPreview key={revision} match={match} onSimulated={bump}/></div>}
      </>;
      // Clásico: marcador + incidencias a la izquierda y cara a cara a la derecha, con el mismo alto.
      return <div className="match-center-top"><div className="match-center-main">{score}{incidents}</div>{h2h}</div>;
    })()}
    {match && <>
      {!replaying && !loadingSimulation && <MatchdayPanel match={match} revision={revision}/>}
      <section className="match-card-panel"><h2>ALINEACIONES <small>Titulares actuales de cada club</small></h2><div className="match-lineups"><Lineup team={resolveTeam(match.homeTeam)}/><Lineup team={resolveTeam(match.awayTeam)}/></div></section>
      {canOperateMatches && <details className="match-corrections"><summary>SANCIONES Y CORRECCIONES</summary><div><SanctionPanel key={`${match.id}-${revision}`} match={match} onChanged={bump}/></div></details>}
    </>}
  </section></main>;
}
