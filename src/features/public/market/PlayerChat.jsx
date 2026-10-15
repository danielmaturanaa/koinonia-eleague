import { useCallback, useEffect, useRef, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';

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
    <p className={`chat-bubble kind-${message.kind}`}>{message.text}</p>
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

  const answer = useApiMutation(
    (body, signal) => endpoints.sealedAuctionAction(auction.id, 'chat/answer', body, signal),
    { onSuccess: result => { if (result?.data) setChat(result.data); } },
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

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [chat?.messages?.length, answer.loading]);

  if (unavailable || auction.status !== 'open' || (!chosen && !isAdmin)) return null;
  if (!chosen) return null;

  const names = id => (teams.find(team => team.id === id)?.name ?? id).toUpperCase();
  const pending = chat?.pending;

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
    <p className="poll-hint">ESTE CHAT ES PRIVADO DE TU CLUB. EL JUGADOR TE PREGUNTA Y TÚ RESPONDES. NO CAMBIA EL RESULTADO POR SÍ SOLO: LA DECISIÓN USA LOS DATOS DE TU CLUB Y TU OFERTA. SIRVE PARA SABER QUÉ LO CONVENCE Y MEJORAR TU OFERTA.</p>
    {clubs.length > 1 && <label className="chat-club">CLUB
      <select value={chosen} onChange={event => { setChat(null); setChosen(event.target.value); }}>
        {clubs.map(id => <option key={id} value={id}>{names(id)}</option>)}
      </select>
    </label>}

    {!chat && !loadError && <p className="poll-meta">ABRIENDO LA CONVERSACIÓN…</p>}
    {loadError && <p className="form-feedback error" role="alert">{loadError.message}</p>}

    {chat && <>
      <InterestMeter interest={chat.interest}/>
      <div className="chat-log" ref={scroller} aria-live="polite">
        {chat.messages.map(message => <Bubble key={message.id} message={message} player={auction.player}/>)}
        {answer.loading && <div className="chat-row theirs"><PlayerFace src={auction.player.faceUrl} name={auction.player.name}/><p className="chat-bubble thinking">EL JUGADOR ESTÁ PENSANDO…</p></div>}
      </div>

      {pending && <div className="chat-options">
        <p className="poll-hint">SOLO PUEDES RESPONDER CON DATOS REALES DE TU CLUB. ELIGE UNA RESPUESTA:</p>
        {pending.options.map(option => <button
          key={option.code} type="button" className="chat-option" disabled={answer.loading}
          onClick={() => answer.execute({ teamId: chosen, topic: pending.topic, optionCode: option.code })}
        >{option.text}</button>)}
      </div>}
      {chat.finished && <p className="poll-confirm">YA RESPONDISTE TODO. SI QUIERES CONVENCERLO MÁS, SUBE TU OFERTA ANTES DEL CIERRE.</p>}
      {answer.error && <p className="form-feedback error" role="alert">{answer.error.message}</p>}
    </>}
  </section>;
}
