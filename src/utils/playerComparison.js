// Selección del comparador compartida entre el directorio y la ficha de jugador.
// Vive en sessionStorage: sobrevive a la navegación dentro de la pestaña, no a otras.
const STORAGE_KEY = 'koinonia-player-comparison';
export const COMPARISON_LIMIT = 2;

export const comparisonCandidate = player => ({
  key: player.playerId ?? `${player.pesId}-${player.variation ?? 0}`,
  playerId: player.playerId ?? null,
  pesId: player.pesId ?? null,
  variation: player.variation ?? 0,
  name: player.name,
  faceUrl: player.faceUrl,
});

export function readComparison() {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.slice(0, COMPARISON_LIMIT) : [];
  } catch {
    return [];
  }
}

export function writeComparison(selections) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selections.slice(0, COMPARISON_LIMIT)));
  } catch {
    // Sin almacenamiento disponible el comparador sigue funcionando dentro de la página.
  }
}

// Agrega un jugador; si ya hay dos, reemplaza al más antiguo.
export function addToComparison(selections, candidate) {
  if (selections.some(item => item.key === candidate.key)) return selections;
  return selections.length >= COMPARISON_LIMIT ? [...selections.slice(1), candidate] : [...selections, candidate];
}
