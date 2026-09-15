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
const isStarter = player => {
  if (typeof player?.isStarter === 'boolean') return player.isStarter;
  if (player?.section) return player.section === 'starters';
  return Number(player?.squadOrder) <= 11;
};
const comparePlayers = (a, b) => (positionOrder.indexOf(a.position) === -1 ? 99 : positionOrder.indexOf(a.position)) - (positionOrder.indexOf(b.position) === -1 ? 99 : positionOrder.indexOf(b.position)) || (a.squadOrder ?? 999) - (b.squadOrder ?? 999);

function useSquad(teamId) {
  return useApiQuery(signal => teamId ? endpoints.teamSquad(teamId, signal) : Promise.resolve({ data: [] }), [teamId]);
}

function PlayerSelect({ teamId, value, onChange, required }) {
  const squad = useSquad(teamId);
  const players = squad.data ?? [];
  const starters = players.filter(isStarter).sort(comparePlayers);
  const substitutes = players.filter(player => !isStarter(player)).sort(comparePlayers);
  const options = rows => rows.map(player => <option key={player.id} value={player.id}>{player.position ?? 'S/P'} · {player.name}</option>);
  return <select className="scoreboard-select" required={required} value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{required ? 'SELECCIONAR JUGADOR' : 'SIN JUGADOR'}</option>
    {starters.length > 0 && <optgroup label="TITULARES">{options(starters)}</optgroup>}
    {substitutes.length > 0 && <optgroup label="SUPLENTES">{options(substitutes)}</optgroup>}
  </select>;
}

function PlayerPicker({ teamId, onPick, disabled }) {
  const squad = useSquad(teamId);
  const players = squad.data ?? [];
  const starters = players.filter(isStarter).sort(comparePlayers);
  const substitutes = players.filter(player => !isStarter(player)).sort(comparePlayers);
  const group = (label, rows) => rows.length > 0 && <div className="scoreboard-player-group" key={label}>
    <p className="scoreboard-player-group-label">{label}</p>
    <div className="scoreboard-player-grid">{rows.map(player => <button type="button" key={player.id} disabled={disabled} onClick={() => onPick(player.id)}>{player.position ?? 'S/P'} · {player.name}</button>)}</div>
  </div>;
  if (squad.loading) return <p className="scoreboard-player-empty">CARGANDO PLANTEL...</p>;
  if (!players.length) return <p className="scoreboard-player-empty">SIN JUGADORES EN EL PLANTEL.</p>;
  return <div className="scoreboard-player-picker">{group('TITULARES', starters)}{group('SUPLENTES', substitutes)}</div>;
}

