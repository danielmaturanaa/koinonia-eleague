// Notas 0–100 del motor convertidas en estrellas (0 a 5) con una frase corta: se entienden de un vistazo.
export const starsOf = note => Math.max(0, Math.min(5, Math.round((Number(note) || 0) / 20)));

const PHRASES = {
  dinero: ['OFERTA BAJA', 'OFERTA COMPETITIVA', 'LA MEJOR OFERTA'],
  minutos: ['IBA A LA BANCA', 'PELEABA EL PUESTO', 'PUESTO ASEGURADO'],
  companeros: ['NO CONOCÍA A NADIE', 'ALGUNOS CONOCIDOS', 'LLENO DE AMIGOS'],
  dt: ['EL DT NO LE SIRVE', 'DT CORRECTO', 'DT IDEAL PARA ÉL'],
  prestigio: ['CLUB CHICO', 'CLUB MEDIO', 'CLUB GRANDE'],
  proyecto: ['MAL MOMENTO', 'PROYECTO NORMAL', 'EQUIPO EN RACHA'],
  reputacion: ['PRESI DUDOSO', 'PRESI NORMAL', 'PRESI CONFIABLE'],
  total: ['NO LE CALZA', 'LE CALZA', 'LE CALZA PERFECTO'],
};

export function phraseOf(factor, note) {
  const stars = starsOf(note);
  const [low, mid, high] = PHRASES[factor] ?? ['BAJO', 'MEDIO', 'ALTO'];
  return stars <= 2 ? low : stars === 3 ? mid : high;
}

export function Stars({ note, factor = null, compact = false }) {
  const stars = starsOf(note);
  const label = `${stars} DE 5 ESTRELLAS${factor ? ` · ${phraseOf(factor, note)}` : ''}`;
  return <span className={`stars stars-${stars}`} role="img" aria-label={label} title={`${label} (${Math.round(Number(note) || 0)}/100)`}>
    <span className="stars-row" aria-hidden="true">{'★'.repeat(stars)}<i>{'★'.repeat(5 - stars)}</i></span>
    {factor && !compact && <small>{phraseOf(factor, note)}</small>}
  </span>;
}
