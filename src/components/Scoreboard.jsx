import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../api/endpoints.js';
import { useApiMutation } from '../features/admin/useApiMutation.js';
import { useApiQuery } from '../features/public/useApiQuery.js';
import { TeamMark } from './TeamMark.jsx';

const STATUS_LABEL = { pending: 'POR JUGAR', live: 'EN VIVO', finished: 'FINAL', cancelled: 'CANCELADO' };
const LIVE_POLL_MS = 12000;
const positionOrder = ['DC', 'EI', 'ED', 'MO', 'MC', 'LI', 'LD', 'DEC', 'PT'];

const goalPlayerName = goal => goal?.player?.name ?? goal?.playerName ?? goal?.player_name ?? 'gol sin jugador';
const goalTeamId = goal => goal?.scoringTeam?.id ?? goal?.team?.id ?? goal?.teamId ?? goal?.team_id ?? '';
const sortPlayers = players => [...players].sort((a, b) => (positionOrder.indexOf(a.position) === -1 ? 99 : positionOrder.indexOf(a.position)) - (positionOrder.indexOf(b.position) === -1 ? 99 : positionOrder.indexOf(b.position)) || (a.squadOrder ?? 999) - (b.squadOrder ?? 999));

function useSquad(teamId) {
  return useApiQuery(signal => teamId ? endpoints.teamSquad(teamId, signal) : Promise.resolve({ data: [] }), [teamId]);
}

function PlayerSelect({ teamId, value, onChange, required }) {
  const squad = useSquad(teamId);
  return <select className="scoreboard-select" required={required} value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{required ? 'SELECCIONAR JUGADOR' : 'SIN JUGADOR'}</option>
    {sortPlayers(squad.data ?? []).map(player => <option key={player.id} value={player.id}>{player.position ?? 'S/P'} · {player.name}</option>)}
  </select>;
}

function GoalPopover({ match, teamId, teamName, onClose, onChanged }) {
  const [playerId, setPlayerId] = useState('');
  const [minute, setMinute] = useState('');
  const mutation = useApiMutation((body, signal) => endpoints.addMatchGoal(match.id, body, signal), { onSuccess: () => { onChanged(); onClose(); } });
  const submit = event => {
    event.preventDefault();
    mutation.execute({ scoringTeamId: teamId, ...(playerId ? { playerId } : {}), ...(minute ? { minute: Number(minute) } : {}) });
  };
  return <form className="scoreboard-popover" onSubmit={submit}>
    <p>GOL DE {teamName?.toUpperCase()}</p>
    <PlayerSelect teamId={teamId} value={playerId} onChange={setPlayerId}/>
    <input className="scoreboard-minute" type="number" min="0" max="130" step="1" placeholder="MIN." value={minute} onChange={event => setMinute(event.target.value)}/>
    <div className="scoreboard-popover-actions"><button type="button" onClick={onClose} disabled={mutation.loading}>CANCELAR</button><button type="submit" className="scoreboard-confirm" disabled={mutation.loading}>¡GOL!</button></div>
    {mutation.error && <p className="scoreboard-popover-error">{mutation.error.message}</p>}
  </form>;
}

function RedCardPopover({ match, onClose, onChanged }) {
  const homeId = match.homeTeam?.id;
  const awayId = match.awayTeam?.id;
  const [teamId, setTeamId] = useState(homeId);
  const [playerId, setPlayerId] = useState('');
  const [minute, setMinute] = useState('');
  const mutation = useApiMutation((body, signal) => endpoints.addMatchRedCard(match.id, body, signal), { onSuccess: () => { onChanged(); onClose(); } });
  const submit = event => {
    event.preventDefault();
    mutation.execute({ teamId, playerId, ...(minute ? { minute: Number(minute) } : {}) });
  };
  return <form className="scoreboard-popover scoreboard-popover-danger" onSubmit={submit}>
    <p>TARJETA ROJA</p>
    <div className="scoreboard-team-toggle">
      <button type="button" className={teamId === homeId ? 'active' : ''} onClick={() => { setTeamId(homeId); setPlayerId(''); }}>{match.homeTeam?.name}</button>
      <button type="button" className={teamId === awayId ? 'active' : ''} onClick={() => { setTeamId(awayId); setPlayerId(''); }}>{match.awayTeam?.name}</button>
    </div>
    <PlayerSelect teamId={teamId} value={playerId} onChange={setPlayerId} required/>
    <input className="scoreboard-minute" type="number" min="0" max="130" step="1" placeholder="MIN." value={minute} onChange={event => setMinute(event.target.value)}/>
    <div className="scoreboard-popover-actions"><button type="button" onClick={onClose} disabled={mutation.loading}>CANCELAR</button><button type="submit" className="scoreboard-confirm scoreboard-confirm-danger" disabled={!playerId || mutation.loading}>EXPULSAR</button></div>
    {mutation.error && <p className="scoreboard-popover-error">{mutation.error.message}</p>}
  </form>;
}

