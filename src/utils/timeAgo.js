/** "hace 5 min", "hace 3 h", "ayer", "hace 4 d" o la fecha si pasó más de una semana. */
export function timeAgo(iso, now = Date.now()) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return '';
  const minutes = Math.max(0, Math.round((now - time) / 60000));
  if (minutes < 1) return 'AHORA';
  if (minutes < 60) return `HACE ${minutes} MIN`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `HACE ${hours} H`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'AYER';
  if (days < 8) return `HACE ${days} D`;
  return new Date(time).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).toUpperCase();
}
