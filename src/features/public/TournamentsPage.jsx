import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { EntityLink } from '../../components/EntityLink.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { TournamentAdminPanel, TournamentAwardsPanel } from '../admin/TournamentAdminPanel.jsx';
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

function PlayoffSeriesCard({ series, resolveTeam, showWinner = true }) {
  const stage = series.round === 'semifinal' ? `SEMIFINAL ${series.slot}` : 'FINAL';
  const home = resolveTeam(series.homeTeam); const away = resolveTeam(series.awayTeam);
  const twoLegs = series.matches.length > 1;
  const firstLeg = series.matches.find(match => Number(match.leg) === 1) ?? series.matches[0];
  const secondLeg = twoLegs ? (series.matches.find(match => Number(match.leg) === 2) ?? series.matches[1]) : null;
  const matchTeamId = (match, side) => match?.[side === 'home' ? 'homeTeamId' : 'awayTeamId'] ?? match?.[side === 'home' ? 'home_team_id' : 'away_team_id'] ?? match?.[side === 'home' ? 'homeTeam' : 'awayTeam']?.id ?? match?.[side === 'home' ? 'home_team' : 'away_team']?.id;
  const sameTeam = (left, right) => left != null && right != null && String(left) === String(right);
  const matchScore = (match, side) => match?.[side === 'home' ? 'homeScore' : 'awayScore'] ?? match?.[side === 'home' ? 'home_score' : 'away_score'];
  const scoreFor = (match, team, side) => {
    if (!match) return '–';
    if (sameTeam(matchTeamId(match, 'home'), team.id)) return matchScore(match, 'home') ?? '–';
    if (sameTeam(matchTeamId(match, 'away'), team.id)) return matchScore(match, 'away') ?? '–';
    const reversedLeg = Number(match.leg) === 2;
    return side === 'home' ? matchScore(match, reversedLeg ? 'away' : 'home') ?? '–' : matchScore(match, reversedLeg ? 'home' : 'away') ?? '–';
  };
  const aggregateFor = (team, side) => {
    const scores = series.matches.map(match => Number(scoreFor(match, team, side)));
    return scores.every(Number.isFinite) ? scores.reduce((total, score) => total + score, 0) : '–';
  };
  const aggregate = { home: aggregateFor(home, 'home'), away: aggregateFor(away, 'away') };
  const legLink = (match, label) => match ? <EntityLink to="match" id={match.id} className="playoff-leg-link">{label}</EntityLink> : <span>{label}</span>;
  return <article className={`playoff-series status-${series.status}`}><header className="playoff-series-head"><small>{stage}</small><span>{twoLegs ? 'IDA Y VUELTA' : 'PARTIDO ÚNICO'}</span></header><div className="playoff-score-table"><div className="playoff-score-heading"><span>CLUB</span>{legLink(firstLeg, twoLegs ? 'IDA' : 'ÚNICO')}{twoLegs ? legLink(secondLeg, 'VUELTA') : <span>—</span>}<span>GLOBAL</span></div>{[[home, 'home'], [away, 'away']].map(([team, side]) => <div className="playoff-score-row" key={team.id}><EntityLink to="team" id={team.id}><TeamMark team={team}/><span>{team.name}</span></EntityLink><b>{scoreFor(firstLeg, team, side)}</b><b>{scoreFor(secondLeg, team, side)}</b><b>{aggregate[side]}</b></div>)}</div>{series.status === 'awaiting_tiebreak' && <em>DEFINICIÓN POR PENALES PENDIENTE</em>}{showWinner && series.winnerTeamId && <strong>CLASIFICA {series.winnerTeamId === home.id ? home.name : away.name}</strong>}</article>;
}

