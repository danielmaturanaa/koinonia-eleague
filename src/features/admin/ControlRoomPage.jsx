import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { Card, EmptyState, Icon, Screen, Tabs } from '../../ui/index.js';
import { DataState, PageHeader } from '../public/DataStates.jsx';
import { MarketAdmin, loadAllPlayers } from '../public/MarketPage.jsx';
import { AuctionSimulator } from '../public/market/AuctionSimulator.jsx';
import { CreateTournamentForm } from '../public/TournamentsPage.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { CreateTeamForm } from './CreateTeamForm.jsx';
import { ClubLifeAdmin } from './ClubLifeAdmin.jsx';
import { PeoplePage } from './PeoplePage.jsx';
import { TournamentAdminPanel, TournamentAwardsPanel } from './TournamentAdminPanel.jsx';

const SECTIONS = [
  { id: 'personas', label: 'PERSONAS Y PERMISOS' },
  { id: 'torneos', label: 'TORNEOS' },
  { id: 'mercado', label: 'MERCADO' },
  { id: 'vida', label: 'VIDA DE CLUB' },
  { id: 'atajos', label: 'CLUBES Y ATAJOS' },
];
// Pestañas antiguas que eran solo enlaces: ahora viven juntas en "Clubes y atajos".
const MOVED = { equipos: 'atajos', jugadores: 'atajos', partidos: 'atajos', noticias: 'atajos' };
const sectionOf = id => (SECTIONS.some(item => item.id === id) ? id : MOVED[id] ?? null);

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
      <p className="control-note">Los traspasos y trueques normalmente se hacen por Discord o en el mercado; usa esto solo para corregir o registrar algo a mano.</p>
      <DataState query={players}/>
      {Array.isArray(players.data) && <MarketAdmin teams={teams} players={players.data} onChanged={() => players.retry()}/>}
    </Card>
    {access.data?.allowed && <Card title="SIMULADOR DE SUBASTAS"><AuctionSimulator teams={teams}/></Card>}
  </div>;
}

/** Control de la liga para administradores: todo lo que antes estaba suelto en las páginas públicas. */
export function ControlRoomPage({ teams = [], initialTab = 'personas', tournamentId = null }) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState(sectionOf(initialTab) ?? 'personas');
  useEffect(() => { if (sectionOf(initialTab)) setTab(sectionOf(initialTab)); }, [initialTab, tournamentId]);
  if (!isAdmin) {
    return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="ADMINISTRACIÓN" title="SALA DE CONTROL"/>
      <EmptyState icon="lock" title="SOLO PARA ADMINISTRADORES">Si necesitas algo de aquí, pídelo a un admin de la liga.</EmptyState></section></main>;
  }
  return <Screen className="control-room" kicker="Administración" title="Sala de control" intro="Herramientas de los admins: personas, torneos, mercado, vida de club y atajos."
    tabs={SECTIONS} active={tab} onTab={id => { window.location.hash = `/admin?tab=${id}`; }}>
    {tab === 'personas' && <PeoplePage teams={teams} embedded/>}
    {tab === 'torneos' && <TournamentsSection teams={teams} initialId={tournamentId}/>}
    {tab === 'mercado' && <MarketSection teams={teams}/>}
    {tab === 'vida' && <ClubLifeAdmin/>}
    {tab === 'atajos' && <div className="control-section">
      <Card title="ATAJOS">
        <ShortcutCards items={[
          ['#/liga?tab=partidos', 'ball', 'CENTRO DE PARTIDOS', 'CREAR, INICIAR, ANOTAR Y CORREGIR'],
          ['#/liga?tab=mas&ver=calendario', 'clock', 'CALENDARIO', 'Arrastra partidos a otro día'],
          ['#/liga?tab=mas&ver=sanciones', 'warning', 'SANCIONES', 'EXPULSIONES Y SUSPENSIONES'],
          ['#/equipos/jugadores/importar', 'search', 'AGREGAR JUGADORES', 'Desde eFootballDB o a mano'],
          ['#/transferencias?tab=buscar', 'shield', 'DIRECTORIO DE JUGADORES', 'Editar o eliminar desde su ficha'],
          ['#/liga?tab=estadios', 'stadium', 'ESTADIOS', 'SUBIR FOTOS DEL CATÁLOGO'],
          ['#/liga?tab=mas&ver=noticias', 'mail', 'PERIÓDICO DE LA LIGA', 'Plantillas e imágenes genéricas'],
        ]}/>
      </Card>
      <Card title="CREAR CLUB O SELECCIÓN"><CreateTeamForm/>
        <p className="control-note">Para editar un club (escudo, presidente, DT, himno) entra a su ficha: el admin lo edita igual que su presidente.</p>
      </Card>
    </div>}
  </Screen>;
}
