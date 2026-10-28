const BAND_Y = { att: 14, mid: 42, def: 68, gk: 90 };

export const bandFor = position => {
  if (['DC', 'SD', 'ED', 'EI'].includes(position)) return 'att';
  if (['MP', 'MC', 'MCD', 'II', 'ID'].includes(position)) return 'mid';
  if (['LD', 'CT', 'LI'].includes(position)) return 'def';
  return position === 'PT' ? 'gk' : 'mid';
};

export function defaultFormationPositions(starters) {
  const byBand = { att: [], mid: [], def: [], gk: [] };
  starters.forEach(player => byBand[bandFor(player.position)].push(player));
  const positions = {};
  Object.entries(byBand).forEach(([band, players]) => {
    players.forEach((player, index) => {
      positions[player.id] = { x: (100 / (players.length + 1)) * (index + 1), y: BAND_Y[band] };
    });
  });
  return positions;
}

export function pitchPositionFor(player, defaults) {
  if (player.pitchX != null && player.pitchY != null) return { x: player.pitchX, y: player.pitchY };
  return defaults[player.id] ?? { x: 50, y: 50 };
}

// Plantillas de formación. Cada hueco es [puesto, x, y] en coordenadas de cancha 0–100
// (y chica = ataque). El portero va siempre en el mismo lugar.
const GK_SLOT = ['PT', 50, 90];
const line = (y, ...slots) => slots.map(([position, x, yOverride]) => [position, x, yOverride ?? y]);

export const FORMATIONS = [
  { key: '4-4-2', slots: [GK_SLOT, ...line(68, ['LI', 15], ['CT', 38], ['CT', 62], ['LD', 85]), ...line(42, ['II', 15], ['MC', 38], ['MC', 62], ['ID', 85]), ...line(14, ['DC', 36], ['DC', 64])] },
  { key: '4-3-3', slots: [GK_SLOT, ...line(68, ['LI', 15], ['CT', 38], ['CT', 62], ['LD', 85]), ...line(42, ['MC', 28], ['MP', 50], ['MC', 72]), ['EI', 18, 16], ['DC', 50, 12], ['ED', 82, 16]] },
  { key: '4-2-3-1', slots: [GK_SLOT, ...line(68, ['LI', 15], ['CT', 38], ['CT', 62], ['LD', 85]), ...line(50, ['MCD', 36], ['MCD', 64]), ['EI', 18, 30], ['MP', 50, 30], ['ED', 82, 30], ['DC', 50, 12]] },
  { key: '4-1-4-1', slots: [GK_SLOT, ...line(68, ['LI', 15], ['CT', 38], ['CT', 62], ['LD', 85]), ['MCD', 50, 54], ...line(34, ['II', 14], ['MC', 38], ['MC', 62], ['ID', 86]), ['DC', 50, 12]] },
  { key: '4-5-1', slots: [GK_SLOT, ...line(68, ['LI', 15], ['CT', 38], ['CT', 62], ['LD', 85]), ...line(40, ['II', 12], ['MC', 32], ['MP', 50], ['MC', 68], ['ID', 88]), ['DC', 50, 12]] },
  { key: '3-5-2', slots: [GK_SLOT, ...line(70, ['CT', 25], ['CT', 50], ['CT', 75]), ['LI', 9, 46], ['MC', 32, 42], ['MP', 50, 38], ['MC', 68, 42], ['LD', 91, 46], ...line(14, ['DC', 36], ['DC', 64])] },
  { key: '3-4-3', slots: [GK_SLOT, ...line(70, ['CT', 25], ['CT', 50], ['CT', 75]), ['LI', 12, 46], ['MC', 38, 44], ['MC', 62, 44], ['LD', 88, 46], ['EI', 18, 16], ['DC', 50, 12], ['ED', 82, 16]] },
  { key: '5-3-2', slots: [GK_SLOT, ['LI', 10, 62], ['CT', 30, 70], ['CT', 50, 72], ['CT', 70, 70], ['LD', 90, 62], ...line(42, ['MC', 28], ['MP', 50], ['MC', 72]), ...line(14, ['DC', 36], ['DC', 64])] },
];

// Reparte los titulares en los huecos de la formación: primero por puesto exacto, luego por
// línea y al final cualquiera. Dentro de cada grupo se respeta el orden izquierda → derecha actual.
export function applyFormation(starters, formation, positionOf) {
  const slots = formation.slots.map(([position, x, y]) => ({ position, x, y })).sort((a, b) => a.x - b.x);
  const players = [...starters].sort((a, b) => positionOf(a).x - positionOf(b).x);
  const result = {};
  const assign = (matches) => {
    for (const slot of slots.filter(item => !item.taken)) {
      const player = players.find(item => !result[item.id] && matches(item, slot));
      if (player) { result[player.id] = { x: slot.x, y: slot.y }; slot.taken = true; }
    }
  };
  assign((player, slot) => player.position === slot.position);
  assign((player, slot) => bandFor(player.position) === bandFor(slot.position));
  assign(() => true);
  return result;
}

// Devuelve la formación cuyos huecos coinciden con las posiciones actuales (o null si es personalizada).
export function detectFormation(starters, positionOf) {
  if (starters.length !== 11) return null;
  const points = starters.map(positionOf);
  return FORMATIONS.find(({ slots }) => points.every(point => slots.some(([, x, y]) => Math.hypot(point.x - x, point.y - y) < 1.5))
    && slots.every(([, x, y]) => points.some(point => Math.hypot(point.x - x, point.y - y) < 1.5)))?.key ?? null;
}

// Puesto EN LA CANCHA de un titular: el del hueco de formación más cercano a donde está (el mismo cálculo del servidor).
// Un EI puesto de 10 pasa a MP; ante un empate de distancia gana su puesto natural.
const ALL_SLOTS = FORMATIONS.flatMap(({ slots }) => slots);
export function fieldPositionAt(point, natural) {
  let best = null;
  for (const [slot, x, y] of ALL_SLOTS) {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (!best || distance < best.distance - 1e-9 || (Math.abs(distance - best.distance) < 1e-9 && slot === natural)) best = { slot, distance };
  }
  return best?.slot ?? natural;
}

// El jugador tal como rinde donde está parado: su puesto de cancha y la media que le da eFootballDB en ese puesto
// (con DT si el club lo tiene). Sin media por puesto (carta sin stats) queda con la de siempre.
export function playerAtPosition(player, point) {
  const slot = fieldPositionAt(point, player.position);
  const overall = player.overallByPosition?.[slot];
  if (overall == null) return { ...player, fieldPosition: player.position, naturalPosition: player.position };
  return { ...player, fieldPosition: slot, naturalPosition: player.position, position: slot, overall, overallWithCoach: player.overallWithCoachByPosition?.[slot] ?? overall };
}
