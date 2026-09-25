// Nombre corto para la cancha y fichas chicas. Si el backend publica `shortName`
// (apodo definido a mano), manda ese; si no, se deduce del nombre completo.
const FLAG_PREFIX = /^\p{Regional_Indicator}{2}\s*/u;
const SUFFIXES = new Set(['jr', 'jr.', 'júnior', 'junior', 'filho', 'neto', 'sobrinho', 'ii', 'iii']);
const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'del', 'della', 'di', 'du', 'van', 'von', 'der', 'den', 'la', 'le', 'ter', 'ten', 'el', 'al', 'bin', 'ben', 'mac', 'st.']);
const SHORT_ENOUGH = 10;

const suffixLabel = word => (/^j(ú|u)nior$|^jr\.?$/i.test(word) ? 'Jr.' : word);

export function shortPlayerName(player) {
  const explicit = typeof player === 'object' ? player?.shortName ?? player?.short_name : null;
  if (explicit?.trim()) return explicit.trim();
  const full = String(typeof player === 'object' ? player?.name ?? '' : player ?? '').replace(FLAG_PREFIX, '').trim();
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length <= 1 || full.length <= SHORT_ENOUGH) return full;
  const last = words.at(-1);
  // "Neymar Jr" / "Vinícius Júnior": el sufijo solo no identifica a nadie.
  if (SUFFIXES.has(last.toLowerCase())) return `${words[0]} ${suffixLabel(last)}`;
  // "Frenkie de Jong", "Kevin De Bruyne": el apellido incluye la partícula.
  let start = words.length - 1;
  while (start > 1 && PARTICLES.has(words[start - 1].toLowerCase())) start -= 1;
  return words.slice(start).join(' ');
}
