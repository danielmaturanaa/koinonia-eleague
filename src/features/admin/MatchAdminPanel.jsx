import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useApiQuery } from '../public/useApiQuery.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';

const teamId = team => team?.id ?? '';
const goalPlayerName = goal => goal?.player?.name ?? goal?.playerName ?? goal?.player_name ?? 'Gol sin jugador';
const positionOrder = ['DC', 'EI', 'ED', 'MO', 'MC', 'LI', 'LD', 'DEC', 'PT'];

const isStarter = player => {
  if (typeof player?.isStarter === 'boolean') return player.isStarter;
  if (player?.section) return player.section === 'starters';
  return Number(player?.squadOrder) <= 11;
};
const comparePlayers = (left, right) => {
  const normalizedPositionDifference = (positionOrder.includes(left.position) ? positionOrder.indexOf(left.position) : positionOrder.length)
    - (positionOrder.includes(right.position) ? positionOrder.indexOf(right.position) : positionOrder.length);
  if (normalizedPositionDifference !== 0) return normalizedPositionDifference;
  const squadDifference = (left.squadOrder ?? 999) - (right.squadOrder ?? 999);
  return squadDifference || String(left.name ?? '').localeCompare(String(right.name ?? ''), 'es');
};

function PlayerOptions({ players }) {
  const starters = players.filter(isStarter).sort(comparePlayers);
  const substitutes = players.filter(player => !isStarter(player)).sort(comparePlayers);
  const options = rows => rows.map(player => <option key={player.id} value={player.id}>{player.position ?? 'S/P'} · {player.name}</option>);
  return <>
    {starters.length > 0 && <optgroup label="TITULARES">{options(starters)}</optgroup>}
    {substitutes.length > 0 && <optgroup label="SUPLENTES">{options(substitutes)}</optgroup>}
  </>;
}

function StatusPanel({ match, onChanged }) {
  const mutation = useApiMutation((operation, signal) => endpoints[`${operation}Match`](match.id, signal), { onSuccess: onChanged });
  const operations = match.status === 'pending' ? [['start','INICIAR'],['cancel','CANCELAR']] : match.status === 'live' ? [['finish','FINALIZAR'],['cancel','CANCELAR']] : [['reopen','REABRIR']];
  const run = operation => {
    const label = operations.find(item => item[0] === operation)?.[1] ?? operation;
    if (window.confirm(`¿${label} ESTE PARTIDO?`)) mutation.execute(operation);
  };
  return <section className="match-admin-section"><p>ESTADO ACTUAL: <b>{String(match.status).toUpperCase()}</b></p><div className="admin-action-grid status-actions">{operations.map(([operation, label]) => <button className={`action-button ${operation === 'cancel' ? 'danger' : ''}`} disabled={mutation.loading} key={operation} onClick={() => run(operation)}>{label} PARTIDO</button>)}</div><FormFeedback mutation={mutation}/></section>;
}

