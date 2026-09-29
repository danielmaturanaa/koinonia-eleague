import { Fragment, useEffect, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { SanctionBadge } from '../../components/SanctionBadge.jsx';
import { SimulatedBadge } from '../../components/SimulatedBadge.jsx';
import { EntityLink } from '../../components/EntityLink.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { teamBalance, teamCoachName, teamCoachPhoto } from '../../utils/teamPresentation.js';
import { readPersonProfile } from '../../utils/personProfile.js';
import { matchRoundLabel } from '../../utils/matchPresentation.js';
import { CoachForm, PresidentForm, ProfileForm, SquadEditor } from '../admin/TeamAdminPanel.jsx';
import { ManagerSummary } from './ManagerCard.jsx';
import { hasCoachBoost, overallText } from '../../utils/managerBoosters.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { useApiQuery } from '../public/useApiQuery.js';
import { PitchBoard } from './PitchBoard.jsx';
import { SimulationTools } from './SimulationTools.jsx';
import { bandFor, defaultFormationPositions, pitchPositionFor } from '../../utils/formationPositions.js';

const gp = value => typeof value === 'number' ? value.toLocaleString('es-CL') : '—';
const FLAG_REGEX = /^(\p{Regional_Indicator}{2})\s*/u;
const SIMULATOR_SEARCH_DELAY = 250;
const SIMULATOR_SEARCH_MIN_LENGTH = 2;

function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debouncedValue;
}

function splitPlayerName(name) {
  const match = name?.match(FLAG_REGEX);
  const flag = match ? match[1] : '';
  const rest = (match ? name.slice(match[0].length) : (name ?? '')).trim();
  return { flag, rest };
}

function PlayerRow({ player }) {
  const { rest: name } = splitPlayerName(player.name);
  return <button type="button" className="roster-row roster-player-link" onClick={() => { window.location.hash = `/jugadores/${encodeURIComponent(player.id)}`; }}><b>{player.jerseyNumber ?? '—'}</b><span><PlayerFace src={player.faceUrl} name={name} className="roster-player-face"/><i>{player.flag && <em className="player-flag">{player.flag}</em>}{name}</i></span><small className={hasCoachBoost(player) ? 'ovr-coach' : ''} title={hasCoachBoost(player) ? 'Media base → media con los potenciadores del DT' : undefined}>{player.position ?? '—'} · {overallText(player)}</small><strong>{gp(player.gpValue)} GP</strong></button>;
}

