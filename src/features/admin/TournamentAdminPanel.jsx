import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';
import { TeamMark } from '../../components/TeamMark.jsx';

function MutationAction({ action, label, confirmText, onChanged, danger = false }) {
  const mutation = useApiMutation(signal => action(signal), { onSuccess: onChanged });
  const run = () => { if (!confirmText || window.confirm(confirmText)) mutation.execute(); };
  return <div className="mutation-action"><button className={`action-button ${danger ? 'danger' : ''}`} disabled={mutation.loading} onClick={run}>{label}</button><FormFeedback mutation={mutation}/></div>;
}

export function TournamentAwardsPanel({ tournament, onChanged }) {
  const standings = useApiQuery(signal => endpoints.standings(tournament.id, {}, signal), [tournament.id]);
  const rows = Array.isArray(standings.data) ? standings.data : [];
  const [amounts, setAmounts] = useState({});
  useEffect(() => setAmounts({}), [tournament.id]);
  const grants = rows.map((row, index) => ({ row, position: index + 1, amount: Number(amounts[row.team_id] ?? 0) })).filter(item => item.amount > 0);
  const total = grants.reduce((sum, item) => sum + item.amount, 0);
  const mutation = useApiMutation(async signal => {
    for (const grant of grants) {
      await endpoints.creditTeam(grant.row.team_id, {
        amount: grant.amount,
        reason: `Premio ${tournament.name} · Puesto ${grant.position}`,
      }, signal);
    }
    return { data: { awardedTeams: grants.length, total } };
  }, { onSuccess: () => { setAmounts({}); onChanged?.(); } });
  const save = () => {
    if (!grants.length) return;
    if (window.confirm(`¿OTORGAR ${total.toLocaleString('es-CL')} GP EN PREMIOS A ${grants.length} CLUBES? ESTA OPERACIÓN MODIFICARÁ SUS PRESUPUESTOS.`)) mutation.execute();
  };
  return <section className="tournament-awards"><header><div><h3>CLASIFICACIÓN FINAL Y PREMIOS</h3><p>INGRESA EL PREMIO DE CADA CLUB. LOS MONTOS SE ACREDITARÁN CON UN ÚNICO GUARDADO.</p></div><b>{total.toLocaleString('es-CL')} GP</b></header><DataState query={standings}/>{rows.length > 0 && <div className="tournament-awards-table"><table><thead><tr><th>CLUB</th><th>PTS</th><th>PREMIO GP</th></tr></thead><tbody>{rows.map(row => <tr key={row.team_id}><td>{row.name}</td><td><b>{row.points}</b></td><td><input aria-label={`Premio para ${row.name}`} type="number" min="0" step="1" value={amounts[row.team_id] ?? ''} onChange={event => setAmounts(current => ({ ...current, [row.team_id]: event.target.value }))} placeholder="0"/></td></tr>)}</tbody></table></div>}<button className="action-button tournament-awards-save" disabled={!grants.length || mutation.loading} onClick={save}>GUARDAR Y OTORGAR PREMIOS</button><FormFeedback mutation={mutation}/></section>;
}

function StatusPanel({ tournament, onChanged, onDeleted }) {
  const [status, setStatus] = useState(tournament.status === 'completed' ? 'completed' : 'active');
  const [championPolicy, setChampionPolicy] = useState(tournament.championPolicy ?? 'regular_season');
  const update = useApiMutation((value, signal) => endpoints.updateTournamentStatus(tournament.id, value, signal), { onSuccess: onChanged });
  const policy = useApiMutation((value, signal) => endpoints.updateTournamentChampionPolicy(tournament.id, value, signal), { onSuccess: onChanged });
  const remove = useApiMutation(signal => endpoints.deleteTournament(tournament.id, signal), { onSuccess: onDeleted });
  const save = () => { if (window.confirm(`¿CAMBIAR EL ESTADO DE ${tournament.name} A ${status.toUpperCase()}?`)) update.execute(status); };
  const saveChampionPolicy = () => { if (window.confirm(championPolicy === 'playoffs' ? `¿DEFINIR QUE EL CAMPEÓN DE ${tournament.name} SEA EL GANADOR DE LOS PLAYOFFS? SE RETIRARÁ CUALQUIER TÍTULO Y NOTICIA DE CAMPEÓN DE FASE REGULAR.` : `¿DEFINIR QUE EL CAMPEÓN DE ${tournament.name} SEA EL LÍDER DE LA FASE REGULAR?`)) policy.execute(championPolicy); };
  const deleteTournament = () => { if (window.confirm(`¿ELIMINAR DEFINITIVAMENTE ${tournament.name} Y SUS DATOS RELACIONADOS?`)) remove.execute(); };
  return <section className="tournament-admin-section"><p>ESTADO ACTUAL: <b>{String(tournament.status).toUpperCase()}</b></p><div className="admin-form compact-form"><label>NUEVO ESTADO<select value={status} onChange={event => setStatus(event.target.value)}><option value="active">ACTIVO</option><option value="completed">COMPLETADO</option></select></label><button className="action-button" disabled={update.loading} onClick={save}>ACTUALIZAR ESTADO</button>{tournament.format === 'league' && <><label>CAMPEONES DE LA LIGA<select value={championPolicy} onChange={event => setChampionPolicy(event.target.value)}><option value="regular_season">FASE REGULAR</option><option value="playoffs">PLAYOFFS</option><option value="both">AMBOS TÍTULOS</option></select></label><button className="action-button" disabled={policy.loading || championPolicy === tournament.championPolicy} onClick={saveChampionPolicy}>ACTUALIZAR REGLA</button></>}<button className="action-button danger" disabled={remove.loading} onClick={deleteTournament}>ELIMINAR TORNEO</button><FormFeedback mutation={update.error || update.success ? update : policy.error || policy.success ? policy : remove}/></div>{tournament.status === 'completed' && <TournamentAwardsPanel tournament={tournament} onChanged={onChanged}/>}</section>;
}

