export function LiveTableStatus({ rows = [] }) {
  const live = rows.some(row => row.hasLiveMatches);
  return live ? <small className="live-table-status" role="status"><i aria-hidden="true"/>TABLA EN VIVO · PROVISORIA</small> : null;
}

export function LivePosition({ row, position }) {
  const change = Number(row.positionChange ?? 0);
  if (!change) return <span className="live-position"><b>{position}</b></span>;
  const up = change > 0;
  const label = up ? `Sube ${change} ${change === 1 ? 'puesto' : 'puestos'} provisionalmente` : `Baja ${Math.abs(change)} ${Math.abs(change) === 1 ? 'puesto' : 'puestos'} provisionalmente`;
  return <span className={`live-position ${up ? 'up' : 'down'}`} aria-label={label}><b>{position}</b><i aria-hidden="true">{up ? '↑' : '↓'}</i></span>;
}

export function liveRowClass(row, extra = '') {
  const movement = Number(row.positionChange ?? 0);
  return [extra, row.isPlayingLive ? 'is-playing-live' : '', movement > 0 ? 'position-up' : movement < 0 ? 'position-down' : ''].filter(Boolean).join(' ');
}
