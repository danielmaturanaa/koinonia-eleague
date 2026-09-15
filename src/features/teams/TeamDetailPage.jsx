import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { clubHistoryFor, legacyHistoryFor } from '../../data/clubHistory.js';
import { teamBalance, teamCoachName, teamCoachPhoto } from '../../utils/teamPresentation.js';
import { BudgetForm, CoachForm, PresidentForm, ProfileForm, SquadEditor } from '../admin/TeamAdminPanel.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';

const gp = value => typeof value === 'number' ? value.toLocaleString('es-CL') : '—';

function PlayerRow({ player }) {
  const flagMatch = player.name?.match(/^(\p{Regional_Indicator}{2})\s*/u);
  const name = flagMatch ? player.name.slice(flagMatch[0].length) : player.name;
  return <div className="roster-row"><b>{String(player.squadOrder ?? '—').padStart(2, '0')}</b><span>{name}</span><small>{player.position ?? '—'}</small><strong>{gp(player.gpValue)} GP</strong></div>;
}

function RosterHeader() {
  return <div className="roster-columns" aria-hidden="true"><b>NÚMERO</b><b>NOMBRE</b><b>POSICIÓN</b><b>VALOR MERCADO</b></div>;
}

const firstText = (...values) => values.find(value => typeof value === 'string' && value.trim());

function presidentPhoto(team) {
  return firstText(team.president?.imageUrl, team.president?.photoUrl, team.president?.avatarUrl, team.president?.pictureUrl, team.presidentImageUrl, team.presidentPhotoUrl);
}

