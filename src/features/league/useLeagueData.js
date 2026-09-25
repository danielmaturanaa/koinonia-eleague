import { useEffect, useRef, useState } from 'react';
import { getData } from '../../api/client.js';

const list = value => Array.isArray(value) ? value : [];

export function useLeagueData(teamId) {
  const [revision, setRevision] = useState(0);
  const [league, setLeague] = useState({ home: null, teams: [], standings: [], standingsByTournament: {} });
  const [teamDetail, setTeamDetail] = useState(null);
  const [squad, setSquad] = useState([]);
  const [teamMatches, setTeamMatches] = useState([]);
  const [teamHistory, setTeamHistory] = useState([]);
  const [teamHistoryError, setTeamHistoryError] = useState(null);
  const [state, setState] = useState({ loading: true, loadingTeam: false, error: '' });
  const loadedTeamId = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getData('/home', { signal: controller.signal }),
      getData('/teams', { query: { page: 1, pageSize: 100 }, signal: controller.signal }),
    ]).then(async ([home, teams]) => {
      const tournaments = list(home?.activeTournaments);
      const standingsEntries = await Promise.all(tournaments.map(async tournament => [
        tournament.id,
        list(await getData(`/tournaments/${tournament.id}/standings`, { signal: controller.signal }).catch(() => [])),
      ]));
      const standingsByTournament = Object.fromEntries(standingsEntries);
      const primaryTournament = tournaments.find(tournament => tournament.format === 'league') ?? tournaments[0];
      setLeague({ home, teams: list(teams), standings: standingsByTournament[primaryTournament?.id] ?? [], standingsByTournament });
      setState(current => ({ ...current, loading: false, error: '' }));
    }).catch(error => {
      if (error.code !== 'REQUEST_ABORTED') {
        setState(current => ({ ...current, loading: false, error: 'No fue posible actualizar los datos de la liga.' }));
      }
    });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (!teamId) {
      loadedTeamId.current = null;
      setTeamDetail(null);
      setSquad([]);
      setTeamMatches([]);
      setTeamHistory([]);
      setTeamHistoryError(null);
      setState(current => ({ ...current, loadingTeam: false }));
      return undefined;
    }

    const controller = new AbortController();
    // Al cambiar de equipo se limpia la ficha; al refrescar el mismo equipo (tras
    // editar formación, plantel, etc.) se conservan los datos hasta que llegan los nuevos.
    const switchingTeam = loadedTeamId.current !== teamId;
    loadedTeamId.current = teamId;
    if (switchingTeam) {
      setTeamDetail(null);
      setSquad([]);
      setTeamMatches([]);
      setTeamHistory([]);
      setTeamHistoryError(null);
      setState(current => ({ ...current, loadingTeam: true }));
    }
    Promise.all([
      getData(`/teams/${teamId}`, { signal: controller.signal }),
      getData(`/teams/${teamId}/squad`, { signal: controller.signal }),
      getData(`/teams/${teamId}/matches`, { query: { page: 1, pageSize: 100 }, signal: controller.signal }),
      getData(`/history/team/${teamId}`, { signal: controller.signal })
        .then(data => ({ data: list(data), error: null }))
        .catch(error => ({ data: [], error })),
    ]).then(([team, roster, matches, history]) => {
      setTeamDetail(team);
      setSquad(list(roster));
      setTeamMatches(list(matches));
      setTeamHistory(history.data);
      setTeamHistoryError(history.error);
      setState(current => ({ ...current, loadingTeam: false }));
    }).catch(error => {
      if (error.code !== 'REQUEST_ABORTED') {
        setState(current => ({ ...current, loadingTeam: false, error: 'No fue posible cargar la ficha completa del equipo.' }));
      }
    });
    return () => controller.abort();
  }, [teamId, revision]);

  return {
    league,
    teamDetail,
    squad,
    teamMatches,
    teamHistory,
    teamHistoryError,
    state,
    refresh: () => setRevision(value => value + 1),
    dismissError: () => setState(current => ({ ...current, error: '' })),
  };
}
