import { useEffect } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { formatDate } from '../public/DataStates.jsx';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { MoodMeter, roleLabel } from './SigningSheet.jsx';

const KIND = { expiring: ['📄', 'CONTRATO POR VENCER'], expired: ['✍️', 'QUIERE RENOVAR'], unhappy: ['😠', 'DESCONTENTO'], renewal: ['💬', 'RENOVACIÓN'] };

/** Bandeja de entrada del presi: lo que le escriben sus jugadores. Al abrirla, los mensajes se marcan como leídos. */
export function InboxTab({ team, onTab, onRead }) {
  const query = useApiQuery(signal => endpoints.teamInbox(team.id, signal), [team.id]);
  const messages = query.data?.messages ?? [];
  useEffect(() => {
    if (query.data?.unread > 0) endpoints.markInboxRead(team.id).then(() => onRead?.()).catch(() => {});
  }, [query.data?.unread, team.id]);
  return <section className="inbox-tab">
    <header><h2>BANDEJA DE ENTRADA</h2><p>AQUÍ TE ESCRIBEN TUS JUGADORES: CUANDO SU CONTRATO ESTÁ POR VENCER, CUANDO QUIEREN RENOVAR Y CUANDO NO ESTÁN CONFORMES CON SU ROL.</p></header>
    <DataState query={query}/>
    {query.data && messages.length === 0 && <p className="empty-copy data-empty">TODAVÍA NO TE HAN ESCRITO. LOS MENSAJES APARECEN CUANDO EL SISTEMA DE CONTRATOS ESTÁ ACTIVO.</p>}
    <ul className="inbox-list">{messages.map(message => {
      const [icon, label] = KIND[message.kind] ?? ['✉️', 'MENSAJE'];
      return <li key={message.id} className={`inbox-item ${message.read ? '' : 'unread'}`}>
        <PlayerFace src={message.faceUrl} name={message.playerName}/>
        <div className="inbox-body">
          <div className="inbox-meta"><b>{message.playerName}</b><small>{icon} {label} · {formatDate(message.createdAt)}</small></div>
          <h4>{message.subject}</h4>
          <p>{message.body}</p>
          {message.meta?.moodLabel && message.kind !== 'renewal' && <div className="inbox-mood"><MoodMeter mood={message.meta.mood} label={message.meta.moodLabel}/>{message.meta.role && <small>ROL: {roleLabel(message.meta.role)}</small>}</div>}
          {['expired', 'expiring'].includes(message.kind) && <button type="button" className="action-button" onClick={() => onTab?.('nomina')}>{message.kind === 'expired' ? 'IR A LA HOJA DE FIRMA' : 'VER CONTRATO'}</button>}
          {message.kind === 'unhappy' && <button type="button" className="action-button" onClick={() => onTab?.('nomina')}>CAMBIAR SU ROL</button>}
        </div>
      </li>;
    })}</ul>
  </section>;
}
