import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';

function MutationAction({ action, label, confirmText, onChanged, danger = false }) {
  const mutation = useApiMutation(signal => action(signal), { onSuccess: onChanged });
  const run = () => { if (!confirmText || window.confirm(confirmText)) mutation.execute(); };
  return <div className="mutation-action"><button className={`action-button ${danger ? 'danger' : ''}`} disabled={mutation.loading} onClick={run}>{label}</button><FormFeedback mutation={mutation}/></div>;
}

function StatusPanel({ tournament, onChanged, onDeleted }) {
  const [status, setStatus] = useState(tournament.status === 'completed' ? 'completed' : 'active');
  const update = useApiMutation((value, signal) => endpoints.updateTournamentStatus(tournament.id, value, signal), { onSuccess: onChanged });
  const remove = useApiMutation(signal => endpoints.deleteTournament(tournament.id, signal), { onSuccess: onDeleted });
  const save = () => { if (window.confirm(`¿CAMBIAR EL ESTADO DE ${tournament.name} A ${status.toUpperCase()}?`)) update.execute(status); };
  const deleteTournament = () => { if (window.confirm(`¿ELIMINAR DEFINITIVAMENTE ${tournament.name} Y SUS DATOS RELACIONADOS?`)) remove.execute(); };
  return <section className="tournament-admin-section"><p>ESTADO ACTUAL: <b>{String(tournament.status).toUpperCase()}</b></p><div className="admin-form compact-form"><label>NUEVO ESTADO<select value={status} onChange={event => setStatus(event.target.value)}><option value="active">ACTIVO</option><option value="completed">COMPLETADO</option></select></label><button className="action-button" disabled={update.loading} onClick={save}>ACTUALIZAR ESTADO</button><button className="action-button danger" disabled={remove.loading} onClick={deleteTournament}>ELIMINAR TORNEO</button><FormFeedback mutation={update.error || update.success ? update : remove}/></div></section>;
}

