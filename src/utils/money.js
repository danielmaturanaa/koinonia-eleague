// Formato de montos de la liga. 1 GP = 1 €, así que los valores llegan a cientos de millones: desde 1 millón se escribe
// abreviado ("120 M GP", "1.200 M GP"); por debajo, el número completo. Igual que el servidor (src/lib/money.js).
export const gpNumber = value => {
  const number = Number(value);
  return Math.abs(number) >= 1_000_000
    ? `${(number / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 2 })} M`
    : number.toLocaleString('es-CL');
};
export const gpLabel = value => `${gpNumber(value)} GP`;

/** Escribe un monto en palabras: "200 M GP", "850 mil GP", "12 GP". */
export const gpWords = value => {
  const number = Math.abs(Number(value));
  if (number >= 1_000_000) return `${(Number(value) / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 2 })} M GP`;
  if (number >= 1_000) return `${(Number(value) / 1_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} mil GP`;
  return `${Number(value).toLocaleString('es-CL')} GP`;
};

/** Un monto con puntos de miles: 200000000 → "200.000.000". */
export const gpDigits = value => Math.round(Number(value)).toLocaleString('es-CL');

/**
 * Lee lo que alguien escribe en un campo de monto: "200.000.000", "200000000", "200m", "1,5m", "850k".
 * Devuelve un entero o null si no hay nada (o no se entiende).
 */
export function parseGp(text) {
  const clean = String(text ?? '').trim().toLowerCase().replace(/\s/g, '');
  const match = clean.match(/^([0-9.,]*)(k|m)?$/);
  if (!match || match[1] === '') return null;
  const [, digits, suffix] = match;
  if (suffix) {
    const value = Number.parseFloat(digits.replace(',', '.'));
    return Number.isFinite(value) ? Math.round(value * (suffix === 'k' ? 1_000 : 1_000_000)) : null;
  }
  const plain = digits.replace(/[.,]/g, '');
  return plain === '' ? null : Number(plain);
}