function CreateTournamentForm({ teams, onChanged }) {
  const [form, setForm] = useState({ name: '', format: 'league', competitorKind: 'club', championPolicy: 'regular_season', teamIds: [] });
  const mutation = useApiMutation((body, signal) => endpoints.createTournament(body, signal), { onSuccess: onChanged });
  const candidates = teams.filter(team => team.kind === form.competitorKind);
  useEffect(() => {
    setForm(current => current.teamIds.length ? { ...current, teamIds: current.teamIds.filter(id => candidates.some(team => team.id === id)) } : { ...current, teamIds: candidates.map(team => team.id) });
  }, [form.competitorKind, teams]);
  const change = event => setForm(current => event.target.name === 'competitorKind'
    ? { ...current, competitorKind: event.target.value, teamIds: teams.filter(team => team.kind === event.target.value).map(team => team.id) }
    : { ...current, [event.target.name]: event.target.value });
  const toggle = teamId => setForm(current => ({ ...current, teamIds: current.teamIds.includes(teamId) ? current.teamIds.filter(id => id !== teamId) : [...current.teamIds, teamId] }));
  const submit = event => {
    event.preventDefault();
    if (window.confirm(`¿CREAR ${form.name} CON ${form.teamIds.length} PARTICIPANTES?`)) mutation.execute(form);
  };
  const invalidKnockout = form.format === 'knockout' && (form.teamIds.length < 2 || (form.teamIds.length & (form.teamIds.length - 1)) !== 0);
  return <form className="admin-form tournament-create-form" onSubmit={submit}><label>NOMBRE<input required name="name" value={form.name} onChange={change}/></label><label>FORMATO<select name="format" value={form.format} onChange={change}><option value="league">LIGA</option><option value="groups_knockout">GRUPOS + ELIMINACIÓN</option><option value="knockout">ELIMINACIÓN DIRECTA</option></select></label>{form.format === 'league' && <label>CAMPEONES<select name="championPolicy" value={form.championPolicy} onChange={change}><option value="regular_season">TABLA DE FASE REGULAR</option><option value="playoffs">PLAYOFFS</option><option value="both">LIGA REGULAR + PLAYOFFS</option></select></label>}<label>COMPETIDORES<select name="competitorKind" value={form.competitorKind} onChange={change}><option value="club">CLUBES</option><option value="national_team">SELECCIONES</option></select></label><section className="division-team-list"><p>PARTICIPANTES: <b>{form.teamIds.length}</b></p>{candidates.map(team => <label key={team.id}><input type="checkbox" checked={form.teamIds.includes(team.id)} onChange={() => toggle(team.id)}/><span>{team.name}</span></label>)}</section>{form.format === 'knockout' && <p className="admin-empty compact">LA ELIMINACIÓN DIRECTA REQUIERE 2, 4, 8, 16… PARTICIPANTES.</p>}<button className="action-button" disabled={mutation.loading || form.teamIds.length < 2 || invalidKnockout}>CREAR TORNEO</button><FormFeedback mutation={mutation}/></form>;
}

const tournamentStartValue = tournament => tournament.startDate
  ?? tournament.start_date
  ?? tournament.startedAt
  ?? tournament.started_at
  ?? tournament.startAt
  ?? tournament.start_at
  ?? tournament.createdAt
  ?? tournament.created_at
  ?? tournament.date
  ?? '';

const tournamentStartTime = tournament => {
  const value = tournamentStartValue(tournament);
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
};

function ScorersPanel({ query }) {
  const rows = Array.isArray(query.data) ? query.data : [];
  return <section className="workspace-panel tournament-scorers"><h3>GOLEADORES</h3><DataState query={query}/>
    {!query.loading && !query.error && (rows.length ? <ol className="tournament-scorer-list">{rows.map((row, index) => <li key={row.playerId ?? row.name}><b>{index + 1}</b><EntityLink to="player" id={row.playerId}>{row.playerName ?? row.name}</EntityLink><strong>{row.goals ?? 0}</strong></li>)}</ol> : <p className="empty-copy">AÚN NO HAY GOLES.</p>)}
  </section>;
}

function PlayoffsSection({ tournamentId, resolveTeam }) {
  const playoffs = useApiQuery(signal => endpoints.playoffs(tournamentId, signal), [tournamentId]);
  const data = playoffs.data;
  if (playoffs.loading || playoffs.error || !data) return null;
  const semis = data.series?.filter(series => series.round === 'semifinal') ?? [];
  const final = data.series?.find(series => series.round === 'final');
  const champion = final?.winnerTeamId ? [resolveTeam(final.homeTeam), resolveTeam(final.awayTeam)].find(team => String(team.id) === String(final.winnerTeamId)) : null;
  return <section className="workspace-panel playoff-workspace"><h3>PLAYOFFS <small>TOP 4 · SEMIFINALES {data.semifinalLegs === 1 ? 'A PARTIDO ÚNICO' : 'IDA Y VUELTA'} · FINAL {data.finalLegs === 1 ? 'A PARTIDO ÚNICO' : 'IDA Y VUELTA'}</small></h3><div className="playoff-bracket"><div className="playoff-semi-rounds">{semis.map(series => <section className="playoff-round" key={series.id}><h4>SEMIFINAL {series.slot}</h4><PlayoffSeriesCard series={series} resolveTeam={resolveTeam}/></section>)}</div><div className="playoff-connector" aria-hidden="true"/><section className="playoff-round playoff-final-round"><h4>FINAL</h4>{final ? <PlayoffSeriesCard series={final} resolveTeam={resolveTeam} showWinner={false}/> : <p className="playoff-awaiting">ESPERANDO FINALISTAS</p>}</section></div>{champion && <div className="playoff-champion" role="status"><span aria-hidden="true">🏆</span><strong>CAMPEÓN: {champion.name}</strong></div>}</section>;
}

