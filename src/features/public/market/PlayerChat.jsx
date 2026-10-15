import { useCallback, useEffect, useRef, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { ReadyControl } from './ReadyControl.jsx';

const LEVEL = { frio: [1, '🧊 FRÍO'], tibio: [2, '🌤️ TIBIO'], caliente: [3, '🔥 CALIENTE'] };
const KIND_TAG = { dato: 'DATO', promesa: 'PROMESA · QUEDA REGISTRADA', argumento: 'ARGUMENTO · NO OBLIGA', negativa: 'HONESTA' };

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
  // El saludo y el cierre se leen como avisos del chat, no como una burbuja más.
  if (message.kind === 'greeting' || message.kind === 'closing') {
    return <div className="pc-system"><span>{message.text}</span></div>;
  }
  return <div className={`pc-row ${mine ? 'mine' : 'theirs'}`}>
    {!mine && <PlayerFace src={player.faceUrl} name={player.name}/>}
    <div className="pc-stack">
      <div className={`pc-bubble kind-${message.kind} ${message.pending ? 'is-pending' : ''}`}>
        <p>{message.text}</p>
        <small>{message.pending ? 'ESCRIBIENDO…' : clock(message.createdAt)}</small>
      </div>
      {children}
    </div>
  </div>;
}

/** Chat privado entre un club y el jugador. Las respuestas son datos reales del club y no cambian el resultado por sí solas. */
export function PlayerChat({ auction, teams = [], clubs: allowedClubs = null, onChanged = null }) {
  const { isAdmin, user, teamId } = useAuth();
  // Los clubes que ya marcaron NO PARTICIPAR no hablan con el jugador.
  const clubs = allowedClubs ?? user?.teamIds ?? [];
  const [chosen, setChosen] = useState(clubs.includes(teamId) ? teamId : clubs[0] ?? '');
  const [shown, setShown] = useState(false);
  const [chat, setChat] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const scroller = useRef(null);
  // Qué tipo de respuesta fue cada mensaje mío (para avisar si se deshace una promesa).
  const answerKinds = useRef({});
  const undoneKind = useRef('dato');

  const [picked, setPicked] = useState('');
  const [text, setText] = useState('');
  // Tema cuya respuesta se está por deshacer (cualquiera de las respondidas, no solo la última).
  const [confirmTopic, setConfirmTopic] = useState('');
  const [notice, setNotice] = useState('');

  const keep = result => { if (result?.data) setChat(result.data); };
  const lastAnswerId = data => [...(data?.messages ?? [])].reverse().find(item => item.role === 'club' && item.kind === 'answer')?.id ?? null;

  const answer = useApiMutation(
    (body, signal) => endpoints.sealedAuctionAction(auction.id, 'chat/answer', body, signal),
    {
      onSuccess: result => {
        const sentKind = (chat?.pending?.options ?? []).find(option => option.code === picked)?.kind ?? 'dato';
        const id = lastAnswerId(result?.data);
        if (id) answerKinds.current[id] = sentKind;
        keep(result);
        setPicked('');
        setConfirmTopic('');
        setNotice('');
        onChanged?.();
      },
    },
  );
  const message = useApiMutation(
    (body, signal) => endpoints.sealedAuctionAction(auction.id, 'chat/message', body, signal),
    { onSuccess: result => { keep(result); setText(''); } },
  );
  const rewind = useApiMutation(
    (body, signal) => endpoints.sealedAuctionAction(auction.id, 'chat/rewind', body, signal),
    {
      onSuccess: result => {
        keep(result);
        setPicked('');
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

  const thinking = answer.loading || message.loading || rewind.loading;
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
  const freeText = chat?.freeText ?? { used: 0, limit: 0, maxLength: 280 };
  const freeLeft = Math.max(0, freeText.limit - freeText.used);
  const rewindInfo = chat?.rewind ?? { available: false, used: 0, limit: 0 };
  const rewindsLeft = Math.max(0, (rewindInfo.limit ?? 0) - (rewindInfo.used ?? 0));

  const send = code => answer.execute({ teamId: chosen, topic: pending.topic, optionCodes: [code] });
  // Un toque selecciona; tocar otra vez la misma (o ENVIAR) la manda. Evita envíos accidentales.
  const tapOption = option => { if (picked === option.code) send(option.code); else setPicked(option.code); };

  if (!shown) {
    return <div className="pc-closed">
      <button type="button" className="action-button" onClick={() => setShown(true)}>💬 HABLAR CON EL JUGADOR</button>
    </div>;
  }

  return <section className="pc" aria-label={`CHAT CON ${player.name}`}>
    <header className="pc-head">
      <PlayerFace src={player.faceUrl} name={player.name}/>
      <div className="pc-who"><b>{player.name.toUpperCase()}</b><small>{(player.position ?? 'JUGADOR').toUpperCase()} · AGENTE LIBRE</small></div>
      <button type="button" className="pc-close" onClick={() => setShown(false)}>CERRAR</button>
    </header>
    {chat && <Temperature interest={chat.interest} temperature={chat.temperature}/>}
    {clubs.length > 1 && <label className="pc-club">CLUB
      <select value={chosen} onChange={event => { setChat(null); setPicked(''); setChosen(event.target.value); }}>
        {clubs.map(id => <option key={id} value={id}>{names(id)}</option>)}
      </select>
    </label>}

    {!chat && !loadError && <p className="pc-note">ABRIENDO LA CONVERSACIÓN…</p>}
    {loadError && <p className="form-feedback error" role="alert">{loadError.message}</p>}

    {chat && <>
      <div className="pc-log" ref={scroller} aria-live="polite">
        <p className="pc-privacy">🔒 CHAT PRIVADO DE TU CLUB. LA DECISIÓN USA LOS DATOS DE TU CLUB Y TU OFERTA; ESTO SIRVE PARA SABER QUÉ LO CONVENCE.</p>
        {chat.messages.map(item => <Bubble key={item.id} message={item} player={player}>
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
        {(thinking || hasPending) && <Typing player={player}/>}
        {notice && <p className="pc-notice" role="status">{notice}</p>}
      </div>

      <div className="pc-composer">
        {pending ? <div className="pc-quick">
          <p className="pc-ask">❓ RESPONDE: <b>{(pending.label ?? pending.topic).toUpperCase()}</b></p>
          <div className="pc-chips" role="radiogroup" aria-label="RESPUESTAS RÁPIDAS">
            {options.map(option => {
              const kind = option.kind ?? 'dato';
              return <button type="button" key={option.code} role="radio" aria-checked={picked === option.code}
                disabled={thinking} className={`pc-chip ${kind} ${picked === option.code ? 'on' : ''}`} onClick={() => tapOption(option)}>
                <em>{KIND_TAG[kind] ?? 'DATO'}</em>
                <span>{option.text}</span>
              </button>;
            })}
          </div>
          {options.length === 0 && <p className="pc-note">NO HAY RESPUESTAS PREPARADAS PARA ESTA PREGUNTA. ESCRÍBELE ABAJO.</p>}
          {options.length > 0 && <div className="pc-send-row">
            <small>{picked ? 'TOCA DE NUEVO LA RESPUESTA O PULSA ENVIAR.' : 'ELIGE UNA RESPUESTA. SOLO LAS PROMESAS (ALINEACIÓN, FICHAJES, ROLES) QUEDAN REGISTRADAS Y SE RECUERDAN POR DISCORD.'}</small>
            <button type="button" className="action-button positive" disabled={thinking || !picked} onClick={() => send(picked)}>ENVIAR</button>
          </div>}
          {answer.error && <p className="form-feedback error" role="alert">{answer.error.message}</p>}
        </div> : chat.finished && <div className="pc-finished" role="status">
          <b>✅ RESPONDISTE TODAS LAS PREGUNTAS</b>
          <p>PUEDES CAMBIAR CUALQUIER RESPUESTA ARRIBA, ESCRIBIRLE AL JUGADOR O MEJORAR TU OFERTA. CUANDO NO FALTE NADA, MARCA QUE ESTÁS LISTO.</p>
          <ReadyControl auction={auction} teamId={chosen} onChanged={onChanged}/>
        </div>}
        {rewind.error && <p className="form-feedback error" role="alert">{rewind.error.message}</p>}

        <form className="pc-bar" onSubmit={event => {
          event.preventDefault();
          if (text.trim()) message.execute({ teamId: chosen, text: text.trim() });
        }}>
          <input value={text} maxLength={freeText.maxLength} disabled={thinking || freeLeft === 0}
            onChange={event => setText(event.target.value)} placeholder={freeLeft === 0 ? 'SIN MENSAJES LIBRES' : 'ESCRÍBELE AL JUGADOR…'}
            aria-label="ESCRÍBELE AL JUGADOR"/>
          <button type="submit" className="pc-send" aria-label="ENVIAR MENSAJE" disabled={thinking || !text.trim() || freeLeft === 0}>➤</button>
        </form>
        <small className="pc-count">{text.length}/{freeText.maxLength} · MENSAJES LIBRES {freeText.used}/{freeText.limit}</small>
        {message.error && <p className="form-feedback error" role="alert">{message.error.message}</p>}
      </div>
    </>}
  </section>;
}
