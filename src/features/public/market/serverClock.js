// Reloj corregido con la hora del servidor: si el reloj del computador está desfasado, la revelación igual
// se ve a la misma hora que los demás.
let offsetMs = 0;
export function syncServerTime(serverIso) {
  const server = Date.parse(serverIso);
  if (Number.isFinite(server)) offsetMs = server - Date.now();
}
export const serverNow = () => Date.now() + offsetMs;
