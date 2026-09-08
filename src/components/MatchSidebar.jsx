import { TeamMark } from './TeamMark.jsx';
import { MusicPlayer } from './MusicPlayer.jsx';
import { leaguePlaylist } from '../app/playlist.js';

function Matches({ rows, title, resolveTeam, loading, showScore }) {
  return <section className="score-panel"><h2>{title}</h2>{rows.length ? rows.map(match =>
    <div className="score-line" key={match.id}><TeamMark team={resolveTeam(match.homeTeam)}/><span className="home-name">{match.homeTeam.name}</span>{showScore ? <strong>{match.homeScore} - {match.awayScore}</strong> : <span className="versus">VS</span>}<span className="away-name">{match.awayTeam.name}</span><TeamMark team={resolveTeam(match.awayTeam)}/></div>)
    : <p className="league-note">{loading ? 'CARGANDO...' : 'SIN PARTIDOS PUBLICADOS.'}</p>}</section>;
}

export function MatchSidebar({ completed, upcoming, standings, resolveTeam, loading }) {
  return <aside className="match-sidebar">
    <Matches rows={completed} title="ÚLTIMOS RESULTADOS" resolveTeam={resolveTeam} loading={loading} showScore/>
    <section className="score-panel upcoming-panel"><h2>PRÓXIMOS PARTIDOS <small>{upcoming[0]?.roundNumber ? `FECHA ${upcoming[0].roundNumber}` : ''}</small></h2>{upcoming.length ? upcoming.map(match =>
      <div className="score-line" key={match.id}><TeamMark team={resolveTeam(match.homeTeam)}/><span className="home-name">{match.homeTeam.name}</span><span className="versus">VS</span><span className="away-name">{match.awayTeam.name}</span><TeamMark team={resolveTeam(match.awayTeam)}/></div>)
      : <p className="league-note">SIN PARTIDOS PENDIENTES.</p>}</section>
    <section className="score-panel standings-panel"><h2>CLASIFICACIÓN</h2><table><thead><tr><th>#</th><th>EQUIPO</th><th>PJ</th><th>DG</th><th>PTS</th></tr></thead><tbody>{standings.slice(0, 5).map((row, index) =>
      <tr key={row.team_id}><td>{index + 1}</td><td><TeamMark team={resolveTeam(row)}/>{row.name}</td><td>{row.played}</td><td>{row.gd > 0 ? '+' : ''}{row.gd}</td><td>{row.points}</td></tr>)}</tbody></table>{!loading && !standings.length && <p className="league-note">SIN TABLA PUBLICADA.</p>}</section>
    <MusicPlayer tracks={leaguePlaylist}/>
  </aside>;
}
