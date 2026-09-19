import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { PlayerFace } from '../../components/PlayerFace.jsx';
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

export function PlayerActions({ player, teams, onChanged }) {
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
    <h3>EQUIPO</h3>
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

export function PlayerAdmin({ player, onChanged }) {
  const [name, setName] = useState(player.name); const [gpValue, setGpValue] = useState(String(player.gpValue)); const [position, setPosition] = useState(player.position); const edit = useApiMutation((body, signal) => endpoints.updatePlayer(player.id, body, signal), { onSuccess: onChanged }); const retire = useApiMutation(signal => endpoints.deletePlayer(player.id, signal), { onSuccess: onChanged });
  return <section className="player-actions"><h3>ADMINISTRACIÓN</h3><label>NOMBRE<input value={name} onChange={event => setName(event.target.value)}/></label><label>VALOR GP<input type="number" min="0" value={gpValue} onChange={event => setGpValue(event.target.value)}/></label><label>POSICIÓN<select value={position} onChange={event => setPosition(event.target.value)}>{positions.map(item => <option key={item}>{item}</option>)}</select></label><div className="button-row"><button className="action-button" disabled={!name.trim() || gpValue === '' || edit.loading} onClick={() => edit.execute({ name: name.trim(), gpValue: Number(gpValue), position })}>GUARDAR CAMBIOS</button><button className="action-button danger" disabled={retire.loading} onClick={() => { if (window.confirm(`¿RETIRAR A ${player.name}? Se conservará su historial.`)) retire.execute(); }}>RETIRAR DE LA LIGA</button></div><FormFeedback mutation={edit.error || edit.success ? edit : retire}/></section>;
}

const STATUS_OPTIONS = [['', 'TODOS'], ['registered', 'EN LA LIGA'], ['owned', 'CON EQUIPO'], ['free', 'AGENTES LIBRES'], ['unregistered', 'NO INSCRITOS']];
const SORT_OPTIONS = [['price_desc', 'PRECIO: MAYOR A MENOR'], ['price_asc', 'PRECIO: MENOR A MAYOR'], ['name', 'NOMBRE A-Z'], ['age_asc', 'MÁS JÓVENES'], ['age_desc', 'MÁS VETERANOS']];
const EMPTY_FILTERS = { q: '', position: '', status: '', teamId: '', minGp: '', maxGp: '', nationality: '', sort: 'price_desc', page: 1 };

function DirectoryStatus({ player }) {
  if (player.status === 'owned') return <span className="search-status owned">{player.team?.imageUrl && <img src={player.team.imageUrl} alt=""/>}{player.team?.name}</span>;
  if (player.status === 'free') return <span className="search-status free">AGENTE LIBRE</span>;
  return <span className="search-status unregistered">NO INSCRITO</span>;
}

// Directorio único: plantilla de la liga y cartas de eFootballDB sin inscribir.
export function PlayersPage({ teams, navigate, initialQuery = '' }) {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, q: initialQuery });
  const [search, setSearch] = useState(initialQuery);
  const [showCreate, setShowCreate] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters(current => current.q === search.trim() ? current : { ...current, q: search.trim(), page: 1 }), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = Object.fromEntries(Object.entries({ ...filters, pageSize: 24 }).filter(([, value]) => value !== ''));
  const directory = useApiQuery(signal => endpoints.playerDirectory(query, signal), Object.values(filters));
  const rows = Array.isArray(directory.data) ? directory.data : [];
  const set = (name, value) => setFilters(current => ({ ...current, [name]: value, page: 1 }));
  const change = event => set(event.target.name, event.target.value);
  const active = Object.entries(filters).filter(([key, value]) => !['sort', 'page'].includes(key) && value !== '').length;
  const reset = () => { setSearch(''); setFilters(EMPTY_FILTERS); };
  const open = player => player.playerId ? `#/jugadores/${encodeURIComponent(player.playerId)}` : `#/efootball/${player.pesId}${player.variation ? `?v=${player.variation}` : ''}`;
  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="LIGA + eFOOTBALLDB" title="JUGADORES"><button className="page-action" onClick={() => setShowCreate(value => !value)}>{showCreate ? 'CERRAR ALTA' : '+ CREAR JUGADOR MANUAL'}</button></PageHeader>
    {showCreate && <CreatePlayerForm onChanged={() => { setShowCreate(false); directory.retry(); }}/>}
    <section className="directory-filters">
      <input className="directory-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="BUSCAR POR NOMBRE" aria-label="Buscar jugador"/>
      <div className="directory-chips" role="group" aria-label="Posición">{['', ...positions].map(value => <button type="button" key={value || 'all'} className={filters.position === value ? 'active' : ''} aria-pressed={filters.position === value} onClick={() => set('position', value)}>{value || 'TODAS'}</button>)}</div>
      <div className="directory-chips" role="group" aria-label="Situación">{STATUS_OPTIONS.map(([value, label]) => <button type="button" key={value || 'all'} className={filters.status === value ? 'active' : ''} aria-pressed={filters.status === value} onClick={() => set('status', value)}>{label}</button>)}</div>
      <div className="directory-row">
        <select name="teamId" value={filters.teamId} onChange={change} aria-label="Equipo"><option value="">TODOS LOS EQUIPOS</option>{teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select>
        <input name="minGp" type="number" min="0" step="1000" value={filters.minGp} onChange={change} placeholder="GP MÍNIMO" aria-label="GP mínimo"/>
        <input name="maxGp" type="number" min="0" step="1000" value={filters.maxGp} onChange={change} placeholder="GP MÁXIMO" aria-label="GP máximo"/>
        <input name="nationality" value={filters.nationality} onChange={change} placeholder="NACIONALIDAD" aria-label="Nacionalidad"/>
        <select name="sort" value={filters.sort} onChange={change} aria-label="Ordenar">{SORT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      </div>
      <p className="directory-summary">{directory.pagination?.total != null ? `${directory.pagination.total.toLocaleString('es-CL')} JUGADORES` : ' '}{active > 0 && <button type="button" className="club-link-button" onClick={reset}>LIMPIAR FILTROS ({active})</button>}</p>
    </section>
    <DataState query={directory}/>
    {!directory.loading && !directory.error && (rows.length ? <div className="player-card-grid">{rows.map(player => <a className={`player-card status-${player.status}`} href={open(player)} key={player.playerId ?? `${player.pesId}-${player.variation}`}>
      <PlayerFace src={player.faceUrl} name={player.name} className="player-card-face"/>
      <span className="player-card-body"><b>{player.name}</b><small>{[player.nationality, player.age ? `${player.age} AÑOS` : null].filter(Boolean).join(' · ') || '—'}</small><DirectoryStatus player={player}/></span>
      <span className="player-card-meta"><em>{player.position ?? '—'}</em><strong>{gp(player.price)}</strong></span>
    </a>)}</div> : <p className="empty-copy">NINGÚN JUGADOR COINCIDE CON LOS FILTROS.</p>)}
    <Pagination pagination={directory.pagination} page={filters.page} onPage={page => { setFilters(current => ({ ...current, page })); window.scrollTo({ top: 0 }); }}/>
  </section></main>;
}
