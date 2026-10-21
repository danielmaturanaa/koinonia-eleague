import { useEffect, useRef } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { matchRoundLabel } from '../../utils/matchPresentation.js';
import { Card, EmptyState, Icon, Stat } from '../../ui/index.js';
import { gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { useNotifications } from '../notifications/NotificationsProvider.jsx';
import { BoardPanel } from './BoardPanel.jsx';

const upper = text => String(text ?? '').toUpperCase();

function nextMatchOf(matches, teamId) {
  return matches
    .filter(match => ['pending', 'live'].includes(match.status) && (match.homeTeam?.id === teamId || match.awayTeam?.id === teamId))
    .sort((left, right) => (left.roundNumber ?? Number.MAX_SAFE_INTEGER) - (right.roundNumber ?? Number.MAX_SAFE_INTEGER))[0] ?? null;
}

function marketHint(status) {
  if (!status?.open) return 'ROLES Y PETICIONES SE RESPONDEN AHORA';
  const closes = status.closesAt ? new Date(status.closesAt) : null;
  return closes && !Number.isNaN(closes.getTime()) ? `CIERRA ${closes.toLocaleString('es-CL', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}` : 'CONTRATOS Y OFERTAS SE MUEVEN AHORA';
}

/**
 * Central del club (la pantalla de inicio de Mi club): plata, nómina, mercado, próximo partido, lo que está esperando que hagas y la directiva.
 * La tabla y los últimos resultados vienen de la ficha (`standing`, `results`) para no duplicar sus componentes.
 */
export function ClubCentral({ team, balance, matches = [], onTab, standing = null, results = null }) {
  const contracts = useApiQuery(signal => endpoints.teamContracts(team.id, signal).catch(() => ({ data: null })), [team.id]);
  const market = useApiQuery(signal => endpoints.marketStatus(signal).catch(() => ({ data: { open: false } })), []);
  const offers = useApiQuery(signal => endpoints.marketOffers(signal).catch(() => ({ data: [] })), []);
  const watch = useApiQuery(signal => endpoints.teamWatchlist(team.id, signal).catch(() => ({ data: [] })), [team.id]);
  const { summary, version } = useNotifications();
  // Los avisos nuevos refrescan lo que está esperando respuesta.
  const firstVersion = useRef(version);
  useEffect(() => { if (version !== firstVersion.current) { offers.retry(); watch.retry(); contracts.retry(); } }, [version]);

  const rows = Array.isArray(contracts.data?.contracts) ? contracts.data.contracts : [];
  const live = rows.filter(row => ['active', 'expired'].includes(row.status));
  const payroll = live.reduce((total, row) => total + (row.salary ?? 0), 0);
  const cap = contracts.data?.projection?.cap ?? null;
  const expiring = rows.filter(row => row.status === 'expired' || (row.status === 'active' && (row.endsWith || row.seasonsLeft === 1))).length;
  const incoming = (Array.isArray(offers.data) ? offers.data : []).filter(offer => offer.direction === 'incoming').length;
  const alerts = (Array.isArray(watch.data) ? watch.data : []).filter(row => row.alerts?.length).length;
  const requests = summary.byCategory.requests ?? 0;
  const next = nextMatchOf(matches, team.id);
  const rival = next ? (next.homeTeam?.id === team.id ? next.awayTeam : next.homeTeam) : null;

  const todo = [
    incoming > 0 && ['gavel', `${incoming} OFERTA${incoming === 1 ? '' : 'S'} POR RESPONDER`, `#/transferencias?tab=ofertas`],
    requests > 0 && ['mail', `${requests} PETICIÓN${requests === 1 ? '' : 'ES'} DE JUGADORES`, `#/equipos/${team.id}?tab=bandeja`],
    expiring > 0 && ['contract', `${expiring} CONTRATO${expiring === 1 ? '' : 'S'} POR VENCER O VENCIDO${expiring === 1 ? '' : 'S'}`, `#/equipos/${team.id}?tab=nomina`],
    alerts > 0 && ['star', `${alerts} JUGADOR${alerts === 1 ? '' : 'ES'} QUE SIGUES CON NOVEDADES`, `#/equipos/${team.id}?tab=seguimiento`],
  ].filter(Boolean);

  return <div className="club-central">
    <div className="central-stats">
      <Card tone="paper"><Stat label="SALDO" value={balance === null ? '—' : gp(balance)} hint="GP PARA FICHAJES"/></Card>
      <Card tone="paper"><Stat label="NÓMINA ANUAL" value={gp(payroll)} hint={cap === null ? 'SIN TOPE DEFINIDO' : payroll > cap ? `TE PASAS DEL TOPE POR ${gp(payroll - cap)}` : `TOPE ${gp(cap)}`} tone={cap !== null && payroll > cap ? 'bad' : 'default'}/></Card>
      <Card tone={market.data?.open ? 'gold' : 'paper'}><Stat label="MERCADO" value={market.data?.open ? 'ABIERTO' : 'CERRADO'} hint={marketHint(market.data)} tone={market.data?.open ? 'good' : 'default'}/></Card>
      <Card tone="paper"><Stat label="PRÓXIMO PARTIDO" value={rival ? `VS ${upper(rival.name).slice(0, 18)}` : '—'} hint={rival ? (next.status === 'live' ? 'EN VIVO AHORA' : upper(matchRoundLabel(next))) : 'SIN PARTIDOS PENDIENTES'}/></Card>
    </div>

    <Card title="ESPERANDO TU DECISIÓN">
      {todo.length === 0
        ? <EmptyState icon="check" title="TODO AL DÍA">NO HAY OFERTAS, PETICIONES NI CONTRATOS ESPERANDO TU RESPUESTA.</EmptyState>
        : <ul className="central-todo">{todo.map(([icon, text, href]) => <li key={text}><a href={href}><Icon name={icon} size={22}/><b>{text}</b><span aria-hidden="true">→</span></a></li>)}</ul>}
      {summary.unread > 0 && <p className="central-note">TIENES {summary.unread} AVISO{summary.unread === 1 ? '' : 'S'} SIN LEER EN LA <a href="#/notificaciones">CAMPANA</a>.</p>}
    </Card>

    <BoardPanel team={team}/>
    <div className="central-columns">{standing}{results}</div>
    <p className="central-links">
      <button type="button" onClick={() => onTab?.('nomina')}>VER CONTRATOS Y NÓMINA →</button>
      <button type="button" onClick={() => onTab?.('plantel')}>VER PLANTEL →</button>
      <a href="#/transferencias">IR AL MERCADO →</a>
    </p>
  </div>;
}
