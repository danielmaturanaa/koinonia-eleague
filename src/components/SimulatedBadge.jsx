// Etiqueta de partido definido por el simulador oficial. `match.simulated` viene de la API.
export function SimulatedBadge({ match }) {
  if (!match?.simulated) return null;
  return <i className="sim-badge" title="Resultado definido por el simulador oficial">SIMULADO</i>;
}
