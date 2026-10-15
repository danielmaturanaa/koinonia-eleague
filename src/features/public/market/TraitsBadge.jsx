// Perfil de negociación de un jugador: sus rasgos y lo que más pesa para él al decidir en una subasta.
// Es el perfil de juego que asigna la liga (sorteado de forma reproducible), no el carácter real del jugador.
const TRAITS = {
  ganador: ['GANADOR', 'QUIERE TÍTULOS Y UN CLUB IMPORTANTE'],
  titular: ['TITULAR', 'QUIERE JUGAR SIEMPRE'],
  sociable: ['SOCIABLE', 'LE IMPORTA CON QUIÉN JUEGA'],
  mercenario: ['MERCENARIO', 'SE VA CON EL QUE MÁS PAGA'],
  ego: ['EGO', 'QUIERE SER LA FIGURA'],
  leal: ['LEAL', 'PREFIERE UN CLUB ESTABLE Y UN PRESI QUE CUMPLE'],
};
const FACTOR = {
  dinero: 'DINERO', minutos: 'MINUTOS DE JUEGO', companeros: 'COMPAÑEROS', dt: 'ENTRENADOR',
  prestigio: 'PRESTIGIO DEL CLUB', proyecto: 'PROYECTO', reputacion: 'REPUTACIÓN DEL PRESI',
};

const topPriorities = weights => Object.entries(weights ?? {})
  .filter(([key]) => FACTOR[key])
  .sort((a, b) => b[1] - a[1]).slice(0, 3);

/**
 * `variant="full"` explica cada rasgo con una frase (ficha del jugador);
 * `variant="compact"` es el bloque corto de la tarjeta de subasta y del chat.
 */
export function TraitsBadge({ negotiation, variant = 'compact' }) {
  const traits = (negotiation?.traits ?? []).filter(trait => TRAITS[trait]);
  if (!traits.length) return null;
  const priorities = topPriorities(negotiation.weights);
  const full = variant === 'full';
  return <section className={`traits-badge ${full ? 'full' : 'compact'}`} aria-label="PERFIL DE NEGOCIACIÓN">
    <b className="traits-title">{full ? 'PERFIL DE NEGOCIACIÓN' : 'ASÍ NEGOCIA ESTE JUGADOR'}</b>
    <ul className="traits-list">
      {traits.map(trait => <li key={trait} title={TRAITS[trait][1]}>
        <em>{TRAITS[trait][0]}</em>
        {full && <small>{TRAITS[trait][1]}</small>}
      </li>)}
    </ul>
    {priorities.length > 0 && <p className="traits-priorities">
      LO QUE MÁS LE PESA: {priorities.map(([key, value]) => <span key={key}>{FACTOR[key]} <b>{Math.round(value)}%</b></span>)}
    </p>}
    {!full && <p className="traits-hint">{traits.map(trait => `${TRAITS[trait][0]}: ${TRAITS[trait][1]}`).join(' · ')}</p>}
    {full && <p className="traits-note">ES EL PERFIL DE JUEGO QUE LA LIGA LE ASIGNA PARA DECIDIR EN UNA SUBASTA; NO ES SU CARÁCTER REAL.</p>}
  </section>;
}
