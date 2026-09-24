import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, OverallBadge, PageHeader, Pagination, gp } from './DataStates.jsx';
import { PLAYING_STYLES, STAT_GROUPS } from './EfootballCard.jsx';
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
  const buy = useApiMutation((id, signal) => endpoints.buyPlayer(player.id, id, signal), { onSuccess: onChanged });
  const release = useApiMutation((body, signal) => endpoints.releasePlayer(player.id, body, signal), { onSuccess: onChanged });
  const isFree = player.isFreeAgent ?? !player.team;
  const currentTeamId = player.team?.id ?? player.teamId;
  const feedback = buy.error || buy.success ? buy : release;

  const buyPlayer = () => {
    const team = teams.find(item => item.id === teamId);
    if (window.confirm(`¿COMPRAR A ${player.name} PARA ${team?.name ?? 'EL EQUIPO SELECCIONADO'} POR SU VALOR GP?`)) buy.execute(teamId);
  };
  const releasePlayer = () => {
    const amount = Math.round(Number(player.gpValue ?? 0) * 0.2);
    if (window.confirm(`¿LIBERAR A ${player.name}? EL CLUB RECIBE EL 20% DE SU VALOR (${amount.toLocaleString('es-CL')} GP).`)) release.execute({ teamId: currentTeamId });
  };

  return <section className="player-actions">
    <h3>EQUIPO</h3>
    {isFree ? <>
      <label>EQUIPO<select value={teamId} onChange={event => setTeamId(event.target.value)}><option value="">SELECCIONAR</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <div className="button-row"><button className="action-button" disabled={!teamId || buy.loading} onClick={buyPlayer}>COMPRAR</button></div>
    </> : <>
      <button className="action-button danger" disabled={release.loading} onClick={releasePlayer}>LIBERAR JUGADOR · 20%</button>
    </>}
    <FormFeedback mutation={feedback}/>
  </section>;
}

export function PlayerAdmin({ player, onChanged }) {
  const [name, setName] = useState(player.name); const [position, setPosition] = useState(player.position); const edit = useApiMutation((body, signal) => endpoints.updatePlayer(player.id, body, signal), { onSuccess: onChanged }); const retire = useApiMutation(signal => endpoints.deletePlayer(player.id, signal), { onSuccess: onChanged });
  return <section className="player-actions"><h3>ADMINISTRACIÓN</h3><label>NOMBRE<input value={name} onChange={event => setName(event.target.value)}/></label><label>POSICIÓN<select value={position} onChange={event => setPosition(event.target.value)}>{positions.map(item => <option key={item}>{item}</option>)}</select></label><div className="button-row"><button className="action-button" disabled={!name.trim() || edit.loading} onClick={() => edit.execute({ name: name.trim(), position })}>GUARDAR CAMBIOS</button><button className="action-button danger" disabled={retire.loading} onClick={() => { if (window.confirm(`¿RETIRAR A ${player.name}? Se conservará su historial.`)) retire.execute(); }}>RETIRAR DE LA LIGA</button></div><FormFeedback mutation={edit.error || edit.success ? edit : retire}/></section>;
}

const STATUS_OPTIONS = [['', 'Todos'], ['registered', 'En la liga'], ['owned', 'Con equipo'], ['free', 'Agentes libres']];
const SORT_OPTIONS = [['price_desc', 'Precio: mayor a menor'], ['price_asc', 'Precio: menor a mayor'], ['name', 'Nombre A-Z'], ['age_asc', 'Más jóvenes'], ['age_desc', 'Más veteranos']];
const POSITION_LINES = [['PORTERO', ['PT']], ['DEFENSA', ['DEC', 'LI', 'LD']], ['MEDIOCAMPO', ['MC', 'MO']], ['ATAQUE', ['EI', 'ED', 'DC']]];
const PRICE_RANGES = [['', '', 'Cualquier precio'], ['', '50000', 'Hasta 50.000'], ['50000', '100000', '50.000 – 100.000'], ['100000', '200000', '100.000 – 200.000'], ['200000', '', 'Más de 200.000']];
const EMPTY_FILTERS = { q: '', positions: [], status: '', teamId: '', minGp: '', maxGp: '', nationality: '', sort: 'price_desc', page: 1 };