function ParticipationPanel({ tournament, teams, onChanged }) {
  const enrolled = new Set((tournament.teams ?? []).map(team => team.id));
  const candidates = teams.filter(team => !enrolled.has(team.id));
  const [form, setForm] = useState({ teamId: '', groupLabel: '', seed: '' });
  const mutation = useApiMutation((body, signal) => endpoints.addTournamentParticipation(tournament.id, body, signal), { onSuccess: onChanged });
  const submit = event => {
    event.preventDefault();
    mutation.execute({ teamId: form.teamId, ...(form.groupLabel.trim() ? { groupLabel: form.groupLabel.trim().toUpperCase() } : {}), ...(form.seed ? { seed: Number(form.seed) } : {}) });
  };
  return <section className="tournament-admin-section"><p>{tournament.teams?.length ?? 0} PARTICIPANTES INSCRITOS</p><form className="admin-form compact-form" onSubmit={submit}><label>EQUIPO<select required value={form.teamId} onChange={event => setForm(current => ({ ...current, teamId: event.target.value }))}><option value="">SELECCIONAR</option>{candidates.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>GRUPO OPCIONAL<input maxLength="4" value={form.groupLabel} onChange={event => setForm(current => ({ ...current, groupLabel: event.target.value }))}/></label><label>SEMILLA OPCIONAL<input type="number" min="1" step="1" value={form.seed} onChange={event => setForm(current => ({ ...current, seed: event.target.value }))}/></label><button className="action-button" disabled={!form.teamId || mutation.loading}>AGREGAR PARTICIPANTE</button><FormFeedback mutation={mutation}/></form>{candidates.length === 0 && <p className="admin-empty compact">NO HAY MÁS CLUBES DISPONIBLES.</p>}</section>;
}

function DrawPanel({ tournament, onChanged }) {
  const participants = tournament.teams ?? [];
  const [labels, setLabels] = useState(() => Object.fromEntries(participants.map((team, index) => [team.id, team.groupLabel ?? (index % 2 ? 'B' : 'A')])));
  const mutation = useApiMutation((groups, signal) => endpoints.drawTournament(tournament.id, groups, signal), { onSuccess: onChanged });
  const groups = participants.reduce((result, team) => {
    const label = String(labels[team.id] ?? '').trim().toUpperCase();
    if (label) (result[label] ??= []).push(team.id);
    return result;
  }, {});
  const submit = () => {
    if (Object.values(groups).flat().length !== participants.length) return;
    if (window.confirm(`¿SORTEAR ${participants.length} PARTICIPANTES EN ${Object.keys(groups).length} GRUPOS?`)) mutation.execute(groups);
  };
  return <section className="tournament-admin-section"><p>ASIGNA UNA ETIQUETA DE GRUPO A CADA PARTICIPANTE.</p><div className="draw-team-list">{participants.map(team => <label key={team.id}><span>{team.name}</span><input maxLength="4" aria-label={`Grupo de ${team.name}`} value={labels[team.id] ?? ''} onChange={event => setLabels(current => ({ ...current, [team.id]: event.target.value }))}/></label>)}</div><button className="action-button" disabled={!participants.length || mutation.loading || Object.values(groups).flat().length !== participants.length} onClick={submit}>GUARDAR SORTEO</button><FormFeedback mutation={mutation}/></section>;
}

function FixturesPanel({ tournament, onChanged }) {
  const [groupLabel, setGroupLabel] = useState('');
  const [legs, setLegs] = useState('1');
  const roundRobin = useApiMutation((body, signal) => endpoints.generateRoundRobin(tournament.id, body, signal), { onSuccess: onChanged });
  const groups = useApiMutation((body, signal) => endpoints.generateGroupFixtures(tournament.id, body, signal), { onSuccess: onChanged });
  const payload = () => ({ ...(groupLabel.trim() ? { groupLabel: groupLabel.trim().toUpperCase() } : {}), ...(legs ? { legs: Number(legs) } : {}) });
  const generate = (kind, mutation) => { if (window.confirm(`¿GENERAR EL FIXTURE ${kind} PARA ${tournament.name}?`)) mutation.execute(payload()); };
  return <section className="tournament-admin-section"><div className="admin-form compact-form"><label>GRUPO OPCIONAL<input maxLength="4" value={groupLabel} onChange={event => setGroupLabel(event.target.value)}/></label><label>VUELTAS<input type="number" min="1" max="4" step="1" value={legs} onChange={event => setLegs(event.target.value)}/></label><button className="action-button" disabled={roundRobin.loading} onClick={() => generate('ROUND ROBIN', roundRobin)}>ROUND ROBIN</button><button className="action-button" disabled={groups.loading} onClick={() => generate('DE GRUPOS', groups)}>FIXTURE DE GRUPOS</button><FormFeedback mutation={roundRobin.error || roundRobin.success ? roundRobin : groups}/></div></section>;
}

function BracketPanel({ tournament, onChanged }) {
  const [directPerGroup, setDirectPerGroup] = useState('2');
  const [bestThirdCount, setBestThirdCount] = useState('0');
  const bracket = useApiMutation((body, signal) => endpoints.generateBracket(tournament.id, body, signal), { onSuccess: onChanged });
  const create = event => {
    event.preventDefault();
    const body = { ...(directPerGroup ? { directPerGroup: Number(directPerGroup) } : {}), ...(bestThirdCount ? { bestThirdCount: Number(bestThirdCount) } : {}) };
    if (window.confirm('¿GENERAR O ACTUALIZAR LA LLAVE DEL TORNEO?')) bracket.execute(body);
  };
  return <section className="tournament-admin-section"><form className="admin-form compact-form" onSubmit={create}><label>DIRECTOS POR GRUPO<input type="number" min="0" step="1" value={directPerGroup} onChange={event => setDirectPerGroup(event.target.value)}/></label><label>MEJORES TERCEROS<input type="number" min="0" step="1" value={bestThirdCount} onChange={event => setBestThirdCount(event.target.value)}/></label><button className="action-button" disabled={bracket.loading}>GENERAR LLAVE</button><FormFeedback mutation={bracket}/></form><div className="admin-action-grid"><MutationAction label="AVANZAR LLAVE" confirmText="¿AVANZAR LOS GANADORES A LA SIGUIENTE RONDA?" action={signal => endpoints.advanceBracket(tournament.id, signal)} onChanged={onChanged}/><MutationAction label="CUARTOS DE COPA" confirmText="¿GENERAR LOS CUARTOS DE FINAL DE COPA?" action={signal => endpoints.generateCupQuarterfinals(tournament.id, signal)} onChanged={onChanged}/><MutationAction label="OCTAVOS MUNDIAL" confirmText="¿GENERAR LOS OCTAVOS DE FINAL DEL MUNDIAL?" action={signal => endpoints.generateWorldRoundOf16(tournament.id, signal)} onChanged={onChanged}/></div></section>;
}

function DivisionsPanel({ tournament, teams, onChanged }) {
  const [selected, setSelected] = useState([]);
  const initialize = useApiMutation((ids, signal) => endpoints.initializeDivisions(ids, signal), { onSuccess: onChanged });
  const toggle = id => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 6 ? [...current, id] : current);
  const runInitialize = () => { if (selected.length === 6 && window.confirm('¿INICIALIZAR LAS DIVISIONES CON ESTOS SEIS EQUIPOS EN PRIMERA?')) initialize.execute(selected); };
  return <section className="tournament-admin-section"><p>SELECCIONA EXACTAMENTE SEIS EQUIPOS PARA PRIMERA DIVISIÓN: <b>{selected.length}/6</b></p><div className="division-team-list">{teams.map(team => <label key={team.id}><input type="checkbox" checked={selected.includes(team.id)} onChange={() => toggle(team.id)}/><span>{team.name}</span></label>)}</div><button className="action-button" disabled={selected.length !== 6 || initialize.loading} onClick={runInitialize}>INICIALIZAR DIVISIONES</button><FormFeedback mutation={initialize}/><div className="admin-action-grid"><MutationAction label="APLICAR ASCENSO" confirmText="¿APLICAR EL ASCENSO DEFINIDO POR ESTE TORNEO?" action={signal => endpoints.applyPromotion(tournament.id, signal)} onChanged={onChanged}/><MutationAction label="MOVIMIENTOS DIVISIONALES" confirmText="¿APLICAR LOS MOVIMIENTOS DIVISIONALES DE ESTE TORNEO?" action={signal => endpoints.applyDivisionMovements(tournament.id, signal)} onChanged={onChanged}/></div></section>;
}

export function TournamentAdminPanel({ tournament, teams, onChanged, onDeleted }) {
  const [tab, setTab] = useState('status');
  const tabs = [['status','ESTADO'],['participants','PARTICIPANTES'],['draw','SORTEO'],['fixtures','CALENDARIO'],['bracket','LLAVES'],['divisions','DIVISIONES']];
  return <section className="tournament-admin"><nav>{tabs.map(([value, label]) => <button className={tab === value ? 'active' : ''} key={value} onClick={() => setTab(value)}>{label}</button>)}</nav>{tab === 'status' && <StatusPanel tournament={tournament} onChanged={onChanged} onDeleted={onDeleted}/>} {tab === 'participants' && <ParticipationPanel tournament={tournament} teams={teams} onChanged={onChanged}/>} {tab === 'draw' && <DrawPanel tournament={tournament} onChanged={onChanged}/>} {tab === 'fixtures' && <FixturesPanel tournament={tournament} onChanged={onChanged}/>} {tab === 'bracket' && <BracketPanel tournament={tournament} onChanged={onChanged}/>} {tab === 'divisions' && <DivisionsPanel tournament={tournament} teams={teams} onChanged={onChanged}/>}</section>;
}
