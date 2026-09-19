import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { EntityLink } from '../../components/EntityLink.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { defaultFormationPositions, pitchPositionFor } from '../../utils/formationPositions.js';
import { teamBalance, teamCoachName, teamCoachPhoto } from '../../utils/teamPresentation.js';
import { readPersonProfile } from '../../utils/personProfile.js';
import { matchRoundLabel } from '../../utils/matchPresentation.js';
import { BudgetForm, CoachForm, FormationEditor, PresidentForm, ProfileForm, SquadEditor } from '../admin/TeamAdminPanel.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { useApiQuery } from '../public/useApiQuery.js';

const gp = value => typeof value === 'number' ? value.toLocaleString('es-CL') : '—';
const FLAG_REGEX = /^(\p{Regional_Indicator}{2})\s*/u;

function splitPlayerName(name) {
  const match = name?.match(FLAG_REGEX);
  const flag = match ? match[1] : '';
  const rest = (match ? name.slice(match[0].length) : (name ?? '')).trim();
  return { flag, rest };
}

function PlayerRow({ player }) {
  const { rest: name } = splitPlayerName(player.name);
  return <button type="button" className="roster-row roster-player-link" onClick={() => { window.location.hash = `/jugadores/${encodeURIComponent(player.id)}`; }}><b>{player.jerseyNumber ?? '—'}</b><span><PlayerFace src={player.faceUrl} name={name} className="roster-player-face"/><i>{player.flag && <em className="player-flag">{player.flag}</em>}{name}</i></span><small>{player.position ?? '—'}</small><strong>{gp(player.gpValue)} GP</strong></button>;
}

function RosterHeader() {
  return <div className="roster-columns" aria-hidden="true"><b>NÚMERO</b><b>NOMBRE</b><b>POSICIÓN</b><b>VALOR MERCADO</b></div>;
}

function ClubMatchRow({ match, resolveTeam, teamId }) {
  const finished = match.status === 'finished';
  const won = finished && match.winnerTeamId === teamId;
  const lost = finished && match.winnerTeamId && match.winnerTeamId !== teamId;
  return <EntityLink to="match" id={match.id} className={`club-match-row ${won ? 'won' : lost ? 'lost' : finished ? 'drawn' : ''}`}>
    <small>{match.tournament?.name ?? 'TORNEO'} · {matchRoundLabel(match, { leagueRound: 'JORNADA' })}</small>
    <div><span><TeamMark team={resolveTeam(match.homeTeam)}/><b>{match.homeTeam?.name ?? 'LOCAL'}</b></span><strong>{finished ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : 'VS'}</strong><span><b>{match.awayTeam?.name ?? 'VISITA'}</b><TeamMark team={resolveTeam(match.awayTeam)}/></span></div>
  </EntityLink>;
}

const CLUB_MATCH_LIMIT = 5;

function ClubMatches({ matches, teams, teamId }) {
  const [showAll, setShowAll] = useState(false);
  const teamIndex = new Map(teams.map(team => [team.id, team]));
  const resolveTeam = matchTeam => matchTeam
    ? { ...matchTeam, ...(teamIndex.get(matchTeam.id ?? matchTeam.team_id) ?? {}) }
    : matchTeam;
  const upcoming = matches
    .filter(match => match.status === 'pending' || match.status === 'live')
    .sort((left, right) => (left.roundNumber ?? Number.MAX_SAFE_INTEGER) - (right.roundNumber ?? Number.MAX_SAFE_INTEGER) || (left.tournament?.name ?? '').localeCompare(right.tournament?.name ?? '', 'es'));
  const played = matches
    .filter(match => match.status === 'finished')
    .sort((left, right) => String(right.finishedAt ?? '').localeCompare(String(left.finishedAt ?? '')));
  const visibleUpcoming = showAll ? upcoming : upcoming.slice(0, CLUB_MATCH_LIMIT);
  const visiblePlayed = showAll ? played : played.slice(0, CLUB_MATCH_LIMIT);
  return <div className="club-matches">
    <section><h3>PRÓXIMOS <small>{upcoming.length}</small></h3>{visibleUpcoming.length ? visibleUpcoming.map(match => <ClubMatchRow match={match} resolveTeam={resolveTeam} teamId={teamId} key={match.id}/>) : <p className="empty-copy">SIN PARTIDOS PROGRAMADOS.</p>}</section>
    <section><h3>ÚLTIMOS RESULTADOS <small>{played.length}</small></h3>{visiblePlayed.length ? visiblePlayed.map(match => <ClubMatchRow match={match} resolveTeam={resolveTeam} teamId={teamId} key={match.id}/>) : <p className="empty-copy">AÚN NO JUEGA PARTIDOS.</p>}</section>
    {(upcoming.length > CLUB_MATCH_LIMIT || played.length > CLUB_MATCH_LIMIT) && <button type="button" className="club-more-button" onClick={() => setShowAll(value => !value)}>{showAll ? 'MOSTRAR MENOS' : 'VER TODOS LOS PARTIDOS'}</button>}
  </div>;
}

