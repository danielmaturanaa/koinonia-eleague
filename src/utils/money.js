// Formato de montos de la liga. 1 GP = 1 €, así que los valores llegan a cientos de millones: desde 1 millón se escribe
// abreviado ("120 M GP", "1.200 M GP"); por debajo, el número completo. Igual que el servidor (src/lib/money.js).
export const gpNumber = value => {
  const number = Number(value);
  return Math.abs(number) >= 1_000_000
    ? `${(number / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 2 })} M`
    : number.toLocaleString('es-CL');
};
export const gpLabel = value => `${gpNumber(value)} GP`;
