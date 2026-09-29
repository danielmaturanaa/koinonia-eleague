import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { STYLE_LABELS, boosterText, bonusText } from '../../utils/managerBoosters.js';
import { useApiQuery } from '../public/useApiQuery.js';

/** Los 5 dominios de estilo del DT (0–99) y sus potenciadores. */
export function ManagerSummary({ manager, compact = false }) {
  if (!manager) return null;
  return <div className={`manager-summary ${compact ? 'compact' : ''}`}>
    <p className="manager-summary-title"><b>{manager.name}</b><small>{[manager.country, manager.age ? `${manager.age} AÑOS` : null, manager.reputation != null ? `REPUTACIÓN ${manager.reputation}` : null].filter(Boolean).join(' · ')}</small></p>
    <ul className="manager-styles" aria-label="Dominios de estilo">
      {STYLE_LABELS.map(([key, label]) => <li key={key}><span>{label}</span><i aria-hidden="true"><b style={{ width: `${Math.min(manager.styles?.[key] ?? 0, 99)}%` }}/></i><em>{manager.styles?.[key] ?? '—'}</em></li>)}
    </ul>
    {manager.proficiency && <p className="manager-style-bonus">JUEGA CON <b>{STYLE_LABELS.find(([key]) => key === manager.proficiency.style)?.[1] ?? manager.proficiency.style} ({manager.proficiency.value})</b> · {bonusText(manager.proficiency.factor)} EN TODAS LAS STATS</p>}
    <p className="manager-boosters">{manager.boosters?.length
      ? manager.boosters.map((booster, index) => <span className="manager-booster" key={`${booster.stat}-${index}`}>{boosterText(booster)}</span>)
      : <span className="manager-booster none">SIN POTENCIADORES</span>}</p>
  </div>;
}

/** Buscador de DT por nombre, sin tildes ni mayúsculas (lo resuelve el servidor). */
export function ManagerPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const results = useApiQuery(signal => term.length >= 2 ? endpoints.efootballManagers({ q: term }, signal) : Promise.resolve({ data: [] }), [term]);
  const rows = Array.isArray(results.data) ? results.data : [];
  return <div className="manager-picker">
    <label htmlFor="manager-picker-input">DT DE eFOOTBALL (OPCIONAL)</label>
    {value ? <div className="manager-picked"><ManagerSummary manager={value}/><button type="button" className="club-inline-edit" onClick={() => onChange(null)}>QUITAR VÍNCULO</button></div> : null}
    <input id="manager-picker-input" type="search" autoComplete="off" value={search} placeholder="Busca por nombre: Allegri, Guardiola, Klopp…" onChange={event => setSearch(event.target.value)}/>
    {search.trim().length >= 2 && <div className="manager-results" role="listbox">
      {results.loading || term !== search.trim() ? <p>BUSCANDO…</p> : rows.length ? rows.map(manager => <button type="button" role="option" key={manager.pesId} onClick={() => { onChange(manager); setSearch(''); }}>
        <span><b>{manager.name}</b><small>{[manager.country, manager.age ? `${manager.age} AÑOS` : null, `REP. ${manager.reputation ?? '—'}`].filter(Boolean).join(' · ')}</small></span>
        <em>{manager.boosters.length ? manager.boosters.map(boosterText).join(' · ') : 'SIN POTENCIADOR'}</em>
      </button>) : <p>SIN RESULTADOS.</p>}
    </div>}
  </div>;
}
