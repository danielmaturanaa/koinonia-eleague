const BAND_Y = { att: 14, mid: 42, def: 68, gk: 90 };

export const bandFor = position => {
  if (['DC', 'SD', 'EXD', 'EXI'].includes(position)) return 'att';
  if (['MO', 'MC', 'MCD', 'MDI', 'MDD'].includes(position)) return 'mid';
  if (['LD', 'DEC', 'LI'].includes(position)) return 'def';
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
  { key: '4-4-2', slots: [GK_SLOT, ...line(68, ['LI', 15], ['DEC', 38], ['DEC', 62], ['LD', 85]), ...line(42, ['MDI', 15], ['MC', 38], ['MC', 62], ['MDD', 85]), ...line(14, ['DC', 36], ['DC', 64])] },
  { key: '4-3-3', slots: [GK_SLOT, ...line(68, ['LI', 15], ['DEC', 38], ['DEC', 62], ['LD', 85]), ...line(42, ['MC', 28], ['MO', 50], ['MC', 72]), ['EXI', 18, 16], ['DC', 50, 12], ['EXD', 82, 16]] },
  { key: '4-2-3-1', slots: [GK_SLOT, ...line(68, ['LI', 15], ['DEC', 38], ['DEC', 62], ['LD', 85]), ...line(50, ['MCD', 36], ['MCD', 64]), ['EXI', 18, 30], ['MO', 50, 30], ['EXD', 82, 30], ['DC', 50, 12]] },
  { key: '4-1-4-1', slots: [GK_SLOT, ...line(68, ['LI', 15], ['DEC', 38], ['DEC', 62], ['LD', 85]), ['MCD', 50, 54], ...line(34, ['MDI', 14], ['MC', 38], ['MC', 62], ['MDD', 86]), ['DC', 50, 12]] },
  { key: '4-5-1', slots: [GK_SLOT, ...line(68, ['LI', 15], ['DEC', 38], ['DEC', 62], ['LD', 85]), ...line(40, ['MDI', 12], ['MC', 32], ['MO', 50], ['MC', 68], ['MDD', 88]), ['DC', 50, 12]] },
  { key: '3-5-2', slots: [GK_SLOT, ...line(70, ['DEC', 25], ['DEC', 50], ['DEC', 75]), ['LI', 9, 46], ['MC', 32, 42], ['MO', 50, 38], ['MC', 68, 42], ['LD', 91, 46], ...line(14, ['DC', 36], ['DC', 64])] },
  { key: '3-4-3', slots: [GK_SLOT, ...line(70, ['DEC', 25], ['DEC', 50], ['DEC', 75]), ['LI', 12, 46], ['MC', 38, 44], ['MC', 62, 44], ['LD', 88, 46], ['EXI', 18, 16], ['DC', 50, 12], ['EXD', 82, 16]] },
  { key: '5-3-2', slots: [GK_SLOT, ['LI', 10, 62], ['DEC', 30, 70], ['DEC', 50, 72], ['DEC', 70, 70], ['LD', 90, 62], ...line(42, ['MC', 28], ['MO', 50], ['MC', 72]), ...line(14, ['DC', 36], ['DC', 64])] },
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

// Dónde se pinta cada puesto cuando se arrastra un jugador (coordenadas de cancha 0–100, y chica = ataque).
export const ZONE_SPOTS = [
  ['DC', 50, 9], ['SD', 50, 21], ['EXI', 17, 16], ['EXD', 83, 16], ['MO', 50, 33], ['MDI', 13, 42], ['MDD', 87, 42],
  ['MC', 50, 46], ['MCD', 50, 58], ['LI', 14, 70], ['LD', 86, 70], ['DEC', 50, 72], ['PT', 50, 90],
];
