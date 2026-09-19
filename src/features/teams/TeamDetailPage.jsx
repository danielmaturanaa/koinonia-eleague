import { useEffect, useRef, useState } from 'react';
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
import { loadAllPlayers } from '../public/MarketPage.jsx';
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

// Resultado desde el marcador; winnerTeamId solo decide empates definidos por penales.
const resultFor = (match, teamId) => {
  if (match.status !== 'finished') return null;
  const own = match.homeTeam?.id === teamId ? match.homeScore : match.awayScore;
  const rival = match.homeTeam?.id === teamId ? match.awayScore : match.homeScore;
  if (own !== rival) return own > rival ? 'G' : 'P';
  if (!match.winnerTeamId) return 'E';
  return match.winnerTeamId === teamId ? 'G' : 'P';
};

function ClubMatchRow({ match, resolveTeam, teamId }) {
  const finished = match.status === 'finished';
  const result = resultFor(match, teamId);
  return <EntityLink to="match" id={match.id} className={`club-match-row ${{ G: 'won', P: 'lost', E: 'drawn' }[result] ?? ''}`}>
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

const TABS = [['resumen', 'RESUMEN'], ['plantel', 'PLANTEL'], ['partidos', 'PARTIDOS'], ['tabla', 'TABLA'], ['fichajes', 'FICHAJES'], ['historia', 'HISTORIA'], ['finanzas', 'FINANZAS']];

const finishedMatches = (matches, teamId) => matches
  .filter(match => match.status === 'finished' && (match.homeTeam?.id === teamId || match.awayTeam?.id === teamId))
  .sort((left, right) => String(right.finishedAt ?? '').localeCompare(String(left.finishedAt ?? '')));

function FormPills({ matches, teamId }) {
  const recent = finishedMatches(matches, teamId).slice(0, 5).reverse();
  if (!recent.length) return null;
  return <div className="club-form" aria-label="Racha de los últimos partidos">{recent.map(match => {
    const result = resultFor(match, teamId);
    return <EntityLink to="match" id={match.id} key={match.id} className={`club-form-pill form-${result}`} title={`${match.homeTeam?.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam?.name}`}>{result}</EntityLink>;
  })}</div>;
}

function ClubTable({ standings, teamId, teams }) {
  const teamIndex = new Map(teams.map(team => [team.id, team]));
  if (!standings.length) return <p className="empty-copy">SIN TABLA PUBLICADA.</p>;
  return <div className="table-scroll"><table className="league-table club-league-table"><thead><tr><th>#</th><th>EQUIPO</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>PTS</th></tr></thead><tbody>{standings.map((row, index) => <tr key={row.team_id} className={row.team_id === teamId ? 'current-team' : ''}><td>{index + 1}</td><td><EntityLink to="team" id={row.team_id} className="table-team-link"><TeamMark team={{ ...row, ...(teamIndex.get(row.team_id) ?? {}) }}/>{row.name}</EntityLink></td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td><td><b>{row.points}</b></td></tr>)}</tbody></table></div>;
}

const MOVE_LABELS = { purchase: 'COMPRA', assignment: 'ASIGNADO', transfer: 'TRASPASO', release: 'LIBERADO', trade: 'TRUEQUE' };

function moveDetail(move) {
  const other = move.otherTeam ? <EntityLink to="team" id={move.otherTeam.id}>{move.otherTeam.name}</EntityLink> : null;
  if (move.type === 'purchase') return move.origin === 'new' ? 'INSCRITO DESDE eFOOTBALLDB' : 'AGENTE LIBRE DE LA LIGA';
  if (move.type === 'assignment') return 'ASIGNADO SIN COSTO';
  if (move.type === 'release') return 'QUEDA COMO AGENTE LIBRE';
  if (move.type === 'trade') return <>A CAMBIO DE <EntityLink to="player" id={move.givenPlayer?.id}>{move.givenPlayer?.name}</EntityLink> · CON {other}</>;
  return <>{move.direction === 'in' ? 'DESDE' : 'HACIA'} {other}</>;
}

function moveAmount(move) {
  if (move.type === 'trade') return move.gpPaid ? `PAGA ${gp(move.gpPaid)} GP` : move.gpReceived ? `RECIBE ${gp(move.gpReceived)} GP` : 'SIN GP';
  if (move.type === 'release') return `RECIBE ${gp(move.gpAmount)} GP`;
  if (move.type === 'assignment') return 'SIN COSTO';
  return `${gp(move.gpAmount)} GP`;
}

function ClubTransfers({ teamId }) {
  const moves = useApiQuery(signal => endpoints.teamMoves(teamId, signal), [teamId]);
  const rows = Array.isArray(moves.data) ? moves.data : [];
  if (moves.loading) return <p className="empty-copy">CARGANDO FICHAJES…</p>;
  if (moves.error) return <p className="empty-copy">NO SE PUDIERON CARGAR LOS FICHAJES.</p>;
  if (!rows.length) return <p className="empty-copy">ESTE CLUB AÚN NO REGISTRA MOVIMIENTOS.</p>;
  const spent = rows.reduce((sum, move) => sum + (move.direction === 'in' && move.type !== 'trade' ? move.gpAmount ?? 0 : 0) + (move.type === 'trade' ? move.gpPaid ?? 0 : 0), 0);
  const earned = rows.reduce((sum, move) => sum + (move.direction === 'out' ? move.gpAmount ?? 0 : 0) + (move.type === 'trade' ? move.gpReceived ?? 0 : 0), 0);
  return <>
    <p className="club-transfer-balance">INVERTIDO <b>{gp(spent)} GP</b> · RECIBIDO <b>{gp(earned)} GP</b></p>
    <div className="club-transfers">{rows.map(move => <article key={move.id} className={`move-${move.type} move-${move.direction}`}>
      <b className="club-transfer-kind">{move.type === 'transfer' ? (move.direction === 'in' ? 'LLEGA' : 'SALE') : MOVE_LABELS[move.type]}</b>
      <span><EntityLink to="player" id={move.player?.id}>{move.player?.name ?? 'JUGADOR'}</EntityLink><small>{moveDetail(move)}{move.date ? ` · ${formatMoveDate(move.date)}` : ''}</small></span>
      <strong>{moveAmount(move)}</strong>
    </article>)}</div>
  </>;
}

const formatMoveDate = value => {
  const date = new Date(String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
};

const UPCOMING_STEP = 5;

function UpcomingMatches({ matches, resolveTeam, teamId }) {
  const [visible, setVisible] = useState(UPCOMING_STEP);
  const upcoming = matches
    .filter(match => match.status === 'pending' || match.status === 'live')
    .sort((left, right) => (left.status === 'live' ? -1 : 0) - (right.status === 'live' ? -1 : 0) || (left.roundNumber ?? Number.MAX_SAFE_INTEGER) - (right.roundNumber ?? Number.MAX_SAFE_INTEGER));
  return <section className="club-card"><h3>PRÓXIMOS PARTIDOS <small>{upcoming.length}</small></h3>
    {upcoming.length ? <div className="club-match-list">{upcoming.slice(0, visible).map(match => <ClubMatchRow match={match} resolveTeam={resolveTeam} teamId={teamId} key={match.id}/>)}</div> : <p className="empty-copy">SIN PARTIDOS PROGRAMADOS.</p>}
    {upcoming.length > visible && <button type="button" className="club-more-button" onClick={() => setVisible(value => value + UPCOMING_STEP)}>MOSTRAR {Math.min(UPCOMING_STEP, upcoming.length - visible)} MÁS</button>}
  </section>;
}

function ClubScorers({ teamId }) {
  const scorers = useApiQuery(signal => endpoints.teamScorers(teamId, {}, signal), [teamId]);
  const rows = (Array.isArray(scorers.data) ? scorers.data : []).slice(0, 5);
  return <section className="club-card"><h3>GOLEADORES <small>TORNEOS ACTIVOS</small></h3>
    {scorers.loading ? <p className="empty-copy">CARGANDO…</p> : scorers.error ? <p className="empty-copy">NO DISPONIBLE.</p> : rows.length ? <ol className="club-scorers">{rows.map((row, index) => <li key={row.playerId}><b>{index + 1}</b><PlayerFace src={row.faceUrl} name={row.name}/><EntityLink to="player" id={row.playerId}>{row.name}</EntityLink><strong>{row.goals} <small>GOL{row.goals === 1 ? '' : 'ES'}</small></strong></li>)}</ol> : <p className="empty-copy">AÚN SIN GOLES EN TORNEOS ACTIVOS.</p>}
  </section>;
}

function HonoursList({ honours, historyError }) {
  return <section className="club-card"><h3>PALMARÉS <small>{honours.length} TÍTULO{honours.length === 1 ? '' : 'S'}</small></h3>{honours.length ? <div className="honours-list">{honours.map(item => <article key={item.id}><span aria-hidden="true">★</span><b>{item.name}</b>{item.season && <small>{item.season}</small>}</article>)}</div> : <p className="empty-copy">AÚN NO HAY TÍTULOS REGISTRADOS.</p>}{historyError && <p className="honours-api-note">NO FUE POSIBLE CONSULTAR EL HISTORIAL DEL CLUB.</p>}</section>;
}

function SquadTab({ team, squad, starters, substitutes, onChanged }) {
  const [mode, setMode] = useState('view');
  return <div className="club-squad-tab">
    <nav className="club-squad-modes" aria-label="Acciones del plantel">{[['view', 'VER PLANTEL'], ['formation', 'EDITAR FORMACIÓN'], ['edit', 'EDITAR PLANTEL']].map(([id, label]) => <button type="button" key={id} className={mode === id ? 'active' : ''} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</nav>
    {mode === 'view' && <div className="club-squad-layout">
      <div className="club-squad-pitch"><h3>TITULARES EN CANCHA</h3><SquadPitch starters={starters}/></div>
      <div className="roster-panel club-roster"><h3>TITULARES <small>{starters.length} / 11</small></h3><RosterHeader/><div className="roster-list">{starters.length ? starters.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay titulares definidos.</p>}</div><h3>SUPLENTES <small>{substitutes.length}</small></h3><div className="roster-list substitutes">{substitutes.length ? substitutes.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay suplentes registrados.</p>}</div></div>
    </div>}
    {mode === 'formation' && <div className="club-formation-tab"><FormationEditor team={team} squad={squad} onChanged={onChanged}/></div>}
    {mode === 'edit' && <div className="club-squad-editor"><SquadEditor team={team} squad={squad} onChanged={onChanged}/></div>}
  </div>;
}

export function TeamDetailPage({ team, teams = [], squad, standings, matches = [], history = [], historyError, loading, tab = 'resumen', onTab, onBack, onChanged }) {
  const [historyEditor, setHistoryEditor] = useState('');
  const [personEditor, setPersonEditor] = useState('');
  const [personRevision, setPersonRevision] = useState(0);
  const [crestEditorOpen, setCrestEditorOpen] = useState(false);
  const [coversOpen, setCoversOpen] = useState(false);
  const activeTab = TABS.some(([id]) => id === tab) ? tab : 'resumen';
  const tabsRef = useRef(null);
  // En pantallas angostas las pestañas se desplazan: la activa siempre queda a la vista.
  useEffect(() => { tabsRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [activeTab, loading]);
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
  const teamIndex = new Map(teams.map(item => [item.id, item]));
  const resolveTeam = matchTeam => matchTeam ? { ...matchTeam, ...(teamIndex.get(matchTeam.id ?? matchTeam.team_id) ?? {}) } : matchTeam;
  const colors = team?.colors ?? {};
  const heroStyle = { '--club-primary': colors.primary ?? '#062764', '--club-secondary': colors.secondary ?? '#0b3f8d', '--club-tertiary': colors.tertiary ?? '#ffd42a' };

  return <main className="newspaper club-page"><section className="club-paper"><div className="club-actions"><button className="back-button" onClick={onBack}>← VOLVER A EQUIPOS</button><button className="action-button club-covers-button" onClick={() => setCoversOpen(true)}>▣ PORTADAS</button></div>
    {loading || !team ? <div className="arcade-state">CARGANDO FICHA...</div> : <>
      <header className="club-hero" style={heroStyle}>
        <div className="club-crest-wrap"><TeamMark team={team} className="club-crest"/><button type="button" className="club-crest-edit" onClick={() => setCrestEditorOpen(true)} aria-label="Editar escudo y nombre del club" title="Editar escudo y nombre">✎</button></div>
        <div className="club-hero-copy"><p>{team.kind === 'national_team' ? 'SELECCIÓN' : 'CLUB'}{team.currentDivision ? ` · ${team.currentDivision}` : ''}</p><h1>{team.name}</h1><div className="club-hero-meta">{rank > 0 && <span className="club-hero-rank"><b>{rank}°</b> EN LA LIGA{standing ? ` · ${standing.points} PTS` : ''}</span>}<FormPills matches={matches} teamId={team.id}/></div></div>
        <div className="club-hero-value"><small>VALOR DEL PLANTEL</small><b>{gp(team.squadValue)}</b><span>GP · {team.playerCount ?? squad.length} JUGADORES</span></div>
      </header>
      <nav className="club-tabs" ref={tabsRef} role="tablist" aria-label="Secciones del club">{TABS.map(([id, label]) => <button type="button" role="tab" key={id} aria-selected={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => onTab?.(id)}>{label}</button>)}</nav>

      <section className="club-tab-content" role="tabpanel">
        {activeTab === 'resumen' && <div className="club-overview">
          <section className="club-card club-overview-pitch"><h3>TITULARES <button type="button" className="club-link-button" onClick={() => onTab?.('plantel')}>PLANTEL COMPLETO →</button></h3><SquadPitch starters={starters}/></section>
          <div className="club-overview-side">
            <section className="club-card club-leadership"><h3>DIRECTIVA</h3><div className="club-leaders">
              <LeaderCard key={`president-${personRevision}`} photo={photo} name={presidentName} age={presidentProfile.age} country={presidentProfile.country} customFields={team.president?.customFields} role="PRESIDENTE" onEdit={() => setPersonEditor('president')}/>
              <LeaderCard key={`coach-${personRevision}`} photo={managerPhoto} name={coachName} age={coachProfile.age} country={coachProfile.country} customFields={team.coach?.customFields} role="DIRECTOR TÉCNICO" onEdit={() => setPersonEditor('coach')}/>
            </div></section>
            <UpcomingMatches matches={matches} resolveTeam={resolveTeam} teamId={team.id}/>
            <ClubScorers teamId={team.id}/>
          </div>
        </div>}

        {activeTab === 'plantel' && <SquadTab team={team} squad={squad} starters={starters} substitutes={substitutes} onChanged={onChanged}/>}
        {activeTab === 'partidos' && <ClubMatches matches={matches} teams={teams} teamId={team.id}/>}
        {activeTab === 'tabla' && <ClubTable standings={standings} teamId={team.id} teams={teams}/>}
        {activeTab === 'fichajes' && <ClubTransfers teamId={team.id}/>}
        {activeTab === 'historia' && <div className="club-history-tab-content"><HonoursList honours={honours} historyError={historyError}/><ClubHistory team={team} onEdit={setHistoryEditor}/></div>}
        {activeTab === 'finanzas' && <div className="club-budget-tab"><div className="club-finance-stats"><span>SALDO DISPONIBLE <b>{balance === null ? '—' : `${gp(balance)} GP`}</b></span><span>VALOR PLANTEL <b>{gp(team.squadValue)} GP</b></span><span>PROMEDIO <b>{gp(team.averageValue)} GP</b></span></div><BudgetForm team={team} onChanged={onChanged}/></div>}
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
