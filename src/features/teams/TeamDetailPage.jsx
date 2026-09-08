import { useState } from 'react';
import { TeamMark } from '../../components/TeamMark.jsx';
import { TeamAdminPanel } from '../admin/TeamAdminPanel.jsx';

const gp = value => typeof value === 'number' ? value.toLocaleString('es-CL') : '—';

function PlayerRow({ player }) {
  const flagMatch = player.name?.match(/^(\p{Regional_Indicator}{2})\s*/u);
  const flag = flagMatch?.[1] ?? '';
  const name = flagMatch ? player.name.slice(flagMatch[0].length) : player.name;
  const countryCode = flag ? [...flag].map(character => String.fromCharCode(character.codePointAt(0) - 127397)).join('') : '';
  const suppliedCountry = player.country?.name ?? player.nationality?.name ?? player.countryName ?? (typeof player.nationality === 'string' ? player.nationality : '');
  const country = suppliedCountry || (countryCode ? new Intl.DisplayNames(['es'], { type: 'region' }).of(countryCode) : '—');
  return <div className="roster-row"><b>{String(player.squadOrder ?? '—').padStart(2, '0')}</b><span>{name}</span><span className="player-country">{flag} {country}</span><small>{player.position ?? '—'}</small><strong>{gp(player.gpValue)} GP</strong></div>;
}

function RosterHeader() {
  return <div className="roster-columns" aria-hidden="true"><b>NÚMERO</b><b>NOMBRE</b><b>PAÍS</b><b>POSICIÓN</b><b>VALOR MERCADO</b></div>;
}

const firstText = (...values) => values.find(value => typeof value === 'string' && value.trim());

function presidentPhoto(team) {
  return firstText(team.president?.imageUrl, team.president?.photoUrl, team.president?.avatarUrl, team.president?.pictureUrl, team.presidentImageUrl, team.presidentPhotoUrl);
}

function clubGallery(team) {
  const source = [team.galleryImages, team.gallery, team.images, team.photos].find(Array.isArray) ?? [];
  return source.map((item, index) => typeof item === 'string'
    ? { id: `${item}-${index}`, src: item, alt: `${team.name}, imagen ${index + 1}` }
    : { id: item.id ?? `${item.url ?? item.src}-${index}`, src: item.url ?? item.src ?? item.imageUrl, alt: item.alt ?? item.title ?? `${team.name}, imagen ${index + 1}` })
    .filter(item => item.src);
}

function clubHonours(team, history) {
  const direct = [team.titles, team.honours, team.honors, team.trophies, team.achievements].find(Array.isArray) ?? [];
  const historic = history.filter(item => /champion|campe[oó]n|title|t[ií]tulo|tournament_won/i.test(`${item.type ?? ''} ${item.name ?? ''} ${item.message ?? ''}`));
  const rows = [...direct, ...historic].map((item, index) => {
    if (typeof item === 'string') return { id: `${item}-${index}`, name: item, season: '' };
    return {
      id: item.id ?? `${item.name ?? item.title ?? 'title'}-${index}`,
      name: item.name ?? item.title ?? item.tournament?.name ?? item.competition?.name ?? item.message ?? 'Título oficial',
      season: item.season ?? item.year ?? item.edition ?? item.wonAt?.slice?.(0, 4) ?? '',
    };
  });
  return rows.filter((item, index) => rows.findIndex(candidate => `${candidate.name}-${candidate.season}` === `${item.name}-${item.season}`) === index);
}