function RosterHeader() {
  return <div className="roster-columns" aria-hidden="true"><b>NÚMERO</b><b>NOMBRE</b><b>POS. / OVR</b><b>VALOR MERCADO</b></div>;
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
    <small><SanctionBadge match={match} compact/><SimulatedBadge match={match}/>{match.tournament?.name ?? 'TORNEO'} · {matchRoundLabel(match, { leagueRound: 'JORNADA' })}{match.homeTeam?.stadium ? <span className="match-venue compact"> · 🏟️ {match.homeTeam.stadium}</span> : null}</small>
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

// Foto a sangre con nombre, edad y país sobre un degradado inferior; la edición queda junto al cargo.
function LeaderCard({ photo, name, age, country, customFields = [], role, onEdit, manager }) {
  const details = [age ? `${age} AÑOS` : null, country, ...customFields.map(field => field.value ? `${field.label}: ${field.value}` : null)].filter(Boolean);
  return <div className="club-person-entry"><h3 className="club-person-role">{role}{onEdit && <button type="button" className="club-inline-edit club-leader-edit" onClick={onEdit} aria-label={`Editar ${role.toLowerCase()}`} title={`Editar ${role.toLowerCase()}`}>✎</button>}</h3><article className="club-person-card" tabIndex={manager ? 0 : undefined} aria-label={manager ? `${name}: estilos y potenciadores de ${manager.name}` : undefined}><PersonPhoto photo={photo} name={name}/><div className="club-person-overlay"><h3>{name}</h3>{details.length > 0 && <p>{details.join(' · ')}</p>}</div></article>{manager && <div className="manager-popover" role="tooltip"><ManagerSummary manager={manager}/></div>}</div>;
}

function ClubPeople({ president: { key: presidentKey, ...president }, coach: { key: coachKey, ...coach }, onEditPresident, onEditCoach }) {
  return <section className="club-card club-people"><div className="club-people-grid"><LeaderCard key={presidentKey} {...president} onEdit={onEditPresident}/><LeaderCard key={coachKey} {...coach} onEdit={onEditCoach}/></div></section>;
}

// Tabla acotada al equipo: el de arriba y el de abajo; en los extremos, los dos siguientes.
function ClubStandingSnippet({ standings, teamId, teams, onMore }) {
  const index = standings.findIndex(row => row.team_id === teamId);
  if (index < 0) return null;
  const start = Math.max(0, Math.min(index - 1, standings.length - 3));
  const rows = standings.slice(start, start + 3);
  const teamIndex = new Map(teams.map(team => [team.id, team]));
  return <section className="club-card club-standing-snippet"><h3>TABLA <button type="button" className="club-link-button" onClick={onMore}>VER COMPLETA →</button></h3>
    <table><thead><tr><th>#</th><th>EQUIPO</th><th>PJ</th><th>DG</th><th>PTS</th></tr></thead><tbody>{rows.map(row => { const position = standings.indexOf(row) + 1; return <tr key={row.team_id} className={row.team_id === teamId ? 'current-team' : ''}><td>{position}</td><td><EntityLink to="team" id={row.team_id} className="table-team-link"><TeamMark team={{ ...row, ...(teamIndex.get(row.team_id) ?? {}) }}/><span>{row.name}</span></EntityLink></td><td>{row.played}</td><td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td><td><b>{row.points}</b></td></tr>; })}</tbody></table>
  </section>;
}

function ClubRecentResults({ matches, resolveTeam, teamId, onMore }) {
  const played = finishedMatches(matches, teamId).slice(0, 3);
  return <section className="club-card club-recent"><h3>ÚLTIMOS RESULTADOS {played.length > 0 && <button type="button" className="club-link-button" onClick={onMore}>VER TODOS →</button>}</h3>
    {played.length ? <div className="club-match-list">{played.map(match => <ClubMatchRow match={match} resolveTeam={resolveTeam} teamId={teamId} key={match.id}/>)}</div> : <p className="empty-copy">AÚN NO JUEGA PARTIDOS.</p>}
  </section>;
}

function StadiumEditor({ team, onChanged }) {
  const [stadium, setStadium] = useState(team.stadium ?? '');
  useEffect(() => setStadium(team.stadium ?? ''), [team.id, team.stadium]);
  const mutation = useApiMutation((body, signal) => endpoints.updateTeam(team.id, body, signal), { onSuccess: onChanged });
  const submit = event => { event.preventDefault(); mutation.execute({ stadium }); };
  return <form className="club-stadium-editor" onSubmit={submit}>
    <label><input aria-label="Estadio" value={stadium} maxLength={100} placeholder="ESTADIO" onChange={event => setStadium(event.target.value)}/></label>
    <button className="action-button" disabled={mutation.loading}>{mutation.loading ? 'GUARDANDO…' : 'GUARDAR ESTADIO'}</button>
    <FormFeedback mutation={mutation}/>
  </form>;
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
    <article className="club-history-review"><header><h3>RESEÑA HISTÓRICA</h3>{onEdit && <button type="button" className="club-inline-edit" onClick={() => onEdit('review')}>✎ EDITAR</button>}</header><p className={longReview && !expanded ? 'clamped' : ''}>{content.review}</p>{longReview && <button type="button" className="club-more-button" onClick={() => setExpanded(value => !value)}>{expanded ? 'MOSTRAR MENOS' : 'LEER RESEÑA COMPLETA'}</button>}</article>
    <aside className="club-history-anthem"><header><h3>HIMNO DEL CLUB</h3>{onEdit && <button type="button" className="club-inline-edit" onClick={() => onEdit('anthem')}>✎ EDITAR</button>}</header>{content.anthemUrl ? <audio controls preload="metadata" src={content.anthemUrl}/> : <p className="empty-copy">AUDIO PENDIENTE DE PUBLICACIÓN.</p>}<details><summary>VER LETRA</summary><div className="anthem-lyrics">{stanzas.map((stanza, index) => <p key={index}>{stanza}</p>)}</div></details></aside>
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

const simulatorPlayerId = player => String(player?.id ?? player?.playerId ?? '');
const SIMULATOR_BUDGET_LIMIT = 2_000_000;
const SIMULATOR_STARTERS = 11;
const simulatorPlayerTeamId = player => String(player?.team?.id ?? player?.teamId ?? player?.team_id ?? '');
const simulatorPlayerTeamName = player => player?.team?.name ?? player?.teamName ?? player?.team_name ?? '';
const simulatorOriginalValue = player => Number(player?.gpValue ?? player?.price ?? 0) || 0;
// simPrice es el precio editado a mano en la simulación; nunca se guarda en el plantel real.
const hasEditedPrice = player => player?.simPrice !== undefined && player.simPrice !== null;
const simulatorValue = player => hasEditedPrice(player) ? player.simPrice : simulatorOriginalValue(player);
const simulatorLayoutSignature = roster => roster.map(player => `${simulatorPlayerId(player)}:${player.section}:${player.pitchX ?? ''}:${player.pitchY ?? ''}:${player.simPrice ?? ''}`).join('|');
const SPOT_CLEARANCE = 8;
const signedGp = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${gp(Math.abs(value))} GP`;

function normalizeSimulatorRoster(players) {
  return [...players]
    .sort((a, b) => (a.squadOrder ?? 999) - (b.squadOrder ?? 999))
    .map((player, index) => ({
      ...player,
      id: player.id ?? player.playerId,
      squadOrder: player.squadOrder ?? index + 1,
      section: player.section ?? ((player.squadOrder ?? index + 1) <= SIMULATOR_STARTERS ? 'starters' : 'substitutes'),
    }))
    .filter(player => simulatorPlayerId(player));
}

// Buscador propio (no <datalist>): muestra foto, media, club y precio, y añade con un clic o Enter.
function SimulatorPlayerSearch({ teamId, excludedIds, onAdd }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const term = useDebouncedValue(search.trim(), SIMULATOR_SEARCH_DELAY);
  const query = useApiQuery(signal => term.length >= SIMULATOR_SEARCH_MIN_LENGTH
    ? endpoints.players({ q: term, page: 1, pageSize: 25 }, signal)
    : Promise.resolve({ data: [] }), [term]);
  const results = (Array.isArray(query.data) ? query.data : [])
    .filter(player => simulatorPlayerId(player) && !excludedIds.has(simulatorPlayerId(player)))
    .slice(0, 8);
  useEffect(() => setHighlighted(0), [term]);
  const typed = search.trim();
  const waiting = typed.length >= SIMULATOR_SEARCH_MIN_LENGTH && (typed !== term || query.loading);
  const pick = player => {
    if (!player) return;
    onAdd(player);
    setSearch('');
    setOpen(false);
  };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setHighlighted(index => Math.min(index + 1, results.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setHighlighted(index => Math.max(index - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); if (!waiting) pick(results[highlighted]); }
    else if (event.key === 'Escape') setOpen(false);
  };
  const status = typed.length < SIMULATOR_SEARCH_MIN_LENGTH ? 'ESCRIBE AL MENOS 2 LETRAS PARA BUSCAR.'
    : waiting ? 'BUSCANDO JUGADORES…'
      : query.error ? 'NO SE PUDIERON CARGAR LOS JUGADORES.'
        : results.length ? '' : 'SIN RESULTADOS PARA ESA BÚSQUEDA.';
  return <div className="squad-sim-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor="squad-sim-search-input">AÑADIR JUGADOR A LA SIMULACIÓN</label>
    <input id="squad-sim-search-input" type="search" autoComplete="off" role="combobox" aria-expanded={open} aria-controls="squad-sim-search-results" value={search} placeholder="Busca por nombre: Mbappé, Rodri, Saka…" onChange={event => { setSearch(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}/>
    {open && typed.length > 0 && <div className="squad-sim-results" id="squad-sim-search-results" role="listbox">
      {status && <p className="squad-sim-results-status">{status}</p>}
      {!waiting && results.map((player, index) => {
        const { rest: name } = splitPlayerName(player.name);
        const ownerId = simulatorPlayerTeamId(player);
        const owner = simulatorPlayerTeamName(player);
        return <button type="button" role="option" aria-selected={index === highlighted} key={simulatorPlayerId(player)} className={index === highlighted ? 'highlighted' : ''} onMouseEnter={() => setHighlighted(index)} onClick={() => pick(player)}>
          <PlayerFace src={player.faceUrl} name={name} className="squad-simulator-face"/>
          <span><b>{name}</b><small className={ownerId && ownerId !== String(teamId) ? 'taken' : ''}>{player.position ?? '—'} · OVR {player.overall ?? '—'} · {owner || 'AGENTE LIBRE'}</small></span>
          <strong>{gp(simulatorValue(player))} GP</strong>
          <i aria-hidden="true">+</i>
        </button>;
      })}
    </div>}
  </div>;
}

function SimulatorMeter({ label, value, detail, ratio, over }) {
  return <div className={`squad-sim-meter ${over ? 'over-budget' : ''}`}>
    <small>{label}</small>
    <b>{value}</b>
    {ratio !== undefined && <span className="squad-sim-meter-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}/></span>}
    <em>{detail}</em>
  </div>;
}

const SIMULATOR_VIEW_KEY = 'koinonia-simulador-vista';
const SIMULATOR_VIEWS = [['pitch', 'VISTA CANCHA'], ['table', 'VISTA TABLA']];

const simulatorDraftKey = teamId => `koinonia-simulador-plantel:${teamId}`;

// El borrador solo vale mientras el plantel real siga igual: si cambió, se descarta.
function loadSimulatorDraft(teamId, signature) {
  try {
    const draft = JSON.parse(window.localStorage.getItem(simulatorDraftKey(teamId)) ?? 'null');
    return draft?.signature === signature && Array.isArray(draft.roster) && Array.isArray(draft.removed) ? draft : null;
  } catch {
    return null;
  }
}

function saveSimulatorDraft(teamId, draft) {
  try {
    if (draft) window.localStorage.setItem(simulatorDraftKey(teamId), JSON.stringify(draft));
    else window.localStorage.removeItem(simulatorDraftKey(teamId));
  } catch {
    // el navegador no permite guardar preferencias locales; no es crítico.
  }
}

function loadSimulatorView() {
  try {
    const stored = window.localStorage.getItem(SIMULATOR_VIEW_KEY);
    return SIMULATOR_VIEWS.some(([id]) => id === stored) ? stored : 'pitch';
  } catch {
    return 'pitch';
  }
}

function saveSimulatorView(view) {
  try {
    window.localStorage.setItem(SIMULATOR_VIEW_KEY, view);
  } catch {
    // el navegador no permite guardar preferencias locales; no es crítico.
  }
}

const BAND_ORDER = { gk: 0, def: 1, mid: 2, att: 3 };
const BAND_LABELS = { gk: 'ARQ', def: 'DEF', mid: 'MED', att: 'DEL' };

// Mismo plantel simulado que la cancha, en filas: el precio se edita igual (clic, Enter, Esc).
// Los titulares se ordenan por línea (arquero a delantero); cada sección muestra su subtotal.
function SimulatorTable({ starters, substitutes, simulation }) {
  const byLine = players => [...players].sort((left, right) => BAND_ORDER[bandFor(left.position)] - BAND_ORDER[bandFor(right.position)]);
  const startersFull = starters.length >= SIMULATOR_STARTERS;
  // Con 11 titulares, "↑ TITULAR" pide a quién reemplaza (los de su misma línea primero).
  const [choosing, setChoosing] = useState(null);
  const promote = player => {
    if (!startersFull) { simulation.onToggleSection(player); return; }
    setChoosing(current => current === simulatorPlayerId(player) ? null : simulatorPlayerId(player));
  };
  const replacementsFor = player => [...starters].sort((left, right) => Number(bandFor(right.position) === bandFor(player.position)) - Number(bandFor(left.position) === bandFor(player.position)) || BAND_ORDER[bandFor(left.position)] - BAND_ORDER[bandFor(right.position)]);
  const section = (title, players, isStarters) => <section className="squad-sim-group" key={title}>
    <header><h4>{title} <small>{players.length}</small></h4><span>{gp(players.reduce((total, player) => total + simulation.priceOf(player), 0))} GP</span></header>
    {players.length ? players.map(player => {
      const { rest: name } = splitPlayerName(player.name);
      const real = simulatorOriginalValue(player);
      const price = simulation.priceOf(player);
      const delta = price - real;
      const band = bandFor(player.position);
      const asking = !isStarters && startersFull && choosing === simulatorPlayerId(player);
      return <Fragment key={simulatorPlayerId(player)}><div className={`squad-sim-row ${simulation.isNew(player) ? 'is-new' : ''} ${simulation.isHighlighted(player) ? 'just-added' : ''}`}>
        <span className="squad-sim-player"><PlayerFace src={player.faceUrl} name={name} className="squad-simulator-face"/><span><b>{name || 'JUGADOR'}</b><small>{simulation.isNew(player) && <em className="squad-sim-tag new">NUEVO</em>}{simulation.isEdited(player) && <em className="squad-sim-tag edited">EDITADO</em>}</small></span></span>
        <i className={`squad-sim-pos band-${band}`} title={BAND_LABELS[band]}>{player.position ?? '—'}</i>
        <b className="squad-sim-ovr">{player.overall ?? '—'}</b>
        <span className="squad-sim-real"><small>REAL</small>{gp(real)}</span>
        <span className="squad-sim-price">
          <SimulationTools name={name} value={price} edited={simulation.isEdited(player)} onPrice={value => simulation.onPrice(player, value)} onReset={() => simulation.onResetPrice(player)} onRemove={() => simulation.onRemove(player)}/>
          {delta !== 0 && <small className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '▲' : '▼'} {gp(Math.abs(delta))}</small>}
        </span>
        <button type="button" className={`squad-sim-move ${isStarters ? 'to-bench' : 'to-pitch'}`} aria-expanded={isStarters ? undefined : asking} onClick={() => isStarters ? simulation.onToggleSection(player) : promote(player)} title={isStarters ? `Mandar a ${name} a la banca` : startersFull ? `Elegir a quién reemplaza ${name}` : `Hacer titular a ${name}`} aria-label={isStarters ? `Mandar a ${name} a la banca` : `Hacer titular a ${name}`}>{isStarters ? '↓ BANCA' : '↑ TITULAR'}</button>
      </div>
      {asking && <div className="squad-sim-replace" role="group" aria-label={`Elegir a quién reemplaza ${name}`}>
        <p>¿A QUIÉN REEMPLAZA <b>{name}</b>? <button type="button" onClick={() => setChoosing(null)}>CANCELAR</button></p>
        <div>{replacementsFor(player).map(starter => <button type="button" key={simulatorPlayerId(starter)} onClick={() => { simulation.onReplace(starter, player); setChoosing(null); }}><i className={`squad-sim-pos band-${bandFor(starter.position)}`}>{starter.position ?? '—'}</i><span>{splitPlayerName(starter.name).rest}</span></button>)}</div>
      </div>}
      </Fragment>;
    }) : <p className="empty-copy">SIN JUGADORES.</p>}
  </section>;
  return <div className="squad-sim-table" role="table" aria-label="Plantel simulado">
    <div className="squad-sim-table-head" aria-hidden="true"><span>JUGADOR</span><span>POS.</span><span>OVR</span><span>PRECIO REAL</span><span>PRECIO SIMULADO</span><span>ACCIÓN</span></div>
    {section('TITULARES', byLine(starters), true)}{section('SUPLENTES', byLine(substitutes), false)}
  </div>;
}

function SquadValueSimulator({ team, squad, balance }) {
  const baseRoster = normalizeSimulatorRoster(squad);
  const baseSignature = baseRoster.map(player => `${simulatorPlayerId(player)}:${player.gpValue ?? player.price ?? ''}:${player.section ?? ''}:${player.squadOrder ?? ''}:${player.pitchX ?? ''}:${player.pitchY ?? ''}`).join('|');
  const [simulatedRoster, setSimulatedRoster] = useState(baseRoster);
  const [removedPlayers, setRemovedPlayers] = useState([]);
  const [lastAdded, setLastAdded] = useState(null);
  const rostersRef = useRef(null);
  const [view, setView] = useState(loadSimulatorView);
  const changeView = next => { setView(next); saveSimulatorView(next); };

  // Tras cargar otro equipo o plantel, el efecto de guardado del mismo render se salta para no pisar su borrador.
  const skipSave = useRef(true);
  useEffect(() => {
    const draft = team?.id ? loadSimulatorDraft(team.id, baseSignature) : null;
    skipSave.current = true;
    setSimulatedRoster(draft?.roster ?? baseRoster);
    setRemovedPlayers(draft?.removed ?? []);
    setLastAdded(null);
  }, [team?.id, baseSignature]);

  useEffect(() => {
    if (!lastAdded) return undefined;
    rostersRef.current?.querySelector('.just-added')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const timeout = window.setTimeout(() => setLastAdded(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [lastAdded]);

  const baseIds = new Set(baseRoster.map(simulatorPlayerId));
  const simulatedIds = new Set(simulatedRoster.map(simulatorPlayerId));
  const simulatedValue = simulatedRoster.reduce((total, player) => total + simulatorValue(player), 0);
  const signings = simulatedRoster.filter(player => !baseIds.has(simulatorPlayerId(player)));
  const signingsCost = signings.reduce((total, player) => total + simulatorValue(player), 0);
  // Las salidas se valoran con el precio con que se venden (el editado, si lo hay).
  const departuresValue = removedPlayers.reduce((total, player) => total + simulatorValue(player), 0);
  const editedCount = simulatedRoster.filter(hasEditedPrice).length;
  // Cambiar el precio de alguien que ya está en el plantel mueve el valor del plantel, no el saldo.
  const movement = signingsCost - departuresValue;
  const projectedBalance = balance === null ? null : balance - movement;
  const capRoom = SIMULATOR_BUDGET_LIMIT - simulatedValue;
  const exceedsLimit = capRoom < 0;
  const exceedsBalance = projectedBalance !== null && projectedBalance < 0;
  const changed = simulatorLayoutSignature(simulatedRoster) !== simulatorLayoutSignature(baseRoster) || removedPlayers.length > 0;
  const starters = simulatedRoster.filter(player => player.section === 'starters');
  const substitutes = simulatedRoster.filter(player => player.section !== 'starters');
  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return; }
    if (!team?.id) return;
    saveSimulatorDraft(team.id, changed ? { signature: baseSignature, roster: simulatedRoster, removed: removedPlayers } : null);
  }, [simulatedRoster, removedPlayers]);
  const idOf = simulatorPlayerId;

  // Dónde ubica la cancha a alguien que entra como titular: su lugar previo si está libre,
  // el de un titular quitado (mejor si es de su misma línea) o el que le toca por posición.
  const startingSpot = (player, current) => {
    const defaults = defaultFormationPositions(current);
    const taken = current.map(item => pitchPositionFor(item, defaults));
    const free = spot => taken.every(other => Math.hypot(other.x - spot.x, other.y - spot.y) > SPOT_CLEARANCE);
    if (player.pitchX != null && player.pitchY != null && free({ x: player.pitchX, y: player.pitchY })) return { x: player.pitchX, y: player.pitchY };
    const sameBand = item => Number(bandFor(item.position) === bandFor(player.position));
    const vacated = removedPlayers
      .filter(item => item.section === 'starters' && item.pitchX != null && idOf(item) !== idOf(player))
      .sort((left, right) => sameBand(right) - sameBand(left))
      .map(item => ({ x: item.pitchX, y: item.pitchY }))
      .find(free);
    return vacated ?? pitchPositionFor({ ...player, pitchX: null, pitchY: null }, defaultFormationPositions([...current, { ...player, pitchX: null, pitchY: null }]));
  };

  const addPlayerToSimulation = player => {
    if (!player) return;
    setSimulatedRoster(current => {
      if (current.some(item => idOf(item) === idOf(player))) return current;
      const currentStarters = current.filter(item => item.section === 'starters');
      if (currentStarters.length >= SIMULATOR_STARTERS) return [...current, { ...player, section: 'substitutes', pitchX: null, pitchY: null }];
      const spot = startingSpot(player, currentStarters);
      return [...current, { ...player, section: 'starters', pitchX: spot.x, pitchY: spot.y }];
    });
    setRemovedPlayers(current => current.filter(item => idOf(item) !== idOf(player)));
    setLastAdded(idOf(player));
  };
  const swapPlayers = ({ starterId, substituteId, position }) => setSimulatedRoster(current => {
    const from = current.findIndex(item => idOf(item) === String(starterId));
    const to = current.findIndex(item => idOf(item) === String(substituteId));
    if (from < 0 || to < 0) return current;
    const next = [...current];
    next[from] = { ...current[to], section: 'starters', pitchX: position.x, pitchY: position.y };
    next[to] = { ...current[from], section: 'substitutes', pitchX: null, pitchY: null };
    return next;
  });
  // Titular ↔ banca sin tocar el resto: al volver a titular recupera su lugar si sigue libre.
  const toggleSection = player => setSimulatedRoster(current => {
    const target = current.find(item => idOf(item) === idOf(player));
    if (!target) return current;
    if (target.section === 'starters') return current.map(item => item === target ? { ...item, section: 'substitutes' } : item);
    const currentStarters = current.filter(item => item.section === 'starters');
    if (currentStarters.length >= SIMULATOR_STARTERS) return current;
    const spot = startingSpot(target, currentStarters);
    return current.map(item => item === target ? { ...item, section: 'starters', pitchX: spot.x, pitchY: spot.y } : item);
  });
  const moveOnPitch = updates => setSimulatedRoster(current => current.map(item => {
    const update = updates.find(candidate => String(candidate.id) === idOf(item));
    return update ? { ...item, pitchX: update.x, pitchY: update.y } : item;
  }));
  const reorderBench = bench => setSimulatedRoster(current => [...current.filter(item => item.section === 'starters'), ...bench]);
  const setPrice = (player, value) => setSimulatedRoster(current => current.map(item => idOf(item) === idOf(player)
    ? { ...item, simPrice: value === simulatorOriginalValue(item) ? undefined : value }
    : item));
  const removePlayer = player => {
    const position = player.section === 'starters' ? pitchPositionFor(player, defaultFormationPositions(starters)) : null;
    setSimulatedRoster(current => current.filter(item => idOf(item) !== idOf(player)));
    if (baseIds.has(idOf(player))) setRemovedPlayers(current => current.some(item => idOf(item) === idOf(player)) ? current : [...current, position ? { ...player, pitchX: position.x, pitchY: position.y } : player]);
  };
  const reset = () => { setSimulatedRoster(baseRoster); setRemovedPlayers([]); setLastAdded(null); };
  const lastAddedPlayer = simulatedRoster.find(player => idOf(player) === lastAdded);
  const statusMessage = exceedsLimit && exceedsBalance ? `SUPERA EL TOPE DE PLANTEL POR ${gp(-capRoom)} GP Y EL SALDO POR ${gp(-projectedBalance)} GP.`
    : exceedsLimit ? `SUPERA EL TOPE DE PLANTEL POR ${gp(-capRoom)} GP.`
      : exceedsBalance ? `FALTAN ${gp(-projectedBalance)} GP DE SALDO PARA ESTOS FICHAJES.`
        : projectedBalance === null ? 'EL CLUB NO TIENE SALDO PUBLICADO: SOLO SE VALIDA EL TOPE DE PLANTEL.'
          : 'PLANTEL VÁLIDO: DENTRO DEL TOPE Y DEL SALDO DISPONIBLE.';
  const changesDetail = [
    signings.length || removedPlayers.length ? `Fichajes ${gp(signingsCost)} GP · salidas ${gp(departuresValue)} GP` : '',
    editedCount ? `${editedCount} precio${editedCount === 1 ? '' : 's'} editado${editedCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ') || 'Sin cambios respecto del plantel real';
  const simulation = {
    priceOf: simulatorValue,
    isEdited: hasEditedPrice,
    isNew: player => !baseIds.has(idOf(player)),
    isHighlighted: player => idOf(player) === lastAdded,
    onSwap: swapPlayers,
    onMove: moveOnPitch,
    onReorder: reorderBench,
    onPrice: setPrice,
    onResetPrice: player => setPrice(player, simulatorOriginalValue(player)),
    onRemove: removePlayer,
    onToggleSection: toggleSection,
    onReplace: (starter, substitute) => swapPlayers({ starterId: idOf(starter), substituteId: idOf(substitute), position: pitchPositionFor(starter, defaultFormationPositions(starters)) }),
  };

  return <section className="club-card squad-value-simulator">
    <header className="squad-simulator-header"><div><h3>SIMULADOR DE PLANTEL</h3><p>Prueba fichajes y salidas sobre la misma alineación del resumen. Es solo una simulación: no modifica el plantel real y se guarda en este navegador.</p></div><button type="button" className="club-link-button" onClick={reset} disabled={!changed}>↺ RESTABLECER</button></header>
    <div className="squad-sim-summary"><div className="squad-sim-meters" aria-label="Resumen del presupuesto simulado">
      <SimulatorMeter label="VALOR DEL PLANTEL" value={`${gp(simulatedValue)} GP`} ratio={simulatedValue / SIMULATOR_BUDGET_LIMIT} over={exceedsLimit} detail={exceedsLimit ? `Excede el tope de ${gp(SIMULATOR_BUDGET_LIMIT)} GP en ${gp(-capRoom)} GP` : `Tope ${gp(SIMULATOR_BUDGET_LIMIT)} GP · quedan ${gp(capRoom)} GP`}/>
      <SimulatorMeter label="SALDO TRAS LOS CAMBIOS" value={projectedBalance === null ? '—' : `${gp(projectedBalance)} GP`} over={exceedsBalance} detail={balance === null ? 'Saldo no publicado' : `Saldo actual ${gp(balance)} GP · movimiento ${signedGp(-movement)}`}/>
      <SimulatorMeter label="CAMBIOS" value={`${signings.length} ALTA${signings.length === 1 ? '' : 'S'} · ${removedPlayers.length} BAJA${removedPlayers.length === 1 ? '' : 'S'}`} detail={changesDetail}/>
    </div>
    <p className={`squad-simulator-status ${exceedsLimit || exceedsBalance ? 'over-budget' : ''}`} role="status">{statusMessage}</p>
    {starters.length !== SIMULATOR_STARTERS && <p className="squad-simulator-status over-budget" role="status">TITULARES: {starters.length} / {SIMULATOR_STARTERS}. LA ALINEACIÓN DEBERÍA TENER {SIMULATOR_STARTERS}.</p>}</div>
    <SimulatorPlayerSearch teamId={team?.id} excludedIds={simulatedIds} onAdd={addPlayerToSimulation}/>
    {lastAddedPlayer && <p className="squad-simulator-player-note" role="status">✓ {splitPlayerName(lastAddedPlayer.name).rest} AÑADIDO A {lastAddedPlayer.section === 'starters' ? 'TITULARES' : 'SUPLENTES'}{simulatorPlayerTeamId(lastAddedPlayer) && simulatorPlayerTeamId(lastAddedPlayer) !== String(team?.id) ? ` · HOY JUEGA EN ${simulatorPlayerTeamName(lastAddedPlayer)}` : ''}.</p>}
    <nav className="club-squad-modes squad-sim-views" aria-label="Vista del simulador">{SIMULATOR_VIEWS.map(([id, label]) => <button type="button" key={id} className={view === id ? 'active' : ''} aria-pressed={view === id} onClick={() => changeView(id)}>{label}</button>)}</nav>
    <div className="squad-simulator-board" ref={rostersRef}>{view === 'table' ? <SimulatorTable starters={starters} substitutes={substitutes} simulation={simulation}/> : <PitchBoard team={team} starters={starters} substitutes={substitutes} simulation={simulation}/>}</div>
    {removedPlayers.length > 0 && <section className="squad-simulator-removed"><h4>SALIDAS SIMULADAS <small>{removedPlayers.length}</small></h4><ul>{removedPlayers.map(player => { const { rest: name } = splitPlayerName(player.name); return <li key={idOf(player)}><span><PlayerFace src={player.faceUrl} name={name} className="squad-simulator-face"/><b>{name || 'JUGADOR'}</b></span><small>{player.position ?? '—'}</small><strong>{gp(simulatorValue(player))} GP</strong><button type="button" className="squad-simulator-restore" onClick={() => addPlayerToSimulation(player)}>↩ DEVOLVER</button></li>; })}</ul></section>}
  </section>;
}

const TABS = [['resumen', 'RESUMEN'], ['plantel', 'PLANTEL'], ['partidos', 'PARTIDOS'], ['tabla', 'TABLA'], ['fichajes', 'FICHAJES'], ['historia', 'HISTORIA'], ['finanzas', 'SIMULADOR DE PRESUPUESTO']];

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

function ClubScorers({ teamId, limit = 5, tournaments = [] }) {
  const scorers = useApiQuery(signal => endpoints.teamScorers(teamId, {}, signal), [teamId]);
  const rows = (Array.isArray(scorers.data) ? scorers.data : []).slice(0, limit);
  return <section className="club-card"><h3>GOLEADORES <small>{tournaments.length === 1 ? tournaments[0].name : 'TORNEOS ACTIVOS'}</small></h3>
    {scorers.loading ? <p className="empty-copy">CARGANDO…</p> : scorers.error ? <p className="empty-copy">NO DISPONIBLE.</p> : rows.length ? <ol className="club-scorers">{rows.map((row, index) => <li key={row.playerId}><b>{index + 1}</b><PlayerFace src={row.faceUrl} name={row.name}/><EntityLink to="player" id={row.playerId}>{row.name}</EntityLink><strong>{row.goals} <small>GOL{row.goals === 1 ? '' : 'ES'}</small></strong></li>)}</ol> : <p className="empty-copy">AÚN SIN GOLES EN TORNEOS ACTIVOS.</p>}
  </section>;
}

function HonoursList({ honours, historyError }) {
  return <section className="club-card"><h3>PALMARÉS <small>{honours.length} TÍTULO{honours.length === 1 ? '' : 'S'}</small></h3>{honours.length ? <div className="honours-list">{honours.map(item => <article key={item.id}><span aria-hidden="true">★</span><b>{item.name}</b>{item.season && <small>{item.season}</small>}</article>)}</div> : <p className="empty-copy">AÚN NO HAY TÍTULOS REGISTRADOS.</p>}{historyError && <p className="honours-api-note">NO FUE POSIBLE CONSULTAR EL HISTORIAL DEL CLUB.</p>}</section>;
}

function SquadTab({ team, squad, starters, substitutes, onChanged }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const [mode, setMode] = useState('view');
  return <div className="club-squad-tab">
    <nav className="club-squad-modes" aria-label="Acciones del plantel">{[['view', 'VER PLANTEL'], ...(canEdit ? [['edit', 'EDITAR PLANTEL']] : [])].map(([id, label]) => <button type="button" key={id} className={mode === id ? 'active' : ''} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</nav>
    {mode === 'view' && <div className="club-squad-layout club-squad-layout-list">
      <div className="roster-panel club-roster"><h3>TITULARES <small>{starters.length} / 11</small></h3><RosterHeader/><div className="roster-list">{starters.length ? starters.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay titulares definidos.</p>}</div><h3>SUPLENTES <small>{substitutes.length}</small></h3><div className="roster-list substitutes">{substitutes.length ? substitutes.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay suplentes registrados.</p>}</div></div>
    </div>}
    {mode === 'edit' && canEdit && <div className="club-squad-editor"><SquadEditor team={team} squad={squad} onChanged={onChanged}/></div>}
  </div>;
}

export function TeamDetailPage({ team, teams = [], tournaments = [], squad, standings, matches = [], history = [], historyError, loading, tab = 'resumen', onTab, onBack, onChanged, onProjection = null }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team?.id);
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

  return <main className="newspaper club-page"><section className="club-paper"><div className="club-actions"><button className="back-button" onClick={onBack}>← VOLVER A EQUIPOS</button>{canEdit && <button className="action-button club-covers-button" onClick={() => setCoversOpen(true)}>▣ PORTADAS</button>}{onProjection && team && <button type="button" className="action-button club-projection-button" onClick={onProjection}>CALCULADORA PARA CLASIFICAR</button>}</div>
    {loading || !team ? <div className="arcade-state">CARGANDO FICHA...</div> : <>
      <header className="club-hero" style={heroStyle}>
        <div className="club-crest-wrap"><TeamMark team={team} className="club-crest"/>{canEdit && <button type="button" className="club-crest-edit" onClick={() => setCrestEditorOpen(true)} aria-label="Editar escudo y nombre del club" title="Editar escudo y nombre">✎</button>}</div>
        <div className="club-hero-copy"><p>{team.kind === 'national_team' ? 'SELECCIÓN' : 'CLUB'}{team.currentDivision ? ` · ${team.currentDivision}` : ''}</p><h1>{team.name}</h1><div className="club-hero-meta">{rank > 0 && <span className="club-hero-rank"><b>{rank}°</b> EN LA LIGA{standing ? ` · ${standing.points} PTS` : ''}</span>}<FormPills matches={matches} teamId={team.id}/></div></div>
        <dl className="club-hero-value"><div><dt>VALOR DEL PLANTEL</dt><dd>{gp(team.squadValue)}</dd><small>GP · {team.playerCount ?? squad.length} JUGADORES</small></div><div><dt>SALDO DISPONIBLE</dt><dd>{balance === null ? '—' : gp(balance)}</dd><small>GP PARA FICHAJES</small></div></dl>
      </header>
      <nav className="club-tabs" ref={tabsRef} role="tablist" aria-label="Secciones del club">{TABS.map(([id, label]) => <button type="button" role="tab" key={id} aria-selected={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => onTab?.(id)}>{label}</button>)}</nav>

      <section className="club-tab-content" role="tabpanel">
        {activeTab === 'resumen' && <div className="club-overview club-overview-reorganized">
          <div className="club-overview-secondary">
            <div className="club-overview-left-column">
              <ClubPeople
                president={{ key: `president-${personRevision}`, photo, name: presidentName, age: presidentProfile.age, country: presidentProfile.country, customFields: team.president?.customFields, role: 'PRESIDENTE' }}
                coach={{ key: `coach-${personRevision}`, photo: managerPhoto, name: coachName, age: coachProfile.age, country: coachProfile.country, customFields: team.coach?.customFields, role: 'DT', manager: team.coach?.manager }}
                onEditPresident={canEdit ? () => setPersonEditor('president') : undefined}
                onEditCoach={canEdit ? () => setPersonEditor('coach') : undefined}
              />
              <ClubStandingSnippet standings={standings} teamId={team.id} teams={teams} onMore={() => onTab?.('tabla')}/>
              <ClubRecentResults matches={matches} resolveTeam={resolveTeam} teamId={team.id} onMore={() => onTab?.('partidos')}/>
              <ClubScorers teamId={team.id} limit={3} tournaments={tournaments}/>
            </div>
            <div className="club-overview-right-column">
              <PitchBoard team={team} starters={starters} substitutes={substitutes} onChanged={onChanged} readOnly={!canEdit}/>
              <StadiumEditor team={team} onChanged={onChanged}/>
            </div>
          </div>
        </div>}

        {activeTab === 'plantel' && <SquadTab team={team} squad={squad} starters={starters} substitutes={substitutes} onChanged={onChanged}/>}
        {activeTab === 'partidos' && <ClubMatches matches={matches} teams={teams} teamId={team.id}/>}
        {activeTab === 'tabla' && <ClubTable standings={standings} teamId={team.id} teams={teams}/>}
        {activeTab === 'fichajes' && <ClubTransfers teamId={team.id}/>}
        {activeTab === 'historia' && <div className="club-history-tab-content"><HonoursList honours={honours} historyError={historyError}/><ClubHistory team={team} onEdit={canEdit ? setHistoryEditor : undefined}/></div>}
        {activeTab === 'finanzas' && <div className="club-budget-tab"><SquadValueSimulator team={team} squad={squad} balance={balance}/></div>}
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
