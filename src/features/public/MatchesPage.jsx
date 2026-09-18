import { useEffect, useMemo, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { MatchQrCode } from '../../components/MatchQrCode.jsx';
import { Scoreboard } from '../../components/Scoreboard.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { MatchAdminPanel } from '../admin/MatchAdminPanel.jsx';
import { matchRoundLabel } from '../../utils/matchPresentation.js';
import { DataState, PageHeader, Pagination } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const labels = { pending: 'PENDIENTE', live: 'EN VIVO', finished: 'FINALIZADO', cancelled: 'CANCELADO' };

const MULTI_SLOT_COUNT = 4;
const MULTI_STORAGE_KEY = 'koinonia-multipartido';
const MULTI_EMPTY_SLOT = { teamId: null, matchId: null };

function loadMultiSlots() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(MULTI_STORAGE_KEY) ?? '[]');
    return Array.from({ length: MULTI_SLOT_COUNT }, (_, index) => ({ ...MULTI_EMPTY_SLOT, ...stored[index] }));
  } catch {
    return Array.from({ length: MULTI_SLOT_COUNT }, () => ({ ...MULTI_EMPTY_SLOT }));
  }
}

function saveMultiSlots(slots) {
  try {
    window.localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // el navegador no permite guardar preferencias locales; no es crítico.
  }
}

function TeamChipBar({ teams, value, onChange }) {
  return <div className="team-chip-bar" role="group" aria-label="Filtrar por equipo">
    {[...teams].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(team => <button className={`team-chip ${value === team.id ? 'active' : ''}`} key={team.id} title={team.name} aria-label={team.name} onClick={() => onChange(team.id)}><TeamMark team={team}/></button>)}
    <button className={`team-chip ${value === '' ? 'active' : ''}`} onClick={() => onChange('')}>TODOS</button>
  </div>;
}

