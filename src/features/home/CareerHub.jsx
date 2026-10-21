import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { matchRoundLabel } from '../../utils/matchPresentation.js';
import { teamBalance } from '../../utils/teamPresentation.js';
import { Card, Icon, Screen, Tile } from '../../ui/index.js';
import { gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { useNotifications } from '../notifications/NotificationsProvider.jsx';
import { BoardPanel } from '../teams/BoardPanel.jsx';
import { NewsArtwork } from '../../components/NewsArtwork.jsx';
import { NewsModal } from '../news/NewsModal.jsx';
import { useAutomaticNews } from '../news/useAutomaticNews.js';

const list = value => (Array.isArray(value) ? value : []);
const when = value => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }) : null;
};

const compactFans = value => (value >= 1_000_000 ? `${Math.round(value / 1_000_000).toLocaleString('es-CL')} M` : `${Math.round(value / 1000).toLocaleString('es-CL')} mil`);
const sideOf = (match, teamId) => (match.homeTeam?.id === teamId ? 'home' : 'away');
const rivalOf = (match, teamId) => (sideOf(match, teamId) === 'home' ? match.awayTeam : match.homeTeam);
function resultOf(match, teamId) {
  const mine = sideOf(match, teamId) === 'home' ? match.homeScore : match.awayScore;
  const theirs = sideOf(match, teamId) === 'home' ? match.awayScore : match.homeScore;
  return mine > theirs ? 'G' : mine < theirs ? 'P' : 'E';
}

/** Lo que espera una decisión tuya, cada cosa con su enlace exacto. */
function useTodo(teamId, base) {
  const contracts = useApiQuery(signal => endpoints.teamContracts(teamId, signal).catch(() => ({ data: null })), [teamId]);
  const offers = useApiQuery(signal => endpoints.marketOffers(signal).catch(() => ({ data: [] })), []);
  const watch = useApiQuery(signal => endpoints.teamWatchlist(teamId, signal).catch(() => ({ data: [] })), [teamId]);
  const { summary, version } = useNotifications();
  const first = useRef(version);
  useEffect(() => { if (version !== first.current) { offers.retry(); watch.retry(); contracts.retry(); } }, [version]);
  const rows = list(contracts.data?.contracts);
  const expiring = rows.filter(row => row.status === 'expired' || (row.status === 'active' && (row.endsWith || row.seasonsLeft === 1))).length;
  const incoming = list(offers.data).filter(offer => offer.direction === 'incoming').length;
  const alerts = list(watch.data).filter(row => row.alerts?.length).length;
  const requests = summary.byCategory.requests ?? 0;
  const velada = base?.velada;
  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  return [
    incoming > 0 && { icon: 'gavel', text: `${plural(incoming, 'oferta', 'ofertas')} por responder`, href: '#/transferencias?tab=ofertas' },
    requests > 0 && { icon: 'chat', text: `${plural(requests, 'jugador quiere', 'jugadores quieren')} hablar contigo`, href: `#/equipos/${teamId}?tab=mensajes` },
    expiring > 0 && { icon: 'contract', text: `${plural(expiring, 'contrato', 'contratos')} por renovar`, href: `#/equipos/${teamId}?tab=finanzas` },
    alerts > 0 && { icon: 'star', text: `${plural(alerts, 'jugador que sigues tiene', 'jugadores que sigues tienen')} novedades`, href: '#/transferencias?tab=seguidos' },
    velada?.round?.status === 'open' && velada.eligibility?.eligible && velada.myBid === null && { icon: 'mic', text: 'Ibai busca estadio para La Velada: puedes ofrecer el tuyo', href: `#/equipos/${teamId}?tab=estadio&ver=velada` },
    base?.enabled && !base.sponsor && { icon: 'handshake', text: 'Tres canales quieren transmitir tus partidos', href: `#/equipos/${teamId}?tab=estadio&ver=tv` },
  ].filter(Boolean);
}

