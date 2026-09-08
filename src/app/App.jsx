import { useMemo } from 'react';
import { ArcadeLayout } from '../components/ArcadeLayout.jsx';
import { MatchSidebar } from '../components/MatchSidebar.jsx';
import { HomePage } from '../features/home/HomePage.jsx';
import { useLeagueData } from '../features/league/useLeagueData.js';
import { SectionPage } from '../features/shared/SectionPage.jsx';
import { TeamDetailPage } from '../features/teams/TeamDetailPage.jsx';
import { TeamsPage } from '../features/teams/TeamsPage.jsx';
import { ActivityPage } from '../features/public/ActivityPage.jsx';
import { MarketPage } from '../features/public/MarketPage.jsx';
import { MatchesPage } from '../features/public/MatchesPage.jsx';
import { NewsPage } from '../features/public/NewsPage.jsx';
import { PlayersPage } from '../features/public/PlayersPage.jsx';
import { RankingsPage, TournamentsPage } from '../features/public/TournamentsPage.jsx';
import { TeamsDirectoryPage } from '../features/public/TeamsDirectoryPage.jsx';
import { useRoute } from './useRoute.js';

const list = value => Array.isArray(value) ? value : [];
const tournamentPriority = tournament => tournament.format === 'league' || /liga/i.test(tournament.name ?? '') ? 0 : 1;

export function App() {
  const { route, navigate } = useRoute();
  const { league, teamDetail, squad, teamMatches, teamHistory, teamHistoryError, state, refresh, dismissError } = useLeagueData(route.teamId);
  const indexedTeams = useMemo(() => new Map(league.teams.map(team => [team.id, team])), [league.teams]);
  const resolveTeam = team => ({ ...team, ...(indexedTeams.get(team?.id ?? team?.team_id) ?? {}) });
  const activeTournaments = [...list(league.home?.activeTournaments)].sort((a, b) => tournamentPriority(a) - tournamentPriority(b) || (a.name ?? '').localeCompare(b.name ?? '', 'es'));
  const tournament = activeTournaments.find(item => item.format === 'league') ?? activeTournaments[0];
  const upcoming = league.upcomingMatches.length ? league.upcomingMatches : list(league.home?.upcomingMatches);
  const completed = list(league.home?.recentMatches).slice(0, 5);

  let page;
  if (route.name === 'home') {
    page = <HomePage tournament={tournament} lead={upcoming[0]}/>;
  } else if (route.name === 'teams') {
    page = <TeamsPage teams={league.teams} loading={state.loading} onChoose={id => navigate(`/equipos/${encodeURIComponent(id)}`)} onChanged={refresh}/>;
  } else if (route.name === 'team') {
    page = <TeamDetailPage team={teamDetail} squad={squad} standings={league.standings} matches={teamMatches} history={teamHistory} historyError={teamHistoryError} loading={state.loadingTeam} onBack={() => navigate('/equipos')} onChanged={refresh}/>;
  } else if (route.path === '/partidos' || route.path === '/partidos/jugados' || route.path === '/partidos/pendientes') {
    page = <MatchesPage key={route.path} mode={route.path.endsWith('jugados') ? 'played' : route.path.endsWith('pendientes') ? 'pending' : 'all'} teams={league.teams}/>;
  } else if (route.path === '/clasificacion') {
    page = <TournamentsPage classificationOnly teams={league.teams}/>;
  } else if (route.path === '/clasificacion/rankings') {
    page = <RankingsPage/>;
  } else if (route.path === '/equipos/jugadores') {
    page = <PlayersPage teams={league.teams}/>;
  } else if (route.path.startsWith('/equipos/')) {
    const modes = { plantillas: 'squads', presupuestos: 'budgets', presidentes: 'presidents', 'directores-tecnicos': 'coaches', emblemas: 'emblems', selecciones: 'national' };
    page = <TeamsDirectoryPage mode={modes[route.path.split('/').at(-1)]} teams={league.teams} onChoose={id => navigate(`/equipos/${encodeURIComponent(id)}`)}/>;
  } else if (route.path === '/transferencias') {
    page = <MarketPage teams={league.teams}/>;
  } else if (route.path === '/sanciones') {
    page = <ActivityPage sanctionsOnly/>;
  } else if (route.path === '/torneos') {
    page = <TournamentsPage teams={league.teams}/>;
  } else if (route.path === '/noticias') {
    page = <NewsPage teams={league.teams}/>;
  } else {
    page = <SectionPage path={route.path}/>;
  }

  const sidebar = <MatchSidebar completed={completed} upcoming={upcoming} tournaments={activeTournaments} standingsByTournament={league.standingsByTournament} resolveTeam={resolveTeam} loading={state.loading}/>;
  return <ArcadeLayout route={route} navigate={navigate} sidebar={sidebar} error={state.error} dismissError={dismissError} headerTeams={league.teams}>{page}</ArcadeLayout>;
}
