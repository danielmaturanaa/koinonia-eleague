import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { Scoreboard } from '../../components/Scoreboard.jsx';
import { useApiQuery } from './useApiQuery.js';

const SLOT_COUNT = 4;
const STORAGE_KEY = 'koinonia-multipartido';
const EMPTY_SLOT = { teamId: null, matchId: null, mode: 'view' };
const statusPriority = status => status === 'live' ? 0 : 1;

function loadStoredSlots() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.from({ length: SLOT_COUNT }, (_, index) => ({ ...EMPTY_SLOT, ...stored[index] }));
  } catch {
    return Array.from({ length: SLOT_COUNT }, () => ({ ...EMPTY_SLOT }));
  }
}

function saveStoredSlots(slots) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // el navegador no permite guardar preferencias locales; no es crítico.
  }
}

function TeamPicker({ teams, value, onChange }) {
  return <select className="multi-slot-picker" value={value ?? ''} onChange={event => onChange(event.target.value || null)}>
    <option value="">— EQUIPO DE REFERENCIA —</option>
    {[...teams].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
  </select>;
}

function MatchPicker({ teamId, matches, value, onChange }) {
  const teamMatches = matches
    .filter(match => match.homeTeam?.id === teamId || match.awayTeam?.id === teamId)
    .sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
  return <select className="multi-slot-picker" value={value ?? ''} onChange={event => onChange(event.target.value || null)}>
    <option value="">{teamMatches.length ? '— ELEGIR PARTIDO —' : 'SIN PARTIDOS PENDIENTES'}</option>
    {teamMatches.map(match => {
      const isHome = match.homeTeam?.id === teamId;
      const rival = isHome ? match.awayTeam?.name : match.homeTeam?.name;
      return <option key={match.id} value={match.id}>{isHome ? 'LOCAL' : 'VISITA'} vs {rival} · {match.status === 'live' ? 'EN VIVO' : 'PENDIENTE'}</option>;
    })}
  </select>;
}

function Slot({ index, teamId, matchId, mode, matches, teams, onSelectTeam, onSelectMatch, onModeChange, onClear }) {
  return <div className="multi-slot">
    <div className="multi-slot-bar">
      <TeamPicker teams={teams} value={teamId} onChange={id => onSelectTeam(index, id)}/>
      {teamId && <MatchPicker teamId={teamId} matches={matches} value={matchId} onChange={id => onSelectMatch(index, id)}/>}
      {matchId && <div className="scoreboard-mode-toggle multi-slot-toggle">
        <button className={mode === 'view' ? 'active' : ''} onClick={() => onModeChange(index, 'view')}>VER</button>
        <button className={mode === 'manage' ? 'active' : ''} onClick={() => onModeChange(index, 'manage')}>GESTIONAR</button>
      </div>}
      {teamId && <button className="multi-slot-clear" onClick={() => onClear(index)}>QUITAR</button>}
    </div>
    {matchId ? <Scoreboard matchId={matchId} mode={mode} density="tile" teams={teams}/> : <div className="scoreboard scoreboard-tile scoreboard-empty">{teamId ? 'ELIGE UNO DE SUS PARTIDOS PENDIENTES.' : 'ELIGE UN EQUIPO DE REFERENCIA PARA ESTA CASILLA.'}</div>}
  </div>;
}

export function MultiMatchPage({ onBack }) {
  const [slots, setSlots] = useState(loadStoredSlots);
  const matchesQuery = useApiQuery(signal => endpoints.matches({ pageSize: 100, page: 1 }, signal));
  const teamsQuery = useApiQuery(signal => endpoints.teams({ pageSize: 100 }, signal));
  const teams = Array.isArray(teamsQuery.data) ? teamsQuery.data : [];
  const matches = useMemo(() => (Array.isArray(matchesQuery.data) ? matchesQuery.data : []).filter(match => match.status === 'pending' || match.status === 'live'), [matchesQuery.data]);

  useEffect(() => saveStoredSlots(slots), [slots]);

  const selectTeam = (index, teamId) => setSlots(current => current.map((slot, slotIndex) => slotIndex === index ? { teamId, matchId: null, mode: slot.mode } : slot));
  const selectMatch = (index, matchId) => setSlots(current => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, matchId } : slot));
  const setMode = (index, mode) => setSlots(current => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, mode } : slot));
  const clearSlot = index => setSlots(current => current.map((slot, slotIndex) => slotIndex === index ? { ...EMPTY_SLOT } : slot));

  return <main className="multi-page">
    <div className="multi-page-bar">
      <button className="scoreboard-back" onClick={onBack}>← PARTIDOS</button>
      <div className="multi-page-title"><h1>MULTIPARTIDO</h1><p>ELIGE UN EQUIPO POR CASILLA Y LUEGO UNO DE SUS PARTIDOS PENDIENTES O EN VIVO</p></div>
    </div>
    <div className="multi-grid">
      {slots.map((slot, index) => <Slot key={index} index={index} teamId={slot.teamId} matchId={slot.matchId} mode={slot.mode} matches={matches} teams={teams} onSelectTeam={selectTeam} onSelectMatch={selectMatch} onModeChange={setMode} onClear={clearSlot}/>)}
    </div>
  </main>;
}