function PersonPhoto({ photo, name }) {
  return photo ? <img src={photo} alt={`Foto de ${name}`}/> : <div className="president-photo-placeholder" aria-label={`Foto de ${name} no publicada`}><b>{name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || '—'}</b><small>FOTO NO PUBLICADA</small></div>;
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

function publishedHistoryFor(team) {
  const fallback = clubHistoryFor(team?.id);
  return {
    review: team?.review?.trim() || fallback.review,
    anthemLyrics: team?.anthemLyrics?.trim() || fallback.anthemLyrics,
    anthemUrl: team?.anthemUrl?.trim() || fallback.anthemUrl,
  };
}

const PITCH_BANDS = [
  { key: 'att', positions: ['DC', 'ED', 'EI'] },
  { key: 'mid', positions: ['MO', 'MC'] },
  { key: 'def', positions: ['LD', 'DEC', 'LI'] },
  { key: 'gk', positions: ['PT'] },
];

function PitchPlayer({ player }) {
  return <div className="club-pitch-player"><span className="club-pitch-number">{player.jerseyNumber ?? '–'}</span><span className="club-pitch-name">{player.name}</span></div>;
}

function SquadPitch({ starters }) {
  if (!starters.length) return <div className="club-pitch club-pitch-empty"><p className="empty-copy">NO HAY TITULARES DEFINIDOS.</p></div>;
  const placed = new Set();
  const bands = PITCH_BANDS.map(band => {
    const players = starters.filter(player => band.positions.includes(player.position));
    players.forEach(player => placed.add(player.id));
    return { ...band, players };
  });
  const rest = starters.filter(player => !placed.has(player.id));
  return <div className="club-pitch">
    {bands.map(band => band.players.length > 0 && <div className={`club-pitch-row club-pitch-${band.key}`} key={band.key}>{band.players.map(player => <PitchPlayer player={player} key={player.id}/>)}</div>)}
    {rest.length > 0 && <div className="club-pitch-row club-pitch-rest">{rest.map(player => <PitchPlayer player={player} key={player.id}/>)}</div>}
  </div>;
}

function ResumenTab({ presidentName, photo, coachName, managerPhoto, honours, starters }) {
  return <div className="club-resumen-tab">
    <div className="club-resumen-left">
      <div className="club-resumen-person"><small>PRESIDENTE</small><PersonPhoto photo={photo} name={presidentName}/><b>{presidentName}</b></div>
      <div className="club-resumen-person"><small>DIRECTOR TÉCNICO</small><PersonPhoto photo={managerPhoto} name={coachName}/><b>{coachName}</b></div>
      <div className="club-resumen-honours-mini"><small>PALMARÉS</small>{honours.length ? <p><b>{honours.length}</b> TÍTULO{honours.length === 1 ? '' : 'S'}{honours[0] && <span> · {honours[0].name}{honours[0].season ? ` (${honours[0].season})` : ''}</span>}</p> : <p className="empty-copy">SIN TÍTULOS.</p>}</div>
    </div>
    <section className="club-resumen-pitch-section">
      <h2>PLANTEL TITULAR</h2>
      <SquadPitch starters={starters}/>
    </section>
  </div>;
}

function PublishedClubHistory({ team }) {
  const [tab, setTab] = useState('review');
  const content = publishedHistoryFor(team);
  const stanzas = content.anthemLyrics.split(/\n{2,}/);
  return <section className="club-history-published"><nav className="club-history-tabs" aria-label="Contenido histórico del club"><button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>RESEÑA</button><button className={tab === 'anthem' ? 'active' : ''} onClick={() => setTab('anthem')}>HIMNO</button></nav>{tab === 'review' && <article className="published-review"><h2>RESEÑA HISTÓRICA</h2><p>{content.review}</p></article>}{tab === 'anthem' && <div className="published-anthem"><aside><h2>HIMNO DEL CLUB</h2>{content.anthemUrl ? <audio controls preload="metadata" src={content.anthemUrl}/> : <p className="empty-copy">ARCHIVO DE AUDIO PENDIENTE DE PUBLICACIÓN.</p>}</aside><article><h2>LETRA DEL HIMNO</h2><div className="anthem-lyrics-columns">{stanzas.map((stanza, index) => <p key={index}>{stanza}</p>)}</div></article></div>}</section>;
}

function ReviewEditor({ team, onChanged }) {
  const initialReview = team?.review ?? legacyHistoryFor(team?.id)?.review ?? '';
  const [review, setReview] = useState(initialReview);
  useEffect(() => setReview(initialReview), [team?.id, initialReview]);
  const mutation = useApiMutation((body, signal) => endpoints.updateTeamHistory(team.id, body, signal), { onSuccess: onChanged });
  const submit = event => { event.preventDefault(); mutation.execute({ review }); };
  return <form className="club-review-editor" onSubmit={submit}>
    <label>RESEÑA HISTÓRICA<textarea value={review} onChange={event => setReview(event.target.value)} placeholder="Describe la fundación, identidad, hitos y evolución histórica del club."/></label>
    <button className="action-button" disabled={mutation.loading}>GUARDAR RESEÑA</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function AnthemEditor({ team, onChanged }) {
  const legacy = legacyHistoryFor(team?.id);
  const initialLyrics = team?.anthemLyrics ?? legacy?.anthemLyrics ?? '';
  const initialUrl = team?.anthemUrl ?? legacy?.anthemUrl ?? '';
  const [anthemLyrics, setAnthemLyrics] = useState(initialLyrics);
  const [anthemUrl, setAnthemUrl] = useState(initialUrl);
  const [preview, setPreview] = useState('');
  useEffect(() => { setAnthemLyrics(initialLyrics); setAnthemUrl(initialUrl); setPreview(''); }, [team?.id, initialLyrics, initialUrl]);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const upload = useApiMutation((file, signal) => endpoints.uploadAudio(file, { entityType: 'team', entityId: team.id }, signal), {
    onSuccess: response => setAnthemUrl(response?.data?.secureUrl ?? response?.secureUrl ?? ''),
  });
  const mutation = useApiMutation((body, signal) => endpoints.updateTeamHistory(team.id, body, signal), { onSuccess: onChanged });

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

export function TeamDetailPage({ team, squad, standings, matches = [], history = [], historyError, loading, onBack, onChanged }) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [squadTab, setSquadTab] = useState('starters');
  const [historyTab, setHistoryTab] = useState('review');
  const roster = [...squad].sort((a, b) => (a.squadOrder ?? 999) - (b.squadOrder ?? 999));
  const starters = roster.filter(player => player.section === 'starters' || (!player.section && player.squadOrder <= 11));
  const substitutes = roster.filter(player => player.section === 'substitutes' || (!player.section && player.squadOrder > 11));
  const rank = standings.findIndex(row => row.team_id === team?.id) + 1;
  const record = rank ? standings[rank - 1] : null;
  const photo = team ? presidentPhoto(team) : '';
  const presidentName = team?.president?.name ?? team?.presidentName ?? 'Sin asignar';
  const coachName = teamCoachName(team);
  const managerPhoto = team ? teamCoachPhoto(team) : '';
  const honours = team ? clubHonours(team, history) : [];
  const balance = teamBalance(team);

  return <main className="newspaper club-page"><section className={`club-paper club-paper-${activeTab}`}><div className="club-actions"><button className="back-button" onClick={onBack}>← VOLVER A EQUIPOS</button></div>
    {loading || !team ? <div className="arcade-state">CARGANDO FICHA...</div> : <>
      <header className="club-header"><TeamMark team={team} className="club-crest"/><div><p>{team.kind === 'national_team' ? 'SELECCIÓN' : 'CLUB'} · {team.currentDivision ?? 'LIGA DE TRANSICIÓN'}</p><h1>{team.name}</h1><span>PRESIDENTE: {team.president?.name ?? team.presidentName ?? 'SIN ASIGNAR'}</span></div><div className="club-rank"><small>LUGAR EN LA LIGA</small><b>{rank || '—'}°</b></div></header>
      <div className="club-stats"><span>SALDO DISPONIBLE <b>{balance === null ? '—' : `${gp(balance)} GP`}</b></span><span>VALOR PLANTEL <b>{gp(team.squadValue)} GP</b></span><span>PROMEDIO <b>{gp(team.averageValue)} GP</b></span><span>JUGADORES <b>{team.playerCount ?? squad.length}</b></span><span>PARTIDOS <b>{record?.played ?? '—'}</b></span></div>
      <nav className="club-detail-tabs" aria-label="Secciones del club">{[['resumen','RESUMEN'],['president','PRESIDENTE'],['coach','DIRECTOR TÉCNICO'],['squad','PLANTEL'],['budget','PRESUPUESTO'],['honours','PALMARÉS'],['history','HISTORIA'],['club','ESCUDO']].map(([value, label]) => <button className={activeTab === value ? 'active' : ''} onClick={() => setActiveTab(value)} key={value}>{label}</button>)}</nav>
      <section className="club-tab-panel">{activeTab === 'resumen' && <ResumenTab presidentName={presidentName} photo={photo} coachName={coachName} managerPhoto={managerPhoto} honours={honours} starters={starters}/>}{activeTab === 'club' && <div className="club-person-tab"><div className="president-card club-crest-card"><TeamMark team={team}/><p><b>{team.name}</b></p></div><div className="inline-team-editor"><h2>EDITAR ESCUDO Y NOMBRE</h2><ProfileForm team={team} onChanged={onChanged}/></div></div>}{activeTab === 'president' && <div className="club-person-tab"><div className="president-card"><PersonPhoto photo={photo} name={presidentName}/><p><b>{presidentName}</b></p></div><div className="inline-team-editor"><h2>EDITAR PRESIDENTE Y FOTO</h2><PresidentForm team={team} onChanged={onChanged}/></div></div>}{activeTab === 'coach' && <div className="club-person-tab"><div className="president-card coach-card"><PersonPhoto photo={managerPhoto} name={coachName}/><p><b>{coachName}</b></p></div><div className="inline-team-editor"><h2>EDITAR DIRECTOR TÉCNICO Y FOTO</h2><CoachForm team={team} onChanged={onChanged}/></div></div>}{activeTab === 'squad' && <div className="club-squad-tab"><nav className="club-squad-tabs" aria-label="Secciones del plantel">{[['starters','TITULARES'],['substitutes','SUPLENTES'],['edit','EDITAR PLANTEL']].map(([value, label]) => <button className={squadTab === value ? 'active' : ''} onClick={() => setSquadTab(value)} key={value}>{label}</button>)}</nav>{squadTab === 'starters' && <section className="roster-panel club-tab-roster"><h2>PLANTEL TITULAR <small>{starters.length} / 11</small></h2><RosterHeader/><div className="roster-list">{starters.length ? starters.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay titulares definidos.</p>}</div></section>}{squadTab === 'substitutes' && <section className="roster-panel club-tab-roster"><h2>SUPLENTES <small>{substitutes.length}</small></h2><RosterHeader/><div className="roster-list substitutes">{substitutes.length ? substitutes.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay suplentes registrados.</p>}</div></section>}{squadTab === 'edit' && <div className="club-squad-editor"><SquadEditor team={team} squad={squad} onChanged={onChanged}/></div>}</div>}{activeTab === 'budget' && <div className="club-budget-tab"><h2>PRESUPUESTO DEL CLUB</h2><BudgetForm team={team} onChanged={onChanged}/></div>}{activeTab === 'honours' && <section className="club-lower-panel honours-panel club-tab-honours"><h2>PALMARÉS</h2><div className="honours-list">{honours.length ? honours.map(item => <article key={item.id}><span aria-hidden="true">★</span><b>{item.name}</b>{item.season && <small>{item.season}</small>}</article>) : <p className="empty-copy">AÚN NO HAY TÍTULOS REGISTRADOS.</p>}</div>{historyError && <p className="honours-api-note">NO FUE POSIBLE CONSULTAR EL HISTORIAL DEL CLUB.</p>}</section>}{activeTab === 'history' && <div className="club-history-tab"><nav className="club-history-tabs" aria-label="Contenido histórico del club">{[['review','RESEÑA'],['anthem','HIMNO']].map(([value, label]) => <button className={historyTab === value ? 'active' : ''} onClick={() => setHistoryTab(value)} key={value}>{label}</button>)}</nav>{historyTab === 'review' && <ReviewEditor team={team} onChanged={onChanged}/>}{historyTab === 'anthem' && <AnthemEditor team={team} onChanged={onChanged}/>}</div>}</section>
      {activeTab === 'history' && <PublishedClubHistory team={team}/>}
    </>}
  </section></main>;
}
