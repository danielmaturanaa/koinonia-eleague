/** Panel de papel con borde y sombra pixel. tone: paper | navy | gold | alert | flat. */
export function Card({ as: Tag = 'section', tone = 'paper', className = '', title, aside, children, ...props }) {
  return <Tag className={`ui-card ui-card--${tone} ${className}`} {...props}>
    {(title || aside) && <header className="ui-card__head">{title && <h3>{title}</h3>}{aside && <div className="ui-card__aside">{aside}</div>}</header>}
    {children}
  </Tag>;
}