function ScoreboardControls({ match, onChanged }) {
  const [popover, setPopover] = useState(null);
  const status = useApiMutation((operation, signal) => endpoints[`${operation}Match`](match.id, signal), { onSuccess: onChanged });
  const runStatus = (operation, label) => { if (window.confirm(`¿${label} ESTE PARTIDO?`)) status.execute(operation); };

  if (match.status === 'pending') return <div className="scoreboard-controls scoreboard-controls-pending">
    <button className="scoreboard-btn scoreboard-btn-start" disabled={status.loading} onClick={() => runStatus('start', 'INICIAR')}>▶ INICIAR PARTIDO</button>
    <button className="scoreboard-btn-text" disabled={status.loading} onClick={() => runStatus('cancel', 'CANCELAR')}>CANCELAR</button>
  </div>;

  if (match.status === 'finished' || match.status === 'cancelled') return <div className="scoreboard-controls scoreboard-controls-closed">
    <button className="scoreboard-btn-text" disabled={status.loading} onClick={() => runStatus('reopen', 'REABRIR')}>↺ REABRIR PARTIDO</button>
  </div>;

  if (match.status !== 'live') return null;

  return <div className="scoreboard-controls">
    {popover === 'home' && <GoalPopover match={match} teamId={match.homeTeam?.id} teamName={match.homeTeam?.name} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {popover === 'away' && <GoalPopover match={match} teamId={match.awayTeam?.id} teamName={match.awayTeam?.name} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {popover === 'card' && <RedCardPopover match={match} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {!popover && <div className="scoreboard-pad">
      <button className="scoreboard-btn scoreboard-btn-goal" onClick={() => setPopover('home')}>GOL LOCAL</button>
      <button className="scoreboard-btn scoreboard-btn-goal" onClick={() => setPopover('away')}>GOL VISITA</button>
      <button className="scoreboard-btn scoreboard-btn-card" onClick={() => setPopover('card')}>ROJA</button>
      <button className="scoreboard-btn scoreboard-btn-finish" disabled={status.loading} onClick={() => runStatus('finish', 'FINALIZAR')}>FINALIZAR</button>
    </div>}
  </div>;
}

function useScoreFlash(value) {
  const previous = useRef(undefined);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (value === undefined) return undefined;
    if (previous.current !== undefined && value > previous.current) {
      setFlashing(true);
      const timeout = window.setTimeout(() => setFlashing(false), 1400);
      previous.current = value;
      return () => window.clearTimeout(timeout);
    }
    previous.current = value;
    return undefined;
  }, [value]);
  return flashing;
}

export function Scoreboard({ matchId, mode = 'view', density = 'tile', onOpen, teams = [] }) {
  const detail = useApiQuery(signal => matchId ? endpoints.match(matchId, signal) : Promise.resolve({ data: null }), [matchId]);
  const match = detail.data;
  const teamIndex = new Map(teams.map(team => [team.id, team]));
  const resolveTeam = team => team ? { ...team, ...(teamIndex.get(team.id) ?? {}) } : team;

  useEffect(() => {
    if (match?.status !== 'live') return undefined;
    const interval = window.setInterval(detail.retry, LIVE_POLL_MS);
    return () => window.clearInterval(interval);
  }, [match?.status, detail.retry]);

  const homeFlash = useScoreFlash(match ? (match.homeScore ?? 0) : undefined);
  const awayFlash = useScoreFlash(match ? (match.awayScore ?? 0) : undefined);

  if (!match) return <article className={`scoreboard scoreboard-${density} scoreboard-loading`}>{detail.error ? <p>NO SE PUDO CARGAR EL PARTIDO.</p> : <p>CARGANDO CARTUCHO...</p>}</article>;

  const goals = match.goals ?? [];
  const lastGoal = goals.length ? goals[goals.length - 1] : null;
  const lastGoalTeamName = lastGoal ? (goalTeamId(lastGoal) === match.homeTeam?.id ? match.homeTeam?.name : match.awayTeam?.name) : '';

  return <article className={`scoreboard scoreboard-${density} scoreboard-status-${match.status}`}>
    <header className="scoreboard-bezel" onClick={onOpen} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}>
      {match.status === 'live' && <i className="scoreboard-live-dot" aria-hidden="true"/>}
      <span className="scoreboard-meta">{match.tournament?.name ?? 'TORNEO'} · {match.groupLabel ? `GRUPO ${match.groupLabel}` : `FECHA ${match.roundNumber ?? '—'}`}</span>
      <i className={`scoreboard-tag scoreboard-tag-${match.status}`}>{STATUS_LABEL[match.status] ?? match.status}</i>
    </header>
    <div className="scoreboard-teams">
      <div className="scoreboard-team"><TeamMark team={resolveTeam(match.homeTeam)}/><b>{match.homeTeam?.name}</b></div>
      <div className="scoreboard-score">
        <span className={`scoreboard-digit${homeFlash ? ' scoreboard-digit-flash' : ''}`}>{match.homeScore ?? '–'}</span>
        <span className="scoreboard-colon">:</span>
        <span className={`scoreboard-digit${awayFlash ? ' scoreboard-digit-flash' : ''}`}>{match.awayScore ?? '–'}</span>
      </div>
      <div className="scoreboard-team scoreboard-team-away"><TeamMark team={resolveTeam(match.awayTeam)}/><b>{match.awayTeam?.name}</b></div>
    </div>
    {lastGoal && <p className="scoreboard-ticker">⚽ {lastGoal.minute ? `${lastGoal.minute}' ` : ''}{goalPlayerName(lastGoal)} ({lastGoalTeamName})</p>}
    {mode === 'manage' && <ScoreboardControls match={match} onChanged={detail.retry}/>}
  </article>;
}
