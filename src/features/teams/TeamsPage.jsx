import { LeagueSectionTabs } from '../../components/SectionTabs.jsx';
import { useAuth } from '../../app/AuthGate.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';

export function TeamsPage({ teams, loading, onChoose, onChanged, navigate }) {
  const { isAdmin } = useAuth();
  return <main className="newspaper teams-page"><section className="team-list-paper">
    <LeagueSectionTabs current="/equipos"/>
    <header className="team-page-header"><p>BASE DE DATOS DE LA LIGA</p><h1>EQUIPOS</h1><span>{teams.length} EQUIPOS REGISTRADOS</span>{isAdmin && <a className="admin-toggle" href="#/admin?tab=equipos">+ CREAR EQUIPO (SALA DE CONTROL)</a>}</header>

    {loading ? <div className="arcade-state">CARGANDO EQUIPOS...</div> : <div className="team-grid">{teams.map(team =>
      <button className="team-choice" key={team.id} onClick={() => onChoose(team.id)}><TeamMark team={team}/><b className={team.name.length > 23 ? 'long-team-name' : ''}>{team.name}</b></button>)}</div>}
  </section></main>;
}
