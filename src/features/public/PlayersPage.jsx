import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, PageHeader, Pagination, gp } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const positions = ['PT','LD','DEC','LI','MC','MO','ED','EI','DC'];

function CreatePlayerForm({ onChanged }) {
  const [form, setForm] = useState({ name: '', position: 'PT', gpValue: '' });
  const mutation = useApiMutation((payload, signal) => endpoints.createPlayer(payload, signal), {
    onSuccess: () => {
      setForm({ name: '', position: 'PT', gpValue: '' });
      onChanged();
    },
  });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = event => {
    event.preventDefault();
    mutation.execute({ name: form.name.trim(), position: form.position, ...(form.gpValue ? { gpValue: Number(form.gpValue) } : {}) });
  };
  return <form className="admin-form player-create-form" onSubmit={submit}>
    <label>NOMBRE<input name="name" required value={form.name} onChange={change}/></label>
    <label>POSICIÓN<select name="position" value={form.position} onChange={change}>{positions.map(value => <option key={value}>{value}</option>)}</select></label>
    <label>VALOR GP OPCIONAL<input name="gpValue" type="number" min="0" step="1" value={form.gpValue} onChange={change}/></label>
    <button className="action-button" disabled={mutation.loading}>CREAR JUGADOR</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function PlayerActions({ player, teams, onChanged }) {
  const [teamId, setTeamId] = useState('');
  const [note, setNote] = useState('');
  const [gpAmount, setGpAmount] = useState('');
  const assign = useApiMutation((body, signal) => endpoints.assignPlayer(player.id, body, signal), { onSuccess: onChanged });
  const buy = useApiMutation((id, signal) => endpoints.buyPlayer(player.id, id, signal), { onSuccess: onChanged });
  const release = useApiMutation((body, signal) => endpoints.releasePlayer(player.id, body, signal), { onSuccess: onChanged });
  const isFree = player.isFreeAgent ?? !player.team;
  const currentTeamId = player.team?.id ?? player.teamId;
  const feedback = assign.error || assign.success ? assign : buy.error || buy.success ? buy : release;

  const buyPlayer = () => {
    const team = teams.find(item => item.id === teamId);
    if (window.confirm(`¿COMPRAR A ${player.name} PARA ${team?.name ?? 'EL EQUIPO SELECCIONADO'} POR SU VALOR GP?`)) buy.execute(teamId);
  };
  const releasePlayer = () => {
    if (window.confirm(`¿LIBERAR A ${player.name} POR ${Number(gpAmount).toLocaleString('es-CL')} GP?`)) release.execute({ teamId: currentTeamId, gpAmount: Number(gpAmount) });
  };

  return <section className="player-actions">
    <h3>GESTIÓN DEL JUGADOR</h3>
    {isFree ? <>
      <label>EQUIPO<select value={teamId} onChange={event => setTeamId(event.target.value)}><option value="">SELECCIONAR</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>NOTA OPCIONAL<input value={note} onChange={event => setNote(event.target.value)}/></label>
      <div className="button-row"><button className="action-button positive" disabled={!teamId || assign.loading || buy.loading} onClick={() => assign.execute({ teamId, ...(note.trim() ? { note: note.trim() } : {}) })}>ASIGNAR GRATIS</button><button className="action-button" disabled={!teamId || assign.loading || buy.loading} onClick={buyPlayer}>COMPRAR</button></div>
    </> : <>
      <label>MONTO DE LIBERACIÓN<input type="number" min="0" step="1" value={gpAmount} onChange={event => setGpAmount(event.target.value)}/></label>
      <button className="action-button danger" disabled={gpAmount === '' || release.loading} onClick={releasePlayer}>LIBERAR JUGADOR</button>
    </>}
    <FormFeedback mutation={feedback}/>
  </section>;
}

export function PlayersPage({ teams }) {
  const [filters, setFilters] = useState({ q: '', position: '', teamId: '', freeAgent: '', page: 1 });
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const players = useApiQuery(signal => endpoints.players({ ...filters, pageSize: 20 }, signal), Object.values(filters));
  const detail = useApiQuery(signal => selectedId ? endpoints.player(selectedId, signal) : Promise.resolve({ data: null }), [selectedId]);
  const rows = Array.isArray(players.data) ? players.data : [];
  const refresh = () => { players.retry(); detail.retry(); };

  const change = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value, page: 1 }));
  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="BASE DE DATOS DE LA LIGA" title="JUGADORES"><button className="page-action" onClick={() => setShowCreate(value => !value)}>{showCreate ? 'CERRAR ALTA' : '+ CREAR JUGADOR'}</button></PageHeader>
    {showCreate && <CreatePlayerForm onChanged={refresh}/>} 
    <div className="filter-bar"><input name="q" value={filters.q} onChange={change} placeholder="BUSCAR JUGADOR" aria-label="Buscar jugador"/><select name="position" value={filters.position} onChange={change} aria-label="Posición"><option value="">TODAS LAS POSICIONES</option>{positions.map(value => <option key={value}>{value}</option>)}</select><select name="teamId" value={filters.teamId} onChange={change} aria-label="Equipo"><option value="">TODOS LOS EQUIPOS</option>{teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select><select name="freeAgent" value={filters.freeAgent} onChange={change} aria-label="Agente libre"><option value="">TODOS</option><option value="true">AGENTES LIBRES</option><option value="false">CON EQUIPO</option></select></div>
    <DataState query={players}/>
    {!players.loading && !players.error && <div className="split-view"><div className="data-list">{rows.map(player => <button className={`data-row ${selectedId === player.id ? 'active' : ''}`} key={player.id} onClick={() => setSelectedId(player.id)}><span><b>{player.name}</b><small>{player.position ?? 'SIN POSICIÓN'} · {player.team?.name ?? 'AGENTE LIBRE'}</small></span><strong>{gp(player.gpValue)}</strong></button>)}</div><aside className="detail-card player-detail">{!selectedId ? <p>SELECCIONA UN JUGADOR PARA VER Y GESTIONAR SU FICHA.</p> : <><DataState query={detail}/>{detail.data && <><h2>{detail.data.name}</h2><dl><div><dt>POSICIÓN</dt><dd>{detail.data.position ?? '—'}</dd></div><div><dt>EQUIPO</dt><dd>{detail.data.team?.name ?? 'AGENTE LIBRE'}</dd></div><div><dt>VALOR</dt><dd>{gp(detail.data.gpValue)}</dd></div><div><dt>GOLES</dt><dd>{detail.data.goals ?? 0}</dd></div><div><dt>PARTIDOS CON GOL</dt><dd>{detail.data.matchesWithGoals ?? 0}</dd></div></dl>{detail.data.team && <TeamMark team={detail.data.team} className="detail-watermark"/>}<PlayerActions key={`${detail.data.id}-${detail.data.team?.id ?? 'free'}`} player={detail.data} teams={teams} onChanged={refresh}/></>}</>}</aside></div>}
    <Pagination pagination={players.pagination} page={filters.page} onPage={page => setFilters(current => ({ ...current, page }))}/>
  </section></main>;
}
