import { useEffect, useState } from 'react';
import { TeamMark } from './TeamMark.jsx';

function Matches({ rows, title, resolveTeam, loading, showScore }) {
  return <section className="score-panel"><h2>{title}</h2>{rows.length ? rows.map(match =>
    <div className="score-line" key={match.id}><TeamMark team={resolveTeam(match.homeTeam)}/><span className="home-name">{match.homeTeam.name}</span>{showScore ? <strong>{match.homeScore} - {match.awayScore}</strong> : <span className="versus">VS</span>}<span className="away-name">{match.awayTeam.name}</span><TeamMark team={resolveTeam(match.awayTeam)}/></div>)
    : <p className="league-note">{loading ? 'CARGANDO...' : 'SIN PARTIDOS PUBLICADOS.'}</p>}</section>;
}

function preferredTournament(tournaments) {
  return tournaments.find(tournament => tournament.format === 'league') ?? tournaments[0];
}

function TournamentTabs({ tournaments, selectedId, onSelect, label }) {
  return <div className="sidebar-tournament-tabs" role="tablist" aria-label={label}>{tournaments.map(tournament => <button type="button" role="tab" aria-selected={tournament.id === selectedId} className={tournament.id === selectedId ? 'active' : ''} onClick={() => onSelect(tournament.id)} key={tournament.id}>{tournament.name}</button>)}</div>;
}

const matchGroup = match => match.groupLabel ?? match.group_label ?? match.group?.label ?? '';

function UpcomingMatch({ match, resolveTeam }) {
  return <div className="score-line"><TeamMark team={resolveTeam(match.homeTeam)}/><span className="home-name">{match.homeTeam.name}</span><span className="versus">VS</span><span className="away-name">{match.awayTeam.name}</span><TeamMark team={resolveTeam(match.awayTeam)}/></div>;
}

function UpcomingByTournament({ tournaments, upcoming, resolveTeam, loading }) {
  const preferred = preferredTournament(tournaments);
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    if (!tournaments.some(tournament => tournament.id === selectedId)) setSelectedId(preferred?.id ?? '');
  }, [preferred?.id, selectedId, tournaments]);
  const selected = tournaments.find(tournament => tournament.id === selectedId) ?? preferred;
  const matches = selected ? upcoming.filter(match => (match.tournament?.id ?? match.tournamentId ?? match.tournament_id) === selected.id) : upcoming;
  const grouped = matches.reduce((groups, match) => {
    const label = matchGroup(match);
    if (!label) return groups;
    (groups[label] ??= []).push(match);
    return groups;
  }, {});
  const groupEntries = Object.entries(grouped).sort(([left], [right]) => String(left).localeCompare(String(right), 'es', { numeric: true }));
  const showGroups = selected && !/liga/i.test(selected.name ?? '') && groupEntries.length > 0;
  return <section className="score-panel upcoming-panel"><h2>PRÓXIMOS PARTIDOS</h2><TournamentTabs tournaments={tournaments} selectedId={selected?.id} onSelect={setSelectedId} label="Próximos partidos por torneo"/><div className="upcoming-scroll">{matches.length ? showGroups ? <div className="upcoming-groups">{groupEntries.map(([label, rows]) => <section className="upcoming-group" key={label}><h3>GRUPO {label}</h3>{rows.map(match => <UpcomingMatch match={match} resolveTeam={resolveTeam} key={match.id}/>)}</section>)}</div> : matches.map(match => <UpcomingMatch match={match} resolveTeam={resolveTeam} key={match.id}/>)
    : <p className="league-note">{loading ? 'CARGANDO...' : 'SIN PARTIDOS PENDIENTES.'}</p>}</div></section>;
}

export function MatchSidebar({ completed, upcoming, tournaments = [], standingsByTournament = {}, resolveTeam, loading }) {
  const preferred = preferredTournament(tournaments);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  useEffect(() => {
    if (!tournaments.some(tournament => tournament.id === selectedTournamentId)) setSelectedTournamentId(preferred?.id ?? '');
  }, [preferred?.id, selectedTournamentId, tournaments]);
  const selectedTournament = tournaments.find(tournament => tournament.id === selectedTournamentId) ?? preferred;
  const standings = standingsByTournament[selectedTournament?.id] ?? [];

  return <aside className="match-sidebar">
    <Matches rows={completed} title="ÚLTIMOS RESULTADOS" resolveTeam={resolveTeam} loading={loading} showScore/>
    <UpcomingByTournament tournaments={tournaments} upcoming={upcoming} resolveTeam={resolveTeam} loading={loading}/>
    <section className="score-panel standings-panel"><h2>CLASIFICACIÓN</h2><TournamentTabs tournaments={tournaments} selectedId={selectedTournament?.id} onSelect={setSelectedTournamentId} label="Clasificación por torneo"/><table><thead><tr><th>#</th><th>EQUIPO</th><th>PJ</th><th>DG</th><th>PTS</th></tr></thead><tbody>{standings.slice(0, 5).map((row, index) =>
      <tr key={`${row.group_label ?? 'table'}-${row.team_id}`}><td>{index + 1}</td><td><TeamMark team={resolveTeam(row)}/><span>{row.name}{row.group_label && <small>GRUPO {row.group_label}</small>}</span></td><td>{row.played}</td><td>{row.gd > 0 ? '+' : ''}{row.gd}</td><td>{row.points}</td></tr>)}</tbody></table>{!loading && !standings.length && <p className="league-note">SIN TABLA PUBLICADA.</p>}</section>
  </aside>;
}
