import { Button, Icon, Screen, Tile } from '../../ui/index.js';
import { TournamentsPage, RankingsPage } from '../public/TournamentsPage.jsx';
import { MatchesPage } from '../public/MatchesPage.jsx';
import { CalendarPage } from '../public/CalendarPage.jsx';
import { CalculatorPage } from '../public/CalculatorPage.jsx';
import { TeamsDirectoryPage } from '../public/TeamsDirectoryPage.jsx';
import { ActivityPage } from '../public/ActivityPage.jsx';
import { NewsPage } from '../public/NewsPage.jsx';
import { RulesPage } from '../public/RulesPage.jsx';
import { StadiumsPage } from '../teams/StadiumsPage.jsx';
import { ClubsGrid } from './ClubsGrid.jsx';

// Liga: todo lo que es de la liga entera (no de tu club) en una sola pantalla con una fila de pestañas.
const TABS = [
  { id: 'tabla', label: 'Tabla' },
  { id: 'partidos', label: 'Partidos' },
  { id: 'goleadores', label: 'Goleadores' },
  { id: 'playoffs', label: 'Playoffs' },
  { id: 'clubes', label: 'Clubes' },
  { id: 'estadios', label: 'Estadios' },
  { id: 'mas', label: 'Más' },
];

const INTRO = {
  tabla: 'Cómo va cada club en el torneo. Arriba eliges otro torneo o uno ya jugado.',
  partidos: 'Todos los partidos: en vivo, por jugar y jugados. Toca uno para ver el acta.',
  goleadores: 'Quién lleva más goles en el torneo.',
  playoffs: 'Los cruces de semifinal y final.',
  clubes: 'Los clubes de la liga. Toca uno para ver su ficha.',
  estadios: 'Todos los estadios: quién es dueño de cada uno y cuánto cuesta. Si tienes plata, aquí compras el tuyo.',
  mas: 'Calendario, calculadora, rankings, presidentes y todo lo demás.',
};

// Lo que vive en "Más": cada cosa abre dentro de Liga, con un botón para volver.
const MORE = [
  { id: 'calendario', icon: 'clock', title: 'Calendario', detail: 'Los partidos repartidos por día.' },
  { id: 'calculadora', icon: 'table', title: 'Calculadora', detail: 'Qué necesita cada club para clasificar.' },
  { id: 'rankings', icon: 'star', title: 'Rankings', detail: 'Planteles más caros y divisiones.' },
  { id: 'plantillas', icon: 'people', title: 'Plantillas', detail: 'Los jugadores de cada club.' },
  { id: 'presupuestos', icon: 'coin', title: 'Presupuestos', detail: 'Cuánta plata tiene cada club.' },
  { id: 'presidentes', icon: 'shield', title: 'Presidentes', detail: 'Quién manda en cada club.' },
  { id: 'directores-tecnicos', icon: 'shirt', title: 'Directores técnicos', detail: 'El DT de cada club.' },
  { id: 'emblemas', icon: 'trophy', title: 'Escudos', detail: 'Los escudos de todos los clubes.' },
  { id: 'selecciones', icon: 'ball', title: 'Selecciones', detail: 'Equipos nacionales.' },
  { id: 'sanciones', icon: 'warning', title: 'Sanciones', detail: 'Rojas y suspensiones.' },
  { id: 'noticias', icon: 'mail', title: 'Noticias', detail: 'Todo lo que pasó en la liga.' },
  { id: 'reglamento', icon: 'contract', title: 'Reglamento', detail: 'Las reglas de la liga.' },
];
const DIRECTORY = { plantillas: 'squads', presupuestos: 'budgets', presidentes: 'presidents', 'directores-tecnicos': 'coaches', emblemas: 'emblems', selecciones: 'national' };

function MorePanel({ ver, teams, navigate, tournament, query }) {
  const item = MORE.find(entry => entry.id === ver);
  if (!item) {
    return <div className="tile-grid">{MORE.map(entry => <Tile key={entry.id} href={`#/liga?tab=mas&ver=${entry.id}`} icon={<Icon name={entry.icon} size={18}/>} title={entry.title} detail={entry.detail}/>)}</div>;
  }
  const back = <Button variant="ghost" size="sm" icon="back" onClick={() => navigate('/liga?tab=mas')}>Más</Button>;
  let page;
  if (ver === 'calendario') page = <CalendarPage teams={teams} navigate={navigate}/>;
  else if (ver === 'calculadora') page = <CalculatorPage tournament={tournament} teams={teams} initialTeamId={query.equipo ?? null}/>;
  else if (ver === 'rankings') page = <RankingsPage teams={teams} navigate={navigate}/>;
  else if (ver === 'sanciones') page = <ActivityPage sanctionsOnly/>;
  else if (ver === 'noticias') page = <NewsPage teams={teams}/>;
  else if (ver === 'reglamento') page = <RulesPage/>;
  else page = <TeamsDirectoryPage mode={DIRECTORY[ver]} teams={teams} onChoose={id => navigate(`/equipos/${encodeURIComponent(id)}`)}/>;
  return <>
    <div className="screen-subhead">{back}<h2>{item.title}</h2></div>
    {page}
  </>;
}

/** Pantalla Liga. `tab` y `ver` vienen del enlace (#/liga?tab=…&ver=…&torneo=…). */
export function LeaguePage({ tab, ver = null, query = {}, teams = [], navigate, tournament = null, matchesMode = 'all' }) {
  const active = TABS.some(item => item.id === tab) ? tab : 'tabla';
  const go = id => navigate(`/liga?tab=${id}${query.torneo && ['tabla', 'goleadores', 'playoffs'].includes(id) ? `&torneo=${query.torneo}` : ''}`);
  return <Screen kicker="Koinonia e-League" title="Liga" intro={INTRO[active]} tabs={TABS} active={active} onTab={go}>
    {['tabla', 'goleadores', 'playoffs'].includes(active) && <TournamentsPage teams={teams} initialId={query.torneo ?? null} initialView={active}/>}
    {active === 'partidos' && <MatchesPage key={matchesMode} mode={matchesMode} teams={teams} navigate={navigate}/>}
    {active === 'clubes' && <ClubsGrid teams={teams}/>}
    {active === 'estadios' && <StadiumsPage/>}
    {active === 'mas' && <MorePanel ver={ver} teams={teams} navigate={navigate} tournament={tournament} query={query}/>}
  </Screen>;
}