export function TeamDetailPage({ team, squad, standings, matches = [], history = [], historyError, loading, onBack, onChanged }) {
  const [showAdmin, setShowAdmin] = useState(false);
  const roster = [...squad].sort((a, b) => (a.squadOrder ?? 999) - (b.squadOrder ?? 999));
  const starters = roster.filter(player => player.section === 'starters' || (!player.section && player.squadOrder <= 11));
  const substitutes = roster.filter(player => player.section === 'substitutes' || (!player.section && player.squadOrder > 11));
  const rank = standings.findIndex(row => row.team_id === team?.id) + 1;
  const record = rank ? standings[rank - 1] : null;
  const photo = team ? presidentPhoto(team) : '';
  const presidentName = team?.president?.name ?? team?.presidentName ?? 'Sin asignar';
  const honours = team ? clubHonours(team, history) : [];
  const gallery = team ? clubGallery(team) : [];

  return <main className="newspaper club-page"><section className="club-paper"><div className="club-actions"><button className="back-button" onClick={onBack}>← VOLVER A EQUIPOS</button>{team && <button className="back-button admin-open" onClick={() => setShowAdmin(true)}>⚙ GESTIONAR EQUIPO</button>}</div>
    {loading || !team ? <div className="arcade-state">CARGANDO FICHA...</div> : <>
      <header className="club-header"><TeamMark team={team} className="club-crest"/><div><p>{team.kind === 'national_team' ? 'SELECCIÓN' : 'CLUB'} · {team.currentDivision ?? 'LIGA DE TRANSICIÓN'}</p><h1>{team.name}</h1><span>PRESIDENTE: {team.president?.name ?? team.presidentName ?? 'SIN ASIGNAR'}</span></div><div className="club-rank"><small>LUGAR EN LA LIGA</small><b>{rank || '—'}°</b><strong>{record?.points ?? '—'} PTS</strong></div></header>
      <div className="club-stats"><span>VALOR PLANTEL <b>{gp(team.squadValue)} GP</b></span><span>PROMEDIO <b>{gp(team.averageValue)} GP</b></span><span>JUGADORES <b>{team.playerCount ?? squad.length}</b></span><span>PARTIDOS <b>{record?.played ?? '—'}</b></span></div>
      <div className="club-columns"><section className="club-info"><h2>PRESIDENTE</h2><div className="president-card">{photo ? <img src={photo} alt={`Foto de ${presidentName}`}/> : <div className="president-photo-placeholder" aria-label={`Foto de ${presidentName} no publicada`}><b>{presidentName.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || '—'}</b><small>FOTO NO PUBLICADA</small></div>}<p><small>REPRESENTANTE DEL CLUB</small><b>{presidentName}</b></p></div><h2>PERFIL DEL CLUB</h2><dl><div><dt>DIRECTOR TÉCNICO</dt><dd>{team.coach?.name ?? team.manager?.name ?? team.coachName ?? team.managerName ?? 'No informado'}</dd></div><div><dt>PRESUPUESTO</dt><dd>{team.budget ?? team.budgetValue ? `${gp(team.budget ?? team.budgetValue)} GP` : 'No informado'}</dd></div><div><dt>PARTIDOS REGISTRADOS</dt><dd>{matches.length}</dd></div></dl></section>
        <section className="roster-panel"><h2>PLANTEL TITULAR <small>{starters.length} / 11</small></h2><RosterHeader/><div className="roster-list">{starters.length ? starters.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay titulares definidos.</p>}</div><h2>SUPLENTES <small>{substitutes.length}</small></h2><RosterHeader/><div className="roster-list substitutes">{substitutes.length ? substitutes.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay suplentes registrados.</p>}</div></section>
      </div>
      <div className="club-lower-sections"><section className="club-lower-panel"><h2>GALERÍA DEL CLUB</h2><div className="club-gallery">{gallery.length ? gallery.map(item => <figure key={item.id}><img src={item.src} alt={item.alt}/></figure>) : <p className="empty-copy">GALERÍA SIN IMÁGENES PUBLICADAS.</p>}</div></section><section className="club-lower-panel honours-panel"><h2>PALMARÉS</h2><div className="honours-list">{honours.length ? honours.map(item => <article key={item.id}><span aria-hidden="true">★</span><b>{item.name}</b>{item.season && <small>{item.season}</small>}</article>) : <p className="empty-copy">AÚN NO HAY TÍTULOS REGISTRADOS.</p>}</div></section></div>
    </>}{showAdmin && team && <div className="admin-drawer"><button className="drawer-close" onClick={() => setShowAdmin(false)} aria-label="Cerrar gestión">×</button><TeamAdminPanel team={team} squad={squad} onChanged={onChanged}/></div>}
  </section></main>;
}
