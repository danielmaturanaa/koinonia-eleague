import { useState } from 'react';
import { gpDigits, gpWords, parseGp } from '../utils/money.js';

/**
 * Campo para escribir un monto de la liga sin pelear con los ceros: muestra puntos de miles mientras escribes,
 * entiende atajos ("200m", "1,5m", "850k") y debajo lo lee en palabras ("= 200 M GP"). Se usa como un <input>:
 * `value` es un texto o número y `onChange` recibe un evento con `target.value` (los dígitos, o '' si está vacío).
 */
export function GpInput({ value, onChange, hint = true, className = '', min = null, max = null, ...rest }) {
  const [draft, setDraft] = useState(null);
  const number = value === '' || value == null || Number.isNaN(Number(value)) ? null : Number(value);
  const shown = draft ?? (number === null ? '' : gpDigits(number));
  const emit = parsed => onChange?.({ target: { name: rest.name, value: parsed === null ? '' : String(parsed) } });
  const change = event => {
    const raw = event.target.value;
    const parsed = parseGp(raw);
    // Solo dígitos y puntos: se reformatea al instante; con letras o coma se deja tal cual hasta salir del campo.
    setDraft(/^[\d.\s]*$/.test(raw) && parsed !== null ? gpDigits(parsed) : raw);
    emit(parsed);
  };
  const outside = number !== null && ((min !== null && number < min) || (max !== null && number > max));
  return <span className={`gp-input ${className}`}>
    <input type="text" inputMode="decimal" autoComplete="off" spellCheck="false" {...rest} value={shown} onChange={change} onBlur={event => { setDraft(null); rest.onBlur?.(event); }}/>
    {hint && number !== null && <small className={`gp-hint ${outside ? 'out' : ''}`}>= {gpWords(number)}</small>}
  </span>;
}
