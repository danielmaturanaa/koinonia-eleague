import { useCallback, useEffect, useRef, useState } from 'react';
import { isMuted, playIncoming, setMuted } from './chatSound.js';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';

const LEVEL = { frio: [1, '🧊 FRÍO'], tibio: [2, '🌤️ TIBIO'], caliente: [3, '🔥 CALIENTE'] };
const KIND_TAG = { dato: 'DATO', promesa: 'PROMESA · QUEDA REGISTRADA', argumento: 'ARGUMENTO · NO OBLIGA', negativa: 'HONESTA', pedido_si: 'ACEPTAR', pedido_no: 'RECHAZAR' };
// Promesas con consecuencia automática: se dice claro qué te obliga.
const PROMISE_TAG = {
  keep: 'PROMESA · NO PODRÁS SOLTARLO HASTA EL PRÓXIMO MERCADO',
  sell: 'PROMESA · DEBES VENDERLO ANTES DE QUE CIERRE EL PRÓXIMO MERCADO',
};
const tagOf = option => PROMISE_TAG[option.promiseKind] ?? KIND_TAG[option.kind ?? 'dato'] ?? 'DATO';
const isRequest = topic => /^pedido:/.test(String(topic ?? ''));
const REQUEST_TITLE = {
  subir: '💰 QUIERE QUE SUBAS TU OFERTA', traer: '🤝 QUIERE QUE LE TRAIGAS A ALGUIEN', dorsal: '👕 PIDE UN DORSAL',
  capitan: '©️ QUIERE LA CINTA DE CAPITÁN', penales: '🎯 QUIERE PATEAR LOS PENALES', tiros_libres: '🌀 QUIERE LOS TIROS LIBRES',
};

const clock = value => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
};

/** Temperatura compacta: barra 0–100 con lo que cambió tu última acción (▲ sube, ▼ baja). */
function Temperature({ interest, temperature }) {
  const [level, label] = LEVEL[interest] ?? [0, '—'];
  const previous = useRef(temperature);
  const [change, setChange] = useState(0);
  useEffect(() => {
    if (typeof temperature === 'number' && typeof previous.current === 'number' && temperature !== previous.current) {
      setChange(temperature - previous.current);
    }
    previous.current = temperature;
  }, [temperature]);
  const hasValue = typeof temperature === 'number';
  return <div className="pc-temp" role="img" aria-label={`TEMPERATURA DEL JUGADOR: ${label}${hasValue ? ` ${temperature} DE 100` : ''}`}>
    <div className="pc-temp-bar" aria-hidden="true"><i className={`level-${level}`} style={{ width: `${hasValue ? temperature : level * 33}%` }}/></div>
    <b>{label}{hasValue ? ` · ${temperature}°` : ''}
      {change !== 0 && <span className={`pc-delta ${change > 0 ? 'up' : 'down'}`}> {change > 0 ? '▲' : '▼'} {Math.abs(change)}</span>}
    </b>
  </div>;
}

function Typing({ player }) {
  return <div className="pc-row theirs">
    <PlayerFace src={player.faceUrl} name={player.name}/>
    <div className="pc-bubble pc-typing" aria-label="EL JUGADOR ESTÁ ESCRIBIENDO"><i/><i/><i/></div>
  </div>;
}

function Bubble({ message, player, children }) {
  const mine = message.role === 'club';
  return <div className={`pc-row ${mine ? 'mine' : 'theirs'}`}>
    {!mine && <PlayerFace src={player.faceUrl} name={player.name}/>}
    <div className="pc-stack">
      {message.pending && !message.text
        // El jugador todavía "escribe": se ven los tres puntos; el texto llega después.
        ? <div className="pc-bubble pc-typing" aria-label="EL JUGADOR ESTÁ ESCRIBIENDO"><i/><i/><i/></div>
        : <div className={`pc-bubble kind-${message.kind} ${message.kind === 'question' && isRequest(message.topic) ? 'is-request' : ''} ${message.pending ? 'is-pending' : ''}`}>
          {!mine && message.kind === 'question' && isRequest(message.topic) && <em className="pc-request-tag">📣 PEDIDO</em>}
          <p>{message.text}</p>
          <small>{message.pending ? 'ESCRIBIENDO…' : clock(message.createdAt)}</small>
        </div>}
      {children}
    </div>
  </div>;
}

