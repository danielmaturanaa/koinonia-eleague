import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { TournamentAdminPanel } from '../admin/TournamentAdminPanel.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, PageHeader, gp } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

function StandingsTable({ rows, resolveTeam }) {
  return <div className="table-scroll"><table className="league-table"><colgroup><col className="rank-column"/><col className="team-column"/><col className="stat-column" span="8"/></colgroup><thead><tr><th>#</th><th>EQUIPO</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th className="optional-stat">GF</th><th className="optional-stat">GC</th><th className="optional-stat">DG</th><th>PTS</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.team_id ?? row.id}><td>{index + 1}</td><td><TeamMark team={resolveTeam(row)}/>{row.name}</td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td className="optional-stat">{row.gf}</td><td className="optional-stat">{row.ga}</td><td className="optional-stat">{row.gd}</td><td><b>{row.points}</b></td></tr>)}</tbody></table></div>;
}

function GroupStandings({ tournamentId, groupLabel, resolveTeam }) {
  const standings = useApiQuery(signal => endpoints.standings(tournamentId, { group: groupLabel }, signal), [tournamentId, groupLabel]);
  const rows = Array.isArray(standings.data) ? standings.data : [];
  return <section className="workspace-panel"><h4>GRUPO {groupLabel}</h4><DataState query={standings}/>{rows.length > 0 && <StandingsTable rows={rows} resolveTeam={resolveTeam}/>}</section>;
}

function CreateTournamentForm({ onChanged }) {
  const [form, setForm] = useState({ name: '', format: 'league', competitorKind: 'club' });
  const mutation = useApiMutation((body, signal) => endpoints.createTournament(body, signal), { onSuccess: onChanged });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = event => {
    event.preventDefault();
    if (window.confirm(`¿CREAR ${form.name} E INSCRIBIR AUTOMÁTICAMENTE SUS COMPETIDORES?`)) mutation.execute(form);
  };
  return <form className="admin-form tournament-create-form" onSubmit={submit}><label>NOMBRE<input required name="name" value={form.name} onChange={change}/></label><label>FORMATO<select name="format" value={form.format} onChange={change}><option value="league">LIGA</option><option value="groups_knockout">GRUPOS + ELIMINACIÓN</option><option value="knockout">ELIMINACIÓN DIRECTA</option></select></label><label>COMPETIDORES<select name="competitorKind" value={form.competitorKind} onChange={change}><option value="club">CLUBES</option><option value="national_team">SELECCIONES</option></select></label><button className="action-button" disabled={mutation.loading}>CREAR TORNEO</button><FormFeedback mutation={mutation}/></form>;
}

function TournamentWorkspace({ tournamentId, classificationOnly, teams, onChanged, onDeleted }) {
  const [classificationView, setClassificationView] = useState('standings');
  const detail = useApiQuery(signal => endpoints.tournament(tournamentId, signal), [tournamentId]);
  const standings = useApiQuery(signal => classificationOnly ? endpoints.standings(tournamentId, {}, signal) : Promise.resolve({ data: [] }), [tournamentId, classificationOnly]);
  const scorers = useApiQuery(signal => classificationOnly ? endpoints.scorers(tournamentId, signal) : Promise.resolve({ data: [] }), [tournamentId, classificationOnly]);
  const standingRows = Array.isArray(standings.data) ? standings.data : [];
  const scorerRows = Array.isArray(scorers.data) ? scorers.data : [];
  const teamIndex = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const resolveTeam = team => ({ ...team, ...(teamIndex.get(team?.id ?? team?.team_id) ?? {}) });
  const groupLabels = useMemo(() => [...new Set((detail.data?.teams ?? []).map(team => team.groupLabel).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right))), [detail.data]);
  const refresh = () => { detail.retry(); standings.retry(); scorers.retry(); onChanged?.(); };

  return <section className={`tournament-workspace ${classificationOnly ? 'classification-workspace' : 'management-workspace'}`}><DataState query={detail}/>{detail.data && <><header><div><small>{detail.data.format?.replaceAll('_', ' ')} · {detail.data.competitorKind}</small><h2>{detail.data.name}</h2></div><b className={`status status-${detail.data.status}`}>{detail.data.status}</b></header>{classificationOnly ? <>
    <nav className="classification-view-tabs classification-content-tabs" aria-label="Datos del torneo"><button className={classificationView === 'standings' ? 'active' : ''} onClick={() => setClassificationView('standings')}>TABLA DE CLASIFICACIÓN</button><button className={classificationView === 'scorers' ? 'active' : ''} onClick={() => setClassificationView('scorers')}>TABLA DE GOLEADORES</button></nav>
    {classificationView === 'standings' && (groupLabels.length > 0 ? <section className="standings-workspace-panel"><h3>CLASIFICACIÓN POR GRUPOS</h3><div className="workspace-columns">{groupLabels.map(groupLabel => <GroupStandings key={groupLabel} tournamentId={tournamentId} groupLabel={groupLabel} resolveTeam={resolveTeam}/>)}</div></section> : <section className="workspace-panel standings-workspace-panel"><h3>TABLA DE CLASIFICACIÓN COMPLETA</h3><DataState query={standings}/>{standingRows.length > 0 && <StandingsTable rows={standingRows} resolveTeam={resolveTeam}/>}</section>)}
    {classificationView === 'scorers' && <section className="workspace-panel scorers-workspace-panel"><h3>TABLA DE GOLEADORES</h3><DataState query={scorers}/><div className="scorers-list">{scorerRows.map((row, index) => <p className="ranking-row" key={row.playerId ?? row.id}><b>{index + 1}</b><span>{row.playerName ?? row.name}</span><strong>{row.goals ?? 0}</strong></p>)}</div></section>}
  </> : <TournamentAdminPanel key={detail.data.id} tournament={detail.data} teams={teams} onChanged={refresh} onDeleted={onDeleted}/>}</>}
  </section>;
}

