import { TeamMark } from '../../components/TeamMark.jsx';
import { gp } from '../public/DataStates.jsx';

/** Los clubes de la liga como tarjetas grandes con sus colores: escudo, nombre, presidente y valor del plantel. */
export function ClubsGrid({ teams = [] }) {
  const clubs = teams.filter(team => team.kind !== 'national_team');
  if (!clubs.length) return <p className="screen-lead">Todavía no hay clubes.</p>;
  return <div className="clubs-grid">{clubs.map(team => {
    const colors = team.colors ?? {};
    return <a key={team.id} className="club-tile" href={`#/equipos/${encodeURIComponent(team.id)}`}
      style={{ '--club-primary': colors.primary ?? '#062764', '--club-secondary': colors.secondary ?? '#0b3f8d' }}>
      <TeamMark team={team} className="club-tile-crest"/>
      <b>{team.name}</b>
      <small>{[team.president?.name ?? team.presidentName, typeof team.squadValue === 'number' ? `plantel ${gp(team.squadValue)}` : null].filter(Boolean).join(' · ')}</small>
    </a>;
  })}</div>;
}
