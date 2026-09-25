import { useMemo } from 'react';
import { SiteLayout } from '../components/SiteLayout.jsx';
import { MatchSidebar } from '../components/MatchSidebar.jsx';
import { HomePage } from '../features/home/HomePage.jsx';
import { useLeagueData } from '../features/league/useLeagueData.js';
import { leaguePlaylist } from './playlist.js';
import { SectionPage } from '../features/shared/SectionPage.jsx';
import { TeamDetailPage } from '../features/teams/TeamDetailPage.jsx';
import { TeamsPage } from '../features/teams/TeamsPage.jsx';
import { ActivityPage } from '../features/public/ActivityPage.jsx';
import { MarketPage } from '../features/public/MarketPage.jsx';
import { MatchesPage } from '../features/public/MatchesPage.jsx';
import { NewsPage } from '../features/public/NewsPage.jsx';
import { PlayersPage, playersReturnQuery } from '../features/public/PlayersPage.jsx';
import { PlayerProfilePage } from '../features/public/PlayerProfilePage.jsx';
import { EfootballCardPage } from '../features/public/EfootballCard.jsx';
import { RulesPage } from '../features/public/RulesPage.jsx';
import { RankingsPage, TournamentsPage } from '../features/public/TournamentsPage.jsx';
import { TeamsDirectoryPage } from '../features/public/TeamsDirectoryPage.jsx';
import { MatchScoreboardPage } from '../features/public/MatchScoreboardPage.jsx';
import { MatchCenterPage } from '../features/public/MatchCenterPage.jsx';
import { useRoute } from './useRoute.js';

const list = value => Array.isArray(value) ? value : [];
const tournamentPriority = tournament => tournament.format === 'league' || /liga/i.test(tournament.name ?? '') ? 0 : 1;
const playerDirectoryBackPath = query => {
  const params = playersReturnQuery({
    q: query.q ?? '',
    status: query.status ?? '',
    teamId: query.teamId ?? '',
    positions: query.position ? query.position.split(',').filter(Boolean) : [],
    minGp: query.minGp ?? '',
    maxGp: query.maxGp ?? '',
    nationality: query.nationality ?? '',
    sort: query.sort ?? 'price_desc',
    page: Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1),
  });
  return `/equipos/jugadores${params ? `?${params}` : ''}`;
};

