import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { formatDate } from '../public/DataStates.jsx';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { MoodMeter, roleLabel } from './SigningSheet.jsx';
import { RoleSelect, useMarketOpen } from './RolesPanel.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { Button } from '../../ui/index.js';
import { useNotifications } from '../notifications/NotificationsProvider.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';

/** Opciones para responderle a un jugador que pide algo (mismas que los botones de Discord). */
function RequestActions({ team, request, locked, onDone }) {
  const [summary, setSummary] = useState(null);
  const resolve = useApiMutation((option, signal) => endpoints.resolveRequest(team.id, request.id, { option }, signal), {
    onSuccess: response => { setSummary(response?.data?.summary ?? null); onDone?.(); },
  });
  if (request.status === 'closed') return <p className="request-note">YA NO ESTÁ EN TU CLUB.</p>;
  if (request.kind === 'leave') return <p className="request-note leave">Pidió salir: ya no se le puede renovar. Véndelo o canjéalo desde el mercado.</p>;
  if (request.status !== 'open') return <p className="request-note">{summary ?? (request.resolution === 'escalated' ? 'NO LE RESPONDISTE A TIEMPO: PIDIÓ SALIR.' : 'RESPONDIDA.')}</p>;
  return <div className="request-actions">
    <span>¿QUÉ LE RESPONDES? <small>SI NO LE RESPONDES A TIEMPO, PIDE SALIR.</small></span>
    <div className="chips">{request.options.map(option => <button type="button" key={option.key} title={option.effect} disabled={locked || resolve.loading} className={option.key === 'ignore' ? 'danger' : ''} onClick={() => resolve.execute(option.key)}>{option.label.toUpperCase()}</button>)}</div>
    {locked && <small>🔒 Mercado abierto: se responde mientras se juega el torneo.</small>}
    {summary && <small>{summary}</small>}
    <FormFeedback mutation={resolve}/>
  </div>;
}

const KIND = { arrival: ['🧳', 'LLEGÓ: CONTRATO POR FIRMAR'], raise: ['💸', 'PIDE UN SUELDO ACORDE'], leave: ['🚪', 'PIDE SALIR'], expiring: ['📄', 'CONTRATO POR VENCER'], expired: ['✍️', 'QUIERE RENOVAR'], unhappy: ['😠', 'DESCONTENTO'], renewal: ['💬', 'RENOVACIÓN'] };

