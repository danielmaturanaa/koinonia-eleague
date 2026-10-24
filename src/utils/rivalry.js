// Cómo se ve cada rivalidad: clásico (rojo, fuego), superclásico (dorado, corona), derbi (azul, rayo) y clásico y derbi a la vez.
const STYLES = {
  clasico: { icon: 'fire', word: 'Clásico' },
  superclasico: { icon: 'crown', word: 'Superclásico' },
  derbi: { icon: 'bolt', word: 'Derbi' },
};

/** Datos de la rivalidad de un partido (o null): tipo para el color, ícono, etiqueta (nombre propio o tipo) y racha. */
export function rivalryOf(match) {
  const rivalry = match?.rivalry ?? (match?.derby ? { kind: match.officialDerby ? 'superclasico' : 'clasico' } : null);
  if (!rivalry?.kind) return null;
  const style = STYLES[rivalry.kind] ?? STYLES.clasico;
  const label = rivalry.label ?? style.word;
  return { kind: rivalry.kind, both: Boolean(rivalry.both), icon: style.icon, label, named: Boolean(rivalry.name), streak: rivalry.streak ?? null };
}
