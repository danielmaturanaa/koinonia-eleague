import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { TournamentAdminPanel } from '../admin/TournamentAdminPanel.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, PageHeader } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

function StandingsTable({ rows, resolveTeam }) {
  return <div className="table-scroll"><table className="league-table"><thead><tr><th>#</th><th>EQUIPO</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.team_id ?? row.id}><td>{index + 1}</td><td><TeamMark team={resolveTeam(row)}/>{row.name}</td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.gf}</td><td>{row.ga}</td><td>{row.gd}</td><td><b>{row.points}</b></td></tr>)}</tbody></table></div>;
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
  const [showAdmin, setShowAdmin] = useState(false);
  const detail = useApiQuery(signal => endpoints.tournament(tournamentId, signal), [tournamentId]);
  const standings = useApiQuery(signal => endpoints.standings(tournamentId, {}, signal), [tournamentId]);
  const fixtures = useApiQuery(signal => endpoints.fixtures(tournamentId, signal), [tournamentId]);
  const bracket = useApiQuery(signal => endpoints.bracket(tournamentId, signal), [tournamentId]);
  const scorers = useApiQuery(signal => endpoints.scorers(tournamentId, signal), [tournamentId]);
  const standingRows = Array.isArray(standings.data) ? standings.data : [];
  const fixtureRows = Array.isArray(fixtures.data) ? fixtures.data : [];
  const scorerRows = Array.isArray(scorers.data) ? scorers.data : [];
  const teamIndex = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const resolveTeam = team => ({ ...team, ...(teamIndex.get(team?.id ?? team?.team_id) ?? {}) });
  const groupLabels = useMemo(() => [...new Set((detail.data?.teams ?? []).map(team => team.groupLabel).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right))), [detail.data]);
  const refresh = () => { detail.retry(); standings.retry(); fixtures.retry(); bracket.retry(); scorers.retry(); onChanged?.(); };

  return <section className={`tournament-workspace ${classificationOnly ? 'classification-workspace' : ''}`}><DataState query={detail}/>{detail.data && <><header><div><small>{detail.data.format?.replaceAll('_', ' ')} · {detail.data.competitorKind}</small><h2>{detail.data.name}</h2></div><div className="workspace-heading-actions"><b className={`status status-${detail.data.status}`}>{detail.data.status}</b>{!classificationOnly && <button onClick={() => setShowAdmin(value => !value)}>{showAdmin ? 'CERRAR GESTIÓN' : '⚙ GESTIONAR'}</button>}</div></header>{showAdmin && <TournamentAdminPanel key={detail.data.id} tournament={detail.data} teams={teams} onChanged={refresh} onDeleted={() => { setShowAdmin(false); onDeleted(); }}/>}</>}
    {groupLabels.length > 0 ? <section className="standings-workspace-panel"><h3>CLASIFICACIÓN POR GRUPOS</h3><div className="workspace-columns">{groupLabels.map(groupLabel => <GroupStandings key={groupLabel} tournamentId={tournamentId} groupLabel={groupLabel} resolveTeam={resolveTeam}/>)}</div></section> : <section className="workspace-panel standings-workspace-panel"><h3>CLASIFICACIÓN</h3><DataState query={standings}/>{standingRows.length > 0 && <StandingsTable rows={standingRows} resolveTeam={resolveTeam}/>}</section>}
    <div className="workspace-columns"><section className="workspace-panel"><h3>GOLEADORES</h3><DataState query={scorers}/>{scorerRows.map((row, index) => <p className="ranking-row" key={row.playerId ?? row.id}><b>{index + 1}</b><span>{row.playerName ?? row.name}</span><strong>{row.goals ?? 0}</strong></p>)}</section>{!classificationOnly && <section className="workspace-panel"><h3>LLAVE</h3><DataState query={bracket}/>{Array.isArray(bracket.data) && bracket.data.map(item => <div className="bracket-row" key={item.id}><TeamMark team={resolveTeam(item.homeTeam)}/><span>{item.homeTeam?.name ?? 'Por definir'}</span><b>VS</b><span>{item.awayTeam?.name ?? 'Por definir'}</span><TeamMark team={resolveTeam(item.awayTeam)}/></div>)}</section>}</div>
    {!classificationOnly && <section className="workspace-panel fixture-panel"><h3>FIXTURE <small>{fixtureRows.length} PARTIDOS</small></h3><DataState query={fixtures}/><div className="fixture-grid">{fixtureRows.slice(0, 40).map(match => <article key={match.id}><small>{match.groupLabel ? `GRUPO ${match.groupLabel}` : `FECHA ${match.roundNumber ?? '—'}`}</small><div className="fixture-match"><TeamMark team={resolveTeam(match.homeTeam)}/><span>{match.homeTeam?.name ?? 'Por definir'}</span><b>{match.homeScore ?? '–'} : {match.awayScore ?? '–'}</b><span>{match.awayTeam?.name ?? 'Por definir'}</span><TeamMark team={resolveTeam(match.awayTeam)}/></div></article>)}</div></section>}
  </section>;
}