const filtersFromQuery = query => ({ ...EMPTY_FILTERS, q: query.q ?? '', status: query.status ?? '', teamId: query.teamId ?? '', positions: query.position ? query.position.split(',') : [], sort: query.sort ?? 'price_desc' });

function DirectoryStatus({ player }) {
  if (player.status === 'owned') return null;
  if (player.status === 'free') return <span className="search-status free">AGENTE LIBRE</span>;
  return <span className="search-status free">AGENTE LIBRE</span>;
}

function FilterPanel({ filters, teams, set, togglePosition, total, onClose }) {
  const priceKey = `${filters.minGp}-${filters.maxGp}`;
  const custom = !PRICE_RANGES.some(([min, max]) => `${min}-${max}` === priceKey);
  return <aside className="filter-panel" aria-label="Filtros">
    <fieldset><legend>SITUACIÓN</legend>{STATUS_OPTIONS.map(([value, label]) => <label key={value || 'all'} className="filter-option"><input type="radio" name="status" checked={filters.status === value} onChange={() => set({ status: value })}/>{label}</label>)}</fieldset>
    <fieldset><legend>POSICIÓN</legend>{POSITION_LINES.map(([line, values]) => {
      const all = values.every(value => filters.positions.includes(value));
      return <div className="filter-line" key={line}>
        <label className="filter-option filter-line-title"><input type="checkbox" checked={all} onChange={() => set({ positions: all ? filters.positions.filter(value => !values.includes(value)) : [...new Set([...filters.positions, ...values])] })}/>{line}</label>
        {values.length > 1 && <div className="filter-line-values">{values.map(value => <label key={value} className="filter-option"><input type="checkbox" checked={filters.positions.includes(value)} onChange={() => togglePosition(value)}/>{value}</label>)}</div>}
      </div>;
    })}</fieldset>
    <fieldset><legend>PRECIO (GP)</legend>{PRICE_RANGES.map(([min, max, label]) => <label key={label} className="filter-option"><input type="radio" name="price" checked={!custom && priceKey === `${min}-${max}`} onChange={() => set({ minGp: min, maxGp: max })}/>{label}</label>)}
      <div className="filter-range"><input type="number" min="0" step="1000" value={filters.minGp} onChange={event => set({ minGp: event.target.value })} placeholder="Mín." aria-label="GP mínimo"/><span>–</span><input type="number" min="0" step="1000" value={filters.maxGp} onChange={event => set({ maxGp: event.target.value })} placeholder="Máx." aria-label="GP máximo"/></div>
    </fieldset>
    <fieldset><legend>EQUIPO</legend><select value={filters.teamId} onChange={event => set({ teamId: event.target.value })} aria-label="Equipo"><option value="">Todos los equipos</option>{teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select></fieldset>
    <fieldset><legend>NACIONALIDAD</legend><input value={filters.nationality} onChange={event => set({ nationality: event.target.value })} placeholder="Ej: Argentina" aria-label="Nacionalidad"/></fieldset>
    <button type="button" className="filter-panel-close" onClick={onClose}>VER {total != null ? total.toLocaleString('es-CL') : ''} RESULTADOS</button>
  </aside>;
}

function activeTags(filters, teams) {
  const tags = [];
  if (filters.q) tags.push(['q', `“${filters.q}”`, { q: '' }]);
  if (filters.status) tags.push(['status', STATUS_OPTIONS.find(([value]) => value === filters.status)?.[1], { status: '' }]);
  for (const value of filters.positions) tags.push([`position-${value}`, value, { positions: filters.positions.filter(item => item !== value) }]);
  if (filters.minGp || filters.maxGp) tags.push(['price', `${filters.minGp ? Number(filters.minGp).toLocaleString('es-CL') : '0'} – ${filters.maxGp ? Number(filters.maxGp).toLocaleString('es-CL') : '∞'} GP`, { minGp: '', maxGp: '' }]);
  if (filters.teamId) tags.push(['team', teams.find(team => team.id === filters.teamId)?.name ?? 'Equipo', { teamId: '' }]);
  if (filters.nationality) tags.push(['nationality', filters.nationality, { nationality: '' }]);
  return tags;
}

const comparisonStatLabels = Object.fromEntries(STAT_GROUPS.flatMap(([, rows]) => rows));
const comparisonValue = value => value == null || value === '' ? '—' : value;
const comparisonSelectionKey = selection => selection ? `${selection.playerId ?? 'efootball'}:${selection.pesId ?? selection.key}:${selection.variation ?? 0}` : 'empty';

function ComparePlayerCard({ selection, onRemove }) {
  const key = comparisonSelectionKey(selection);
  const profile = useApiQuery(signal => selection.playerId
    ? endpoints.player(selection.playerId, signal)
    : selection.pesId ? endpoints.efootballCard(selection.pesId, selection.variation ?? 0, signal) : Promise.resolve(null), [key]);
  const cardId = selection.playerId ? profile.data?.efootballPesId : null;
  const linkedCard = useApiQuery(signal => cardId
    ? endpoints.efootballCard(cardId, profile.data?.efootballVariation ?? 0, signal)
    : Promise.resolve(null), [cardId, profile.data?.efootballVariation]);
  const player = profile.data;
  const card = selection.playerId ? linkedCard.data : profile.data;
  const stats = card?.stats ?? {};
  const knownStats = new Set(STAT_GROUPS.flatMap(([, rows]) => rows.map(([stat]) => stat)));
  const statGroups = [...STAT_GROUPS.map(([title, rows]) => [title, rows.filter(([stat]) => stats[stat] != null)]).filter(([, rows]) => rows.length), ...(Object.keys(stats).filter(stat => !knownStats.has(stat)).length ? [['OTRAS', Object.keys(stats).filter(stat => !knownStats.has(stat)).map(stat => [stat, comparisonStatLabels[stat] ?? stat])]] : [])];
  const name = player?.name ?? card?.name ?? selection.name;
  const faceUrl = player?.faceUrl ?? card?.faceUrl ?? selection.faceUrl;
  const loading = profile.loading || (Boolean(cardId) && linkedCard.loading);

  return <article className="player-comparison-card">
    <header className="player-comparison-card-header"><PlayerFace src={faceUrl} name={name} className="player-comparison-face"/><div><small>FICHA DEL JUGADOR</small><h3>{name}</h3></div><button type="button" className="player-comparison-remove" onClick={() => onRemove(selection)}>×</button></header>
    {loading ? <div className="arcade-state compact">CARGANDO DATOS...</div> : profile.error ? <p className="empty-copy">NO SE PUDO CARGAR ESTE JUGADOR.</p> : <>
      <dl className="player-comparison-facts">
        <div><dt>EQUIPO</dt><dd>{player?.team?.name ?? card?.clubName ?? 'AGENTE LIBRE'}</dd></div>
        <div><dt>POSICIÓN</dt><dd>{comparisonValue(player?.position ?? card?.position)}</dd></div>
        <div><dt>MEDIA eFOOTBALL</dt><dd><OverallBadge value={card?.overall ?? player?.external?.overall}/></dd></div>
        <div><dt>NACIONALIDAD</dt><dd>{comparisonValue(player?.nationality ?? card?.nationality)}</dd></div>
        <div><dt>EDAD</dt><dd>{player?.age ?? card?.age ? `${player?.age ?? card.age} AÑOS` : '—'}</dd></div>
        <div><dt>VALOR LIGA</dt><dd>{gp(player?.gpValue)}</dd></div>
        <div><dt>GOLES HISTÓRICOS</dt><dd>{player?.goals ?? 0}</dd></div>
        <div><dt>VALOR eFOOTBALL</dt><dd>{gp(card?.gpPrice ?? player?.external?.gpPrice)}</dd></div>
        <div><dt>ALTURA</dt><dd>{card?.height ? `${card.height} CM` : '—'}</dd></div>
        <div><dt>ESTILO DE JUEGO</dt><dd>{PLAYING_STYLES[card?.playingStyle] ?? '—'}</dd></div>
        <div><dt>PIE HÁBIL</dt><dd>{card?.strongFoot === 1 ? 'IZQUIERDO' : card?.strongFoot === 0 ? 'DERECHO' : '—'}</dd></div>
        <div><dt>USO PIE MALO</dt><dd>{card?.profile?.weakFootUsage != null ? `${card.profile.weakFootUsage}/4` : '—'}</dd></div>
        <div><dt>PRECISIÓN PIE MALO</dt><dd>{card?.profile?.weakFootAccuracy != null ? `${card.profile.weakFootAccuracy}/4` : '—'}</dd></div>
        <div><dt>FORMA</dt><dd>{card?.profile?.form != null ? `${card.profile.form}/8` : '—'}</dd></div>
        <div><dt>RESIST. LESIONES</dt><dd>{card?.profile?.injuryResistance != null ? `${card.profile.injuryResistance}/3` : '—'}</dd></div>
      </dl>
      {player?.activeGoals?.length ? <section className="player-comparison-section"><h4>GOLES EN TORNEOS ACTIVOS</h4>{player.activeGoals.map(tournament => <p key={tournament.name}><span>{tournament.name}</span><b>{tournament.goals}</b></p>)}</section> : null}
      {statGroups.length ? <section className="player-comparison-section"><h4>ESTADÍSTICAS eFOOTBALL</h4><div className="player-comparison-stat-groups">{statGroups.map(([title, rows]) => <div key={title}><h5>{title}</h5>{rows.map(([stat]) => <p key={stat}><span>{comparisonStatLabels[stat] ?? stat.replaceAll('_', ' ')}</span><b>{stats[stat]}</b></p>)}</div>)}</div></section> : <p className="empty-copy">SIN ESTADÍSTICAS eFOOTBALL DISPONIBLES.</p>}
      {card?.skills?.length ? <section className="player-comparison-section"><h4>HABILIDADES</h4><p className="player-comparison-skills">{card.skills.join(' · ')}</p></section> : null}
    </>}
  </article>;
}

function PlayerComparator({ selections, onRemove }) {
  return <section className="player-comparator"><header><div><h2>COMPARADOR DE JUGADORES</h2><p>Selecciona hasta dos jugadores para revisar sus datos, medias y estadísticas.</p></div><small>{selections.length} / 2 SELECCIONADOS</small></header>{selections.length ? <div className="player-comparison-grid">{selections.map(selection => <ComparePlayerCard key={comparisonSelectionKey(selection)} selection={selection} onRemove={onRemove}/>)}{selections.length === 1 && <div className="player-comparison-placeholder">ELIGE OTRO JUGADOR PARA COMPARARLO</div>}</div> : <p className="player-comparator-empty">Pulsa <b>COMPARAR</b> en dos fichas del directorio para comenzar.</p>}</section>;
}

// Directorio único: plantilla de la liga y cartas de eFootballDB sin inscribir.
export function PlayersPage({ teams, initialQuery = {} }) {
  const [filters, setFilters] = useState(() => filtersFromQuery(initialQuery));
  const [search, setSearch] = useState(initialQuery.q ?? '');
  const [showCreate, setShowCreate] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('directory');
  const [compareSelections, setCompareSelections] = useState([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters(current => current.q === search.trim() ? current : { ...current, q: search.trim(), page: 1 }), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const { positions, ...rest } = filters;
  const query = Object.fromEntries(Object.entries({ ...rest, position: positions.join(','), pageSize: 18 }).filter(([, value]) => value !== ''));
  const directory = useApiQuery(signal => endpoints.playerDirectory(query, signal), [JSON.stringify(query)]);
  const rows = Array.isArray(directory.data) ? directory.data : [];
  const set = patch => { if ('q' in patch) setSearch(patch.q); setFilters(current => ({ ...current, ...patch, page: 1 })); };
  const togglePosition = value => set({ positions: filters.positions.includes(value) ? filters.positions.filter(item => item !== value) : [...filters.positions, value] });
  const tags = activeTags(filters, teams);
  const open = player => player.playerId ? `#/jugadores/${encodeURIComponent(player.playerId)}` : `#/efootball/${player.pesId}${player.variation ? `?v=${player.variation}` : ''}`;
  const comparisonCandidate = player => ({ key: player.playerId ?? `${player.pesId}-${player.variation ?? 0}`, playerId: player.playerId, pesId: player.pesId, variation: player.variation ?? 0, name: player.name, faceUrl: player.faceUrl });
  const toggleCompare = player => {
    const candidate = comparisonCandidate(player);
    setCompareSelections(current => current.some(item => item.key === candidate.key)
      ? current.filter(item => item.key !== candidate.key)
      : current.length >= 2 ? [current[1], candidate] : [...current, candidate]);
  };
  const removeCompare = selection => setCompareSelections(current => current.filter(item => item.key !== selection.key));
  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="LIGA + eFOOTBALLDB" title="JUGADORES"><button className="page-action" onClick={() => setShowCreate(value => !value)}>{showCreate ? 'CERRAR ALTA' : '+ CREAR JUGADOR MANUAL'}</button></PageHeader>
    <nav className="player-page-tabs" aria-label="Secciones de jugadores"><button type="button" className={activeTab === 'directory' ? 'active' : ''} onClick={() => setActiveTab('directory')}>DIRECTORIO</button><button type="button" className={activeTab === 'comparator' ? 'active' : ''} onClick={() => setActiveTab('comparator')}>COMPARADOR{compareSelections.length ? ` (${compareSelections.length})` : ''}</button></nav>
    {activeTab === 'directory' && <>
    {showCreate && <CreatePlayerForm onChanged={() => { setShowCreate(false); directory.retry(); }}/>}
    <div className={`directory-layout ${panelOpen ? 'panel-open' : ''}`}>
      <FilterPanel filters={filters} teams={teams} set={set} togglePosition={togglePosition} total={directory.pagination?.total} onClose={() => setPanelOpen(false)}/>
      <div className="directory-results">
        <div className="directory-toolbar">
          <input className="directory-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="BUSCAR POR NOMBRE" aria-label="Buscar jugador"/>
          <button type="button" className="directory-filter-toggle" aria-expanded={panelOpen} onClick={() => setPanelOpen(value => !value)}>FILTROS{tags.length ? ` (${tags.length})` : ''}</button>
          <label className="directory-sort">ORDENAR<select value={filters.sort} onChange={event => set({ sort: event.target.value })}>{SORT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        </div>
        <div className="directory-summary"><b>{directory.pagination?.total != null ? `${directory.pagination.total.toLocaleString('es-CL')} JUGADORES` : ' '}</b>
          {tags.map(([key, label, patch]) => <button type="button" key={key} className="filter-tag" onClick={() => set(patch)} aria-label={`Quitar filtro ${label}`}>{label} <span aria-hidden="true">×</span></button>)}
          {tags.length > 0 && <button type="button" className="club-link-button" onClick={() => { setSearch(''); setFilters(EMPTY_FILTERS); }}>LIMPIAR TODO</button>}
        </div>
        <DataState query={directory}/>
        {!directory.loading && !directory.error && (rows.length ? <div className="player-card-grid">{rows.map(player => { const playerKey = player.playerId ?? `${player.pesId}-${player.variation}`; const selected = compareSelections.some(item => item.key === playerKey); return <article className={`player-card status-${player.status} ${selected ? 'is-comparison-selected' : ''}`} key={playerKey}>
          <a className="player-card-link" href={open(player)}>
            <PlayerFace src={player.faceUrl} name={player.name} className="player-card-face"/>
            <span className="player-card-body"><b>{player.name}</b><small>{[player.nationality, player.age ? `${player.age} AÑOS` : null].filter(Boolean).join(' · ') || '—'}</small><span className="player-card-details"><em>{player.position ?? '—'}</em><OverallBadge value={player.overall}/><strong>{gp(player.price)}</strong></span></span>
            {player.status === 'owned' && player.team?.imageUrl ? <span className="player-card-team-mark" title={player.team.name}><img src={player.team.imageUrl} alt={`Emblema de ${player.team.name}`}/></span> : <span className="player-card-team-mark player-card-status-mark"><DirectoryStatus player={player}/></span>}
          </a>
          <button type="button" className="player-card-compare" onClick={() => toggleCompare(player)}>{selected ? 'QUITAR DEL COMPARADOR' : 'COMPARAR'}</button>
        </article>; })}</div> : <p className="empty-copy">NINGÚN JUGADOR COINCIDE CON LOS FILTROS.</p>)}
        <Pagination pagination={directory.pagination} page={filters.page} onPage={page => { setFilters(current => ({ ...current, page })); window.scrollTo({ top: 0 }); }}/>
      </div>
    </div>
    </>}
    {activeTab === 'comparator' && <PlayerComparator selections={compareSelections} onRemove={removeCompare}/>}
  </section></main>;
}
