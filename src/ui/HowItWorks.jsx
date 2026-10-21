/** Explicación plegada ("¿Cómo funciona?"): a la vista queda una frase corta y el detalle se abre si alguien lo busca. */
export function HowItWorks({ title = '¿Cómo funciona?', children, className = '' }) {
  return <details className={`ui-how ${className}`.trim()}>
    <summary>{title}</summary>
    <div className="ui-how-body">{children}</div>
  </details>;
}
