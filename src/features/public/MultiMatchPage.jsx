import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { Scoreboard } from '../../components/Scoreboard.jsx';
import { PageHeader } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const SLOT_COUNT = 4;
const STORAGE_KEY = 'koinonia-multipartido';
const statusPriority = status => status === 'live' ? 0 : status === 'pending' ? 1 : 2;

function loadStoredSlots() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.from({ length: SLOT_COUNT }, (_, index) => stored[index] ?? null);
  } catch {
    return Array.from({ length: SLOT_COUNT }, () => null);
  }
}

function saveStoredSlots(slots) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // el navegador no permite guardar preferencias locales; no es crítico.
  }
}

function SlotPicker({ matches, value, onChange }) {
  return <select className="multi-slot-picker" value={value ?? ''} onChange={event => onChange(event.target.value || null)}>
    <option value="">— ELEGIR PARTIDO —</option>
    {matches.map(match => <option key={match.id} value={match.id}>{match.homeTeam?.name} vs {match.awayTeam?.name} · {match.status === 'live' ? 'EN VIVO' : match.status === 'pending' ? 'PENDIENTE' : match.status.toUpperCase()}</option>)}
  </select>;
}

function Slot({ index, matchId, mode, matches, teams, onSelect, onModeChange, onClear }) {
  return <div className="multi-slot">
    <div className="multi-slot-bar">
      <SlotPicker matches={matches} value={matchId} onChange={id => onSelect(index, id)}/>
      {matchId && <div className="scoreboard-mode-toggle multi-slot-toggle">
        <button className={mode === 'view' ? 'active' : ''} onClick={() => onModeChange(index, 'view')}>VER</button>
        <button className={mode === 'manage' ? 'active' : ''} onClick={() => onModeChange(index, 'manage')}>GESTIONAR</button>
      </div>}
      {matchId && <button className="multi-slot-clear" onClick={() => onClear(index)}>QUITAR</button>}
    </div>
    {matchId ? <Scoreboard matchId={matchId} mode={mode} density="tile" teams={teams}/> : <div className="scoreboard scoreboard-tile scoreboard-empty">ELIGE UN PARTIDO PARA ESTA CASILLA.</div>}
  </div>;
}

export function MultiMatchPage({ teams = [] }) {
  const [slots, setSlots] = useState(() => loadStoredSlots().map(entry => entry ?? { matchId: null, mode: 'view' }));
  const matches = useApiQuery(signal => endpoints.matches({ pageSize: 50, page: 1 }, signal));
  const rows = useMemo(() => (Array.isArray(matches.data) ? matches.data : []).filter(match => match.status !== 'cancelled').sort((a, b) => statusPriority(a.status) - statusPriority(b.status)), [matches.data]);

  useEffect(() => saveStoredSlots(slots), [slots]);

  const selectMatch = (index, matchId) => setSlots(current => current.map((slot, slotIndex) => slotIndex === index ? { matchId, mode: slot.mode } : slot));
  const setMode = (index, mode) => setSlots(current => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, mode } : slot));
  const clearSlot = index => setSlots(current => current.map((slot, slotIndex) => slotIndex === index ? { matchId: null, mode: 'view' } : slot));

  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="HASTA 4 PARTIDOS A LA VEZ" title="MULTIPARTIDO"/>
    <p className="multi-help">ELIGE UN PARTIDO POR CASILLA. GESTIONA GOLES Y TARJETAS SIN SALIR DE LA GRILLA.</p>
    <div className="multi-grid">
      {slots.map((slot, index) => <Slot key={index} index={index} matchId={slot.matchId} mode={slot.mode} matches={rows} teams={teams} onSelect={selectMatch} onModeChange={setMode} onClear={clearSlot}/>)}
    </div>
  </section></main>;
}