/** Bandeja de entrada del presi: lo que le escriben sus jugadores. Al abrirla, los mensajes se marcan como leídos. */
export function InboxTab({ team, onTab, onRead, highlightId = null }) {
  const query = useApiQuery(signal => endpoints.teamInbox(team.id, signal), [team.id]);
  const messages = query.data?.messages ?? [];
  // Rol actual de cada jugador (el del mensaje puede estar desactualizado) para cambiarlo desde la propia bandeja.
  const rolesQuery = useApiQuery(signal => endpoints.teamRoles(team.id, signal), [team.id]);
  const roleOf = new Map((Array.isArray(rolesQuery.data) ? rolesQuery.data : []).map(row => [row.playerId, row]));
  const marketOpen = useMarketOpen();
  const { refresh: refreshNotifications } = useNotifications();
  const [readNow, setReadNow] = useState(() => new Set());
  const scrolledTo = useRef(null);
  // Cada carta se marca leída al tocarla (o al llegar por un aviso); ya no se marcan todas solo por abrir la bandeja.
  const markRead = async ids => {
    // Se ve leída al instante; el servidor la confirma en segundo plano.
    setReadNow(current => new Set([...current, ...(ids ?? messages.filter(message => !message.read).map(message => message.id))]));
    await endpoints.markInboxRead(team.id, ids).catch(() => {});
    onRead?.();
    refreshNotifications();
  };
  const isRead = message => message.read || readNow.has(message.id);
  const unread = messages.filter(message => !isRead(message)).length;
  useEffect(() => {
    if (!highlightId || !query.data || scrolledTo.current === highlightId) return;
    scrolledTo.current = highlightId;
    document.getElementById(`msg-${highlightId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (messages.some(message => String(message.id) === String(highlightId) && !isRead(message))) markRead([highlightId]);
  }, [highlightId, query.data]);
  // Solo lo último de cada jugador puede pedir algo; lo demás (y todo lo ya respondido) es historial, sin botones.
  const latest = new Map();
  for (const message of messages) {
    const current = latest.get(message.playerId);
    if (!current || String(message.createdAt) > String(current.createdAt)) latest.set(message.playerId, message);
  }
  const staleOf = message => {
    const nowRow = roleOf.get(message.playerId);
    return message.kind === 'unhappy' && nowRow && message.meta?.role && nowRow.role !== message.meta.role;
  };
  // El servidor dice qué carta todavía pide algo (`needsAnswer`); lo de abajo queda para respuestas viejas sin ese dato.
  const needsYou = message => {
    if (typeof message.needsAnswer === 'boolean') return message.needsAnswer;
    if (message.request) return message.request.status === 'open';
    if (latest.get(message.playerId)?.id !== message.id) return false;
    if (message.kind === 'unhappy') return !staleOf(message);
    return ['expired', 'expiring'].includes(message.kind);
  };
  const pending = messages.filter(needsYou);
  const history = messages.filter(message => !needsYou(message));
  const outcome = message => {
    if (message.request?.status === 'closed') return 'Ya no está en tu club.';
    if (message.request?.kind === 'leave') return 'Pidió salir.';
    if (message.request?.resolution === 'role_given') return 'Le diste el rol que pedía.';
    if (message.request?.resolution === 'raised') return 'Le subiste el sueldo.';
    if (message.request?.resolution === 'minutes') return 'Le prometiste minutos en el próximo partido.';
    if (message.request) return message.request.resolution === 'escalated' ? 'No le respondiste a tiempo: pidió salir.' : 'Respondida.';
    if (staleOf(message)) return `Le cambiaste el rol a ${roleLabel(roleOf.get(message.playerId).role).toLowerCase()}.`;
    if (message.kind === 'unhappy') return 'Ya está más tranquilo.';
    if (message.kind === 'expiring' || message.kind === 'expired') return 'Contrato resuelto.';
    if (message.kind === 'arrival') return 'Contrato firmado.';
    return 'Leída.';
  };
  const open = message => { if (!isRead(message)) markRead([message.id]); };
  return <section className="inbox-tab">
    <header><h2>MENSAJES DE TUS JUGADORES</h2>{unread > 0 && <Button variant="ghost" size="sm" onClick={() => markRead(null)}>MARCAR TODO COMO LEÍDO ({unread})</Button>}<p>Lo que te piden tus jugadores. Lo que ya respondiste queda abajo, en el historial.</p></header>
    <DataState query={query} empty={null}/>
    {query.data && messages.length === 0 && <p className="empty-copy data-empty">Todavía no te han escrito. Los mensajes aparecen cuando el sistema de contratos está activo.</p>}
    {query.data && messages.length > 0 && pending.length === 0 && <p className="inbox-clear">✅ No tienes nada por responder.</p>}
    <ul className="inbox-list">{pending.map(message => {
      const [icon, label] = KIND[message.kind] ?? ['✉️', 'MENSAJE'];
      const nowRow = roleOf.get(message.playerId);
      return <li key={message.id} id={`msg-${message.id}`} className={`inbox-item ${isRead(message) ? '' : 'unread'} ${String(message.id) === String(highlightId) ? 'is-highlighted' : ''}`} onClick={() => open(message)}>
        <PlayerFace src={message.faceUrl} name={message.playerName}/>
        <div className="inbox-body">
          <div className="inbox-meta"><b>{message.playerName}</b><small>{icon} {label} · {formatDate(message.createdAt)}</small></div>
          <h4>{message.subject}</h4>
          <p>{message.body}</p>
          {message.meta?.moodLabel && !['renewal', 'arrival'].includes(message.kind) && <div className="inbox-mood"><MoodMeter mood={message.meta.mood} label={message.meta.moodLabel}/>{message.meta.role && <small>ROL: {roleLabel(message.meta.role)}</small>}</div>}
          {['expired', 'expiring', 'arrival'].includes(message.kind) && <Button onClick={() => onTab?.('nomina')}>{message.kind === 'expiring' ? 'Ver contrato' : 'Ir a la hoja de firma'}</Button>}
          {message.request && <RequestActions team={team} request={message.request} locked={marketOpen} onDone={() => { query.retry(); rolesQuery.retry(); }}/>}
          {message.kind === 'unhappy' && nowRow && <div className="inbox-role">
            <span>ROL AHORA:</span><RoleSelect team={team} row={nowRow} locked={nowRow.roleLocked ?? marketOpen} showWanted onDone={() => { rolesQuery.retry(); }}/>
            <small>{marketOpen ? '🔒 Mercado abierto: los roles están bloqueados.' : `ÁNIMO HOY: ${String(nowRow.moodLabel).toUpperCase()} (${nowRow.mood}/100)`}</small>
          </div>}
        </div>
      </li>;
    })}</ul>
    {history.length > 0 && <details className="inbox-history" open={history.some(message => String(message.id) === String(highlightId))}>
      <summary>Historial · {history.length} mensaje{history.length === 1 ? '' : 's'}</summary>
      <ul>{history.map(message => <li key={message.id} id={`msg-${message.id}`} className={`${isRead(message) ? '' : 'unread'} ${String(message.id) === String(highlightId) ? 'is-highlighted' : ''}`} onClick={() => open(message)}>
        <PlayerFace src={message.faceUrl} name={message.playerName}/>
        <span><b>{message.playerName}</b> · {message.subject}<small>{formatDate(message.createdAt)} · {outcome(message)}</small></span>
      </li>)}</ul>
    </details>}
  </section>;
}