export function TournamentsPage({ classificationOnly = false, teams = [] }) {
  const tournaments = useApiQuery(signal => endpoints.tournaments({ page: 1, pageSize: 100 }, signal));
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const rows = useMemo(() => {
    const source = Array.isArray(tournaments.data) ? tournaments.data : [];
    if (!classificationOnly) return source;
    const priority = tournament => tournament.format === 'league' || /liga/i.test(tournament.name ?? '') ? 0 : 1;
    return [...source].sort((a, b) => priority(a) - priority(b) || (a.name ?? '').localeCompare(b.name ?? '', 'es'));
  }, [classificationOnly, tournaments.data]);
  useEffect(() => { if (!selectedId && rows[0]?.id) setSelectedId(rows[0].id); }, [rows, selectedId]);
  const deleted = () => { setSelectedId(null); tournaments.retry(); };
  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="COMPETICIONES OFICIALES" title={classificationOnly ? 'CLASIFICACIÓN' : 'TORNEOS'}>{!classificationOnly && <button className="page-action" onClick={() => setShowCreate(value => !value)}>{showCreate ? 'CERRAR ALTA' : '+ CREAR TORNEO'}</button>}</PageHeader>{showCreate && <CreateTournamentForm onChanged={() => tournaments.retry()}/>}<DataState query={tournaments}/>{rows.length > 0 && <div className="tournament-tabs">{rows.map(item => <button className={selectedId === item.id ? 'active' : ''} key={item.id} onClick={() => setSelectedId(item.id)}>{item.name}<small>{item.status}</small></button>)}</div>}{selectedId && <TournamentWorkspace tournamentId={selectedId} classificationOnly={classificationOnly} teams={teams} onChanged={() => tournaments.retry()} onDeleted={deleted}/>}</section></main>;
}

export function RankingsPage() {
  const rankings = useApiQuery(signal => endpoints.squadRankings({ page: 1, pageSize: 100 }, signal));
  const divisions = useApiQuery(signal => endpoints.divisions(signal));
  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="ESTADÍSTICAS GLOBALES" title="RANKINGS Y DIVISIONES"/><div className="workspace-columns"><section className="workspace-panel"><h3>VALOR DE PLANTELES</h3><DataState query={rankings}/>{(rankings.data ?? []).map((row, index) => <p className="ranking-row" key={row.teamId ?? row.id}><b>{index + 1}</b><span>{row.teamName ?? row.name}</span><strong>{row.squadValue ?? row.value ?? '—'} GP</strong></p>)}</section><section className="workspace-panel"><h3>DIVISIONES</h3><DataState query={divisions}/>{(divisions.data ?? []).map(row => <p className="ranking-row" key={row.id ?? row.name}><span>{row.name ?? row.division}</span><strong>{row.teamCount ?? row.teams?.length ?? '—'} EQUIPOS</strong></p>)}</section></div></section></main>;
}
