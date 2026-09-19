import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { EntityLink } from '../../components/EntityLink.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { TournamentAdminPanel } from '../admin/TournamentAdminPanel.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, PageHeader, gp } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

function StandingsTable({ rows, resolveTeam }) {
  return <div className="table-scroll"><table className="league-table"><colgroup><col className="rank-column"/><col className="team-column"/><col className="stat-column" span="8"/></colgroup><thead><tr><th>#</th><th>EQUIPO</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th className="optional-stat">GF</th><th className="optional-stat">GC</th><th className="optional-stat">DG</th><th>PTS</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.team_id ?? row.id}><td>{index + 1}</td><td><EntityLink to="team" id={row.team_id ?? row.id} className="table-team-link"><TeamMark team={resolveTeam(row)}/>{row.name}</EntityLink></td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td className="optional-stat">{row.gf}</td><td className="optional-stat">{row.ga}</td><td className="optional-stat">{row.gd}</td><td><b>{row.points}</b></td></tr>)}</tbody></table></div>;
}

function GroupStandings({ tournamentId, groupLabel, resolveTeam }) {
  const standings = useApiQuery(signal => endpoints.standings(tournamentId, { group: groupLabel }, signal), [tournamentId, groupLabel]);
  const rows = Array.isArray(standings.data) ? standings.data : [];
  return <section className="workspace-panel"><h4>GRUPO {groupLabel}</h4><DataState query={standings}/>{rows.length > 0 && <StandingsTable rows={rows} resolveTeam={resolveTeam}/>}</section>;
}

