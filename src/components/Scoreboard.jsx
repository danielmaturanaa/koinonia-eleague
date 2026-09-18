import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../api/endpoints.js';
import { useApiMutation } from '../features/admin/useApiMutation.js';
import { useApiQuery } from '../features/public/useApiQuery.js';
import { goalPlayerName, goalTeamId, groupGoals } from '../utils/goals.js';
import { TeamMark } from './TeamMark.jsx';
import { matchRoundLabel } from '../utils/matchPresentation.js';

const STATUS_LABEL = { pending: 'POR JUGAR', live: 'EN VIVO', finished: 'FINAL', cancelled: 'CANCELADO' };
const LIVE_POLL_MS = 12000;
const positionOrder = ['DC', 'EI', 'ED', 'MO', 'MC', 'LI', 'LD', 'DEC', 'PT'];

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

function GoalPopover({ match, teamId, teamName, onClose, onChanged }) {
  const [playerId, setPlayerId] = useState('');
  const mutation = useApiMutation((body, signal) => endpoints.addMatchGoal(match.id, body, signal), { onSuccess: () => { onChanged(); onClose(); } });
  const submit = event => {
    event.preventDefault();
    mutation.execute({ scoringTeamId: teamId, ...(playerId ? { playerId } : {}) });
  };
  return <form className="scoreboard-popover" onSubmit={submit}>
    <p>GOL DE {teamName?.toUpperCase()}</p>
    <PlayerSelect teamId={teamId} value={playerId} onChange={setPlayerId}/>
    <div className="scoreboard-popover-actions"><button type="button" onClick={onClose} disabled={mutation.loading}>CANCELAR</button><button type="submit" className="scoreboard-confirm" disabled={mutation.loading}>¡GOL!</button></div>
    {mutation.error && <p className="scoreboard-popover-error">{mutation.error.message}</p>}
  </form>;
}

function OwnGoalPopover({ match, onClose, onChanged }) {
  const homeId = match.homeTeam?.id;
  const awayId = match.awayTeam?.id;
  const [scoringTeamId, setScoringTeamId] = useState(homeId);
  const [playerId, setPlayerId] = useState('');
  const rivalTeamId = scoringTeamId === homeId ? awayId : homeId;
  const rivalTeamName = scoringTeamId === homeId ? match.awayTeam?.name : match.homeTeam?.name;
  const mutation = useApiMutation((body, signal) => endpoints.addMatchGoal(match.id, body, signal), { onSuccess: () => { onChanged(); onClose(); } });
  const chooseTeam = value => { setScoringTeamId(value); setPlayerId(''); };
  const submit = event => {
    event.preventDefault();
    mutation.execute({ scoringTeamId, ownGoal: true, playerId });
  };
  return <form className="scoreboard-popover scoreboard-popover-danger" onSubmit={submit}>
    <p>AUTOGOL · ¿A FAVOR DE QUIÉN?</p>
    <div className="scoreboard-team-toggle">
      <button type="button" className={scoringTeamId === homeId ? 'active' : ''} onClick={() => chooseTeam(homeId)}>{match.homeTeam?.name}</button>
      <button type="button" className={scoringTeamId === awayId ? 'active' : ''} onClick={() => chooseTeam(awayId)}>{match.awayTeam?.name}</button>
    </div>
    <p className="scoreboard-popover-hint">LO MARCÓ UN JUGADOR DE {rivalTeamName?.toUpperCase()}</p>
    <PlayerSelect teamId={rivalTeamId} value={playerId} onChange={setPlayerId} required/>
    <div className="scoreboard-popover-actions"><button type="button" onClick={onClose} disabled={mutation.loading}>CANCELAR</button><button type="submit" className="scoreboard-confirm scoreboard-confirm-danger" disabled={!playerId || mutation.loading}>¡AUTOGOL!</button></div>
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
    {popover === 'owngoal' && <OwnGoalPopover match={match} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {popover === 'card' && <RedCardPopover match={match} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {popover === 'goals' && <GoalList match={match} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {popover === 'redcards' && <RedCardList match={match} onClose={() => setPopover(null)} onChanged={onChanged}/>}
    {!popover && <>
      <div className="scoreboard-pad">
        <button className="scoreboard-btn scoreboard-btn-goal" onClick={() => setPopover('home')}>GOL LOCAL</button>
        <button className="scoreboard-btn scoreboard-btn-goal" onClick={() => setPopover('away')}>GOL VISITA</button>
        <button className="scoreboard-btn scoreboard-btn-owngoal" onClick={() => setPopover('owngoal')}>AUTOGOL</button>
        <button className="scoreboard-btn scoreboard-btn-card" onClick={() => setPopover('card')}>ROJA</button>
      </div>
      <button className="scoreboard-btn scoreboard-btn-finish" disabled={status.loading} onClick={() => runStatus('finish', 'FINALIZAR')}>FINALIZAR</button>
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

function useFinishedNotifier(status, onFinished) {
  const previous = useRef(undefined);
  useEffect(() => {
    if (status === undefined) return;
    if (previous.current !== undefined && previous.current !== 'finished' && status === 'finished') onFinished?.();
    previous.current = status;
  }, [status, onFinished]);
}

function ScoreboardActa({ match }) {
  const goals = match.goals ?? [];
  const homeGoals = groupGoals(goals.filter(goal => goalTeamId(goal) === match.homeTeam?.id));
  const awayGoals = groupGoals(goals.filter(goal => goalTeamId(goal) === match.awayTeam?.id));
  if (!homeGoals.length && !awayGoals.length) return null;
  const column = entries => entries.map(entry => <p key={entry.key}><b>{'⚽'.repeat(entry.count)}</b> {entry.name}{entry.ownGoal ? ' (autogol)' : ''}</p>);
  return <div className="scoreboard-acta">
    <div className="scoreboard-acta-team">{column(homeGoals)}</div>
    <div className="scoreboard-acta-team">{column(awayGoals)}</div>
  </div>;
}

export function Scoreboard({ matchId, mode = 'view', density = 'tile', onOpen, onFinished, teams = [] }) {
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
  useFinishedNotifier(match?.status, onFinished);

  if (!match) return <article className={`scoreboard scoreboard-${density} scoreboard-loading`}>{detail.error ? <p>NO SE PUDO CARGAR EL PARTIDO.</p> : <p>CARGANDO CARTUCHO...</p>}</article>;

  return <article className={`scoreboard scoreboard-${density} scoreboard-status-${match.status}`}>
    <header className="scoreboard-bezel" onClick={onOpen} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}>
      {match.status === 'live' && <i className="scoreboard-live-dot" aria-hidden="true"/>}
      <span className="scoreboard-meta">{match.tournament?.name ?? 'TORNEO'} · {matchRoundLabel(match)}</span>
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
    <ScoreboardActa match={match}/>
    {mode === 'manage' && <ScoreboardControls match={match} onChanged={detail.retry} compact={density === 'tile'}/>}
  </article>;
}
