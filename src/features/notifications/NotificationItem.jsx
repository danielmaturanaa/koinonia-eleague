import { Icon, PlayerAvatar } from '../../ui/index.js';
import { timeAgo } from '../../utils/timeAgo.js';
import { categoryIcon, categoryLabel } from './categories.js';

/** Un aviso en la lista (campana y página): icono o foto del jugador, título, texto, club, hora y punto de "sin leer". */
export function NotificationItem({ item, onOpen, showClub = false }) {
  const letter = item.payload?.letter;
  return <li className={`notif-item ${item.read ? '' : 'unread'} prio-${item.priority}`}>
    <button type="button" onClick={() => onOpen(item)}>
      {letter
        ? <PlayerAvatar src={item.payload.faceUrl} name={item.payload.playerName} size="sm"/>
        : <span className="notif-icon"><Icon name={categoryIcon(item.category)} size={22}/></span>}
      <span className="notif-main">
        <b>{item.title}</b>
        {item.body && <span className="notif-body">{item.body}</span>}
        <small>{categoryLabel(item.category)}{showClub && item.teamName ? ` · ${item.teamName.toUpperCase()}` : ''} · {timeAgo(item.createdAt)}</small>
      </span>
      {!item.read && <span className="notif-dot" role="img" aria-label="Sin leer"/>}
    </button>
  </li>;
}