export function TournamentsPage({ classificationOnly = false, teams = [] }) {
  const tournaments = useApiQuery(signal => endpoints.tournaments({ page: 1, pageSize: 100 }, signal));
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const rows = useMemo(() => {
    const source = Array.isArray(tournaments.data) ? tournaments.data : [];
    if (!classificationOnly) return source;
    const priority = tournament => tournament.format === 'league' || /liga/i.test(tournament.name ?? '') ? 0 : 1;
    return source.filter(item => item.status === statusFilter).sort((a, b) => priority(a) - priority(b) || (a.name ?? '').localeCompare(b.name ?? '', 'es'));
  }, [classificationOnly, statusFilter, tournaments.data]);
  useEffect(() => { if (!rows.some(item => item.id === selectedId)) setSelectedId(rows[0]?.id ?? null); }, [rows, selectedId]);
  const deleted = () => { setSelectedId(null); tournaments.retry(); };
  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="COMPETICIONES OFICIALES" title={classificationOnly ? 'CLASIFICACIÓN' : 'TORNEOS'}>{!classificationOnly && <button className="page-action" onClick={() => setShowCreate(value => !value)}>{showCreate ? 'CERRAR ALTA' : '+ CREAR TORNEO'}</button>}</PageHeader>{classificationOnly && <nav className="classification-view-tabs" aria-label="Estado de los torneos"><button className={statusFilter === 'active' ? 'active' : ''} onClick={() => setStatusFilter('active')}>TORNEOS ACTIVOS</button><button className={statusFilter === 'completed' ? 'active' : ''} onClick={() => setStatusFilter('completed')}>TORNEOS COMPLETADOS</button></nav>} {showCreate && <CreateTournamentForm onChanged={() => tournaments.retry()}/>}<DataState query={tournaments}/>{rows.length > 0 ? <div className="tournament-tabs">{rows.map(item => <button className={selectedId === item.id ? 'active' : ''} key={item.id} onClick={() => setSelectedId(item.id)}>{item.name}<small>{item.status}</small></button>)}</div> : !tournaments.loading && <p className="empty-copy">NO HAY TORNEOS {statusFilter === 'active' ? 'ACTIVOS' : 'COMPLETADOS'}.</p>}{selectedId && <TournamentWorkspace tournamentId={selectedId} classificationOnly={classificationOnly} teams={teams} onChanged={() => tournaments.retry()} onDeleted={deleted}/>}</section></main>;
}

export function RankingsPage({ teams = [], navigate }) {
  const rankings = useApiQuery(signal => endpoints.squadRankings({ page: 1, pageSize: 100 }, signal));
  const divisions = useApiQuery(signal => endpoints.divisions(signal));
  const rankingRows = Array.isArray(rankings.data) ? rankings.data : [];
  const divisionRows = Array.isArray(divisions.data) ? divisions.data : Object.entries(divisions.data ?? {}).map(([name, members]) => ({ name, teams: Array.isArray(members) ? members : [] }));
  const teamIndex = new Map(teams.map(team => [team.id, team]));
  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="ESTADÍSTICAS DE EQUIPOS" title="RANKINGS Y DIVISIONES"/><div className="workspace-columns"><section className="workspace-panel"><h3>VALOR DE PLANTELES</h3><DataState query={rankings}/>{rankingRows.map((row, index) => <p className="ranking-row ranking-team-row" key={row.teamId ?? row.team_id ?? row.id}><b>{index + 1}</b><TeamMark team={{ ...row, ...(teamIndex.get(row.teamId ?? row.team_id ?? row.id) ?? {}) }}/><span>{row.teamName ?? row.team_name ?? row.name}</span><strong>{gp(row.squadValue ?? row.squad_value ?? row.value)}</strong></p>)}</section><section className="workspace-panel"><h3>DIVISIONES</h3><DataState query={divisions}/>{divisionRows.map(row => <p className="ranking-row division-row" key={row.id ?? row.name}><span>{String(row.name ?? row.division).replaceAll('_', ' ').toUpperCase()}</span><strong>{row.teamCount ?? row.team_count ?? row.teams?.length ?? '—'} EQUIPOS</strong></p>)}</section></div></section></main>;
}
