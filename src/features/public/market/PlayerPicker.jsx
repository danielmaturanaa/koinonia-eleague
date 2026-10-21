import { useEffect, useId, useRef, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { Button } from '../../../ui/index.js';

const detail = player => [player.position, player.nationality, player.age ? `${player.age} AÑOS` : null].filter(Boolean).join(' · ');

/**
 * Buscador único con autocompletado: escribes parte del nombre y eliges de la lista (teclado o clic).
 * `value` es el jugador elegido (objeto del directorio) y `onChange` recibe el jugador o null.
 */
export function PlayerPicker({ value, onChange, status = 'free', label = 'JUGADOR' }) {
  const listId = useId();
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null);

  // Espera un instante tras escribir para no pedir una búsqueda por cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => setTyped(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);
  useEffect(() => {
    const close = event => { if (root.current && !root.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const results = useApiQuery(signal => endpoints.playerDirectory({ status, sort: 'price_desc', pageSize: 8, q: typed }, signal), [typed, status]);
  const rows = (Array.isArray(results.data) ? results.data : []).filter(player => player.playerId);
  useEffect(() => { setActive(0); }, [typed]);

  const choose = player => { onChange(player); setText(''); setTyped(''); setOpen(false); };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, Math.max(rows.length - 1, 0))); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
    else if (event.key === 'Enter' && open && rows[active]) { event.preventDefault(); choose(rows[active]); }
    else if (event.key === 'Escape') setOpen(false);
  };

  if (value) {
    return <div className="player-picker chosen">
      <span className="picker-label">{label}</span>
      <div className="picker-chosen"><b>{value.name}</b><small>{detail(value)} · {gp(value.price)}</small>
        <Button onClick={() => onChange(null)}>CAMBIAR</Button></div>
    </div>;
  }
  return <div className="player-picker" ref={root}>
    <label htmlFor={`${listId}-input`} className="picker-label">{label}</label>
    <input
      id={`${listId}-input`} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
      aria-activedescendant={open && rows[active] ? `${listId}-${active}` : undefined}
      autoComplete="off" value={text} placeholder="ESCRIBE EL NOMBRE DEL JUGADOR"
      onChange={event => { setText(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}/>
    {open && <ul id={listId} role="listbox" className="picker-list">
      {results.loading && !rows.length && <li className="picker-note">BUSCANDO…</li>}
      {!results.loading && !rows.length && <li className="picker-note">No hay agentes libres con ese nombre.</li>}
      {rows.map((player, index) => <li key={player.playerId} id={`${listId}-${index}`} role="option" aria-selected={index === active}
        className={index === active ? 'active' : ''} onMouseEnter={() => setActive(index)} onMouseDown={event => { event.preventDefault(); choose(player); }}>
        <b>{player.name}</b><small>{detail(player)}</small><span>{gp(player.price)}</span>
      </li>)}
    </ul>}
  </div>;
}
