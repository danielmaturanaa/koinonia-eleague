import { useAuth } from '../../app/AuthGate.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { gp } from '../public/DataStates.jsx';

/** Los clubes de la liga como tarjetas grandes con sus colores (el tuyo primero y marcado): escudo, nombre, presidente y valor del plantel. */
export function ClubsGrid({ teams = [] }) {
  const { teamId: mine } = useAuth();
  // El tuyo primero: así "Mi club" está siempre a un toque desde Equipos.
  const clubs = teams.filter(team => team.kind !== 'national_team').sort((a, b) => (b.id === mine) - (a.id === mine));
  if (!clubs.length) return <p className="screen-lead">Todavía no hay clubes.</p>;
  return <div className="clubs-grid">{clubs.map(team => {
    const colors = team.colors ?? {};
    return <a key={team.id} className={`club-tile ${team.id === mine ? 'is-mine' : ''}`} href={`#/equipos/${encodeURIComponent(team.id)}`}
      style={{ '--club-primary': colors.primary ?? '#062764', '--club-secondary': colors.secondary ?? '#0b3f8d' }}>
      {team.id === mine && <em className="club-tile-mine">Tu club</em>}
      <TeamMark team={team} className="club-tile-crest"/>
      <b>{team.name}</b>
      <small>{[team.president?.name ?? team.presidentName, typeof team.squadValue === 'number' ? `plantel ${gp(team.squadValue)}` : null].filter(Boolean).join(' · ')}</small>
    </a>;
  })}</div>;
}
