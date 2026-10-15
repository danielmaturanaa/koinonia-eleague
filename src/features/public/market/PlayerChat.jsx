import { useCallback, useEffect, useRef, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { TraitsBadge } from './TraitsBadge.jsx';

const LEVEL = { frio: [1, '🧊 FRÍO'], tibio: [2, '🌤️ TIBIO'], caliente: [3, '🔥 CALIENTE'] };

function InterestMeter({ interest }) {
  const [level, label] = LEVEL[interest] ?? [0, '—'];
  return <div className="chat-meter" role="img" aria-label={`INTERÉS DEL JUGADOR: ${label}`}>
    <div className="chat-meter-bar">{[1, 2, 3].map(step => <i key={step} className={step <= level ? `on level-${level}` : ''}/>)}</div>
    <b>{label}</b>
    <small>ASÍ VE EL JUGADOR A TU CLUB AHORA. MEJORA TU OFERTA PARA SUBIRLO.</small>
  </div>;
}

function Bubble({ message, player }) {
  const mine = message.role === 'club';
  return <div className={`chat-row ${mine ? 'mine' : 'theirs'}`}>
    {!mine && <PlayerFace src={player.faceUrl} name={player.name}/>}
    <p className={`chat-bubble kind-${message.kind} ${message.pending ? 'is-pending' : ''}`}>
      {message.text}
      {message.pending && <small className="chat-typing"> …ESCRIBIENDO</small>}
    </p>
  </div>;
}

/** Chat privado entre un club y el jugador. Las respuestas son datos reales del club y no cambian el resultado por sí solas. */
export function PlayerChat({ auction, teams = [] }) {
  const { isAdmin, user, teamId } = useAuth();
  const clubs = user?.teamIds ?? [];
  const [chosen, setChosen] = useState(teamId ?? clubs[0] ?? '');
  const [shown, setShown] = useState(false);
  const [chat, setChat] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const scroller = useRef(null);

  const [topic, setTopic] = useState(null);
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState('');
  const [text, setText] = useState('');
  const keep = result => { if (result?.data) setChat(result.data); };
  const answer = useApiMutation(
    (body, signal) => endpoints.sealedAuctionAction(auction.id, 'chat/answer', body, signal),
    { onSuccess: result => { keep(result); setPicked([]); setNote(''); } },
  );
  const message = useApiMutation(
    (body, signal) => endpoints.sealedAuctionAction(auction.id, 'chat/message', body, signal),
    { onSuccess: result => { keep(result); setText(''); } },
  );

  const load = useCallback(signal => {
    setLoadError(null);
    return endpoints.sealedAuctionChat(auction.id, chosen, signal).then(response => setChat(response.data)).catch(error => {
      if (error?.code === 'REQUEST_ABORTED') return;
      if (error?.status === 404) setUnavailable(true);
      else setLoadError(error);
    });
  }, [auction.id, chosen]);

  useEffect(() => {
    if (!shown || !chosen) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [shown, chosen, load]);

  // Mientras la IA escribe, se vuelve a pedir la conversación cada 3 s (hasta ~3 minutos) y se reemplazan los mensajes.
  const hasPending = Boolean(chat?.messages?.some(item => item.pending));
  useEffect(() => {
    if (!shown || !chosen || !hasPending) return undefined;
    const controller = new AbortController();
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt > 3 * 60 * 1000) { window.clearInterval(timer); return; }
      endpoints.sealedAuctionChat(auction.id, chosen, controller.signal)
        .then(response => { if (response?.data) setChat(response.data); })
        .catch(() => {});
    }, 3000);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [shown, chosen, hasPending, auction.id]);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [chat?.messages?.length, answer.loading, message.loading]);

  if (unavailable || auction.status !== 'open' || (!chosen && !isAdmin)) return null;
  if (!chosen) return null;

  const names = id => (teams.find(team => team.id === id)?.name ?? id).toUpperCase();
  const pending = chat?.pending;
  const topics = chat?.topics ?? [];
  const current = topics.find(item => item.topic === topic) ?? null;
  const thinking = answer.loading || message.loading;
  const freeText = chat?.freeText ?? { used: 0, limit: 0, maxLength: 280 };
  const toggle = code => setPicked(list => (list.includes(code) ? list.filter(item => item !== code) : [...list, code]));
  const chooseTopic = value => { setTopic(value === topic ? null : value); setPicked([]); setNote(''); answer.clear?.(); };

  if (!shown) {
    return <div className="chat-closed">
      <button type="button" className="action-button" onClick={() => setShown(true)}>💬 HABLAR CON EL JUGADOR</button>
    </div>;
  }

  return <section className="player-chat" aria-label={`CHAT CON ${auction.player.name}`}>
    <header>
      <b>💬 CHAT CON {auction.player.name.toUpperCase()}</b>
      <button type="button" className="chat-hide" onClick={() => setShown(false)}>CERRAR</button>
    </header>
    <p className="poll-hint">ESTE CHAT ES PRIVADO DE TU CLUB. PUEDES CONTESTARLE LO QUE TE PREGUNTE Y TAMBIÉN HABLAR DE CUALQUIER TEMA. NO CAMBIA EL RESULTADO POR SÍ SOLO: LA DECISIÓN USA LOS DATOS DE TU CLUB Y TU OFERTA. SIRVE PARA SABER QUÉ LO CONVENCE Y MEJORAR TU OFERTA.</p>
    {clubs.length > 1 && <label className="chat-club">CLUB
      <select value={chosen} onChange={event => { setChat(null); setTopic(null); setChosen(event.target.value); }}>
        {clubs.map(id => <option key={id} value={id}>{names(id)}</option>)}
      </select>
    </label>}

    {!chat && !loadError && <p className="poll-meta">ABRIENDO LA CONVERSACIÓN…</p>}
    {loadError && <p className="form-feedback error" role="alert">{loadError.message}</p>}

    {chat && <>
      <TraitsBadge negotiation={chat.negotiation ?? auction.negotiation}/>
      <InterestMeter interest={chat.interest}/>
      <div className="chat-log" ref={scroller} aria-live="polite">
        {chat.messages.map(item => <Bubble key={item.id} message={item} player={auction.player}/>)}
        {thinking && <div className="chat-row theirs"><PlayerFace src={auction.player.faceUrl} name={auction.player.name}/><p className="chat-bubble thinking">EL JUGADOR ESTÁ PENSANDO…</p></div>}
      </div>

      {pending && <p className="chat-pending">❓ EL JUGADOR ESPERA TU RESPUESTA SOBRE: <b>{(pending.label ?? pending.topic).toUpperCase()}</b></p>}

      <div className="chat-topics" role="group" aria-label="TEMAS DE CONVERSACIÓN">
        <p className="poll-hint">ELIGE UN TEMA PARA RESPONDER O PARA CONTARLE ALGO. PUEDES MARCAR VARIAS RESPUESTAS A LA VEZ.</p>
        <div className="chat-topic-list">
          {topics.map(item => <button
            key={item.topic} type="button" disabled={thinking}
            className={`chat-topic ${item.answered ? 'answered' : ''} ${pending?.topic === item.topic ? 'asked' : ''} ${topic === item.topic ? 'active' : ''}`}
            aria-pressed={topic === item.topic}
            onClick={() => chooseTopic(item.topic)}
          >{item.answered ? '✓ ' : ''}{(item.label ?? item.topic).toUpperCase()}</button>)}
        </div>
      </div>

      {current && <form className="chat-options" onSubmit={event => {
        event.preventDefault();
        answer.execute({ teamId: chosen, topic: current.topic, optionCodes: picked, ...(note.trim() ? { note: note.trim() } : {}) });
      }}>
        <p className="poll-hint">SOLO PUEDES RESPONDER CON DATOS REALES DE TU CLUB.{current.answered ? ' ESTE TEMA YA LO RESPONDISTE: PUEDES AGREGAR MÁS.' : ''}</p>
        {current.options.length === 0 && <p className="poll-hint">NO HAY DATOS DE TU CLUB PARA ESTE TEMA. PUEDES ESCRIBIRLE ABAJO.</p>}
        {current.options.map(option => <label key={option.code} className={`chat-check ${picked.includes(option.code) ? 'on' : ''}`}>
          <input type="checkbox" checked={picked.includes(option.code)} disabled={thinking} onChange={() => toggle(option.code)}/>
          <span>{option.text}</span>
        </label>)}
        {current.options.length > 0 && <>
          <label className="chat-note">COMENTARIO (OPCIONAL)
            <input type="text" maxLength={200} value={note} disabled={thinking} onChange={event => setNote(event.target.value)} placeholder="AGREGA ALGO CON TUS PALABRAS"/>
            <small>{note.length}/200</small>
          </label>
          <button type="submit" className="action-button positive" disabled={thinking || picked.length === 0}>ENVIAR RESPUESTA{picked.length > 1 ? ` (${picked.length})` : ''}</button>
        </>}
        {answer.error && <p className="form-feedback error" role="alert">{answer.error.message}</p>}
      </form>}

      <form className="chat-free" onSubmit={event => {
        event.preventDefault();
        if (text.trim()) message.execute({ teamId: chosen, text: text.trim() });
      }}>
        <label>ESCRÍBELE AL JUGADOR
          <textarea rows={2} maxLength={freeText.maxLength} value={text} disabled={thinking || freeText.used >= freeText.limit}
            onChange={event => setText(event.target.value)} placeholder="CUÉNTALE TU PROYECTO CON TUS PALABRAS"/>
        </label>
        <div className="chat-free-bar">
          <small>{text.length}/{freeText.maxLength} CARACTERES · MENSAJES {freeText.used}/{freeText.limit}</small>
          <button type="submit" className="action-button" disabled={thinking || !text.trim() || freeText.used >= freeText.limit}>ENVIAR MENSAJE</button>
        </div>
        <p className="poll-hint">ESCRIBIR LIBRE ES PARA CONVERSAR: EL JUGADOR TE CONTESTA, PERO LA DECISIÓN SIGUE USANDO LOS DATOS DE TU CLUB Y TU OFERTA.</p>
        {freeText.used >= freeText.limit && freeText.limit > 0 && <p className="poll-hint">YA USASTE TODOS TUS MENSAJES LIBRES EN ESTA SUBASTA.</p>}
        {message.error && <p className="form-feedback error" role="alert">{message.error.message}</p>}
      </form>
    </>}
  </section>;
}