function TournamentWorkspace({ tournamentId, teams, onChanged, onDeleted }) {
  const [managing, setManaging] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState('standings');
  const detail = useApiQuery(signal => endpoints.tournament(tournamentId, signal), [tournamentId]);
  const standings = useApiQuery(signal => endpoints.standings(tournamentId, {}, signal), [tournamentId]);
  const scorers = useApiQuery(signal => endpoints.scorers(tournamentId, signal), [tournamentId]);
  const standingRows = Array.isArray(standings.data) ? standings.data : [];
  const teamIndex = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const resolveTeam = team => ({ ...team, ...(teamIndex.get(team?.id ?? team?.team_id) ?? {}) });
  const groupLabels = useMemo(() => [...new Set((detail.data?.teams ?? []).map(team => team.groupLabel).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right))), [detail.data]);
  const refresh = () => { detail.retry(); standings.retry(); scorers.retry(); onChanged?.(); };
  useEffect(() => { setManaging(false); setWorkspaceTab('standings'); }, [tournamentId]);
  const data = detail.data;
  const statusLabel = { active: 'EN JUEGO', completed: 'TERMINADO', draft: 'EN PREPARACIÓN' }[data?.status] ?? data?.status;
  const regularChampionId = data?.championTeamId ?? data?.champion_team_id;
  const regularChampionRow = regularChampionId
    ? standingRows.find(row => String(row.team_id ?? row.id) === String(regularChampionId))
    : standingRows[0];
  const regularChampion = data?.status === 'completed' && data?.format === 'league' && data?.championPolicy !== 'playoffs' && groupLabels.length === 0 && regularChampionRow
    ? resolveTeam(regularChampionRow)
    : null;

  return <section className="tournament-workspace"><DataState query={detail}/>{data && <>
    <header className="tournament-header"><div><small>{data.format === 'league' ? 'LIGA' : data.format === 'knockout' ? 'ELIMINACIÓN DIRECTA' : 'GRUPOS + ELIMINACIÓN'}{data.format === 'league' ? ` · CAMPEONES: ${data.championPolicy === 'both' ? 'LIGA REGULAR + PLAYOFFS' : data.championPolicy === 'playoffs' ? 'PLAYOFFS' : 'TABLA'}` : ''}</small><h2>{data.name}</h2></div><b className={`status status-${data.status}`}>{statusLabel}</b><button type="button" className={`tournament-manage-button ${managing ? 'active' : ''}`} aria-pressed={managing} onClick={() => setManaging(value => !value)}>{managing ? '← VOLVER A LA TABLA' : '⚙ GESTIONAR TORNEO'}</button></header>
    {managing ? <TournamentAdminPanel key={data.id} tournament={data} teams={teams} onChanged={refresh} onDeleted={onDeleted}/> : <>
      <nav className="tournament-subtabs" aria-label="Secciones del torneo" role="tablist">
        <button type="button" role="tab" aria-selected={workspaceTab === 'standings'} className={workspaceTab === 'standings' ? 'active' : ''} onClick={() => setWorkspaceTab('standings')}>TABLA DE POSICIONES</button>
        <button type="button" role="tab" aria-selected={workspaceTab === 'scorers'} className={workspaceTab === 'scorers' ? 'active' : ''} onClick={() => setWorkspaceTab('scorers')}>GOLEADORES</button>
        <button type="button" role="tab" aria-selected={workspaceTab === 'playoffs'} className={workspaceTab === 'playoffs' ? 'active' : ''} onClick={() => setWorkspaceTab('playoffs')} disabled={data.format !== 'league'}>PLAYOFFS</button>
        {data.status === 'completed' && <button type="button" role="tab" aria-selected={workspaceTab === 'awards'} className={workspaceTab === 'awards' ? 'active' : ''} onClick={() => setWorkspaceTab('awards')}>GESTIÓN DE PREMIOS</button>}
      </nav>
      <div className="tournament-main">
        {workspaceTab === 'standings' && (groupLabels.length > 0
          ? <section className="workspace-panel standings-workspace-panel"><h3>CLASIFICACIÓN POR GRUPOS</h3><div className="tournament-groups">{groupLabels.map(groupLabel => <GroupStandings key={groupLabel} tournamentId={tournamentId} groupLabel={groupLabel} resolveTeam={resolveTeam}/>)}</div></section>
          : <section className="workspace-panel standings-workspace-panel"><h3>TABLA DE POSICIONES</h3><DataState query={standings}/>{standingRows.length > 0 && <StandingsTable rows={standingRows} resolveTeam={resolveTeam}/>} {regularChampion && <div className="playoff-champion" role="status"><span aria-hidden="true">🏆</span><TeamMark team={regularChampion}/><strong>CAMPEÓN: {regularChampion.name}</strong></div>}</section>)}
        {workspaceTab === 'scorers' && <ScorersPanel query={scorers}/>}
        {workspaceTab === 'playoffs' && data.format === 'league' && <PlayoffsSection tournamentId={tournamentId} resolveTeam={resolveTeam}/>}
        {workspaceTab === 'awards' && data.status === 'completed' && <TournamentAwardsPanel tournament={data} onChanged={refresh}/>}
      </div>
    </>}
  </>}</section>;
}

