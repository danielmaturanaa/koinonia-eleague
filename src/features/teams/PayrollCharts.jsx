import { gpNumber } from '../../utils/money.js';

const W = 440; const H = 190; const PAD = { left: 10, right: 10, top: 18, bottom: 26 };
const innerW = W - PAD.left - PAD.right; const innerH = H - PAD.top - PAD.bottom;

/** Nómina por torneo contra el tope (línea punteada). Las barras que pasan el tope salen en rojo. */
export function PayrollBars({ rows, cap = null, labelOf = index => `T${index + 1}` }) {
  const max = Math.max(...rows.map(row => row.payroll), cap ?? 0, 1) * 1.1;
  const slot = innerW / rows.length; const bar = slot * 0.6;
  const y = value => PAD.top + innerH - (value / max) * innerH;
  return <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Nómina proyectada por torneo">
    <title>Nómina proyectada por torneo{cap !== null ? ` y tope de ${gpNumber(cap)} GP` : ''}</title>
    {rows.map((row, index) => {
      const x = PAD.left + slot * index + (slot - bar) / 2;
      return <g key={row.torneo}>
        <rect x={x} y={y(row.payroll)} width={bar} height={PAD.top + innerH - y(row.payroll)} className={row.overCap ? 'bar over' : 'bar'}/>
        <text x={x + bar / 2} y={y(row.payroll) - 4} className="chart-value">{gpNumber(row.payroll)}</text>
        <text x={x + bar / 2} y={H - 8} className="chart-label">{labelOf(row.torneo - 1)}</text>
      </g>;
    })}
    {cap !== null && <g><line x1={PAD.left} x2={W - PAD.right} y1={y(cap)} y2={y(cap)} className="chart-cap"/><text x={W - PAD.right} y={y(cap) - 4} className="chart-cap-label">TOPE {gpNumber(cap)}</text></g>}
    <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="chart-axis"/>
  </svg>;
}

/** Saldo proyectado torneo a torneo. La línea cero se marca; bajo cero sale en rojo. */
export function BalanceLine({ rows, start, labelOf = index => `T${index + 1}` }) {
  const values = [start, ...rows.map(row => row.balance)];
  // Con todo en positivo la escala parte un poco bajo el mínimo (si no la línea se ve plana); si hay números negativos se incluye el cero.
  const lowest = Math.min(...values); const highest = Math.max(...values, 1);
  const min = lowest < 0 ? lowest : Math.max(0, lowest - (highest - lowest) * 0.6 - 1); const max = highest;
  const span = (max - min) || 1;
  const x = index => PAD.left + (innerW / (values.length - 1)) * index;
  const y = value => PAD.top + innerH - ((value - min) / span) * innerH;
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  return <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Saldo proyectado por torneo">
    <title>Saldo proyectado por torneo</title>
    {lowest < 0 && <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} className="chart-axis"/>}
    <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="chart-axis"/>
    <polyline points={points} className="line"/>
    {values.map((value, index) => <g key={index}>
      <circle cx={x(index)} cy={y(value)} r="3.5" className={value < 0 ? 'dot neg' : 'dot'}/>
      <text x={x(index)} y={y(value) - 8} className={`chart-value ${value < 0 ? 'neg' : ''}`} style={{ textAnchor: index === 0 ? 'start' : index === values.length - 1 ? 'end' : 'middle' }}>{gpNumber(value)}</text>
      <text x={x(index)} y={H - 8} className="chart-label">{index === 0 ? 'HOY' : labelOf(index - 1)}</text>
    </g>)}
  </svg>;
}
