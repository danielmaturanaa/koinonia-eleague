import { TeamMark } from './TeamMark.jsx';
import { MusicPlayer } from './MusicPlayer.jsx';
import { leaguePlaylist } from '../app/playlist.js';

function Matches({ rows, title, resolveTeam, loading, showScore }) {
  return <section className="score-panel"><h2>{title}</h2>{rows.length ? rows.map(match =>
    <article className="result-match" key={match.id}>{showScore && <small>{[match.tournament?.name ?? 'TORNEO', (match.roundNumber ?? match.round_number) ? `JORNADA ${match.roundNumber ?? match.round_number}` : null].filter(Boolean).join(' · ')}</small>}<div className="score-line"><TeamMark team={resolveTeam(match.homeTeam)}/><span className="home-name">{match.homeTeam.name}</span>{showScore ? <strong>{match.homeScore} - {match.awayScore}</strong> : <span className="versus">VS</span>}<span className="away-name">{match.awayTeam.name}</span><TeamMark team={resolveTeam(match.awayTeam)}/></div></article>)
    : <p className="league-note">{loading ? 'CARGANDO...' : 'SIN PARTIDOS PUBLICADOS.'}</p>}</section>;
}

const matchGroup = match => match.groupLabel ?? match.group_label ?? match.group?.label ?? '';

function UpcomingMatch({ match, resolveTeam }) {
  const tournamentName = match.tournament?.name ?? 'TORNEO';
  const round = match.roundNumber ?? match.round_number;
  const group = matchGroup(match);
  const detail = [tournamentName, round ? `JORNADA ${round}` : null, group ? `GRUPO ${group}` : null].filter(Boolean).join(' · ');
  return <article className="upcoming-match"><small>{detail}</small><div className="score-line"><TeamMark team={resolveTeam(match.homeTeam)}/><span className="home-name">{match.homeTeam.name}</span><span className="versus">VS</span><span className="away-name">{match.awayTeam.name}</span><TeamMark team={resolveTeam(match.awayTeam)}/></div></article>;
}

function UpcomingByTournament({ tournaments, upcoming, resolveTeam, loading }) {
  const priority = new Map(tournaments.map((tournament, index) => [tournament.id, index]));
  const matches = [...upcoming].sort((left, right) => {
    const leftRound = left.roundNumber ?? left.round_number ?? Number.MAX_SAFE_INTEGER;
    const rightRound = right.roundNumber ?? right.round_number ?? Number.MAX_SAFE_INTEGER;
    if (leftRound !== rightRound) return leftRound - rightRound;
    const leftTournament = left.tournament?.id ?? left.tournamentId ?? left.tournament_id;
    const rightTournament = right.tournament?.id ?? right.tournamentId ?? right.tournament_id;
    return (priority.get(leftTournament) ?? 99) - (priority.get(rightTournament) ?? 99);
  });
  return <section className="score-panel upcoming-panel"><h2>PRÓXIMOS PARTIDOS</h2><div className="upcoming-scroll">{matches.length ? matches.map(match => <UpcomingMatch match={match} resolveTeam={resolveTeam} key={match.id}/>)
    : <p className="league-note">{loading ? 'CARGANDO...' : 'SIN PARTIDOS PENDIENTES.'}</p>}</div></section>;
}

export function MatchSidebar({ completed, upcoming, tournaments = [], resolveTeam, loading }) {
  return <aside className="match-sidebar">
    <Matches rows={completed} title="ÚLTIMOS RESULTADOS" resolveTeam={resolveTeam} loading={loading} showScore/>
    <UpcomingByTournament tournaments={tournaments} upcoming={upcoming} resolveTeam={resolveTeam} loading={loading}/>
    <MusicPlayer tracks={leaguePlaylist}/>
  </aside>;
}