export function TournamentsPage({ teams = [] }) {
  const tournaments = useApiQuery(signal => endpoints.tournaments({ page: 1, pageSize: 100 }, signal));
  const [selectedId, setSelectedId] = useState(null);
  const [tournamentTab, setTournamentTab] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const all = Array.isArray(tournaments.data) ? tournaments.data : [];
  const priority = tournament => tournament.format === 'league' || /liga/i.test(tournament.name ?? '') ? 0 : 1;
  const active = useMemo(() => all.filter(item => item.status !== 'completed').sort((a, b) => priority(a) - priority(b) || (a.name ?? '').localeCompare(b.name ?? '', 'es')), [all]);
  const completed = useMemo(() => all
    .filter(item => item.status === 'completed')
    .sort((a, b) => tournamentStartTime(b) - tournamentStartTime(a) || (a.name ?? '').localeCompare(b.name ?? '', 'es')), [all]);
  useEffect(() => {
    const visible = tournamentTab === 'completed' ? completed : active;
    if (!visible.some(item => item.id === selectedId)) setSelectedId(visible[0]?.id ?? null);
  }, [active, completed, selectedId, tournamentTab]);
  const deleted = () => { setSelectedId(null); tournaments.retry(); };
  const selectedCompletedId = completed.some(item => item.id === selectedId) ? selectedId : '';
  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="COMPETICIONES OFICIALES" title="TORNEOS"><button className="page-action" onClick={() => setShowCreate(value => !value)}>{showCreate ? 'CERRAR ALTA' : '+ CREAR TORNEO'}</button></PageHeader>
    {showCreate && <CreateTournamentForm teams={teams} onChanged={() => { setShowCreate(false); tournaments.retry(); }}/>}
    <DataState query={tournaments}/>
    {all.length > 0 && <>
      <nav className="tournament-tabs" aria-label="Secciones de torneos" role="tablist">
        <button type="button" role="tab" aria-selected={tournamentTab === 'active'} className={tournamentTab === 'active' ? 'active' : ''} onClick={() => setTournamentTab('active')}>TORNEO EN CURSO</button>
        <button type="button" role="tab" aria-selected={tournamentTab === 'completed'} className={tournamentTab === 'completed' ? 'active' : ''} onClick={() => setTournamentTab('completed')} disabled={!completed.length}>TORNEOS ANTERIORES</button>
      </nav>
      {tournamentTab === 'active'
        ? <div className="tournament-picker tournament-active-picker" role="tabpanel" aria-label="Torneos en curso">
          {active.length > 0 ? active.map(item => <button type="button" key={item.id} className={selectedId === item.id ? 'active' : ''} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>{item.name}</button>) : <p className="empty-copy">NO HAY TORNEOS EN CURSO.</p>}
        </div>
        : <div className="tournament-history-selector" role="tabpanel" aria-label="Torneos anteriores">
          {completed.length > 0 ? <label>SELECCIONA UN TORNEO JUGADO<select value={selectedCompletedId} onChange={event => event.target.value && setSelectedId(event.target.value)}><option value="">ELEGIR TORNEO…</option>{completed.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <p className="empty-copy">AÚN NO HAY TORNEOS TERMINADOS.</p>}
        </div>}
    </>}
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
