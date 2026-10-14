import { endpoints } from '../api/endpoints.js';
import { useApiQuery } from '../features/public/useApiQuery.js';
import { EntityLink } from './EntityLink.jsx';
import { TeamMark } from './TeamMark.jsx';

// "Koinonia E-League v6" -> "v6"; "Liga de Transición" -> "LT"; otro torneo -> iniciales.
export function starLabel(name = '') {
  const edition = /\bv\s*(\d+)\s*$/i.exec(name);
  if (edition) return { text: `v${edition[1]}`, order: Number(edition[1]) };
  if (/transici[oó]n/i.test(name)) return { text: 'LT', order: 0 };
  const initials = name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 3).toUpperCase();
  return { text: initials || '★', order: 1000 };
}

export function buildShowcase(clubs, titleLists) {
  return clubs.map((club, index) => ({
    club,
    stars: (titleLists[index] ?? []).map(title => ({ id: title.id, name: title.name, ...starLabel(title.name) }))
      .sort((a, b) => a.order - b.order || String(a.name).localeCompare(b.name)),
  })).filter(row => row.stars.length)
    .sort((a, b) => b.stars.length - a.stars.length || a.club.name.localeCompare(b.club.name));
}

// Vitrina del inicio: cada campeón con una estrella por título (LT, v1, v2…).
export function TrophyCase({ teams = [] }) {
  const clubs = teams.filter(team => team.kind === 'club' || team.kind == null);
  const key = clubs.map(team => team.id).join(',');
  const titles = useApiQuery(signal => Promise.all(clubs.map(club =>
    endpoints.teamTitles(club.id, signal).then(response => response?.data ?? []).catch(() => []),
  )).then(data => ({ data })), [key]);
  const rows = Array.isArray(titles.data) ? buildShowcase(clubs, titles.data) : [];
  if (!rows.length) return null;
  return <section className="score-panel trophy-panel"><h2>VITRINA <small>CAMPEONES</small></h2>
    <ul className="trophy-list">{rows.map(({ club, stars }) => <li key={club.id}>
      <EntityLink to="team" id={club.id} className="trophy-team"><TeamMark team={club}/><span>{club.name}</span></EntityLink>
      <span className="trophy-stars" aria-label={`${stars.length} título${stars.length === 1 ? '' : 's'}`}>{stars.map(star =>
        <span key={star.id} className="trophy-star" title={star.name}><i aria-hidden="true">★</i><small>{star.text}</small></span>)}</span>
    </li>)}</ul>
  </section>;
}