function MiniTable({ standings = [], teamId, teams }) {
  if (!standings.length) return null;
  const index = standings.findIndex(row => row.team_id === teamId);
  const byId = new Map(teams.map(team => [team.id, team]));
  return <Card title="Tabla" aside={<a className="card-link" href="#/liga?tab=tabla">Ver completa ›</a>}>
    <ol className="mini-table">{standings.map((row, position) => <li key={row.team_id} className={`${row.team_id === teamId ? 'mine' : ''} ${Math.abs(position - index) > 2 && position > 2 ? 'far' : ''}`}>
      <b>{position + 1}</b><TeamMark team={{ ...row, ...(byId.get(row.team_id) ?? {}) }}/><span>{row.name}</span><strong>{row.points}</strong>
    </li>)}</ol>
  </Card>;
}

function LatestNews({ teams }) {
  const { news } = useAutomaticNews();
  const [open, setOpen] = useState(null);
  const items = news.slice(0, 3);
  if (!items.length) return null;
  return <Card title="Últimas noticias" aside={<a className="card-link" href="#/liga?tab=mas&ver=noticias">Todas ›</a>}>
    <div className="hub-news">{items.map(item => <button type="button" key={item.id} onClick={() => setOpen(item)}><NewsArtwork item={item} teams={teams}/><span><small>{item.label}</small><b>{item.headline}</b></span></button>)}</div>
    {open && <NewsModal item={open} teams={teams} onClose={() => setOpen(null)}/>}
  </Card>;
}