/** Chat privado entre un club y el jugador. Las respuestas son datos reales del club y no cambian el resultado por sí solas. */
const openKey = auctionId => `chat-abierto-${auctionId}`;
const readOpen = auctionId => {
  try { return window.sessionStorage.getItem(openKey(auctionId)) !== '0'; } catch { return true; }
};
const writeOpen = (auctionId, value) => {
  try { window.sessionStorage.setItem(openKey(auctionId), value ? '1' : '0'); } catch { /* sin almacenamiento: no pasa nada */ }
};

export function PlayerChat({ auction, teams = [], clubs: allowedClubs = null, onChanged = null, onHeat = null }) {
  const { isAdmin, user, teamId } = useAuth();
  // Los clubes que ya marcaron NO PARTICIPAR no hablan con el jugador.
  const clubs = allowedClubs ?? user?.teamIds ?? [];
  const [chosen, setChosen] = useState(clubs.includes(teamId) ? teamId : clubs[0] ?? '');
  const [shown, setShownState] = useState(() => readOpen(auction.id));
  const setShown = value => { setShownState(value); writeOpen(auction.id, value); };
  const [chat, setChat] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const scroller = useRef(null);
  // Qué tipo de respuesta fue cada mensaje mío (para avisar si se deshace una promesa).
  const answerKinds = useRef({});
  const undoneKind = useRef('dato');

  // Respuestas elegidas (se pueden combinar hasta 3 si calzan entre sí).
  const [picks, setPicks] = useState([]);
  // Tema cuya respuesta se está por deshacer (cualquiera de las respondidas, no solo la última).
  const [confirmTopic, setConfirmTopic] = useState('');
  const [notice, setNotice] = useState('');

  const keep = result => { if (result?.data) setChat(result.data); };
  const lastAnswerId = data => [...(data?.messages ?? [])].reverse().find(item => item.role === 'club' && item.kind === 'answer')?.id ?? null;

  const answer = useApiMutation(
    (body, signal) => endpoints.sealedAuctionAction(auction.id, 'chat/answer', body, signal),
    {
      onSuccess: result => {
        const sentKinds = (chat?.pending?.options ?? []).filter(option => picks.includes(option.code)).map(option => option.kind);
        const sentKind = sentKinds.includes('promesa') ? 'promesa' : sentKinds[0] ?? 'dato';
        const id = lastAnswerId(result?.data);
        if (id) answerKinds.current[id] = sentKind;
        keep(result);
        setPicks([]);
        setConfirmTopic('');
        setNotice('');
        onChanged?.();
      },
    },
  );
  const rewind = useApiMutation(
    (body, signal) => endpoints.sealedAuctionAction(auction.id, 'chat/rewind', body, signal),
    {
      onSuccess: result => {
        keep(result);
        setPicks([]);
        setConfirmTopic('');
        setNotice(undoneKind.current === 'promesa' ? 'LA PROMESA QUEDÓ RETIRADA.' : 'RESPUESTA DESHECHA: VUELVE A RESPONDERLA CUANDO QUIERAS.');
        onChanged?.();
      },
    },
  );

  const load = useCallback(signal => {
    setLoadError(null);
    return endpoints.sealedAuctionChat(auction.id, chosen, signal).then(response => setChat(response.data)).catch(error => {
      if (error?.code === 'REQUEST_ABORTED') return;
      if (error?.status === 404) setUnavailable(true);
      else setLoadError(error);
    });
  }, [auction.id, chosen]);

  // La temperatura incluye tu oferta: si la subes o la retiras, se vuelve a pedir.
  const bidSignature = (auction.myBids ?? []).map(bid => `${bid.teamId}:${bid.amount}`).join(',');
  useEffect(() => {
    if (!shown || !chosen) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [shown, chosen, load, bidSignature]);

  // Mientras el jugador "escribe", se vuelve a pedir la conversación cada segundo (hasta ~3 minutos) y se reemplazan los mensajes.
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
    }, 1000);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [shown, chosen, hasPending, auction.id]);

  // Se pide la conversación justo cuando toca revelar el siguiente mensaje (además del refresco de respaldo).
  const nextReveal = (chat?.messages ?? []).filter(item => item.pending && item.revealAt)
    .map(item => Date.parse(item.revealAt)).filter(Number.isFinite).sort((a, b) => a - b)[0] ?? null;
  useEffect(() => {
    if (!shown || !chosen || nextReveal == null) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      endpoints.sealedAuctionChat(auction.id, chosen, controller.signal)
        .then(response => { if (response?.data) setChat(response.data); })
        .catch(() => {});
    }, Math.max(120, nextReveal - Date.now() + 150));
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [shown, chosen, nextReveal, auction.id]);

  useEffect(() => {
    if (!onHeat) return;
    onHeat(chat && typeof chat.temperature === 'number' ? {
      temperature: chat.temperature, label: (LEVEL[chat.interest] ?? [0, ''])[1].replace(/^\S+\s/, ''),
      // Para la guía de pasos: cuántas preguntas respondiste y si ya no quedan.
      answered: (chat.messages ?? []).filter(item => item.kind === 'answer' && !/^pedido:/.test(String(item.topic ?? ''))).length,
      finished: Boolean(chat.finished),
    } : null);
  }, [chat?.temperature, chat?.interest, chat?.finished, chat?.messages?.length]);

  // Con la pestaña oculta, un mensaje nuevo del jugador se anuncia en el título del documento.
  const playerCount = (chat?.messages ?? []).filter(item => item.role !== 'club' && !item.pending).length;
  const seenCount = useRef(null);
  useEffect(() => {
    if (seenCount.current !== null && playerCount > seenCount.current && document.hidden && !document.title.startsWith('(1) ')) {
      const base = document.title;
      document.title = `(1) ${base}`;
      const restore = () => {
        if (document.hidden) return;
        document.title = base;
        document.removeEventListener('visibilitychange', restore);
      };
      document.addEventListener('visibilitychange', restore);
    }
    // Mensaje nuevo del jugador (no el primero al abrir): suena si el chat está a la vista, salvo que lo silencies.
    if (seenCount.current !== null && playerCount > seenCount.current) playIncoming();
    seenCount.current = playerCount;
  }, [playerCount]);

  const [muted, setMutedState] = useState(isMuted);
  const toggleMuted = () => { const next = !muted; setMuted(next); setMutedState(next); };


  const thinking = answer.loading || rewind.loading;
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [chat?.messages?.length, hasPending, thinking, chat?.pending?.topic]);

  if (unavailable || auction.status !== 'open' || (!chosen && !isAdmin)) return null;
  if (!chosen) return null;

  const names = id => (teams.find(team => team.id === id)?.name ?? id).toUpperCase();
  const player = auction.player;
  const pending = chat?.pending;
  const options = pending?.options ?? [];
  // Los mensajes que el jugador todavía "escribe" no se dibujan: solo se ve un indicador por vez, en orden.
  const firstHidden = (chat?.messages ?? []).findIndex(item => item.pending && !item.text);
  const shownMessages = firstHidden === -1 ? (chat?.messages ?? []) : chat.messages.slice(0, firstHidden);
  const rewindInfo = chat?.rewind ?? { available: false, used: 0, limit: 0 };
  const rewindsLeft = Math.max(0, (rewindInfo.limit ?? 0) - (rewindInfo.used ?? 0));

  const send = codes => answer.execute({ teamId: chosen, topic: pending.topic, optionCodes: codes });
  const MAX_PICKS = 3;
  // Un toque marca o desmarca; se pueden combinar las que calzan. Las que contradicen lo elegido quedan bloqueadas.
  const blockedBy = option => options.find(other => picks.includes(other.code) && (option.conflicts ?? []).includes(other.code)) ?? null;
  const tapOption = option => setPicks(current => (current.includes(option.code)
    ? current.filter(code => code !== option.code)
    : current.length >= MAX_PICKS || blockedBy(option) ? current : [...current, option.code]));

  if (!shown) {
    return <div className="pc-closed">
      <button type="button" className="action-button" onClick={() => setShown(true)}>💬 HABLAR CON EL JUGADOR</button>
    </div>;
  }

  return <section className="pc" aria-label={`CHAT CON ${player.name}`}>
    <header className="pc-head">
      <div className="pc-who"><b>💬 CHAT PRIVADO CON {player.name.toUpperCase()}</b><small>SOLO TU CLUB LO VE</small></div>
      <button type="button" className="pc-sound" aria-pressed={muted} aria-label={muted ? 'ACTIVAR SONIDO' : 'SILENCIAR SONIDO'} title={muted ? 'ACTIVAR SONIDO' : 'SILENCIAR SONIDO'} onClick={toggleMuted}>{muted ? '🔕' : '🔔'}</button>
      <button type="button" className="pc-close" onClick={() => setShown(false)}>CERRAR</button>
    </header>
    {chat && <Temperature interest={chat.interest} temperature={chat.temperature}/>}
    {clubs.length > 1 && <label className="pc-club">CLUB
      <select value={chosen} onChange={event => { setChat(null); setPicks([]); setChosen(event.target.value); }}>
        {clubs.map(id => <option key={id} value={id}>{names(id)}</option>)}
      </select>
    </label>}

    {!chat && !loadError && <p className="pc-note">ABRIENDO LA CONVERSACIÓN…</p>}
    {loadError && <p className="form-feedback error" role="alert">{loadError.message}</p>}

    {chat && <>
      <div className="pc-log" ref={scroller} aria-live="polite">
        {shownMessages.map(item => <Bubble key={item.id} message={item} player={player}>
          {item.role === 'club' && item.kind === 'answer' && rewindInfo.available && (confirmTopic === item.topic
            ? <span className="pc-confirm" role="group" aria-label="CONFIRMAR DESHACER">
              ¿DESHACER ESTA RESPUESTA?
              <button type="button" disabled={rewind.loading} onClick={() => {
                undoneKind.current = item.optionKind ?? answerKinds.current[item.id] ?? 'dato';
                rewind.execute({ teamId: chosen, topic: item.topic });
              }}>SÍ</button>
              <button type="button" onClick={() => setConfirmTopic('')}>NO</button>
            </span>
            : <button type="button" className="pc-undo" disabled={thinking} onClick={() => setConfirmTopic(item.topic)}>
              ↩ CAMBIAR RESPUESTA ({rewindsLeft > 0 ? `QUEDAN ${rewindsLeft}` : 'ÚLTIMA'})
            </button>)}
        </Bubble>)}
        {/* Un solo "escribiendo" a la vez: primero el feedback, después la siguiente pregunta. */}
        {(thinking || firstHidden !== -1) && <Typing player={player}/>}
        {notice && <p className="pc-notice" role="status">{notice}</p>}
      </div>

      <div className="pc-composer">
        {pending ? <div className={`pc-quick ${pending.request ? 'is-request' : ''}`}>
          {pending.request
            ? <p className="pc-ask pc-ask-request">📣 <b>{REQUEST_TITLE[pending.request.type] ?? 'TE PIDE ALGO'}</b> · ACEPTAR SUMA, RECHAZAR RESTA</p>
            : <p className="pc-ask">❓ RESPONDE: <b>{(pending.label ?? pending.topic).toUpperCase()}</b></p>}
          <div className={`pc-chips ${pending.request ? 'pc-chips-request' : ''}`} role="group" aria-label="RESPUESTAS RÁPIDAS">
            {options.map(option => {
              const kind = option.kind ?? 'dato';
              const on = picks.includes(option.code);
              const blocked = !on && Boolean(blockedBy(option));
              const full = !on && picks.length >= MAX_PICKS;
              return <button type="button" key={option.code} role="checkbox" aria-checked={on}
                disabled={thinking || blocked || full} title={blocked ? 'NO CALZA CON LO QUE ELEGISTE' : undefined}
                className={`pc-chip ${kind} ${option.promiseKind ? `promise-${option.promiseKind}` : ''} ${on ? 'on' : ''} ${blocked ? 'blocked' : ''}`} onClick={() => tapOption(option)}>
                <em>{tagOf(option)}</em>
                <span>{option.text}</span>
                {option.action?.type === 'raise' && <small className="pc-chip-action">SUBE TU OFERTA DE VERDAD A {Number(option.action.amount).toLocaleString('es-CL')} GP</small>}
              </button>;
            })}
          </div>
          {options.length === 0 && <p className="pc-note">NO HAY RESPUESTAS PREPARADAS PARA ESTA PREGUNTA. ESCRÍBELE ABAJO.</p>}
          {options.length > 0 && <div className="pc-send-row">
            <small>{pending.request ? 'SI ACEPTAS, QUEDA COMO PROMESA (Y SI LO ROMPES, BAJA TU REPUTACIÓN).'
              : picks.length ? `${picks.length} ELEGIDA${picks.length > 1 ? 'S' : ''} · PUEDES COMBINAR HASTA ${MAX_PICKS} QUE CALCEN ENTRE SÍ.`
                : 'ELIGE UNA O COMBINA HASTA 3 QUE CALCEN. LAS QUE SE CONTRADICEN SE BLOQUEAN SOLAS.'}</small>
            <button type="button" className="action-button positive" disabled={thinking || !picks.length} onClick={() => send(picks)}>ENVIAR{picks.length > 1 ? ` (${picks.length})` : ''}</button>
          </div>}
          {answer.error && <p className="form-feedback error" role="alert">{answer.error.message}</p>}
        </div> : chat.finished && <p className="pc-finished" role="status">✅ LE RESPONDISTE TODO · PUEDES CAMBIAR UNA RESPUESTA O TU OFERTA. SI YA ESTÁS, MARCA «ESTOY LISTO».</p>}
        {rewind.error && <p className="form-feedback error" role="alert">{rewind.error.message}</p>}

      </div>
    </>}
  </section>;
}
