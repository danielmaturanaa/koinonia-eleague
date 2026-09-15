import { useEffect, useState } from 'react';
import { TeamMark } from '../../components/TeamMark.jsx';
import { clubHistoryFor } from '../../data/clubHistory.js';
import { teamBalance, teamCoachName, teamCoachPhoto } from '../../utils/teamPresentation.js';
import { BudgetForm, CoachForm, PresidentForm, SquadEditor } from '../admin/TeamAdminPanel.jsx';

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

function PublishedClubHistory({ team }) {
  const [tab, setTab] = useState('review');
  const content = clubHistoryFor(team.id);
  const stanzas = content.anthemLyrics.split(/\n{2,}/);
  return <section className="club-history-published"><nav className="club-history-tabs" aria-label="Contenido histórico del club"><button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>RESEÑA</button><button className={tab === 'anthem' ? 'active' : ''} onClick={() => setTab('anthem')}>HIMNO</button></nav>{tab === 'review' && <article className="published-review"><h2>RESEÑA HISTÓRICA</h2><p>{content.review}</p></article>}{tab === 'anthem' && <div className="published-anthem"><aside><h2>HIMNO DEL CLUB</h2>{content.anthemUrl ? <audio controls preload="metadata" src={content.anthemUrl}/> : <p className="empty-copy">ARCHIVO DE AUDIO PENDIENTE DE PUBLICACIÓN.</p>}</aside><article><h2>LETRA DEL HIMNO</h2><div className="anthem-lyrics-columns">{stanzas.map((stanza, index) => <p key={index}>{stanza}</p>)}</div></article></div>}</section>;
}

export function TeamDetailPage({ team, squad, standings, matches = [], history = [], historyError, loading, onBack, onChanged }) {
  const [activeTab, setActiveTab] = useState('president');
  const [squadTab, setSquadTab] = useState('starters');
  const [historyTab, setHistoryTab] = useState('review');
  const [review, setReview] = useState('');
  const [anthemLyrics, setAnthemLyrics] = useState('');
  const [anthemPreview, setAnthemPreview] = useState('');
  useEffect(() => {
    const published = clubHistoryFor(team?.id);
    setReview(published.review);
    setAnthemLyrics(published.anthemLyrics);
    setAnthemPreview(published.anthemUrl);
  }, [team?.id]);
  useEffect(() => () => { if (anthemPreview.startsWith('blob:')) URL.revokeObjectURL(anthemPreview); }, [anthemPreview]);
  const selectAnthem = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnthemPreview(current => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };
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
      <nav className="club-detail-tabs" aria-label="Secciones del club">{[['president','PRESIDENTE'],['coach','DIRECTOR TÉCNICO'],['squad','PLANTEL'],['budget','PRESUPUESTO'],['honours','PALMARÉS'],['history','HISTORIA']].map(([value, label]) => <button className={activeTab === value ? 'active' : ''} onClick={() => setActiveTab(value)} key={value}>{label}</button>)}</nav>
      <section className="club-tab-panel">{activeTab === 'president' && <div className="club-person-tab"><div className="president-card"><PersonPhoto photo={photo} name={presidentName}/><p><b>{presidentName}</b></p></div><div className="inline-team-editor"><h2>EDITAR PRESIDENTE Y FOTO</h2><PresidentForm team={team} onChanged={onChanged}/></div></div>}{activeTab === 'coach' && <div className="club-person-tab"><div className="president-card coach-card"><PersonPhoto photo={managerPhoto} name={coachName}/><p><b>{coachName}</b></p></div><div className="inline-team-editor"><h2>EDITAR DIRECTOR TÉCNICO Y FOTO</h2><CoachForm team={team} onChanged={onChanged}/></div></div>}{activeTab === 'squad' && <div className="club-squad-tab"><nav className="club-squad-tabs" aria-label="Secciones del plantel">{[['starters','TITULARES'],['substitutes','SUPLENTES'],['edit','EDITAR PLANTEL']].map(([value, label]) => <button className={squadTab === value ? 'active' : ''} onClick={() => setSquadTab(value)} key={value}>{label}</button>)}</nav>{squadTab === 'starters' && <section className="roster-panel club-tab-roster"><h2>PLANTEL TITULAR <small>{starters.length} / 11</small></h2><RosterHeader/><div className="roster-list">{starters.length ? starters.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay titulares definidos.</p>}</div></section>}{squadTab === 'substitutes' && <section className="roster-panel club-tab-roster"><h2>SUPLENTES <small>{substitutes.length}</small></h2><RosterHeader/><div className="roster-list substitutes">{substitutes.length ? substitutes.map(player => <PlayerRow player={player} key={player.id}/>) : <p className="empty-copy">No hay suplentes registrados.</p>}</div></section>}{squadTab === 'edit' && <div className="club-squad-editor"><SquadEditor team={team} squad={squad} onChanged={onChanged}/></div>}</div>}{activeTab === 'budget' && <div className="club-budget-tab"><h2>PRESUPUESTO DEL CLUB</h2><BudgetForm team={team} onChanged={onChanged}/></div>}{activeTab === 'honours' && <section className="club-lower-panel honours-panel club-tab-honours"><h2>PALMARÉS</h2><div className="honours-list">{honours.length ? honours.map(item => <article key={item.id}><span aria-hidden="true">★</span><b>{item.name}</b>{item.season && <small>{item.season}</small>}</article>) : <p className="empty-copy">AÚN NO HAY TÍTULOS REGISTRADOS.</p>}</div>{historyError && <p className="honours-api-note">NO FUE POSIBLE CONSULTAR EL HISTORIAL DEL CLUB.</p>}</section>}{activeTab === 'history' && <div className="club-history-tab"><nav className="club-history-tabs" aria-label="Contenido histórico del club">{[['review','RESEÑA'],['anthem','HIMNO']].map(([value, label]) => <button className={historyTab === value ? 'active' : ''} onClick={() => setHistoryTab(value)} key={value}>{label}</button>)}</nav>{historyTab === 'review' && <section className="club-review-editor"><label>RESEÑA HISTÓRICA<textarea value={review} onChange={event => setReview(event.target.value)} placeholder="Describe la fundación, identidad, hitos y evolución histórica del club."/></label><button className="action-button" disabled>GUARDAR RESEÑA</button></section>}{historyTab === 'anthem' && <section className="club-anthem-editor"><div className="club-anthem-audio"><label>ARCHIVO DEL HIMNO<input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4" onChange={selectAnthem}/></label>{(anthemPreview || team.anthemUrl) ? <audio controls preload="metadata" src={anthemPreview || team.anthemUrl}/> : <p className="empty-copy">SELECCIONA UN ARCHIVO PARA ESCUCHAR LA VISTA PREVIA.</p>}</div><label>LETRA DEL HIMNO<textarea value={anthemLyrics} onChange={event => setAnthemLyrics(event.target.value)} placeholder="Escribe aquí la letra completa del himno."/></label><button className="action-button" disabled>GUARDAR HIMNO Y LETRA</button></section>}<p className="history-api-note">VISTA PREVIA LOCAL: LA API TODAVÍA NO ADMITE GUARDAR RESEÑAS, LETRAS NI ARCHIVOS DE AUDIO.</p></div>}</section>
      {activeTab === 'history' && <PublishedClubHistory team={team}/>}
    </>}
  </section></main>;
}