function ParticipationPanel({ tournament, teams, onChanged }) {
  const candidates = teams.filter(team => team.kind === tournament.competitorKind);
  const [selected, setSelected] = useState(() => (tournament.teams ?? []).map(team => team.id));
  useEffect(() => setSelected((tournament.teams ?? []).map(team => team.id)), [tournament.id, tournament.teams]);
  const mutation = useApiMutation((teamIds, signal) => endpoints.replaceTournamentParticipations(tournament.id, teamIds, signal), { onSuccess: onChanged });
  const toggle = teamId => setSelected(current => current.includes(teamId) ? current.filter(id => id !== teamId) : [...current, teamId]);
  const invalidKnockout = tournament.format === 'knockout' && (selected.length < 2 || (selected.length & (selected.length - 1)) !== 0);
  const save = () => { if (window.confirm(`¿GUARDAR ${selected.length} PARTICIPANTES? EL SORTEO ACTUAL SE REINICIARÁ.`)) mutation.execute(selected); };
  if (tournament.rosterLocked) return <section className="tournament-admin-section"><p>LA NÓMINA DE <b>{tournament.teams?.length ?? 0} PARTICIPANTES</b> ESTÁ BLOQUEADA PORQUE EL FIXTURE YA FUE CREADO.</p></section>;
  return <section className="tournament-admin-section"><p>SELECCIONA LOS PARTICIPANTES. PODRÁS CAMBIARLOS HASTA GENERAR EL FIXTURE: <b>{selected.length}</b></p><div className="division-team-list">{candidates.map(team => <label key={team.id}><input type="checkbox" checked={selected.includes(team.id)} onChange={() => toggle(team.id)}/><span>{team.name}</span></label>)}</div>{invalidKnockout && <p className="admin-empty compact">LA ELIMINACIÓN DIRECTA REQUIERE 2, 4, 8, 16… PARTICIPANTES.</p>}<button className="action-button" disabled={selected.length < 2 || invalidKnockout || mutation.loading} onClick={save}>GUARDAR PARTICIPANTES</button><FormFeedback mutation={mutation}/></section>;
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
  const teamCount = tournament.teams?.length ?? 0;
  return <section className="tournament-admin-section"><p>{teamCount} PARTICIPANTES{teamCount % 2 ? ' · HABRÁ UN DESCANSO POR JORNADA.' : ''}</p><div className="admin-form compact-form"><label>GRUPO OPCIONAL<input maxLength="4" value={groupLabel} onChange={event => setGroupLabel(event.target.value)}/></label><label>VUELTAS<select value={legs} onChange={event => setLegs(event.target.value)}><option value="1">1</option><option value="2">2</option></select></label><button className="action-button" disabled={roundRobin.loading} onClick={() => generate('ROUND ROBIN', roundRobin)}>ROUND ROBIN</button><button className="action-button" disabled={groups.loading} onClick={() => generate('DE GRUPOS', groups)}>FIXTURE DE GRUPOS</button><FormFeedback mutation={roundRobin.error || roundRobin.success ? roundRobin : groups}/></div></section>;
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

function PlayoffsPanel({ tournament, teams, onChanged }) {
  const playoffs = useApiQuery(signal => endpoints.playoffs(tournament.id, signal), [tournament.id]);
  const [form, setForm] = useState({ pairingMode: 'seeded', semifinalLegs: '1', finalLegs: '1', semi1a: '', semi1b: '', semi2a: '', semi2b: '' });
  const create = useApiMutation((body, signal) => endpoints.createPlayoffs(tournament.id, body, signal), { onSuccess: () => { playoffs.retry(); onChanged(); } });
  const tiebreak = useApiMutation(({ seriesId, winnerTeamId }, signal) => endpoints.resolvePlayoffTiebreak(seriesId, winnerTeamId, signal), { onSuccess: () => { playoffs.retry(); onChanged(); } });
  const configured = playoffs.data;
  const submit = event => {
    event.preventDefault();
    const body = { pairingMode: form.pairingMode, semifinalLegs: Number(form.semifinalLegs), finalLegs: Number(form.finalLegs) };
    if (form.pairingMode === 'custom') body.semifinalPairs = [[form.semi1a, form.semi1b], [form.semi2a, form.semi2b]];
    if (window.confirm('¿CONFIRMAR LOS PLAYOFFS? LA CLASIFICACIÓN Y LAS LLAVES QUEDARÁN FIJADAS.')) create.execute(body);
  };
  const team = id => teams.find(item => item.id === id);
  return <section className="tournament-admin-section"><DataState query={playoffs}/>{configured ? <div className="playoff-admin-summary"><p><b>PLAYOFFS {configured.status.toUpperCase()}</b> · SEMIS A {configured.semifinalLegs === 1 ? 'PARTIDO ÚNICO' : 'IDA Y VUELTA'} · FINAL A {configured.finalLegs === 1 ? 'PARTIDO ÚNICO' : 'IDA Y VUELTA'}</p><div className="playoff-qualifiers">{configured.qualifiers.map(row => <span key={row.teamId}><b>#{row.rank}</b><TeamMark team={team(row.teamId) ?? row}/>{row.name}</span>)}</div>{configured.series.filter(series => series.status === 'awaiting_tiebreak').map(series => <div className="playoff-tiebreak" key={series.id}><span>{series.round === 'final' ? 'FINAL' : `SEMIFINAL ${series.slot}`} EMPATADA: REGISTRA EL GANADOR POR PENALES.</span><button className="action-button" disabled={tiebreak.loading} onClick={() => tiebreak.execute({ seriesId: series.id, winnerTeamId: series.homeTeam.id })}>{series.homeTeam.name}</button><button className="action-button" disabled={tiebreak.loading} onClick={() => tiebreak.execute({ seriesId: series.id, winnerTeamId: series.awayTeam.id })}>{series.awayTeam.name}</button></div>)}<FormFeedback mutation={tiebreak}/></div> : <form className="admin-form compact-form" onSubmit={submit}><label>CRUCES<select value={form.pairingMode} onChange={event => setForm(current => ({ ...current, pairingMode: event.target.value }))}><option value="seeded">1° VS 4° · 2° VS 3°</option><option value="custom">ELEGIR MANUALMENTE</option></select></label><label>SEMIFINALES<select value={form.semifinalLegs} onChange={event => setForm(current => ({ ...current, semifinalLegs: event.target.value }))}><option value="1">PARTIDO ÚNICO</option><option value="2">IDA Y VUELTA</option></select></label><label>FINAL<select value={form.finalLegs} onChange={event => setForm(current => ({ ...current, finalLegs: event.target.value }))}><option value="1">PARTIDO ÚNICO</option><option value="2">IDA Y VUELTA</option></select></label>{form.pairingMode === 'custom' && <><label>SEMIFINAL 1 · EQUIPO 1<select required value={form.semi1a} onChange={event => setForm(current => ({ ...current, semi1a: event.target.value }))}><option value="">ELEGIR</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>SEMIFINAL 1 · EQUIPO 2<select required value={form.semi1b} onChange={event => setForm(current => ({ ...current, semi1b: event.target.value }))}><option value="">ELEGIR</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>SEMIFINAL 2 · EQUIPO 1<select required value={form.semi2a} onChange={event => setForm(current => ({ ...current, semi2a: event.target.value }))}><option value="">ELEGIR</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>SEMIFINAL 2 · EQUIPO 2<select required value={form.semi2b} onChange={event => setForm(current => ({ ...current, semi2b: event.target.value }))}><option value="">ELEGIR</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></>}<button className="action-button" disabled={create.loading}>CREAR PLAYOFFS</button><FormFeedback mutation={create}/></form>}</section>;
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
  const tabs = [['status','ESTADO'],['participants','PARTICIPANTES'],['draw','SORTEO'],['fixtures','CALENDARIO'],['bracket','LLAVES'],['playoffs','PLAYOFFS'], ...(tournament.divisionsReady ? [['divisions','DIVISIONES']] : [])];
  return <section className="tournament-admin"><nav>{tabs.map(([value, label]) => <button className={tab === value ? 'active' : ''} key={value} onClick={() => setTab(value)}>{label}</button>)}</nav>{tab === 'status' && <StatusPanel tournament={tournament} onChanged={onChanged} onDeleted={onDeleted}/>} {tab === 'participants' && <ParticipationPanel tournament={tournament} teams={teams} onChanged={onChanged}/>} {tab === 'draw' && <DrawPanel tournament={tournament} onChanged={onChanged}/>} {tab === 'fixtures' && <FixturesPanel tournament={tournament} onChanged={onChanged}/>} {tab === 'bracket' && <BracketPanel tournament={tournament} onChanged={onChanged}/>} {tab === 'playoffs' && <PlayoffsPanel tournament={tournament} teams={teams} onChanged={onChanged}/>} {tab === 'divisions' && tournament.divisionsReady && <DivisionsPanel tournament={tournament} teams={teams} onChanged={onChanged}/>}</section>;
}