/** Inicio = la central de tu club, como el menú del modo carrera: lo próximo, lo pendiente y los atajos. */
export function CareerHub({ teamId, teams = [], standings = [] }) {
  const team = useApiQuery(signal => endpoints.team(teamId, signal), [teamId]);
  const matches = useApiQuery(signal => endpoints.teamMatches(teamId, signal), [teamId]);
  const rivalry = useApiQuery(signal => endpoints.teamRivalry(teamId, signal).catch(() => ({ data: null })), [teamId]);
  const market = useApiQuery(signal => endpoints.marketStatus(signal).catch(() => ({ data: { open: false } })), []);
  const business = useApiQuery(signal => endpoints.teamBusiness(teamId, signal).catch(() => ({ data: null })), [teamId]);
  const inbox = useApiQuery(signal => endpoints.teamInbox(teamId, signal).catch(() => ({ data: null })), [teamId]);
  const fans = useApiQuery(signal => endpoints.teamFans(teamId, signal).catch(() => ({ data: null })), [teamId]);
  const todo = useTodo(teamId, business.data);
  const club = team.data ? { ...team.data, ...(teams.find(item => item.id === teamId) ?? {}) } : teams.find(item => item.id === teamId);
  const all = list(matches.data);
  const next = all.filter(match => ['live', 'pending'].includes(match.status)).sort((a, b) => (a.status === 'live' ? -1 : 0) - (b.status === 'live' ? -1 : 0) || (a.roundNumber ?? 999) - (b.roundNumber ?? 999))[0] ?? null;
  const played = all.filter(match => match.status === 'finished').sort((a, b) => String(b.finishedAt ?? '').localeCompare(String(a.finishedAt ?? ''))).slice(0, 5);
  const rival = rivalry.data?.rival ?? null;
  const nextRival = next ? rivalOf(next, teamId) : null;
  const derby = Boolean(next?.derby || (nextRival && rival && nextRival.id === rival.id));
  const h2h = rivalry.data?.headToHead;
  const position = standings.findIndex(row => row.team_id === teamId) + 1;
  const balance = teamBalance(club);
  const unread = inbox.data?.unread ?? 0;
  const greeting = club?.president?.name ? `Hola, ${club.president.name.split(' ')[0]}.` : 'Hola, presi.';
  const colors = club?.colors ?? {};
  const hero = club && <div className="hub-crest" style={{ '--club-primary': colors.primary ?? '#062764' }}><TeamMark team={club} className="hub-crest-mark"/></div>;
  return <Screen className="career-hub" kicker={club ? `${club.name}${position ? ` · ${position}.º en la liga` : ''}` : 'Tu club'} title="Inicio" hero={hero}
    intro={`${greeting} ${todo.length ? `Tienes ${todo.length} ${todo.length === 1 ? 'cosa' : 'cosas'} esperando tu decisión.` : 'Todo al día: no hay nada esperando tu decisión.'}`}>
    <div className="tile-grid">
      <Tile size="lg" tone={derby ? 'red' : 'navy'} href={next ? `#/partidos/${next.id}` : '#/liga?tab=partidos'} icon={<Icon name={derby ? 'fire' : 'ball'} size={18}/>}
        title={next?.status === 'live' ? 'Jugando ahora' : derby ? 'Próximo partido · ¡Clásico!' : 'Próximo partido'}
        value={nextRival ? `vs ${nextRival.name}` : 'Sin partidos'}
        detail={next ? `${matchRoundLabel(next)} · ${sideOf(next, teamId) === 'home' ? 'de local' : 'de visita'}` : 'No tienes partidos por jugar.'}/>
      <Tile href={`#/equipos/${teamId}?tab=mensajes`} icon={<Icon name="chat" size={18}/>} title="Mensajes" badge={unread}
        value={unread ? `${unread} sin leer` : 'Al día'} detail="Tus jugadores y los que quieres fichar."/>
      <Tile href={`#/equipos/${teamId}?tab=finanzas`} icon={<Icon name="coin" size={18}/>} title="Caja" value={balance === null ? '—' : gp(balance)} detail="Sueldos, ingresos y gastos."/>
      <Tile tone={market.data?.open ? 'gold' : 'paper'} href="#/transferencias" icon={<Icon name="handshake" size={18}/>} title="Mercado"
        value={market.data?.open ? 'Abierto' : 'Cerrado'} detail={market.data?.open ? `Cierra el ${when(market.data.closesAt) ?? 'pronto'}.` : 'Igual puedes buscar jugadores y hablarles.'}/>
      <Tile href={`#/equipos/${teamId}?tab=clasico`} icon={<Icon name="fire" size={18}/>} title="Tu clásico" value={rival ? `vs ${rival.name}` : 'Sin rival'}
        detail={h2h?.played ? `${h2h.wins} ganados · ${h2h.draws} empates · ${h2h.losses} perdidos` : 'Toca para elegir tu rival.'}/>
      <Tile href={`#/equipos/${teamId}?tab=plantel`} icon={<Icon name="shirt" size={18}/>} title="Plantel" value={club?.playerCount ? `${club.playerCount} jugadores` : 'Tu plantel'} detail="Alineación, roles y ánimo."/>
      <Tile href={`#/equipos/${teamId}?tab=estadio`} icon={<Icon name="stadium" size={18}/>} title="Estadio" value={fans.data?.venue?.name ?? 'Tu estadio'}
        detail={fans.data?.followers ? `${compactFans(fans.data.followers)} de hinchas · conciertos, TV y La Velada.` : 'Hinchas, conciertos, TV y La Velada.'}/>
    </div>

    <Card title="Esperando tu decisión">
      {todo.length
        ? <ul className="hub-todo">{todo.map(item => <li key={item.text}><a href={item.href}><Icon name={item.icon} size={20}/><span>{item.text}</span><i aria-hidden="true">›</i></a></li>)}</ul>
        : <p className="screen-lead">Nada pendiente. Buen momento para mirar el mercado o hablar con un jugador.</p>}
    </Card>

    <div className="hub-columns">
      <div className="hub-column">
        {played.length > 0 && <Card title="Últimos partidos" aside={<a className="card-link" href="#/liga?tab=partidos">Todos ›</a>}>
          <ul className="hub-results">{played.map(match => {
            const result = resultOf(match, teamId);
            const other = rivalOf(match, teamId);
            return <li key={match.id}><a href={`#/partidos/${match.id}`}><em className={`form-${result}`}>{result}</em><span>{sideOf(match, teamId) === 'home' ? 'vs' : 'en casa de'} {other?.name}</span>
              <b>{match.homeScore}-{match.awayScore}</b>{rival && other?.id === rival.id && <Icon name="fire" size={14}/>}</a></li>;
          })}</ul>
        </Card>}
        <BoardPanel team={{ id: teamId }}/>
      </div>
      <div className="hub-column">
        <MiniTable standings={standings} teamId={teamId} teams={teams}/>
        <LatestNews teams={teams}/>
      </div>
    </div>
  </Screen>;
}
