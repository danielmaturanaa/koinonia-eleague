// Categorías de aviso: etiqueta e icono pixel de cada una (las mismas que usa la API).
export const CATEGORIES = [
  ['requests', 'PETICIONES DE JUGADORES', 'mail'],
  ['contracts', 'CONTRATOS', 'contract'],
  ['market', 'MERCADO', 'gavel'],
  ['finance', 'FINANZAS', 'coin'],
  ['board', 'DIRECTIVA', 'shield'],
  ['matches', 'PARTIDOS Y SANCIONES', 'ball'],
  ['watchlist', 'SEGUIMIENTO', 'star'],
  ['league', 'LIGA', 'trophy'],
];
export const categoryLabel = key => CATEGORIES.find(([id]) => id === key)?.[1] ?? 'AVISO';
export const categoryIcon = key => CATEGORIES.find(([id]) => id === key)?.[2] ?? 'bell';
