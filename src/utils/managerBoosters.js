// Etiquetas de los potenciadores y estilos de los DT de eFootballDB.
// El backend ya entrega cada potenciador como { stat, value }; aquí solo se traduce para mostrarlo.
export const STAT_LABELS = {
  attacking_prowess: 'ACTITUD OFENSIVA', ball_control: 'CONTROL DE BALÓN', dribbling: 'REGATE', tight_possession: 'POSESIÓN ESTRECHA',
  low_pass: 'PASE RASO', lofted_pass: 'PASE ALTO', finishing: 'FINALIZACIÓN', place_kicking: 'BALÓN PARADO', swerve: 'EFECTO', header: 'CABECEO',
  defensive_prowess: 'ACTITUD DEFENSIVA', ball_winning: 'RECUPERACIÓN', aggression: 'AGRESIVIDAD', kicking_power: 'POTENCIA DE TIRO',
  speed: 'VELOCIDAD', explosive_power: 'ACELERACIÓN', physical_contact: 'CONTACTO FÍSICO', body_control: 'EQUILIBRIO', jump: 'SALTO', stamina: 'RESISTENCIA',
  goalkeeping: 'ACTITUD DE PORTERO', coverage: 'COBERTURA DE PORTERO', catching: 'AGARRE DE PORTERO', clearing: 'DESPEJE DE PORTERO', reflexes: 'REFLEJOS DE PORTERO',
  defensive_engagement: 'COMPROMISO DEFENSIVO',
};

export const STYLE_LABELS = [
  ['possession_game', 'JUEGO DE POSESIÓN'], ['quick_counter', 'CONTRAATAQUE RÁPIDO'], ['long_ball_counter', 'CONTRA CON BALÓN LARGO'],
  ['out_wide', 'JUEGO POR LAS BANDAS'], ['long_ball', 'BALÓN LARGO'],
];

export const boosterText = booster => `+${booster.value} ${STAT_LABELS[booster.stat] ?? booster.stat}`;

/** "85 → 86 CON DT" si el DT sube la media; si no, solo la media base. */
export function overallText(player) {
  const base = player?.overall;
  if (base == null) return '—';
  const withCoach = player.overallWithCoach;
  return withCoach != null && withCoach > base ? `${base} → ${withCoach} CON DT` : String(base);
}

export const hasCoachBoost = player => player?.overall != null && player.overallWithCoach != null && player.overallWithCoach > player.overall;
