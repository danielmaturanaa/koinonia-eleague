export function TeamMark({ team, className = '' }) {
  return team?.imageUrl
    ? <img className={`team-mark ${className}`} src={team.imageUrl} alt={`Escudo de ${team.name}`}/>
    : <span className={`team-mark emoji-mark ${className}`} aria-label={`Emblema de ${team?.name ?? 'equipo'}`}>{team?.emoji ?? '⚽'}</span>;
}
