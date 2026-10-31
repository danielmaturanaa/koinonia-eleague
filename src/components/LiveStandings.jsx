export function LiveTableStatus({ rows = [] }) {
  const live = rows.some(row => row.hasLiveMatches);
  return live ? <small className="live-table-status" role="status"><i aria-hidden="true"/>TABLA EN VIVO</small> : null;
}

export function LivePosition({ position }) {
  return <span className="live-position">{position}</span>;
}

export function LiveMovement({ row }) {
  if (!row.hasLiveMatches) return null;
  const change = Number(row.positionChange ?? 0);
  if (!change) return <span className="live-movement" aria-hidden="true"/>;
  const up = change > 0;
  const label = up ? `Sube ${change} ${change === 1 ? 'puesto' : 'puestos'} provisionalmente` : `Baja ${Math.abs(change)} ${Math.abs(change) === 1 ? 'puesto' : 'puestos'} provisionalmente`;
  const path = up ? 'M2 8 L6 4 L10 8' : 'M2 4 L6 8 L10 4';
  return <span className={`live-movement ${up ? 'up' : 'down'}`} aria-label={label}><svg viewBox="0 0 12 12" aria-hidden="true"><path d={path}/></svg></span>;
}

// Zonas de la tabla (misma regla que el servidor): con 8 clubes o más, 1.º-2.º pasan directo a semis y 3.º-6.º juegan el play-in; con menos, los 4 primeros van a semis.
export function playoffZone(index, total) {
  if (total >= 8) return index < 2 ? 'is-qualified' : index < 6 ? 'is-playin' : '';
  return index < 4 && total >= 4 ? 'is-qualified' : '';
}

export function PlayoffLegend({ total }) {
  if (total < 4) return null;
  return <p className="playoff-legend" aria-label="Zonas de clasificación"><span className="legend-qualified">{total >= 8 ? 'SEMIFINAL DIRECTA' : 'PLAYOFFS'}</span>{total >= 8 && <span className="legend-playin">PLAY-IN</span>}</p>;
}

export function liveRowClass(row, extra = '') {
  const movement = Number(row.positionChange ?? 0);
  return [extra, row.isPlayingLive ? 'is-playing-live' : '', movement > 0 ? 'position-up' : movement < 0 ? 'position-down' : ''].filter(Boolean).join(' ');
}
