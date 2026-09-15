const BAND_Y = { att: 14, mid: 42, def: 68, gk: 90 };

export const bandFor = position => {
  if (['DC', 'ED', 'EI'].includes(position)) return 'att';
  if (['MO', 'MC'].includes(position)) return 'mid';
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
