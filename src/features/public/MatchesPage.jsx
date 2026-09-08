import { useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { MatchAdminPanel } from '../admin/MatchAdminPanel.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, PageHeader, Pagination } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const labels = { pending: 'PENDIENTE', live: 'EN VIVO', finished: 'FINALIZADO', cancelled: 'CANCELADO' };

function CreateMatchForm({ tournaments, teams, onChanged }) {
  const [form, setForm] = useState({ tournamentId: '', homeTeamId: '', awayTeamId: '', stage: '', groupLabel: '', roundNumber: '' });
  const mutation = useApiMutation((body, signal) => endpoints.createMatch(body, signal), { onSuccess: onChanged });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = event => {
    event.preventDefault();
    const body = { tournamentId: form.tournamentId, homeTeamId: form.homeTeamId, awayTeamId: form.awayTeamId, ...(form.stage.trim() ? { stage: form.stage.trim() } : {}), ...(form.groupLabel.trim() ? { groupLabel: form.groupLabel.trim().toUpperCase() } : {}), ...(form.roundNumber ? { roundNumber: Number(form.roundNumber) } : {}) };
    if (window.confirm('¿CREAR ESTE PARTIDO EN EL CALENDARIO OFICIAL?')) mutation.execute(body);
  };
  return <form className="admin-form create-match-form" onSubmit={submit}><label>TORNEO<select required name="tournamentId" value={form.tournamentId} onChange={change}><option value="">SELECCIONAR</option>{tournaments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>LOCAL<select required name="homeTeamId" value={form.homeTeamId} onChange={change}><option value="">SELECCIONAR</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>VISITA<select required name="awayTeamId" value={form.awayTeamId} onChange={change}><option value="">SELECCIONAR</option>{teams.filter(team => team.id !== form.homeTeamId).map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>ETAPA OPCIONAL<input name="stage" value={form.stage} onChange={change} placeholder="groups, semifinal..."/></label><label>GRUPO OPCIONAL<input name="groupLabel" maxLength="4" value={form.groupLabel} onChange={change}/></label><label>RONDA OPCIONAL<input name="roundNumber" type="number" min="1" step="1" value={form.roundNumber} onChange={change}/></label><button className="action-button" disabled={!form.tournamentId || !form.homeTeamId || !form.awayTeamId || mutation.loading}>CREAR PARTIDO</button><FormFeedback mutation={mutation}/></form>;
}

function MatchDetail({ matchId, onChanged, resolveTeam }) {
  const [showAdmin, setShowAdmin] = useState(false);
  const detail = useApiQuery(signal => matchId ? endpoints.match(matchId, signal) : Promise.resolve({ data: null }), [matchId]);
  if (!matchId) return <aside className="detail-card"><p>SELECCIONA UN PARTIDO PARA ABRIR EL ACTA.</p></aside>;
  const refresh = () => { detail.retry(); onChanged(); };
  return <aside className="detail-card match-detail"><DataState query={detail}/>{detail.data && <><div className="match-detail-kicker"><small>{detail.data.tournament?.name} · {detail.data.stage ?? 'FECHA'} {detail.data.roundNumber ?? ''}</small><button onClick={() => setShowAdmin(value => !value)}>{showAdmin ? 'CERRAR ACTA' : '⚙ GESTIONAR ACTA'}</button></div><div className="match-detail-score"><span><TeamMark team={resolveTeam(detail.data.homeTeam)}/><b>{detail.data.homeTeam?.name}</b></span><strong>{detail.data.homeScore ?? '–'} : {detail.data.awayScore ?? '–'}</strong><span><TeamMark team={resolveTeam(detail.data.awayTeam)}/><b>{detail.data.awayTeam?.name}</b></span></div>{showAdmin && <MatchAdminPanel key={detail.data.id} match={detail.data} onChanged={refresh}/>}<h3>ACTA DE GOLES</h3><div className="goal-list">{detail.data.goals?.length ? detail.data.goals.map(goal => <p key={goal.id}><b>{goal.minute ? `${goal.minute}'` : '—'}</b> {goal.player?.name ?? 'Gol sin jugador'} <small>{goal.scoringTeam?.name ?? ''}</small></p>) : <p>Sin goles registrados.</p>}</div></>}</aside>;
}

export function MatchesPage({ mode = 'all', teams }) {
  const initialStatus = mode === 'played' ? 'finished' : mode === 'pending' ? 'pending' : '';
  const [filters, setFilters] = useState({ tournament: '', team: '', status: initialStatus, page: 1 });
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const tournaments = useApiQuery(signal => endpoints.tournaments({ page: 1, pageSize: 100 }, signal));
  const matches = useApiQuery(signal => endpoints.matches({ ...filters, pageSize: 20 }, signal), Object.values(filters));
  const teamIndex = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const resolveTeam = team => ({ ...team, ...(teamIndex.get(team?.id ?? team?.team_id) ?? {}) });
  const rows = Array.isArray(matches.data) ? matches.data : [];
  const change = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value, page: 1 }));
  const title = mode === 'pending' ? 'PRÓXIMOS PARTIDOS' : mode === 'played' ? 'PARTIDOS JUGADOS' : 'CENTRO DE PARTIDOS';

  const refresh = () => matches.retry();
  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="CALENDARIO Y ACTAS" title={title}><button className="page-action" onClick={() => setShowCreate(value => !value)}>{showCreate ? 'CERRAR ALTA' : '+ CREAR PARTIDO'}</button></PageHeader>
    {showCreate && <CreateMatchForm tournaments={tournaments.data ?? []} teams={teams} onChanged={refresh}/>} 
    <div className="filter-bar"><select name="tournament" value={filters.tournament} onChange={change} aria-label="Torneo"><option value="">TODOS LOS TORNEOS</option>{(tournaments.data ?? []).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select name="team" value={filters.team} onChange={change} aria-label="Equipo"><option value="">TODOS LOS EQUIPOS</option>{teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select><select name="status" value={filters.status} onChange={change} aria-label="Estado"><option value="">TODOS LOS ESTADOS</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
    <DataState query={matches}/>{!matches.loading && !matches.error && <div className="split-view matches-split"><div className="data-list">{rows.map(match => <button className={`match-card ${selectedId === match.id ? 'active' : ''}`} key={match.id} onClick={() => setSelectedId(match.id)}><small>{match.tournament?.name ?? 'TORNEO'} · {match.groupLabel ? `GRUPO ${match.groupLabel}` : `FECHA ${match.roundNumber ?? '—'}`}</small><span><TeamMark team={resolveTeam(match.homeTeam)}/><b>{match.homeTeam?.name}</b><strong>{match.homeScore ?? '–'} : {match.awayScore ?? '–'}</strong><b>{match.awayTeam?.name}</b><TeamMark team={resolveTeam(match.awayTeam)}/></span><i className={`status status-${match.status}`}>{labels[match.status] ?? match.status}</i></button>)}</div><MatchDetail key={selectedId ?? 'empty'} matchId={selectedId} onChanged={refresh} resolveTeam={resolveTeam}/></div>}
    <Pagination pagination={matches.pagination} page={filters.page} onPage={page => setFilters(current => ({ ...current, page }))}/>
  </section></main>;
}
