import { useAuth } from '../../app/AuthGate.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { gp } from '../public/DataStates.jsx';

/** Los clubes de la liga como tarjetas grandes (el tuyo primero y marcado): escudo, nombre, presidente y valor del plantel.
 * De fondo va la foto de su estadio; sin estadio o sin foto, el degradé con sus colores. */
export function ClubsGrid({ teams = [] }) {
  const { teamId: mine } = useAuth();
  // El tuyo primero: así "Mi club" está siempre a un toque desde Equipos.
  const clubs = teams.filter(team => team.kind !== 'national_team').sort((a, b) => (b.id === mine) - (a.id === mine));
  if (!clubs.length) return <p className="screen-lead">Todavía no hay clubes.</p>;
  return <div className="clubs-grid">{clubs.map(team => {
    const colors = team.colors ?? {};
    const photo = team.stadiumImageUrl;
    return <a key={team.id} className={`club-tile ${team.id === mine ? 'is-mine' : ''} ${photo ? 'has-stadium' : ''}`} href={`#/equipos/${encodeURIComponent(team.id)}`}
      style={{ '--club-primary': colors.primary ?? '#062764', '--club-secondary': colors.secondary ?? '#0b3f8d', ...(photo ? { '--club-stadium': `url(${JSON.stringify(photo)})` } : {}) }}>
      {team.id === mine && <em className="club-tile-mine">Tu club</em>}
      <TeamMark team={team} className="club-tile-crest"/>
      <b>{team.name}</b>
      <small>{[team.president?.name ?? team.presidentName, typeof team.squadValue === 'number' ? `plantel ${gp(team.squadValue)}` : null].filter(Boolean).join(' · ')}</small>
    </a>;
  })}</div>;
}