function PlayoffSeriesCard({ series, resolveTeam }) {
  const stage = series.round === 'semifinal' ? `SEMIFINAL ${series.slot}` : 'FINAL';
  const home = resolveTeam(series.homeTeam); const away = resolveTeam(series.awayTeam);
  return <article className={`playoff-series status-${series.status}`}><small>{stage} · {series.matches.length === 1 ? 'PARTIDO ÚNICO' : 'IDA Y VUELTA'}</small><div><EntityLink to="team" id={home.id}><TeamMark team={home}/>{home.name}</EntityLink><b>{series.aggregate.home}</b></div><div><EntityLink to="team" id={away.id}><TeamMark team={away}/>{away.name}</EntityLink><b>{series.aggregate.away}</b></div>{series.status === 'awaiting_tiebreak' && <em>DEFINICIÓN POR PENALES PENDIENTE</em>}{series.winnerTeamId && <strong>CLASIFICA {series.winnerTeamId === home.id ? home.name : away.name}</strong>}<footer>{series.matches.map(match => <EntityLink to="match" id={match.id} key={match.id}>#{match.leg}: {match.homeScore ?? '–'}-{match.awayScore ?? '–'}</EntityLink>)}</footer></article>;
}

function CreateTournamentForm({ onChanged }) {
  const [form, setForm] = useState({ name: '', format: 'league', competitorKind: 'club', championPolicy: 'regular_season' });
  const mutation = useApiMutation((body, signal) => endpoints.createTournament(body, signal), { onSuccess: onChanged });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = event => {
    event.preventDefault();
    if (window.confirm(`¿CREAR ${form.name} E INSCRIBIR AUTOMÁTICAMENTE SUS COMPETIDORES?`)) mutation.execute(form);
  };
  return <form className="admin-form tournament-create-form" onSubmit={submit}><label>NOMBRE<input required name="name" value={form.name} onChange={change}/></label><label>FORMATO<select name="format" value={form.format} onChange={change}><option value="league">LIGA</option><option value="groups_knockout">GRUPOS + ELIMINACIÓN</option><option value="knockout">ELIMINACIÓN DIRECTA</option></select></label>{form.format === 'league' && <label>CAMPEONES<select name="championPolicy" value={form.championPolicy} onChange={change}><option value="regular_season">TABLA DE FASE REGULAR</option><option value="playoffs">PLAYOFFS</option><option value="both">LIGA REGULAR + PLAYOFFS</option></select></label>}<label>COMPETIDORES<select name="competitorKind" value={form.competitorKind} onChange={change}><option value="club">CLUBES</option><option value="national_team">SELECCIONES</option></select></label><button className="action-button" disabled={mutation.loading}>CREAR TORNEO</button><FormFeedback mutation={mutation}/></form>;
}

const SCORERS_PREVIEW = 10;

function ScorersPanel({ query }) {
  const [expanded, setExpanded] = useState(false);
  const rows = Array.isArray(query.data) ? query.data : [];
  const visible = expanded ? rows : rows.slice(0, SCORERS_PREVIEW);
  return <section className="workspace-panel tournament-scorers"><h3>GOLEADORES</h3><DataState query={query}/>
    {!query.loading && !query.error && (rows.length ? <ol className="tournament-scorer-list">{visible.map((row, index) => <li key={row.playerId ?? row.name}><b>{index + 1}</b><EntityLink to="player" id={row.playerId}>{row.playerName ?? row.name}</EntityLink><strong>{row.goals ?? 0}</strong></li>)}</ol> : <p className="empty-copy">AÚN NO HAY GOLES.</p>)}
    {rows.length > SCORERS_PREVIEW && <button type="button" className="club-link-button" onClick={() => setExpanded(value => !value)}>{expanded ? 'VER MENOS' : `VER LOS ${rows.length}`}</button>}
  </section>;
}

function PlayoffsSection({ tournamentId, resolveTeam }) {
  const playoffs = useApiQuery(signal => endpoints.playoffs(tournamentId, signal), [tournamentId]);
  const data = playoffs.data;
  if (playoffs.loading || playoffs.error || !data) return null;
  const semis = data.series?.filter(series => series.round === 'semifinal') ?? [];
  const final = data.series?.find(series => series.round === 'final');
  return <section className="workspace-panel playoff-workspace"><h3>PLAYOFFS <small>TOP 4 · SEMIFINALES {data.semifinalLegs === 1 ? 'A PARTIDO ÚNICO' : 'IDA Y VUELTA'} · FINAL {data.finalLegs === 1 ? 'A PARTIDO ÚNICO' : 'IDA Y VUELTA'}</small></h3><div className="playoff-bracket"><section><h4>SEMIFINALES</h4>{semis.map(series => <PlayoffSeriesCard key={series.id} series={series} resolveTeam={resolveTeam}/>)}</section><section><h4>FINAL</h4>{final ? <PlayoffSeriesCard series={final} resolveTeam={resolveTeam}/> : <p className="playoff-awaiting">ESPERANDO FINALISTAS</p>}</section></div></section>;
}

function TournamentWorkspace({ tournamentId, teams, onChanged, onDeleted }) {
  const [managing, setManaging] = useState(false);
  const detail = useApiQuery(signal => endpoints.tournament(tournamentId, signal), [tournamentId]);
  const standings = useApiQuery(signal => endpoints.standings(tournamentId, {}, signal), [tournamentId]);
  const scorers = useApiQuery(signal => endpoints.scorers(tournamentId, signal), [tournamentId]);
  const standingRows = Array.isArray(standings.data) ? standings.data : [];
  const teamIndex = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const resolveTeam = team => ({ ...team, ...(teamIndex.get(team?.id ?? team?.team_id) ?? {}) });
  const groupLabels = useMemo(() => [...new Set((detail.data?.teams ?? []).map(team => team.groupLabel).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right))), [detail.data]);
  const refresh = () => { detail.retry(); standings.retry(); scorers.retry(); onChanged?.(); };
  useEffect(() => setManaging(false), [tournamentId]);
  const data = detail.data;
  const statusLabel = { active: 'EN JUEGO', completed: 'TERMINADO', draft: 'EN PREPARACIÓN' }[data?.status] ?? data?.status;

  return <section className="tournament-workspace"><DataState query={detail}/>{data && <>
    <header className="tournament-header"><div><small>{data.format === 'league' ? 'LIGA' : data.format === 'knockout' ? 'ELIMINACIÓN DIRECTA' : 'GRUPOS + ELIMINACIÓN'}{data.format === 'league' ? ` · CAMPEONES: ${data.championPolicy === 'both' ? 'LIGA REGULAR + PLAYOFFS' : data.championPolicy === 'playoffs' ? 'PLAYOFFS' : 'TABLA'}` : ''}</small><h2>{data.name}</h2></div><b className={`status status-${data.status}`}>{statusLabel}</b><button type="button" className={`tournament-manage-button ${managing ? 'active' : ''}`} aria-pressed={managing} onClick={() => setManaging(value => !value)}>{managing ? '← VOLVER A LA TABLA' : '⚙ GESTIONAR TORNEO'}</button></header>
    {managing ? <TournamentAdminPanel key={data.id} tournament={data} teams={teams} onChanged={refresh} onDeleted={onDeleted}/> : <>
      <div className="tournament-main">
        {groupLabels.length > 0
          ? <section className="workspace-panel standings-workspace-panel"><h3>CLASIFICACIÓN POR GRUPOS</h3><div className="tournament-groups">{groupLabels.map(groupLabel => <GroupStandings key={groupLabel} tournamentId={tournamentId} groupLabel={groupLabel} resolveTeam={resolveTeam}/>)}</div></section>
          : <section className="workspace-panel standings-workspace-panel"><h3>TABLA DE POSICIONES</h3><DataState query={standings}/>{standingRows.length > 0 && <StandingsTable rows={standingRows} resolveTeam={resolveTeam}/>}</section>}
        <ScorersPanel query={scorers}/>
      </div>
      {data.format === 'league' && <PlayoffsSection tournamentId={tournamentId} resolveTeam={resolveTeam}/>}
    </>}
  </>}</section>;
}

export function TournamentsPage({ teams = [] }) {
  const tournaments = useApiQuery(signal => endpoints.tournaments({ page: 1, pageSize: 100 }, signal));
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const all = Array.isArray(tournaments.data) ? tournaments.data : [];
  const priority = tournament => tournament.format === 'league' || /liga/i.test(tournament.name ?? '') ? 0 : 1;
  const active = useMemo(() => all.filter(item => item.status !== 'completed').sort((a, b) => priority(a) - priority(b) || (a.name ?? '').localeCompare(b.name ?? '', 'es')), [all]);
  const completed = useMemo(() => all.filter(item => item.status === 'completed').sort((a, b) => String(b.createdAt ?? b.created_at ?? '').localeCompare(String(a.createdAt ?? a.created_at ?? '')) || (a.name ?? '').localeCompare(b.name ?? '', 'es')), [all]);
  useEffect(() => { if (!all.some(item => item.id === selectedId)) setSelectedId(active[0]?.id ?? completed[0]?.id ?? null); }, [all, active, completed, selectedId]);
  const deleted = () => { setSelectedId(null); tournaments.retry(); };
  const selectedCompleted = completed.some(item => item.id === selectedId);
  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="COMPETICIONES OFICIALES" title="TORNEOS"><button className="page-action" onClick={() => setShowCreate(value => !value)}>{showCreate ? 'CERRAR ALTA' : '+ CREAR TORNEO'}</button></PageHeader>
    {showCreate && <CreateTournamentForm onChanged={() => { setShowCreate(false); tournaments.retry(); }}/>}
    <DataState query={tournaments}/>
    {all.length > 0 && <nav className="tournament-picker" aria-label="Elegir torneo">
      {active.map(item => <button type="button" key={item.id} className={selectedId === item.id ? 'active' : ''} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>{item.name}</button>)}
      {completed.length > 0 && <label className={`tournament-history ${selectedCompleted ? 'active' : ''}`}>TORNEOS TERMINADOS<select value={selectedCompleted ? selectedId : ''} onChange={event => event.target.value && setSelectedId(event.target.value)}><option value="">ELEGIR…</option>{completed.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    </nav>}
    {!tournaments.loading && !all.length && <p className="empty-copy">AÚN NO HAY TORNEOS.</p>}
    {selectedId && <TournamentWorkspace key={selectedId} tournamentId={selectedId} teams={teams} onChanged={() => tournaments.retry()} onDeleted={deleted}/>}
  </section></main>;
}

export function RankingsPage({ teams = [], navigate }) {
  const rankings = useApiQuery(signal => endpoints.squadRankings({ page: 1, pageSize: 100 }, signal));
  const divisions = useApiQuery(signal => endpoints.divisions(signal));
  const rankingRows = Array.isArray(rankings.data) ? rankings.data : [];
  const divisionRows = Array.isArray(divisions.data) ? divisions.data : Object.entries(divisions.data ?? {}).map(([name, members]) => ({ name, teams: Array.isArray(members) ? members : [] }));
  const teamIndex = new Map(teams.map(team => [team.id, team]));
  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="ESTADÍSTICAS DE EQUIPOS" title="RANKINGS Y DIVISIONES"/><div className="workspace-columns"><section className="workspace-panel"><h3>VALOR DE PLANTELES</h3><DataState query={rankings}/>{rankingRows.map((row, index) => <p className="ranking-row ranking-team-row" key={row.teamId ?? row.team_id ?? row.id}><b>{index + 1}</b><TeamMark team={{ ...row, ...(teamIndex.get(row.teamId ?? row.team_id ?? row.id) ?? {}) }}/><EntityLink to="team" id={row.teamId ?? row.team_id ?? row.id}>{row.teamName ?? row.team_name ?? row.name}</EntityLink><strong>{gp(row.squadValue ?? row.squad_value ?? row.value)}</strong></p>)}</section><section className="workspace-panel"><h3>DIVISIONES</h3><DataState query={divisions}/>{divisionRows.map(row => <p className="ranking-row division-row" key={row.id ?? row.name}><span>{String(row.name ?? row.division).replaceAll('_', ' ').toUpperCase()}</span><strong>{row.teamCount ?? row.team_count ?? row.teams?.length ?? '—'} EQUIPOS</strong></p>)}</section></div></section></main>;
}