function GoalPopover({ match, teamId, teamName, onClose, onChanged }) {
  const rivalTeamId = teamId === match.homeTeam?.id ? match.awayTeam?.id : match.homeTeam?.id;
  const rivalTeamName = teamId === match.homeTeam?.id ? match.awayTeam?.name : match.homeTeam?.name;
  const [ownGoal, setOwnGoal] = useState(false);
  const mutation = useApiMutation((body, signal) => endpoints.addMatchGoal(match.id, body, signal), { onSuccess: () => { onChanged(); onClose(); } });
  const score = playerId => mutation.execute({ scoringTeamId: teamId, ownGoal, ...(playerId ? { playerId } : {}) });
  return <div className="scoreboard-popover scoreboard-popover-goal">
    <p>GOL DE {teamName?.toUpperCase()}</p>
    <label className="scoreboard-own-goal"><input type="checkbox" checked={ownGoal} disabled={mutation.loading} onChange={event => setOwnGoal(event.target.checked)}/> AUTOGOL DE {rivalTeamName?.toUpperCase()}</label>
    <PlayerPicker teamId={ownGoal ? rivalTeamId : teamId} onPick={score} disabled={mutation.loading}/>
    {!ownGoal && <button type="button" className="scoreboard-player-none" disabled={mutation.loading} onClick={() => score('')}>⚽ GOL SIN JUGADOR</button>}
    <button type="button" className="scoreboard-btn-text" disabled={mutation.loading} onClick={onClose}>CANCELAR</button>
    {mutation.error && <p className="scoreboard-popover-error">{mutation.error.message}</p>}
  </div>;
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

function GoalList({ match, onClose, onChanged }) {
  const mutation = useApiMutation((goalId, signal) => endpoints.deleteMatchGoal(match.id, goalId, signal), { onSuccess: onChanged });
  const goals = match.goals ?? [];
  const teamName = goal => goalTeamId(goal) === match.homeTeam?.id ? match.homeTeam?.name : match.awayTeam?.name;
  const remove = goal => { if (window.confirm('¿ANULAR ESTE GOL? SE DESCUENTA DEL MARCADOR.')) mutation.execute(goal.id); };
  return <div className="scoreboard-popover scoreboard-goal-list-popover">
    <p>GOLES DEL PARTIDO</p>
    {goals.length ? <div className="scoreboard-goal-list">{goals.map(goal => <div className="scoreboard-goal-row" key={goal.id}>
      <span>⚽ {goalPlayerName(goal)}{goal.isOwnGoal ? ' (autogol)' : ''} · {teamName(goal)}</span>
      <button type="button" className="scoreboard-goal-remove" disabled={mutation.loading} onClick={() => remove(goal)}>✕ ANULAR</button>
    </div>)}</div> : <p className="scoreboard-player-empty">SIN GOLES REGISTRADOS.</p>}
    <button type="button" className="scoreboard-btn-text" onClick={onClose}>CERRAR</button>
    {mutation.error && <p className="scoreboard-popover-error">{mutation.error.message}</p>}
  </div>;
}

function RedCardList({ match, onClose, onChanged }) {
  const mutation = useApiMutation((redCardId, signal) => endpoints.deleteMatchRedCard(match.id, redCardId, signal), { onSuccess: onChanged });
  const redCards = match.redCards ?? [];
  const remove = card => { if (window.confirm('¿ANULAR ESTA TARJETA ROJA? SE LEVANTA LA SUSPENSIÓN ASOCIADA.')) mutation.execute(card.id); };
  return <div className="scoreboard-popover scoreboard-popover-danger scoreboard-goal-list-popover">
    <p>TARJETAS ROJAS DEL PARTIDO</p>
    {redCards.length ? <div className="scoreboard-goal-list">{redCards.map(card => <div className="scoreboard-goal-row" key={card.id}>
      <span>🟥 {card.playerName} · {card.teamName}</span>
      <button type="button" className="scoreboard-goal-remove" disabled={mutation.loading} onClick={() => remove(card)}>✕ ANULAR</button>
    </div>)}</div> : <p className="scoreboard-player-empty">SIN TARJETAS ROJAS REGISTRADAS.</p>}
    <button type="button" className="scoreboard-btn-text" onClick={onClose}>CERRAR</button>
    {mutation.error && <p className="scoreboard-popover-error">{mutation.error.message}</p>}
  </div>;
}

function ScoreboardControls({ match, onChanged, compact }) {
  const [popover, setPopover] = useState(null);
  const status = useApiMutation((operation, signal) => endpoints[`${operation}Match`](match.id, signal), { onSuccess: onChanged });
  const runStatus = (operation, label, confirmMessage) => { if (window.confirm(confirmMessage ?? `¿${label} ESTE PARTIDO?`)) status.execute(operation); };
  const revertButton = <button className="scoreboard-btn-text scoreboard-btn-revert" disabled={status.loading} onClick={() => runStatus('reset', 'REVERTIR', '¿REVERTIR ESTE PARTIDO A PENDIENTE 0-0? SE BORRARÁN LOS GOLES Y TARJETAS REGISTRADOS.')}>↺ REVERTIR A PENDIENTE (0-0)</button>;
  const goalsCount = match.goals?.length ?? 0;
  const goalsButton = <button className="scoreboard-btn-text" disabled={status.loading} onClick={() => setPopover('goals')}>📋 VER/ANULAR GOLES{goalsCount ? ` (${goalsCount})` : ''}</button>;
  const redCardsCount = match.redCards?.length ?? 0;
  const redCardsButton = <button className="scoreboard-btn-text" disabled={status.loading} onClick={() => setPopover('redcards')}>🟥 VER/ANULAR ROJAS{redCardsCount ? ` (${redCardsCount})` : ''}</button>;

  if (match.status === 'pending') return <div className="scoreboard-controls scoreboard-controls-pending">
    <button className="scoreboard-btn scoreboard-btn-start" disabled={status.loading} onClick={() => runStatus('start', 'INICIAR')}>▶ INICIAR PARTIDO</button>
    {!compact && <button className="scoreboard-btn-text scoreboard-btn-cancel" disabled={status.loading} onClick={() => runStatus('cancel', 'CANCELAR', '¿CANCELAR ESTE PARTIDO? QUEDARÁ ANULADO, NO SE JUGARÁ.')}>✕ CANCELAR PARTIDO (NO SE JUGARÁ)</button>}
  </div>;

  if (match.status === 'finished') return <div className="scoreboard-controls scoreboard-controls-closed">
    <button className="scoreboard-btn-text" disabled={status.loading} onClick={() => runStatus('reopen', 'REABRIR')}>↺ REABRIR PARTIDO (VUELVE A EN VIVO)</button>
  </div>;

  if (match.status === 'cancelled') return <div className="scoreboard-controls scoreboard-controls-closed">
    {revertButton}
  </div>;

  if (match.status !== 'live') return null;

  return <div className="scoreboard-controls">
    {popover === 'home' && <GoalPopover match={match} teamId={match.homeTeam?.id} teamName={match.homeTeam?.name} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {popover === 'away' && <GoalPopover match={match} teamId={match.awayTeam?.id} teamName={match.awayTeam?.name} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {popover === 'card' && <RedCardPopover match={match} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {popover === 'goals' && <GoalList match={match} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {popover === 'redcards' && <RedCardList match={match} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {!popover && <>
      <div className="scoreboard-pad">
        <button className="scoreboard-btn scoreboard-btn-goal" onClick={() => setPopover('home')}>GOL LOCAL</button>
        <button className="scoreboard-btn scoreboard-btn-goal" onClick={() => setPopover('away')}>GOL VISITA</button>
        <button className="scoreboard-btn scoreboard-btn-card" onClick={() => setPopover('card')}>ROJA</button>
        <button className="scoreboard-btn scoreboard-btn-finish" disabled={status.loading} onClick={() => runStatus('finish', 'FINALIZAR')}>FINALIZAR</button>
      </div>
      <div className="scoreboard-secondary-actions">{goalsButton}{redCardsButton}{revertButton}</div>
    </>}
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
    {lastGoal && <p className="scoreboard-ticker">⚽ {goalPlayerName(lastGoal)}{lastGoal.isOwnGoal ? ' (autogol)' : ''} ({lastGoalTeamName})</p>}
    {mode === 'manage' && <ScoreboardControls match={match} onChanged={detail.retry} compact={density === 'tile'}/>}
  </article>;
}
