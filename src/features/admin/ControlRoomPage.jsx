import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { Card, EmptyState, Icon, Tabs } from '../../ui/index.js';
import { DataState, PageHeader } from '../public/DataStates.jsx';
import { MarketAdmin, loadAllPlayers } from '../public/MarketPage.jsx';
import { AuctionSimulator } from '../public/market/AuctionSimulator.jsx';
import { CreateTournamentForm } from '../public/TournamentsPage.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { CreateTeamForm } from './CreateTeamForm.jsx';
import { PeoplePage } from './PeoplePage.jsx';
import { TournamentAdminPanel, TournamentAwardsPanel } from './TournamentAdminPanel.jsx';

const SECTIONS = [
  { id: 'personas', label: 'PERSONAS Y PERMISOS' },
  { id: 'torneos', label: 'TORNEOS' },
  { id: 'mercado', label: 'MERCADO' },
  { id: 'equipos', label: 'EQUIPOS' },
  { id: 'jugadores', label: 'JUGADORES' },
  { id: 'partidos', label: 'PARTIDOS' },
  { id: 'noticias', label: 'NOTICIAS' },
];

function ShortcutCards({ items }) {
  return <div className="control-shortcuts">{items.map(([href, icon, title, text]) => <a key={href} href={href} className="control-shortcut">
    <Icon name={icon} size={28}/><b>{title}</b><span>{text}</span>
  </a>)}</div>;
}

/** Torneos: crear uno nuevo y administrar (editar, cerrar, premios, borrar) el que elijas. */
function TournamentsSection({ teams, initialId }) {
  const list = useApiQuery(signal => endpoints.tournaments({ page: 1, pageSize: 100 }, signal));
  const [selectedId, setSelectedId] = useState(initialId ?? '');
  const detail = useApiQuery(signal => selectedId ? endpoints.tournament(selectedId, signal) : Promise.resolve({ data: null }), [selectedId]);
  const tournaments = Array.isArray(list.data) ? list.data : [];
  const tournament = detail.data;
  const refresh = () => { list.retry(); detail.retry(); };
  return <div className="control-section">
    <Card title="CREAR TORNEO"><CreateTournamentForm teams={teams} onChanged={refresh}/></Card>
    <Card title="ADMINISTRAR UN TORNEO">
      <DataState query={list}/>
      <label className="control-picker">TORNEO
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)}>
          <option value="">ELEGIR TORNEO…</option>
          {tournaments.map(item => <option key={item.id} value={item.id}>{item.name} · {{ active: 'EN JUEGO', completed: 'TERMINADO', draft: 'EN PREPARACIÓN' }[item.status] ?? item.status}</option>)}
        </select>
      </label>
      {tournament && <>
        <TournamentAdminPanel key={tournament.id} tournament={tournament} teams={teams} onChanged={refresh} onDeleted={() => { setSelectedId(''); list.retry(); }}/>
        {tournament.status === 'completed' && <TournamentAwardsPanel tournament={tournament} onChanged={refresh}/>}
      </>}
    </Card>
  </div>;
}

/** Mercado: registrar a mano un traspaso o un trueque, y el simulador de subastas (solo quien tiene acceso). */
function MarketSection({ teams }) {
  const players = useApiQuery(signal => loadAllPlayers(signal), []);
  const access = useApiQuery(signal => endpoints.auctionSimAccess(signal).catch(() => ({ data: { allowed: false } })), []);
  return <div className="control-section">
    <Card title="REGISTRAR OPERACIÓN MANUAL">
      <p className="control-note">LOS TRASPASOS Y TRUEQUES NORMALMENTE SE HACEN POR DISCORD O EN EL MERCADO; USA ESTO SOLO PARA CORREGIR O REGISTRAR ALGO A MANO.</p>
      <DataState query={players}/>
      {Array.isArray(players.data) && <MarketAdmin teams={teams} players={players.data} onChanged={() => players.retry()}/>}
    </Card>
    {access.data?.allowed && <Card title="SIMULADOR DE SUBASTAS"><AuctionSimulator teams={teams}/></Card>}
  </div>;
}

/** Control de la liga para administradores: todo lo que antes estaba suelto en las páginas públicas. */
export function ControlRoomPage({ teams = [], initialTab = 'personas', tournamentId = null }) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState(SECTIONS.some(item => item.id === initialTab) ? initialTab : 'personas');
  useEffect(() => { if (SECTIONS.some(item => item.id === initialTab)) setTab(initialTab); }, [initialTab]);
  if (!isAdmin) {
    return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="ADMINISTRACIÓN" title="SALA DE CONTROL"/>
      <EmptyState icon="lock" title="SOLO PARA ADMINISTRADORES">SI NECESITAS ALGO DE AQUÍ, PÍDELO A UN ADMIN DE LA LIGA.</EmptyState></section></main>;
  }
  return <main className="newspaper data-page"><section className="data-paper control-room">
    <PageHeader kicker="ADMINISTRACIÓN" title="SALA DE CONTROL"/>
    <Tabs tabs={SECTIONS} value={tab} onChange={id => { setTab(id); window.history.replaceState(null, '', `#/admin?tab=${id}`); }} label="Secciones de administración"/>
    {tab === 'personas' && <PeoplePage teams={teams} embedded/>}
    {tab === 'torneos' && <TournamentsSection teams={teams} initialId={tournamentId}/>}
    {tab === 'mercado' && <MarketSection teams={teams}/>}
    {tab === 'equipos' && <div className="control-section"><Card title="CREAR CLUB O SELECCIÓN"><CreateTeamForm/></Card>
      <p className="control-note">PARA EDITAR UN CLUB (ESCUDO, PRESIDENTE, DT, HIMNO) ENTRA A SU FICHA: EL ADMIN PUEDE EDITARLO IGUAL QUE SU PRESIDENTE.</p></div>}
    {tab === 'jugadores' && <div className="control-section">
      <ShortcutCards items={[['#/equipos/jugadores/importar', 'search', 'AGREGAR E IMPORTAR JUGADORES', 'DESDE EFOOTBALLDB O A MANO'], ['#/equipos/jugadores', 'shield', 'DIRECTORIO DE JUGADORES', 'EDITAR O ELIMINAR UN JUGADOR DESDE SU FICHA']]}/>
    </div>}
    {tab === 'partidos' && <div className="control-section">
      <ShortcutCards items={[['#/partidos/calendario', 'clock', 'CALENDARIO', 'ARRASTRA PARTIDOS A OTRO DÍA'], ['#/partidos', 'ball', 'CENTRO DE PARTIDOS', 'CREAR, INICIAR, ANOTAR Y CORREGIR'], ['#/sanciones', 'warning', 'SANCIONES', 'EXPULSIONES Y SUSPENSIONES']]}/>
    </div>}
    {tab === 'noticias' && <div className="control-section">
      <ShortcutCards items={[['#/noticias', 'mail', 'PERIÓDICO DE LA LIGA', 'PLANTILLAS E IMÁGENES GENÉRICAS (BOTONES DE ADMIN EN LA PÁGINA)']]}/>
    </div>}
  </section></main>;
}
