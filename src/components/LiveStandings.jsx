export function LiveTableStatus({ rows = [] }) {
  const live = rows.some(row => row.hasLiveMatches);
  return live ? <small className="live-table-status" role="status"><i aria-hidden="true"/>TABLA EN VIVO</small> : null;
}

export function LivePosition({ position }) {
  return <span className="live-position">{position}</span>;
}

export function LiveMovement({ row }) {
  const change = Number(row.positionChange ?? 0);
  if (!change) return <span className="live-movement" aria-hidden="true"/>;
  const up = change > 0;
  const label = up ? `Sube ${change} ${change === 1 ? 'puesto' : 'puestos'} provisionalmente` : `Baja ${Math.abs(change)} ${Math.abs(change) === 1 ? 'puesto' : 'puestos'} provisionalmente`;
  const path = up ? 'M2 10 L8 4 L14 10' : 'M2 6 L8 12 L14 6';
  return <span className={`live-movement ${up ? 'up' : 'down'}`} aria-label={label}><svg viewBox="0 0 16 16" aria-hidden="true"><path d={path}/></svg></span>;
}

export function liveRowClass(row, extra = '') {
  const movement = Number(row.positionChange ?? 0);
  return [extra, row.isPlayingLive ? 'is-playing-live' : '', movement > 0 ? 'position-up' : movement < 0 ? 'position-down' : ''].filter(Boolean).join(' ');
}
