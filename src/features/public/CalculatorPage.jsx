import { PageHeader } from './DataStates.jsx';
import { ProjectionPanel } from './ProjectionPanel.jsx';

/** Herramienta independiente de los torneos: trabaja sobre la liga que está en juego. */
export function CalculatorPage({ tournament, teams = [], initialTeamId = null }) {
  const teamIndex = new Map(teams.map(team => [String(team.id), team]));
  const resolveTeam = team => ({ ...team, ...(teamIndex.get(String(team?.id ?? team?.team_id)) ?? {}) });
  const participantIds = tournament?.teamIds ?? tournament?.teams?.map(team => team.id ?? team.teamId) ?? [];

  return <main className="newspaper data-page"><section className="data-paper calculator-page">
    <PageHeader kicker="HERRAMIENTAS DE LA LIGA" title="CALCULADORA"/>
    {tournament
      ? <ProjectionPanel tournamentId={tournament.id} participantIds={participantIds} initialTeamId={initialTeamId} initialView={initialTeamId ? 'needs' : 'odds'} resolveTeam={resolveTeam}/>
      : <p className="empty-copy">NO HAY UNA LIGA ACTIVA PARA CALCULAR.</p>}
  </section></main>;
}
