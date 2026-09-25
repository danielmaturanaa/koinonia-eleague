import { useEffect } from 'react';
import { endpoints } from '../api/endpoints.js';
import { useApiQuery } from '../features/public/useApiQuery.js';
import { matchRoundLabel } from '../utils/matchPresentation.js';
import { EntityLink } from './EntityLink.jsx';
import { TeamMark } from './TeamMark.jsx';

const LIVE_REFRESH_MS = 30000;

// Solo aparece cuando hay partidos jugándose; se refresca cada 30 segundos.
function LiveMatches({ resolveTeam }) {
  const live = useApiQuery(signal => endpoints.matches({ status: 'live', activeOnly: 1, page: 1, pageSize: 20 }, signal));
  useEffect(() => {
    const timer = window.setInterval(live.retry, LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [live.retry]);
  const rows = (Array.isArray(live.data) ? live.data : []).filter(match => match.status === 'live');
  if (!rows.length) return null;
  return <section className="score-panel live-panel"><h2><span className="live-dot" aria-hidden="true"/>EN VIVO <small>{rows.length}</small></h2>{rows.map(match =>
    <EntityLink to="match" id={match.id} className="result-match" key={match.id}><small>{[match.tournament?.name ?? 'TORNEO', matchRoundLabel(match, { leagueRound: 'JORNADA' })].join(' · ')}</small><div className="score-line"><TeamMark team={resolveTeam(match.homeTeam)}/><span className="home-name">{match.homeTeam.name}</span><strong>{match.homeScore ?? 0} - {match.awayScore ?? 0}</strong><span className="away-name">{match.awayTeam.name}</span><TeamMark team={resolveTeam(match.awayTeam)}/></div></EntityLink>)}
  </section>;
}

function StandingsPanel({ tournament, standings, resolveTeam, loading, navigate }) {
  return <section className="score-panel standings-home-panel"><h2>TABLA <small>{tournament?.name ?? ''}</small></h2>
    {standings.length ? <table className="standings-home-table"><thead><tr><th>#</th><th>EQUIPO</th><th title="Partidos jugados">PJ</th><th title="Diferencia de goles">DG</th><th title="Puntos">PTS</th></tr></thead><tbody>{standings.map((row, index) => <tr key={row.team_id}><td>{index + 1}</td><td><EntityLink to="team" id={row.team_id} className="table-team-link"><TeamMark team={resolveTeam({ id: row.team_id, ...row })}/><span>{row.name}</span></EntityLink></td><td>{row.played}</td><td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td><td><b>{row.points}</b></td></tr>)}</tbody></table>
      : <p className="league-note">{loading ? 'CARGANDO...' : 'SIN TABLA PUBLICADA.'}</p>}
    <button className="sidebar-more" type="button" onClick={() => navigate('/torneos')}>VER TORNEO COMPLETO →</button>
  </section>;
}

export function MatchSidebar({ tournament, standings = [], resolveTeam, loading, navigate }) {
  return <aside className="match-sidebar">
    <LiveMatches resolveTeam={resolveTeam}/>
    <StandingsPanel tournament={tournament} standings={standings} resolveTeam={resolveTeam} loading={loading} navigate={navigate}/>
  </aside>;
}
