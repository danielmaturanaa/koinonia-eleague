import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { formatDate } from '../public/DataStates.jsx';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { MoodMeter, roleLabel } from './SigningSheet.jsx';
import { RoleSelect, useMarketOpen } from './RolesPanel.jsx';
import { BoardPanel } from './BoardPanel.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';

/** Opciones para responderle a un jugador que pide algo (mismas que los botones de Discord). */
function RequestActions({ team, request, locked, onDone }) {
  const [summary, setSummary] = useState(null);
  const resolve = useApiMutation((option, signal) => endpoints.resolveRequest(team.id, request.id, { option }, signal), {
    onSuccess: response => { setSummary(response?.data?.summary ?? null); onDone?.(); },
  });
  if (request.status === 'closed') return <p className="request-note">YA NO ESTÁ EN TU CLUB.</p>;
  if (request.kind === 'leave') return <p className="request-note leave">PIDIÓ SALIR: YA NO SE LE PUEDE RENOVAR. VÉNDELO O CANJÉALO DESDE EL MERCADO.</p>;
  if (request.status !== 'open') return <p className="request-note">{summary ?? (request.resolution === 'escalated' ? 'NO LE RESPONDISTE A TIEMPO: PIDIÓ SALIR.' : 'RESPONDIDA.')}</p>;
  return <div className="request-actions">
    <span>¿QUÉ LE RESPONDES? <small>SI NO LE RESPONDES A TIEMPO, PIDE SALIR.</small></span>
    <div className="chips">{request.options.map(option => <button type="button" key={option.key} title={option.effect} disabled={locked || resolve.loading} className={option.key === 'ignore' ? 'danger' : ''} onClick={() => resolve.execute(option.key)}>{option.label.toUpperCase()}</button>)}</div>
    {locked && <small>🔒 MERCADO ABIERTO: SE RESPONDE MIENTRAS SE JUEGA EL TORNEO.</small>}
    {summary && <small>{summary}</small>}
    <FormFeedback mutation={resolve}/>
  </div>;
}

const KIND = { raise: ['💸', 'PIDE UN SUELDO ACORDE'], leave: ['🚪', 'PIDE SALIR'], expiring: ['📄', 'CONTRATO POR VENCER'], expired: ['✍️', 'QUIERE RENOVAR'], unhappy: ['😠', 'DESCONTENTO'], renewal: ['💬', 'RENOVACIÓN'] };

/** Bandeja de entrada del presi: lo que le escriben sus jugadores. Al abrirla, los mensajes se marcan como leídos. */
export function InboxTab({ team, onTab, onRead }) {
  const query = useApiQuery(signal => endpoints.teamInbox(team.id, signal), [team.id]);
  const messages = query.data?.messages ?? [];
  // Rol actual de cada jugador (el del mensaje puede estar desactualizado) para cambiarlo desde la propia bandeja.
  const rolesQuery = useApiQuery(signal => endpoints.teamRoles(team.id, signal), [team.id]);
  const roleOf = new Map((Array.isArray(rolesQuery.data) ? rolesQuery.data : []).map(row => [row.playerId, row]));
  const marketOpen = useMarketOpen();
  useEffect(() => {
    if (query.data?.unread > 0) endpoints.markInboxRead(team.id).then(() => onRead?.()).catch(() => {});
  }, [query.data?.unread, team.id]);
  return <section className="inbox-tab">
    <header><h2>BANDEJA DE ENTRADA</h2><p>AQUÍ TE ESCRIBEN TUS JUGADORES: CUANDO SU CONTRATO ESTÁ POR VENCER, CUANDO QUIEREN RENOVAR Y CUANDO NO ESTÁN CONFORMES CON SU ROL.</p></header>
    <BoardPanel team={team}/>
    <DataState query={query}/>
    {query.data && messages.length === 0 && <p className="empty-copy data-empty">TODAVÍA NO TE HAN ESCRITO. LOS MENSAJES APARECEN CUANDO EL SISTEMA DE CONTRATOS ESTÁ ACTIVO.</p>}
    <ul className="inbox-list">{messages.map(message => {
      const [icon, label] = KIND[message.kind] ?? ['✉️', 'MENSAJE'];
      // El mensaje es una foto del momento en que se escribió: si desde entonces le cambiaste el rol, se avisa y no se muestra el ánimo viejo.
      const nowRow = roleOf.get(message.playerId);
      const stale = message.kind === 'unhappy' && nowRow && message.meta?.role && nowRow.role !== message.meta.role;
      return <li key={message.id} className={`inbox-item ${message.read ? '' : 'unread'}`}>
        <PlayerFace src={message.faceUrl} name={message.playerName}/>
        <div className="inbox-body">
          <div className="inbox-meta"><b>{message.playerName}</b><small>{icon} {label} · {formatDate(message.createdAt)}</small></div>
          <h4>{message.subject}</h4>
          <p>{message.body}</p>
          {stale && <p className="request-note">↻ ESTE MENSAJE ES DE CUANDO ERA {roleLabel(message.meta.role)}. DESDE ENTONCES LO PASASTE A {roleLabel(nowRow.role)}.</p>}
          {!stale && message.meta?.moodLabel && message.kind !== 'renewal' && <div className="inbox-mood"><MoodMeter mood={message.meta.mood} label={message.meta.moodLabel}/>{message.meta.role && <small>ROL: {roleLabel(message.meta.role)}</small>}</div>}
          {['expired', 'expiring'].includes(message.kind) && <button type="button" className="action-button" onClick={() => onTab?.('nomina')}>{message.kind === 'expired' ? 'IR A LA HOJA DE FIRMA' : 'VER CONTRATO'}</button>}
          {message.request && <RequestActions team={team} request={message.request} locked={marketOpen} onDone={() => { query.retry(); rolesQuery.retry(); }}/>}
          {message.kind === 'unhappy' && roleOf.get(message.playerId) && <div className="inbox-role">
            <span>ROL AHORA:</span><RoleSelect team={team} row={roleOf.get(message.playerId)} locked={marketOpen} showWanted onDone={() => { rolesQuery.retry(); }}/>
            <small>{marketOpen ? '🔒 MERCADO ABIERTO: LOS ROLES ESTÁN BLOQUEADOS.' : `ÁNIMO HOY: ${String(roleOf.get(message.playerId).moodLabel).toUpperCase()} (${roleOf.get(message.playerId).mood}/100)`}</small>
          </div>}
        </div>
      </li>;
    })}</ul>
  </section>;
}