function MultiTeamPicker({ teams, value, onChange }) {
  return <select className="multi-slot-picker" value={value ?? ''} onChange={event => onChange(event.target.value || null)}>
    <option value="">— EQUIPO DE REFERENCIA —</option>
    {[...teams].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
  </select>;
}

function MultiMatchPicker({ teamId, matches, value, onChange }) {
  const teamMatches = matches
    .filter(match => match.homeTeam?.id === teamId || match.awayTeam?.id === teamId)
    .sort((a, b) => (a.roundNumber ?? Infinity) - (b.roundNumber ?? Infinity));
  return <select className="multi-slot-picker" value={value ?? ''} onChange={event => onChange(event.target.value || null)}>
    <option value="">{teamMatches.length ? '— ELEGIR PARTIDO —' : 'SIN PARTIDOS PENDIENTES'}</option>
    {teamMatches.map(match => {
      const isHome = match.homeTeam?.id === teamId;
      const rival = isHome ? match.awayTeam?.name : match.homeTeam?.name;
      const roundLabel = matchRoundLabel(match);
      return <option key={match.id} value={match.id}>{roundLabel} · {isHome ? 'LOCAL' : 'VISITA'} vs {rival} · {match.status === 'live' ? 'EN VIVO' : 'PENDIENTE'}</option>;
    })}
  </select>;
}

function MultiSlot({ index, teamId, matchId, matches, teams, onSelectTeam, onSelectMatch, onClear }) {
  return <div className="multi-slot">
    <div className="multi-slot-bar">
      <MultiTeamPicker teams={teams} value={teamId} onChange={id => onSelectTeam(index, id)}/>
      {teamId && <MultiMatchPicker teamId={teamId} matches={matches} value={matchId} onChange={id => onSelectMatch(index, id)}/>}
      {teamId && <button className="multi-slot-clear" onClick={() => onClear(index)}>QUITAR</button>}
    </div>
    {matchId ? <Scoreboard matchId={matchId} mode="manage" density="tile" teams={teams} onFinished={() => onClear(index)}/> : <div className="scoreboard scoreboard-tile scoreboard-empty">{teamId ? 'ELIGE UNO DE SUS PARTIDOS PENDIENTES.' : 'ELIGE UN EQUIPO DE REFERENCIA PARA ESTA CASILLA.'}</div>}
  </div>;
}

function MatchDetail({ matchId, onChanged, onBack, resolveTeam, teams }) {
  const [panel, setPanel] = useState(() => window.matchMedia?.('(max-width: 560px)').matches ? 'scoreboard' : null);
  const detail = useApiQuery(signal => matchId ? endpoints.match(matchId, signal) : Promise.resolve({ data: null }), [matchId]);
  const refresh = () => { detail.retry(); onChanged(); };
  const togglePanel = value => setPanel(current => current === value ? null : value);
  return <aside className="detail-card match-detail match-detail-full"><div className="match-detail-navigation"><button onClick={onBack}>← VOLVER A PARTIDOS</button></div>{(!detail.data || detail.error) && <DataState query={detail}/>} {detail.data && <><div className="match-detail-kicker"><small>{detail.data.tournament?.name} · {detail.data.stage ?? 'FECHA'} {detail.data.roundNumber ?? ''}</small><span className="match-detail-actions"><button className={`match-detail-marcador-btn ${panel === 'scoreboard' ? 'active' : ''}`} onClick={() => togglePanel('scoreboard')}>🎮 MARCADOR</button><button className={panel === 'qr' ? 'active' : ''} onClick={() => togglePanel('qr')}>📱 QR DEL PARTIDO</button><button className={panel === 'acta' ? 'active' : ''} onClick={() => togglePanel('acta')}>⚙ GESTIONAR ACTA</button></span></div>{panel === 'qr' && <MatchQrCode matchId={detail.data.id}/>}{panel === 'scoreboard' ? <Scoreboard key={detail.data.id} matchId={detail.data.id} mode="manage" density="full" teams={teams}/> : <div className="match-detail-score"><span><TeamMark team={resolveTeam(detail.data.homeTeam)}/><b>{detail.data.homeTeam?.name}</b></span><strong>{detail.data.homeScore ?? '–'} : {detail.data.awayScore ?? '–'}</strong><span><TeamMark team={resolveTeam(detail.data.awayTeam)}/><b>{detail.data.awayTeam?.name}</b></span></div>}{panel === 'acta' && <MatchAdminPanel key={detail.data.id} match={detail.data} onChanged={refresh}/>}</>}</aside>;
}

export function MatchesPage({ mode = 'all', teams, navigate, initialMatchId = null }) {
  const initialStatus = mode === 'played' ? 'finished' : mode === 'pending' ? 'pending' : '';
  const [filters, setFilters] = useState({ tournament: '', team: '', status: initialStatus, page: 1 });
  const [selectedId, setSelectedId] = useState(initialMatchId);
  const [showMulti, setShowMulti] = useState(false);
  const [multiSlots, setMultiSlots] = useState(loadMultiSlots);
  const [multiFullscreen, setMultiFullscreen] = useState(false);
  const multiGridRef = useRef(null);
  const tournaments = useApiQuery(signal => endpoints.tournaments({ status: 'active', page: 1, pageSize: 100 }, signal));
  const matches = useApiQuery(signal => endpoints.matches({ ...filters, activeOnly: 1, pageSize: 3 }, signal), Object.values(filters));
  const multiMatchesQuery = useApiQuery(signal => showMulti ? endpoints.matches({ activeOnly: 1, pageSize: 100, page: 1 }, signal) : Promise.resolve({ data: [] }), [showMulti]);
  const multiMatches = useMemo(() => (Array.isArray(multiMatchesQuery.data) ? multiMatchesQuery.data : []).filter(match => match.status === 'pending' || match.status === 'live'), [multiMatchesQuery.data]);
  const teamIndex = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const resolveTeam = team => ({ ...team, ...(teamIndex.get(team?.id ?? team?.team_id) ?? {}) });
  const rows = Array.isArray(matches.data) ? matches.data : [];

  useEffect(() => saveMultiSlots(multiSlots), [multiSlots]);

  useEffect(() => {
    const onFullscreenChange = () => setMultiFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!showMulti) return undefined;
    const interval = window.setInterval(multiMatchesQuery.retry, 12000);
    return () => window.clearInterval(interval);
  }, [showMulti, multiMatchesQuery.retry]);

  // Compacta las casillas con partido hacia el frente (si el partido 1 termina, el 2
  // pasa a ser el 1, sin huecos en medio) y rellena las que queden vacías con partidos
  // en vivo disponibles. Se usa tanto en el refresco automático como al quitar/terminar
  // una casilla a mano, para que la grilla se reordene al instante.
  const compactMultiSlots = list => {
    const active = list.filter(slot => slot.matchId);
    const inactive = list.filter(slot => !slot.matchId);
    const packed = [...active, ...inactive].slice(0, MULTI_SLOT_COUNT);
    while (packed.length < MULTI_SLOT_COUNT) packed.push({ ...MULTI_EMPTY_SLOT });
    const usedMatchIds = new Set(packed.filter(slot => slot.matchId).map(slot => slot.matchId));
    const available = multiMatches.filter(match => match.status === 'live' && !usedMatchIds.has(match.id));
    let cursor = 0;
    return packed.map(slot => {
      if (slot.matchId || cursor >= available.length) return slot;
      const match = available[cursor];
      cursor += 1;
      return { teamId: match.homeTeam?.id ?? null, matchId: match.id };
    });
  };

  useEffect(() => {
    // Espera a que llegue el primer dato real: multiMatches parte en [] mientras
    // carga, y tomar eso como "no hay nada pendiente/en vivo" vaciaría las casillas
    // guardadas antes de tiempo.
    if (!showMulti || multiMatchesQuery.data == null) return;
    const availableIds = new Set(multiMatches.map(match => match.id));
    setMultiSlots(current => {
      const withValidMatches = current.map(slot => (slot.matchId && !availableIds.has(slot.matchId)) ? { ...slot, matchId: null } : slot);
      const filled = compactMultiSlots(withValidMatches);
      const changed = filled.some((slot, index) => slot.matchId !== current[index]?.matchId || slot.teamId !== current[index]?.teamId);
      return changed ? filled : current;
    });
  }, [showMulti, multiMatches, multiMatchesQuery.data]);

  const selectMatch = id => { setSelectedId(id); navigate?.(`/partidos/${encodeURIComponent(id)}`); };
  const backToList = () => { setSelectedId(null); navigate?.('/partidos'); };
  const change = event => {
    if (selectedId) backToList();
    setFilters(current => ({ ...current, [event.target.name]: event.target.value, page: 1 }));
  };
  const selectTeamFilter = teamId => {
    if (selectedId) backToList();
    setFilters(current => ({ ...current, team: teamId, page: 1 }));
  };
  const toggleMulti = () => {
    if (selectedId) backToList();
    setShowMulti(value => !value);
  };
  const toggleMultiFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else multiGridRef.current?.requestFullscreen?.();
  };
  const selectMultiTeam = (index, teamId) => setMultiSlots(current => current.map((slot, slotIndex) => slotIndex === index ? { teamId, matchId: null } : slot));
  const selectMultiMatch = (index, matchId) => setMultiSlots(current => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, matchId } : slot));
  const clearMultiSlot = index => setMultiSlots(current => compactMultiSlots(current.map((slot, slotIndex) => slotIndex === index ? { ...MULTI_EMPTY_SLOT } : slot)));
  const title = mode === 'pending' ? 'PRÓXIMOS PARTIDOS' : mode === 'played' ? 'PARTIDOS JUGADOS' : 'CENTRO DE PARTIDOS';

  const refresh = () => matches.retry();
  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="CALENDARIO Y ACTAS" title={title}><button className={`page-action ${showMulti ? 'active' : ''}`} onClick={toggleMulti}>{showMulti ? 'CERRAR MULTIPARTIDO' : '🎮 MULTIPARTIDO'}</button></PageHeader>
    {showMulti ? <>
      <p className="multi-inline-help">LAS CASILLAS VACÍAS SE LLENAN SOLAS CON PARTIDOS EN VIVO. TAMBIÉN PUEDES ELEGIR UN EQUIPO Y UNO DE SUS PARTIDOS A MANO.<button type="button" className="multi-fullscreen-button" onClick={toggleMultiFullscreen}>{multiFullscreen ? '✕ SALIR DE PANTALLA COMPLETA' : '⛶ PANTALLA COMPLETA'}</button></p>
      <div className="multi-grid" ref={multiGridRef}>
        {multiSlots.map((slot, index) => <MultiSlot key={index} index={index} teamId={slot.teamId} matchId={slot.matchId} matches={multiMatches} teams={teams} onSelectTeam={selectMultiTeam} onSelectMatch={selectMultiMatch} onClear={clearMultiSlot}/>)}
      </div>
    </> : <>
      <TeamChipBar teams={teams} value={filters.team} onChange={selectTeamFilter}/>
      <div className="filter-bar"><select name="tournament" value={filters.tournament} onChange={change} aria-label="Torneo"><option value="">TORNEOS ACTIVOS</option>{(tournaments.data ?? []).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select name="status" value={filters.status} onChange={change} aria-label="Estado"><option value="">TODOS LOS ESTADOS</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
      {!selectedId && <DataState query={matches}/>} {selectedId
        ? <MatchDetail key={selectedId} matchId={selectedId} onChanged={refresh} onBack={backToList} resolveTeam={resolveTeam} teams={teams}/>
        : !matches.loading && !matches.error && <div className="data-list matches-full-list">{rows.map(match => <button className="match-card" key={match.id} onClick={() => selectMatch(match.id)}><small>{match.tournament?.name ?? 'TORNEO'} · {match.groupLabel ? `GRUPO ${match.groupLabel}` : `FECHA ${match.roundNumber ?? '—'}`}</small><span><TeamMark team={resolveTeam(match.homeTeam)}/><b>{match.homeTeam?.name}</b><strong>{match.homeScore ?? '–'} : {match.awayScore ?? '–'}</strong><b>{match.awayTeam?.name}</b><TeamMark team={resolveTeam(match.awayTeam)}/></span><i className={`status status-${match.status}`}>{labels[match.status] ?? match.status}</i></button>)}</div>}
      {!selectedId && <Pagination pagination={matches.pagination} page={filters.page} onPage={page => setFilters(current => ({ ...current, page }))}/>}
    </>}
  </section></main>;
}
