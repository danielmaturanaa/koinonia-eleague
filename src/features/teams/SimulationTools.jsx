import { useEffect, useRef, useState } from 'react';

const format = value => Number(value).toLocaleString('es-CL');

// Herramientas de una carta en el simulador: precio editable (clic para escribir, Enter guarda,
// Esc cancela), restablecer al precio real y quitar. Van fuera del <button> de la carta.
export function SimulationTools({ name, value, edited, onPrice, onReset, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const input = useRef(null);
  useEffect(() => { if (editing) input.current?.select(); }, [editing]);

  const start = () => { setDraft(String(value)); setEditing(true); };
  const commit = () => {
    const digits = draft.replace(/\D/g, '');
    setEditing(false);
    if (digits !== '' && Number(digits) !== value) onPrice(Number(digits));
  };
  const onKeyDown = event => {
    if (event.key === 'Enter') { event.preventDefault(); commit(); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setEditing(false); }
  };

  return <span className="pitch-tools">
    {editing
      ? <input ref={input} className="pitch-price-input" inputMode="numeric" autoComplete="off" value={draft} aria-label={`Precio de ${name} en GP`} onChange={event => setDraft(event.target.value)} onKeyDown={onKeyDown} onBlur={commit}/>
      : <button type="button" className={`pitch-price ${edited ? 'edited' : ''}`} onClick={start} title={`Editar precio de ${name}${edited ? ' (editado)' : ''}`} aria-label={`Editar precio de ${name}: ${format(value)} GP`}>{format(value)}</button>}
    {edited && !editing && <button type="button" className="pitch-tool" onClick={onReset} title="Volver al precio real" aria-label={`Volver al precio real de ${name}`}>↺</button>}
    {!editing && <button type="button" className="pitch-tool remove" onClick={onRemove} title="Quitar de la simulación" aria-label={`Quitar a ${name} de la simulación`}>×</button>}
  </span>;
}