const firstText = (...values) => values.find(value => typeof value === 'string' && value.trim());

function presidentPhoto(team) {
  return firstText(team.president?.imageUrl, team.president?.photoUrl, team.president?.avatarUrl, team.president?.pictureUrl, team.presidentImageUrl, team.presidentPhotoUrl);
}

function PersonPhoto({ photo, name }) {
  return photo ? <img src={photo} alt={`Foto de ${name}`}/> : <div className="president-photo-placeholder" aria-label={`Foto de ${name} no publicada`}><b>{name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || '—'}</b><small>FOTO NO PUBLICADA</small></div>;
}

function LeaderCard({ photo, name, age, country, customFields = [], role, onEdit }) {
  return <article className="club-leader-card"><PersonPhoto photo={photo} name={name}/><div><small>{role}</small><h3>{name}</h3><dl><div><dt>EDAD</dt><dd>{age || '—'}</dd></div><div><dt>PAÍS</dt><dd>{country || '—'}</dd></div>{customFields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{field.value || '—'}</dd></div>)}</dl><button type="button" className="club-inline-edit" onClick={onEdit}>✎ EDITAR</button></div></article>;
}

function PersonEditorModal({ title, onClose, children }) {
  useEffect(() => {
    const closeWithEscape = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, [onClose]);
  return <div className="person-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="person-modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar editor">×</button></header>{children}</section></div>;
}

function clubHonours(team, history) {
  const direct = (team.titles ?? []).filter(item => item?.sourceType ?? item?.source_type);
  return direct.map((item, index) => {
    return {
      id: item.id ?? `${item.name ?? item.title ?? 'title'}-${index}`,
      name: item.name ?? item.title ?? item.tournament?.name ?? item.competition?.name ?? item.message ?? 'Título oficial',
      season: item.season ?? item.year ?? item.edition ?? item.wonAt?.slice?.(0, 4) ?? '',
      sourceType: item.sourceType ?? item.source_type ?? null,
    };
  }).filter((item, index, rows) => rows.findIndex(candidate => `${candidate.name}-${candidate.season}` === `${item.name}-${item.season}`) === index);
}

function publishedHistoryFor(team) {
  return {
    review: team?.review?.trim() || 'RESEÑA HISTÓRICA PENDIENTE DE PUBLICACIÓN.',
    anthemLyrics: team?.anthemLyrics?.trim() || 'LETRA DEL HIMNO PENDIENTE DE PUBLICACIÓN.',
    anthemUrl: team?.anthemUrl?.trim() || '',
  };
}

function SquadPitch({ starters }) {
  if (!starters.length) return <div className="club-pitch club-pitch-empty"><p className="empty-copy">NO HAY TITULARES DEFINIDOS.</p></div>;
  const defaults = defaultFormationPositions(starters);
  return <div className="club-pitch">
    {starters.map(player => {
      const { x, y } = pitchPositionFor(player, defaults);
      const { flag, rest: name } = splitPlayerName(player.name);
      return <button type="button" className="club-pitch-player" style={{ left: `${x}%`, top: `${y}%` }} key={player.id} onClick={() => { window.location.hash = `/jugadores/${encodeURIComponent(player.id)}`; }} aria-label={`Ver ficha de ${name}`}>
        <PlayerFace src={player.faceUrl} name={name} className="club-pitch-face"/><span className="club-pitch-name"><b>{player.jerseyNumber ?? '–'}</b>{flag && <i className="club-pitch-flag">{flag}</i>} {name}</span>
      </button>;
    })}
  </div>;
}

function TeamCoversModal({ team, onClose, onChanged }) {
  const covers = useApiQuery(signal => endpoints.teamCovers(team.id, signal), [team.id]);
  const upload = useApiMutation(async (file, signal) => {
    const asset = await endpoints.uploadImage(file, { entityType: 'team', entityId: team.id }, signal);
    return endpoints.addTeamCover(team.id, { imageUrl: asset?.data?.secureUrl ?? asset?.secureUrl, assetId: asset?.data?.id ?? asset?.id }, signal);
  }, { onSuccess: () => { covers.retry(); onChanged?.(); } });
  const remove = useApiMutation((coverId, signal) => endpoints.removeTeamCover(team.id, coverId, signal), { onSuccess: () => { covers.retry(); onChanged?.(); } });
  const rows = covers.data ?? [];
  return <PersonEditorModal title={`PORTADAS · ${team.name}`} onClose={onClose}><div className="team-covers-manager"><label>SUBIR PORTADA<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={upload.loading} onChange={event => { const file = event.target.files?.[0]; if (file) upload.execute(file); }}/></label><small>Quitarla evita que se elija en noticias futuras; las ya publicadas conservan su imagen.</small><FormFeedback mutation={upload}/>{covers.loading ? <p>CARGANDO PORTADAS…</p> : <div className="team-covers-grid">{rows.length ? rows.map(cover => <figure key={cover.id}><img src={cover.imageUrl} alt="Portada del equipo"/><button type="button" disabled={remove.loading} onClick={() => remove.execute(cover.id)}>QUITAR</button></figure>) : <p>SIN PORTADAS.</p>}</div>}<FormFeedback mutation={remove}/></div></PersonEditorModal>;
}

function ClubHistory({ team, onEdit }) {
  const content = publishedHistoryFor(team);
  const stanzas = content.anthemLyrics.split(/\n{2,}/);
  const [expanded, setExpanded] = useState(false);
  const longReview = content.review.length > 900;
  return <div className="club-history">
    <article className="club-history-review"><header><h3>RESEÑA HISTÓRICA</h3><button type="button" className="club-inline-edit" onClick={() => onEdit('review')}>✎ EDITAR</button></header><p className={longReview && !expanded ? 'clamped' : ''}>{content.review}</p>{longReview && <button type="button" className="club-more-button" onClick={() => setExpanded(value => !value)}>{expanded ? 'MOSTRAR MENOS' : 'LEER RESEÑA COMPLETA'}</button>}</article>
    <aside className="club-history-anthem"><header><h3>HIMNO DEL CLUB</h3><button type="button" className="club-inline-edit" onClick={() => onEdit('anthem')}>✎ EDITAR</button></header>{content.anthemUrl ? <audio controls preload="metadata" src={content.anthemUrl}/> : <p className="empty-copy">AUDIO PENDIENTE DE PUBLICACIÓN.</p>}<details><summary>VER LETRA</summary><div className="anthem-lyrics">{stanzas.map((stanza, index) => <p key={index}>{stanza}</p>)}</div></details></aside>
  </div>;
}

function ReviewEditor({ team, onChanged, onSaved }) {
  const initialReview = team?.review ?? '';
  const [review, setReview] = useState(initialReview);
  useEffect(() => setReview(initialReview), [team?.id, initialReview]);
  const mutation = useApiMutation((body, signal) => endpoints.updateTeamHistory(team.id, body, signal), { onSuccess: () => { onChanged(); onSaved?.(); } });
  const submit = event => { event.preventDefault(); mutation.execute({ review }); };
  return <form className="club-review-editor" onSubmit={submit}>
    <label>RESEÑA HISTÓRICA<textarea value={review} onChange={event => setReview(event.target.value)} placeholder="Describe la fundación, identidad, hitos y evolución histórica del club."/></label>
    <button className="action-button" disabled={mutation.loading}>GUARDAR RESEÑA</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function AnthemEditor({ team, onChanged, onSaved }) {
  const initialLyrics = team?.anthemLyrics ?? '';
  const initialUrl = team?.anthemUrl ?? '';
  const [anthemLyrics, setAnthemLyrics] = useState(initialLyrics);
  const [anthemUrl, setAnthemUrl] = useState(initialUrl);
  const [preview, setPreview] = useState('');
  useEffect(() => { setAnthemLyrics(initialLyrics); setAnthemUrl(initialUrl); setPreview(''); }, [team?.id, initialLyrics, initialUrl]);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const upload = useApiMutation((file, signal) => endpoints.uploadAudio(file, { entityType: 'team', entityId: team.id }, signal), {
    onSuccess: response => setAnthemUrl(response?.data?.secureUrl ?? response?.secureUrl ?? ''),
  });
  const mutation = useApiMutation((body, signal) => endpoints.updateTeamHistory(team.id, body, signal), { onSuccess: () => { onChanged(); onSaved?.(); } });

  const selectAnthem = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(current => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    upload.execute(file);
  };
  const submit = event => { event.preventDefault(); mutation.execute({ anthemLyrics, anthemUrl }); };

  return <form className="club-anthem-editor" onSubmit={submit}>
    <div className="club-anthem-audio">
      <label>ARCHIVO DEL HIMNO<input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4" disabled={upload.loading} onChange={selectAnthem}/></label>
      {(preview || anthemUrl) ? <audio controls preload="metadata" src={preview || anthemUrl}/> : <p className="empty-copy">SELECCIONA UN ARCHIVO PARA ESCUCHAR LA VISTA PREVIA.</p>}
      <FormFeedback mutation={upload}/>
    </div>
    <label>LETRA DEL HIMNO<textarea value={anthemLyrics} onChange={event => setAnthemLyrics(event.target.value)} placeholder="Escribe aquí la letra completa del himno."/></label>
    <button className="action-button" disabled={mutation.loading || upload.loading}>GUARDAR HIMNO Y LETRA</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

const SECTIONS = [['plantel', 'PLANTEL'], ['partidos', 'PARTIDOS'], ['directiva', 'DIRECTIVA'], ['palmares', 'PALMARÉS'], ['historia', 'HISTORIA'], ['gestion', 'GESTIÓN']];

function jumpTo(id) {
  document.getElementById(`club-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function TeamDetailPage({ team, teams = [], squad, standings, matches = [], history = [], historyError, loading, onBack, onChanged }) {
  const [historyEditor, setHistoryEditor] = useState('');
  const [personEditor, setPersonEditor] = useState('');
  const [personRevision, setPersonRevision] = useState(0);
  const [crestEditorOpen, setCrestEditorOpen] = useState(false);
  const [coversOpen, setCoversOpen] = useState(false);
  const roster = [...squad].sort((a, b) => (a.squadOrder ?? 999) - (b.squadOrder ?? 999));
  const starters = roster.filter(player => player.section === 'starters' || (!player.section && player.squadOrder <= 11));
  const substitutes = roster.filter(player => player.section === 'substitutes' || (!player.section && player.squadOrder > 11));
  const rank = standings.findIndex(row => row.team_id === team?.id) + 1;
  const standing = standings.find(row => row.team_id === team?.id);
  const photo = team ? presidentPhoto(team) : '';
  const presidentName = team?.president?.name ?? team?.presidentName ?? 'Sin asignar';
  const coachName = teamCoachName(team);
  const managerPhoto = team ? teamCoachPhoto(team) : '';
  const presidentProfile = readPersonProfile('president', team?.president);
  const coachEntity = team?.coach ?? team?.manager ?? ((team?.coachId ?? team?.managerId) ? { id: team.coachId ?? team.managerId } : null);
  const coachProfile = readPersonProfile('coach', coachEntity);
  const honours = team ? clubHonours(team, history) : [];
  const balance = teamBalance(team);

  return <main className="newspaper club-page"><section className="club-paper"><div className="club-actions"><button className="back-button" onClick={onBack}>← VOLVER A EQUIPOS</button><button className="action-button club-covers-button" onClick={() => setCoversOpen(true)}>▣ PORTADAS</button></div>
    {loading || !team ? <div className="arcade-state">CARGANDO FICHA...</div> : <>
      <header className="club-header"><div className="club-crest-wrap"><TeamMark team={team} className="club-crest"/><button type="button" className="club-crest-edit" onClick={() => setCrestEditorOpen(true)} aria-label="Editar escudo y nombre del club" title="Editar escudo y nombre">✎</button></div><div><p>{team.kind === 'national_team' ? 'SELECCIÓN' : 'CLUB'}{team.currentDivision ? ` · ${team.currentDivision}` : ''}</p><h1>{team.name}</h1><span>PRESIDENTE: {presidentName} · DT: {coachName}</span></div><div className="club-rank"><small>LUGAR EN LA LIGA</small><b>{rank || '—'}°</b></div></header>
      <dl className="club-stats">
        <div><dt>PUNTOS</dt><dd>{standing?.points ?? '—'}</dd><small>{standing ? `${standing.wins}G · ${standing.draws}E · ${standing.losses}P` : 'SIN PARTIDOS'}</small></div>
        <div><dt>GOLES</dt><dd>{standing ? `${standing.gf} : ${standing.ga}` : '—'}</dd><small>{standing ? `DIFERENCIA ${standing.gd > 0 ? '+' : ''}${standing.gd}` : 'A FAVOR : EN CONTRA'}</small></div>
        <div><dt>VALOR PLANTEL</dt><dd>{gp(team.squadValue)}</dd><small>GP · {team.playerCount ?? squad.length} JUGADORES</small></div>
        <div><dt>SALDO</dt><dd>{balance === null ? '—' : gp(balance)}</dd><small>GP DISPONIBLES</small></div>
        <div><dt>TÍTULOS</dt><dd>{honours.length}</dd><small>PALMARÉS OFICIAL</small></div>
      </dl>
      <nav className="club-section-nav" aria-label="Secciones del club">{SECTIONS.map(([id, label]) => <button type="button" key={id} onClick={() => jumpTo(id)}>{label}</button>)}</nav>

      <section className="club-section" id="club-plantel"><h2>PLANTEL</h2><div className="club-squad-layout">
        <div className="club-squad-pitch"><h3>TITULARES EN CANCHA</h3><SquadPitch starters={starters}/></div>
        <div className="roster-panel club-roster"><h3>TITULARES <small>{starters.length} / 11</small></h3><RosterHeader/><div className="roster-list">{starters.length ? starters.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay titulares definidos.</p>}</div><h3>SUPLENTES <small>{substitutes.length}</small></h3><div className="roster-list substitutes">{substitutes.length ? substitutes.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay suplentes registrados.</p>}</div></div>
      </div></section>

      <section className="club-section" id="club-partidos"><h2>PARTIDOS</h2><ClubMatches matches={matches} teams={teams} teamId={team.id}/></section>

      <section className="club-section" id="club-directiva"><h2>DIRECTIVA</h2><div className="club-leaders">
        <LeaderCard key={`president-${personRevision}`} photo={photo} name={presidentName} age={presidentProfile.age} country={presidentProfile.country} customFields={team.president?.customFields} role="PRESIDENTE" onEdit={() => setPersonEditor('president')}/>
        <LeaderCard key={`coach-${personRevision}`} photo={managerPhoto} name={coachName} age={coachProfile.age} country={coachProfile.country} customFields={team.coach?.customFields} role="DIRECTOR TÉCNICO" onEdit={() => setPersonEditor('coach')}/>
      </div></section>

      <section className="club-section" id="club-palmares"><h2>PALMARÉS <small>ACTUALIZADO AUTOMÁTICAMENTE POR LOS TORNEOS</small></h2><div className="honours-list">{honours.length ? honours.map(item => <article key={item.id}><span aria-hidden="true">★</span><b>{item.name}</b>{item.season && <small>{item.season}</small>}</article>) : <p className="empty-copy">AÚN NO HAY TÍTULOS REGISTRADOS.</p>}</div>{historyError && <p className="honours-api-note">NO FUE POSIBLE CONSULTAR EL HISTORIAL DEL CLUB.</p>}</section>

      <section className="club-section" id="club-historia"><h2>HISTORIA</h2><ClubHistory team={team} onEdit={setHistoryEditor}/></section>

      <section className="club-section club-management" id="club-gestion"><h2>GESTIÓN DEL CLUB <small>HERRAMIENTAS DE ADMINISTRACIÓN</small></h2>
        <details><summary>FORMACIÓN EN CANCHA</summary><div className="club-formation-tab"><FormationEditor team={team} squad={squad} onChanged={onChanged}/></div></details>
        <details><summary>EDITAR PLANTEL</summary><div className="club-squad-editor"><SquadEditor team={team} squad={squad} onChanged={onChanged}/></div></details>
        <details><summary>FINANZAS · SALDO {balance === null ? '—' : `${gp(balance)} GP`}</summary><div className="club-budget-tab"><div className="club-finance-stats"><span>SALDO DISPONIBLE <b>{balance === null ? '—' : `${gp(balance)} GP`}</b></span><span>VALOR PLANTEL <b>{gp(team.squadValue)} GP</b></span><span>PROMEDIO <b>{gp(team.averageValue)} GP</b></span></div><BudgetForm team={team} onChanged={onChanged}/></div></details>
      </section>

      {personEditor === 'president' && <PersonEditorModal title="EDITAR PRESIDENTE" onClose={() => setPersonEditor('')}><PresidentForm team={team} onChanged={onChanged} onSaved={() => { setPersonRevision(value => value + 1); setPersonEditor(''); }}/></PersonEditorModal>}
      {personEditor === 'coach' && <PersonEditorModal title="EDITAR DIRECTOR TÉCNICO" onClose={() => setPersonEditor('')}><CoachForm team={team} onChanged={onChanged} onSaved={() => { setPersonRevision(value => value + 1); setPersonEditor(''); }}/></PersonEditorModal>}
      {crestEditorOpen && <PersonEditorModal title="EDITAR ESCUDO Y NOMBRE" onClose={() => setCrestEditorOpen(false)}><ProfileForm team={team} onChanged={onChanged} onSaved={() => setCrestEditorOpen(false)}/></PersonEditorModal>}
      {coversOpen && <TeamCoversModal team={team} onClose={() => setCoversOpen(false)} onChanged={onChanged}/>}
      {historyEditor === 'review' && <PersonEditorModal title="EDITAR RESEÑA HISTÓRICA" onClose={() => setHistoryEditor('')}><ReviewEditor team={team} onChanged={onChanged} onSaved={() => setHistoryEditor('')}/></PersonEditorModal>}
      {historyEditor === 'anthem' && <PersonEditorModal title="EDITAR HIMNO Y LETRA" onClose={() => setHistoryEditor('')}><AnthemEditor team={team} onChanged={onChanged} onSaved={() => setHistoryEditor('')}/></PersonEditorModal>}
    </>}
  </section></main>;
}
