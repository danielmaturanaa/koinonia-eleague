import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { EntityLink } from '../../components/EntityLink.jsx';
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

const externalPosition = value => positions.includes(value) ? value : ({ GK: 'PT', RB: 'LD', CB: 'DEC', LB: 'LI', DMF: 'MC', CMF: 'MC', AMF: 'MO', LMF: 'EI', LWF: 'EI', RMF: 'ED', RWF: 'ED', SS: 'DC', CF: 'DC' }[value] ?? 'MC');

function EfootballCatalog({ initialQuery = '', onImported }) {
  const [search, setSearch] = useState(initialQuery);
  const [filters, setFilters] = useState({ position: '', nationality: '', minGp: '', maxGp: '' });
  const [selected, setSelected] = useState(null);
  const [value, setValue] = useState('');
  const catalog = useApiQuery(signal => search.trim().length >= 2 ? endpoints.efootballPlayers({ q: search, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')) }, signal) : Promise.resolve({ data: [] }), [search, ...Object.values(filters)]);
  const importer = useApiMutation((player, signal) => endpoints.createPlayer({ name: player.name, position: externalPosition(player.position), gpValue: Number(value || player.gpPrice || 0), efootballPesId: player.pesId, efootballVariation: player.variation, faceUrl: player.faceUrl, nationality: player.nationality }, signal), { onSuccess: result => { setSelected(null); onImported(result?.data?.id); } });
  const change = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  return <section className="efootball-catalog">
    <h2>CATÁLOGO eFOOTBALLDB · CARTAS GRISES</h2><p>Busca una carta y agrégala a la liga. Las que ya están inscritas muestran su equipo.</p>
    <div className="filter-bar efootball-filters"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="NOMBRE DE LA CARTA (MÍN. 2 LETRAS)" aria-label="Buscar en eFootballDB" autoFocus/><select name="position" value={filters.position} onChange={change}><option value="">TODOS LOS PUESTOS</option>{positions.map(item => <option key={item}>{item}</option>)}</select><input name="nationality" value={filters.nationality} onChange={change} placeholder="NACIONALIDAD"/><input name="minGp" type="number" min="0" value={filters.minGp} onChange={change} placeholder="GP MÍN."/><input name="maxGp" type="number" min="0" value={filters.maxGp} onChange={change} placeholder="GP MÁX."/></div>
    {search.trim().length >= 2 ? <DataState query={catalog}/> : <p className="empty-copy">ESCRIBE AL MENOS DOS LETRAS PARA BUSCAR EN EL CATÁLOGO.</p>}
    <div className="efootball-results">{(catalog.data ?? []).map(player => <article key={`${player.pesId}-${player.variation}`}>
      <PlayerFace src={player.faceUrl} name={player.name} className="efootball-face"/><div><b>{player.name}</b><small>{player.position ?? '—'} · {player.nationality ?? '—'} · {player.age ?? '—'} años</small><small>{player.clubName ?? 'SIN CLUB'} · ref. {gp(player.gpPrice)}</small></div>
      <strong>{player.league ? <EntityLink to="player" id={player.league.id}>{player.league.teamName ? `EN ${player.league.teamName}` : 'AGENTE LIBRE'}</EntityLink> : 'AÚN NO ESTÁ EN LA LIGA'}</strong>{!player.league && <button className="action-button" onClick={() => { setSelected(player); setValue(String(player.gpPrice ?? '')); }}>IMPORTAR</button>}
    </article>)}</div>
    {selected && <form className="admin-form player-create-form import-confirmation" onSubmit={event => { event.preventDefault(); importer.execute(selected); }}><b>CONFIRMAR IMPORTACIÓN · {selected.name}</b><small>Se vinculará a la carta PES {selected.pesId}. No podrás crear un duplicado de esta identidad.</small><label>VALOR GP DE LA LIGA<input type="number" min="0" value={value} onChange={event => setValue(event.target.value)}/></label><div className="button-row"><button className="action-button positive" disabled={importer.loading}>CONFIRMAR IMPORTACIÓN</button><button type="button" className="action-button" onClick={() => setSelected(null)}>CANCELAR</button></div><FormFeedback mutation={importer}/></form>}
  </section>;
}

export function PlayerAdmin({ player, onChanged }) {
  const [name, setName] = useState(player.name); const [gpValue, setGpValue] = useState(String(player.gpValue)); const [position, setPosition] = useState(player.position); const edit = useApiMutation((body, signal) => endpoints.updatePlayer(player.id, body, signal), { onSuccess: onChanged }); const retire = useApiMutation(signal => endpoints.deletePlayer(player.id, signal), { onSuccess: onChanged });
  return <section className="player-actions"><h3>ADMINISTRACIÓN</h3><label>NOMBRE<input value={name} onChange={event => setName(event.target.value)}/></label><label>VALOR GP<input type="number" min="0" value={gpValue} onChange={event => setGpValue(event.target.value)}/></label><label>POSICIÓN<select value={position} onChange={event => setPosition(event.target.value)}>{positions.map(item => <option key={item}>{item}</option>)}</select></label><div className="button-row"><button className="action-button" disabled={!name.trim() || gpValue === '' || edit.loading} onClick={() => edit.execute({ name: name.trim(), gpValue: Number(gpValue), position })}>GUARDAR CAMBIOS</button><button className="action-button danger" disabled={retire.loading} onClick={() => { if (window.confirm(`¿RETIRAR A ${player.name}? Se conservará su historial.`)) retire.execute(); }}>RETIRAR DE LA LIGA</button></div><FormFeedback mutation={edit.error || edit.success ? edit : retire}/></section>;
}

function LeaguePlayers({ teams }) {
  const [filters, setFilters] = useState({ q: '', position: '', teamId: '', freeAgent: '', page: 1 });
  const players = useApiQuery(signal => endpoints.players({ ...filters, pageSize: 24 }, signal), Object.values(filters));
  const rows = Array.isArray(players.data) ? players.data : [];
  const change = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value, page: 1 }));
  return <>
    <div className="filter-bar player-global-search"><input name="q" value={filters.q} onChange={change} placeholder="BUSCAR JUGADOR" aria-label="Buscar jugador"/><select name="position" value={filters.position} onChange={change} aria-label="Posición"><option value="">TODAS LAS POSICIONES</option>{positions.map(value => <option key={value}>{value}</option>)}</select><select name="teamId" value={filters.teamId} onChange={change} aria-label="Equipo"><option value="">TODOS LOS EQUIPOS</option>{teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select><select name="freeAgent" value={filters.freeAgent} onChange={change} aria-label="Agente libre"><option value="">CON Y SIN EQUIPO</option><option value="true">AGENTES LIBRES</option><option value="false">CON EQUIPO</option></select></div>
    <DataState query={players}/>
    {!players.loading && !players.error && (rows.length ? <div className="player-card-grid">{rows.map(player => <EntityLink to="player" id={player.id} className="player-card" key={player.id}>
      <PlayerFace src={player.faceUrl} name={player.name} className="player-card-face"/>
      <span className="player-card-body"><b>{player.name}</b><small>{player.flag && <i className="player-flag">{player.flag}</i>}{player.nationality ?? ''}</small><span className="player-card-team">{player.team?.imageUrl && <img src={player.team.imageUrl} alt="" onError={event => { event.currentTarget.hidden = true; }}/>}{player.team?.name ?? 'AGENTE LIBRE'}</span></span>
      <span className="player-card-meta"><em>{player.position ?? '—'}</em><strong>{gp(player.gpValue)}</strong></span>
    </EntityLink>)}</div> : <p className="empty-copy">NO HAY JUGADORES QUE COINCIDAN CON LOS FILTROS.</p>)}
    <Pagination pagination={players.pagination} page={filters.page} onPage={page => setFilters(current => ({ ...current, page }))}/>
  </>;
}

export function PlayersPage({ teams, navigate, mode = 'league', initialQuery = '' }) {
  const [showCreate, setShowCreate] = useState(false);
  const openPlayer = id => navigate?.(`/jugadores/${encodeURIComponent(id)}`);
  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="BASE DE DATOS DE LA LIGA" title="JUGADORES"/>
    <nav className="player-mode-tabs" aria-label="Vistas de jugadores"><button className={mode === 'league' ? 'active' : ''} aria-current={mode === 'league' ? 'page' : undefined} onClick={() => navigate('/equipos/jugadores')}>JUGADORES DE LA LIGA</button><button className={mode === 'import' ? 'active' : ''} aria-current={mode === 'import' ? 'page' : undefined} onClick={() => navigate('/equipos/jugadores/importar')}>AGREGAR JUGADORES</button></nav>
    {mode === 'import' ? <>
      <EfootballCatalog key={initialQuery} initialQuery={initialQuery} onImported={openPlayer}/>
      <details className="player-manual-create" open={showCreate} onToggle={event => setShowCreate(event.currentTarget.open)}><summary>¿NO ESTÁ EN eFOOTBALLDB? CREAR JUGADOR MANUALMENTE</summary><CreatePlayerForm onChanged={() => setShowCreate(false)}/></details>
    </> : <LeaguePlayers teams={teams}/>}
  </section></main>;
}