function ResultPanel({ match, onChanged }) {
  const [homeScore, setHomeScore] = useState(match.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(match.awayScore ?? '');
  const mutation = useApiMutation((body, signal) => endpoints.setMatchResult(match.id, body, signal), { onSuccess: onChanged });
  const submit = event => {
    event.preventDefault();
    if (window.confirm(`¿GUARDAR EL RESULTADO ${homeScore} - ${awayScore}?`)) mutation.execute({ homeScore: Number(homeScore), awayScore: Number(awayScore) });
  };
  return <form className="admin-form match-result-form" onSubmit={submit}><label>{match.homeTeam?.name}<input type="number" min="0" step="1" required value={homeScore} onChange={event => setHomeScore(event.target.value)}/></label><b>—</b><label>{match.awayTeam?.name}<input type="number" min="0" step="1" required value={awayScore} onChange={event => setAwayScore(event.target.value)}/></label><button className="action-button" disabled={mutation.loading || homeScore === '' || awayScore === ''}>GUARDAR RESULTADO</button><FormFeedback mutation={mutation}/></form>;
}

function useTeamPlayers(selectedTeamId) {
  return useApiQuery(signal => selectedTeamId ? endpoints.teamSquad(selectedTeamId, signal) : Promise.resolve({ data: [] }), [selectedTeamId]);
}

function GoalDeleteButton({ matchId, goal, onChanged }) {
  const mutation = useApiMutation(signal => endpoints.deleteMatchGoal(matchId, goal.id, signal), { onSuccess: onChanged });
  const remove = () => { if (window.confirm(`¿ELIMINAR EL GOL DE ${goalPlayerName(goal)}?`)) mutation.execute(); };
  return <button className="danger" disabled={mutation.loading} onClick={remove}>ELIMINAR</button>;
}

function GoalsPanel({ match, onChanged }) {
  const homeId = teamId(match.homeTeam);
  const awayId = teamId(match.awayTeam);
  const [form, setForm] = useState({ scoringTeamId: homeId, playerId: '', minute: '' });
  const players = useTeamPlayers(form.scoringTeamId);
  const mutation = useApiMutation((body, signal) => endpoints.addMatchGoal(match.id, body, signal), { onSuccess: onChanged });
  const submit = event => {
    event.preventDefault();
    mutation.execute({ scoringTeamId: form.scoringTeamId, ...(form.playerId ? { playerId: form.playerId } : {}), ...(form.minute ? { minute: Number(form.minute) } : {}) });
  };
  return <section className="match-admin-section"><form className="admin-form match-event-form" onSubmit={submit}><label>EQUIPO<select required value={form.scoringTeamId} onChange={event => setForm(current => ({ ...current, scoringTeamId: event.target.value, playerId: '' }))}><option value={homeId}>{match.homeTeam?.name}</option><option value={awayId}>{match.awayTeam?.name}</option></select></label><label>JUGADOR OPCIONAL<select value={form.playerId} onChange={event => setForm(current => ({ ...current, playerId: event.target.value }))}><option value="">GOL SIN JUGADOR</option><PlayerOptions players={players.data ?? []}/></select></label><label>MINUTO OPCIONAL<input type="number" min="0" max="130" step="1" value={form.minute} onChange={event => setForm(current => ({ ...current, minute: event.target.value }))}/></label><button className="action-button" disabled={mutation.loading}>AGREGAR GOL</button><FormFeedback mutation={mutation}/></form><div className="event-admin-list">{match.goals?.length ? match.goals.map(goal => <article key={goal.id}><span><b>{goal.minute ? `${goal.minute}'` : '—'}</b> {goalPlayerName(goal)}</span><GoalDeleteButton matchId={match.id} goal={goal} onChanged={onChanged}/></article>) : <p>SIN GOLES REGISTRADOS.</p>}</div></section>;
}

function RedCardsPanel({ match, onChanged }) {
  const homeId = teamId(match.homeTeam);
  const awayId = teamId(match.awayTeam);
  const [form, setForm] = useState({ teamId: homeId, playerId: '', minute: '' });
  const players = useTeamPlayers(form.teamId);
  const mutation = useApiMutation((body, signal) => endpoints.addMatchRedCard(match.id, body, signal), { onSuccess: onChanged });
  const submit = event => {
    event.preventDefault();
    if (window.confirm('¿REGISTRAR ESTA TARJETA ROJA Y LA SUSPENSIÓN ASOCIADA?')) mutation.execute({ teamId: form.teamId, playerId: form.playerId, ...(form.minute ? { minute: Number(form.minute) } : {}) });
  };
  return <section className="match-admin-section"><form className="admin-form match-event-form" onSubmit={submit}><label>EQUIPO<select value={form.teamId} onChange={event => setForm({ teamId: event.target.value, playerId: '', minute: form.minute })}><option value={homeId}>{match.homeTeam?.name}</option><option value={awayId}>{match.awayTeam?.name}</option></select></label><label>JUGADOR<select required value={form.playerId} onChange={event => setForm(current => ({ ...current, playerId: event.target.value }))}><option value="">SELECCIONAR</option><PlayerOptions players={players.data ?? []}/></select></label><label>MINUTO OPCIONAL<input type="number" min="0" max="130" step="1" value={form.minute} onChange={event => setForm(current => ({ ...current, minute: event.target.value }))}/></label><button className="action-button danger" disabled={!form.playerId || mutation.loading}>REGISTRAR ROJA</button><FormFeedback mutation={mutation}/></form><p>LAS ROJAS SOLO SON VÁLIDAS CON EL PARTIDO EN VIVO.</p></section>;
}

function WinnerPanel({ match, onChanged }) {
  const [winnerTeamId, setWinnerTeamId] = useState(match.winnerTeamId ?? '');
  const [kind, setKind] = useState('');
  const mutation = useApiMutation((body, signal) => endpoints.setMatchWinner(match.id, body, signal), { onSuccess: onChanged });
  const submit = event => {
    event.preventDefault();
    if (window.confirm('¿DEFINIR ESTE EQUIPO COMO GANADOR DEL PARTIDO?')) mutation.execute({ winnerTeamId, ...(kind ? { kind } : {}) });
  };
  return <form className="admin-form match-winner-form" onSubmit={submit}><label>GANADOR<select required value={winnerTeamId} onChange={event => setWinnerTeamId(event.target.value)}><option value="">SELECCIONAR</option><option value={teamId(match.homeTeam)}>{match.homeTeam?.name}</option><option value={teamId(match.awayTeam)}>{match.awayTeam?.name}</option></select></label><label>TIPO OPCIONAL<select value={kind} onChange={event => setKind(event.target.value)}><option value="">RESULTADO NORMAL</option><option value="promotion">PROMOCIÓN</option></select></label><button className="action-button" disabled={!winnerTeamId || mutation.loading}>DEFINIR GANADOR</button><FormFeedback mutation={mutation}/></form>;
}

export function MatchAdminPanel({ match, onChanged }) {
  const [tab, setTab] = useState('status');
  const tabs = [['status','ESTADO'],['result','RESULTADO'],['goals','GOLES'],['cards','ROJAS'],['winner','GANADOR']];
  return <section className="match-admin"><nav>{tabs.map(([value, label]) => <button className={tab === value ? 'active' : ''} key={value} onClick={() => setTab(value)}>{label}</button>)}</nav>{tab === 'status' && <StatusPanel match={match} onChanged={onChanged}/>} {tab === 'result' && <ResultPanel match={match} onChanged={onChanged}/>} {tab === 'goals' && <GoalsPanel match={match} onChanged={onChanged}/>} {tab === 'cards' && <RedCardsPanel match={match} onChanged={onChanged}/>} {tab === 'winner' && <WinnerPanel match={match} onChanged={onChanged}/>}</section>;
}
