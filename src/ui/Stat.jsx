/** Número grande con etiqueta: saldos, medias, precios. */
export function Stat({ label, value, hint, tone = 'default' }) {
  return <div className={`ui-stat ui-stat--${tone}`}><small>{label}</small><b>{value}</b>{hint && <em>{hint}</em>}</div>;
}
