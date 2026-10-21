import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { Button, Card, Icon } from '../../ui/index.js';
import { PlayerPicker } from '../public/market/PlayerPicker.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { InboxTab } from './InboxTab.jsx';
import { TalkModal } from './TalkModal.jsx';

const ago = value => {
  const minutes = Math.round((Date.now() - Date.parse(value)) / 60000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 60) return `hace ${Math.max(1, minutes)} min`;
  if (minutes < 1440) return `hace ${Math.round(minutes / 60)} h`;
  return `hace ${Math.round(minutes / 1440)} d`;
};

/** Mensajes: como WhatsApp. Arriba, las charlas con jugadores que quieres fichar; abajo, lo que te escriben los tuyos. */
export function MessagesTab({ team, onTab, onRead, highlightId }) {
  const chats = useApiQuery(signal => endpoints.teamChats(team.id, signal).catch(() => ({ data: [] })), [team.id]);
  const [talking, setTalking] = useState(null);
  const [picking, setPicking] = useState(false);
  const rows = Array.isArray(chats.data) ? chats.data : [];
  const open = player => { setPicking(false); setTalking(player); };
  return <div className="messages-tab">
    <Card title="Charlas con jugadores que quieres fichar" aside={<Button size="sm" icon="chat" onClick={() => setPicking(value => !value)}>Hablar con un jugador</Button>}>
      {picking && <div className="messages-picker"><PlayerPicker status="" label="¿Con quién quieres hablar?" value={null} onChange={player => player && open(player)}/></div>}
      {rows.length
        ? <ul className="chat-list">{rows.map(row => <li key={row.playerId}>
          <button type="button" onClick={() => open({ id: row.playerId, name: row.name, faceUrl: row.faceUrl, position: row.position })}>
            <PlayerFace src={row.faceUrl} name={row.name}/>
            <span className="chat-list-copy">
              <b>{row.name}</b>
              <small>{row.club ? row.club.name : 'Agente libre'}{row.lastMessage ? ` · ${ago(row.lastMessage.createdAt)}` : ''}</small>
              <em>{row.typing ? 'Escribiendo…' : row.lastMessage?.text ?? 'Todavía no hablan.'}</em>
            </span>
            {row.unanswered && <i className="chat-list-badge">Te espera</i>}
            {row.finished && !row.unanswered && <i className="chat-list-done"><Icon name="check" size={12}/> Terminada</i>}
          </button>
        </li>)}</ul>
        : <p className="screen-lead">Todavía no hablas con nadie. Busca a un jugador (de otro club o libre) y convéncelo antes de hacerle una oferta. Se puede aunque el mercado esté cerrado.</p>}
    </Card>
    <InboxTab team={team} onTab={onTab} onRead={onRead} highlightId={highlightId}/>
    {talking && <TalkModal player={talking} teamId={team.id} onClose={() => { setTalking(null); chats.retry(); }} onChanged={() => chats.retry()}/>}
  </div>;
}