export function App() {
  const { route, navigate } = useRoute();
  const { league, teamDetail, squad, teamMatches, teamHistory, teamHistoryError, state, refresh, dismissError } = useLeagueData(route.teamId);
  const indexedTeams = useMemo(() => new Map(league.teams.map(team => [team.id, team])), [league.teams]);
  const playlist = useMemo(() => {
    const anthems = league.teams
      .filter(team => team.anthemUrl?.trim())
      .map(team => ({ title: `Himno de ${team.name}`, artist: 'HIMNO OFICIAL', src: team.anthemUrl }));
    return [...leaguePlaylist, ...anthems];
  }, [league.teams]);
  const resolveTeam = team => ({ ...team, ...(indexedTeams.get(team?.id ?? team?.team_id) ?? {}) });
  const activeTournaments = [...list(league.home?.activeTournaments)].sort((a, b) => tournamentPriority(a) - tournamentPriority(b) || (a.name ?? '').localeCompare(b.name ?? '', 'es'));
  const tournament = activeTournaments.find(item => item.format === 'league') ?? activeTournaments[0];

  if (route.name === 'scoreboard') {
    return <MatchScoreboardPage matchId={route.matchId} onBack={() => navigate(`/partidos/${encodeURIComponent(route.matchId)}`)}/>;
  }

  let page;
  if (route.name === 'home') {
    page = <HomePage teams={league.teams} navigate={navigate}/>;
  } else if (route.name === 'teams') {
    page = <TeamsPage teams={league.teams} loading={state.loading} onChoose={id => navigate(`/equipos/${encodeURIComponent(id)}`)} onChanged={refresh} navigate={navigate}/>;
  } else if (route.name === 'team') {
    page = <TeamDetailPage team={teamDetail} teams={league.teams} squad={squad} standings={league.standings} matches={teamMatches} history={teamHistory} historyError={teamHistoryError} loading={state.loadingTeam} tab={route.query.tab} onTab={tab => navigate(`/equipos/${encodeURIComponent(route.teamId)}${tab === 'resumen' ? '' : `?tab=${tab}`}`)} onBack={() => navigate('/equipos')} onChanged={refresh}/>;
  } else if (route.name === 'player') {
    const fromMarket = route.query.from === 'mercado';
    const fromPlayers = route.query.from === 'jugadores';
    page = <PlayerProfilePage playerId={route.playerId} teams={league.teams} backLabel={fromMarket ? '← VOLVER A MERCADO' : '← VOLVER A JUGADORES'} onBack={() => navigate(fromMarket ? '/transferencias' : fromPlayers ? playerDirectoryBackPath(route.query) : '/equipos/jugadores')}/>;
  } else if (route.path === '/partidos' || route.path === '/partidos/jugados' || route.path === '/partidos/pendientes') {
    const matchesMode = route.path.endsWith('jugados') ? 'played' : route.path.endsWith('pendientes') ? 'pending' : 'all';
    page = <MatchesPage key={matchesMode} mode={matchesMode} teams={league.teams} navigate={navigate}/>;
  } else if (route.name === 'match') {
    page = <MatchCenterPage key={route.matchId} matchId={route.matchId} teams={league.teams} navigate={navigate}/>;
  } else if (route.path === '/torneos') {
    page = <TournamentsPage teams={league.teams}/>;
  } else if (route.path === '/equipos/rankings') {
    page = <RankingsPage teams={league.teams} navigate={navigate}/>;
  } else if (route.name === 'card') {
    const fromMarket = route.query.from === 'mercado';
    const fromPlayers = route.query.from === 'jugadores';
    page = <EfootballCardPage pesId={route.pesId} variation={Number(route.query.v ?? 0)} navigate={navigate} backLabel={fromMarket ? '← VOLVER A MERCADO' : '← VOLVER A JUGADORES'} onBack={() => navigate(fromMarket ? '/transferencias' : fromPlayers ? playerDirectoryBackPath(route.query) : '/equipos/jugadores')}/>;
  } else if (route.path === '/equipos/jugadores' || route.path === '/equipos/jugadores/importar') {
    page = <PlayersPage key={JSON.stringify(route.query)} teams={league.teams} initialQuery={route.query}/>;
  } else if (route.path.startsWith('/equipos/')) {
    const modes = { plantillas: 'squads', presupuestos: 'budgets', presidentes: 'presidents', 'directores-tecnicos': 'coaches', emblemas: 'emblems', selecciones: 'national' };
    page = <TeamsDirectoryPage mode={modes[route.path.split('/').at(-1)]} teams={league.teams} onChoose={id => navigate(`/equipos/${encodeURIComponent(id)}`)}/>;
  } else if (route.path === '/transferencias') {
    page = <MarketPage teams={league.teams}/>;
  } else if (route.path === '/sanciones') {
    page = <ActivityPage sanctionsOnly/>;
  } else if (route.path === '/noticias') {
    page = <NewsPage teams={league.teams}/>;
  } else if (route.path === '/reglas') {
    page = <RulesPage/>;
  } else {
    page = <SectionPage path={route.path}/>;
  }

  const sidebar = route.name === 'home' ? <MatchSidebar tournament={tournament} standings={league.standings} resolveTeam={resolveTeam} loading={state.loading} navigate={navigate}/> : null;
  return <SiteLayout route={route} navigate={navigate} sidebar={sidebar} error={state.error} dismissError={dismissError} playlist={playlist} teams={league.teams}>{page}</SiteLayout>;
}
