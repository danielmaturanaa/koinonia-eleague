import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { gp } from '../DataStates.jsx';
import { isMuted } from './chatSound.js';

// Mismas duraciones que el servidor (REVEAL en core/auctions.js): así todos ven el mismo momento a la misma hora.
export const REVEAL = { introMs: 6000, perClubMs: 7500, fakeoutMs: 7000, finalMs: 8000 };
const FIT_MIN = 0.7;
const FIT_MAX = 1.3;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const fitLabel = value => `×${Number(value).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ease = t => 1 - (1 - t) ** 3;

// Lo que piensa el jugador de cada club, en voz alta. Sale de las notas reales que le puso.
const GOOD = {
  minutos: 'ahí juego seguro', companeros: 'ahí tengo amigos', dt: 'su DT me hace mejor', prestigio: 'es un club grande',
  proyecto: 'vienen en racha', reputacion: 'ese presi cumple lo que promete',
};
const BAD = {
  minutos: 'no sé si voy a jugar', companeros: 'no conozco a nadie', dt: 'el DT no me sirve', prestigio: 'es un club chico',
  proyecto: 'vienen mal', reputacion: 'ese presi no cumple sus promesas',
};
const hash = text => [...String(text)].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
const pick = (seed, options) => options[hash(seed) % options.length];

function thoughtsFor(row, ranking) {
  const name = row.teamName ?? 'ese club';
  const topOffer = Math.max(...ranking.map(item => item.offer ?? 0));
  const notes = Object.entries(row.notes ?? {}).filter(([factor]) => factor !== 'dinero');
  const best = [...notes].sort((a, b) => b[1] - a[1])[0];
  const worst = [...notes].sort((a, b) => a[1] - b[1])[0];
  const money = row.offer >= topOffer
    ? pick(`${name}:m`, [`${name} pone la mejor plata… ${gp(row.offer)}. Uf.`, `${gp(row.offer)}. ${name} va en serio…`, `Nadie pone más que ${name}: ${gp(row.offer)}.`])
    : pick(`${name}:m`, [`${name} me ofrece ${gp(row.offer)}…`, `Mmm, ${name}. ${gp(row.offer)} sobre la mesa.`, `${name} pone ${gp(row.offer)}. A ver…`]);
  const feel = best && best[1] >= 70 && (!worst || worst[1] >= 45)
    ? pick(`${name}:g`, [`Y la verdad… ${GOOD[best[0]]}.`, `Me tinca: ${GOOD[best[0]]}.`, `Eso sí, ${GOOD[best[0]]}. 😏`])
    : worst && worst[1] < 45
      ? pick(`${name}:b`, [`Pero… ${BAD[worst[0]]}. 🤔`, `Aunque ${BAD[worst[0]]}…`, `Lo malo: ${BAD[worst[0]]}.`])
      : pick(`${name}:n`, ['No está mal… no está mal.', 'Mmm. Correcto.', 'Ni frío ni caliente.']);
  return [money, feel];
}

/** Lluvia de papel picado en un canvas (sin librerías). Dura ~3,5 s. */
function Confetti() {
  const canvas = useRef(null);
  useEffect(() => {
    const node = canvas.current;
    if (!node || reducedMotion()) return undefined;
    const context = node.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const resize = () => { node.width = node.clientWidth * ratio; node.height = node.clientHeight * ratio; };
    resize();
    const colors = ['#ffd42a', '#d10020', '#73c5eb', '#ffffff', '#1c7a3e'];
    const pieces = Array.from({ length: 200 }, () => ({
      x: node.width / 2 + (Math.random() - 0.5) * node.width * 0.25, y: node.height * 0.42,
      vx: (Math.random() - 0.5) * 18 * ratio, vy: (-Math.random() * 16 - 6) * ratio,
      size: (5 + Math.random() * 7) * ratio, spin: Math.random() * Math.PI, turn: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const started = performance.now();
    let frame = 0;
    const draw = now => {
      const elapsed = now - started;
      context.clearRect(0, 0, node.width, node.height);
      for (const piece of pieces) {
        piece.vy += 0.42 * ratio; piece.vx *= 0.985; piece.x += piece.vx; piece.y += piece.vy; piece.spin += piece.turn;
        context.save();
        context.globalAlpha = Math.max(0, 1 - elapsed / 3600);
        context.translate(piece.x, piece.y);
        context.rotate(piece.spin);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        context.restore();
      }
      if (elapsed < 3600) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas className="reveal-confetti" ref={canvas} aria-hidden="true"/>;
}

function tone(notes, { type = 'triangle', gap = 0.12, last = 0.6, volume = 0.12 } = {}) {
  if (isMuted() || typeof window === 'undefined') return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const audio = new Context();
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      const at = audio.currentTime + index * gap;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + (index === notes.length - 1 ? last : 0.16));
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + last + 0.1);
    });
    window.setTimeout(() => audio.close?.(), (notes.length * gap + last + 0.5) * 1000);
  } catch { /* sin audio: no pasa nada */ }
}
const fanfare = () => tone([523.25, 659.25, 783.99, 1046.5]);
const tick = () => tone([880], { type: 'sine', last: 0.08, volume: 0.05 });
const drum = () => tone(Array.from({ length: 14 }, (_, index) => 110 + index * 4), { type: 'square', gap: 0.06, last: 0.12, volume: 0.04 });

/** Línea de tiempo de la revelación: todo sale de cuánto pasó desde `startAt` (igual para todos). */
export function revealLength(clubs) {
  return REVEAL.introMs + Math.max(1, clubs) * REVEAL.perClubMs + REVEAL.fakeoutMs + REVEAL.finalMs;
}

/**
 * La revelación: el jugador piensa en voz alta club por club (del peor al mejor), el encaje de cada uno se llena de
 * a poco, amaga con elegir a otro, redoble… y recién ahí el "HERE WE GO". `startAt` (ms) la sincroniza para todos.
 */
const initials = name => String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
function Crest({ teams, teamId, name, className = 'reveal-crest' }) {
  const team = teams.find(item => item.id === teamId);
  const src = team?.imageUrl ?? team?.image_url ?? null;
  return src ? <img className={className} src={src} alt="" loading="lazy"/> : <span className={`${className} fallback`} aria-hidden="true">{initials(name)}</span>;
}

export function AuctionReveal({ auction, startAt, onClose, onSkip = null, teams = [] }) {
  const ranking = auction.result?.ranking ?? [];
  const order = [...ranking].reverse();
  const n = Math.max(1, order.length);
  const winnerId = auction.winner?.teamId ?? null;
  const runnerUp = ranking.find(row => row.teamId !== winnerId) ?? null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let frame = 0;
    const loop = () => { setNow(Date.now()); frame = requestAnimationFrame(loop); };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const quick = reducedMotion();
  const elapsed = quick ? Infinity : now - startAt;
  const clubsStart = REVEAL.introMs;
  const fakeoutStart = clubsStart + n * REVEAL.perClubMs;
  const finalStart = fakeoutStart + REVEAL.fakeoutMs;
  const phase = elapsed < 0 ? 'countdown' : elapsed < clubsStart ? 'intro' : elapsed < fakeoutStart ? 'clubs' : elapsed < finalStart ? 'fakeout' : 'done';
  const current = phase === 'clubs' ? Math.floor((elapsed - clubsStart) / REVEAL.perClubMs) : phase === 'intro' || phase === 'countdown' ? -1 : order.length;
  const within = phase === 'clubs' ? ((elapsed - clubsStart) % REVEAL.perClubMs) / REVEAL.perClubMs : 1;
  const fakeHalf = phase === 'fakeout' && elapsed - fakeoutStart < REVEAL.fakeoutMs * 0.5;

  // Sonidos al entrar a cada momento (una sola vez cada uno).
  const played = useRef(new Set());
  const once = (key, fn) => { if (!played.current.has(key)) { played.current.add(key); fn(); } };
  useEffect(() => {
    if (quick) return;
    if (phase === 'clubs' && current >= 0) once(`club-${current}`, tick);
    if (phase === 'fakeout' && !fakeHalf) once('drum', drum);
    if (phase === 'done' && winnerId && elapsed < finalStart + 1500) once('fanfare', fanfare);
  });

  const player = auction.player;
  const bubble = (() => {
    if (phase === 'countdown') return `LA DECISIÓN EN VIVO EN ${Math.ceil(-elapsed / 1000)}…`;
    if (phase === 'intro') return elapsed < clubsStart / 2 ? 'Bueno, bueno…' : `Tengo ${order.length} ${order.length === 1 ? 'oferta' : 'ofertas'} sobre la mesa. Déjenme pensar.`;
    if (phase === 'clubs') { const [money, feel] = thoughtsFor(order[current], ranking); return within < 0.5 ? money : feel; }
    if (phase === 'fakeout') {
      if (!winnerId) return fakeHalf ? 'Mmm… ninguno me termina de convencer…' : '…';
      if (!runnerUp) return fakeHalf ? `¿Me convence ${auction.winner.name}… o sigo libre?` : 'Ya. Lo tengo decidido.';
      // Coqueteo, no una decisión falsa: se nota que está jugando.
      return fakeHalf ? `${runnerUp.teamName} me hace ojitos… 😏 ¿o no?` : 'Ya. Lo tengo decidido… 🥁';
    }
    return null;
  })();
  const done = phase === 'done';

  return createPortal(<div className={`reveal phase-${phase} ${winnerId ? 'has-winner' : 'no-winner'}`} role="dialog" aria-modal="true" aria-label={`RESULTADO DE LA SUBASTA DE ${player.name}`}>
    <div className="reveal-spot" aria-hidden="true"/>
    {done && winnerId && <Confetti/>}
    <button type="button" className="reveal-close" onClick={onClose} aria-label="CERRAR">✕</button>
    <div className="reveal-inner">
      <p className="reveal-live">{done ? '🔨 SUBASTA SELLADA · DECISIÓN FINAL' : '🔴 EN VIVO · EL JUGADOR ESTÁ DECIDIENDO'}</p>
      <div className="reveal-player">
        <div className="reveal-ring"><PlayerFace src={player.faceUrl} name={player.name}/></div>
        <b>{player.name}</b>
        {bubble && <p className="reveal-bubble" key={bubble} aria-live="polite">{bubble}</p>}
      </div>
      <ol className="reveal-envelopes">
        {order.map((row, index) => {
          const shown = index < current || (index === current && phase === 'clubs') || phase === 'fakeout' || done;
          const active = index === current && phase === 'clubs';
          const fill = !shown ? 0 : active ? ease(Math.min(1, Math.max(0, (within - 0.15) / 0.5))) : 1;
          const fit = FIT_MIN + (row.fit - FIT_MIN) * fill;
          const percent = Math.max(0, Math.min(100, (fit - FIT_MIN) / (FIT_MAX - FIT_MIN) * 100));
          const isWinner = row.teamId === winnerId;
          const teased = phase === 'fakeout' && fakeHalf && row.teamId === runnerUp?.teamId;
          return <li key={row.teamId} className={`reveal-envelope ${shown ? 'open' : ''} ${active ? 'active' : ''} ${teased ? 'teased' : ''} ${phase === 'fakeout' && !fakeHalf ? 'shake' : ''} ${done && isWinner ? 'winner' : ''} ${done && !isWinner ? 'loser' : ''}`}>
            <div className="reveal-card">
              <div className="reveal-front" aria-hidden={shown}>✉️<span>SOBRE SELLADO</span></div>
              <div className="reveal-back" aria-hidden={!shown}>
                <Crest teams={teams} teamId={row.teamId} name={row.teamName}/>
                <b>{String(row.teamName ?? '').toUpperCase()}</b>
                <span>OFERTA <strong>{gp(row.offer)}</strong></span>
                <span className="reveal-fit">ENCAJE <strong>{fitLabel(fit)}</strong></span>
                <span className="reveal-meter" aria-hidden="true"><i style={{ width: `${percent}%` }}/></span>
                {(fill >= 1) && <span>VALOR <strong>{gp(Math.round(row.offer * fit))}</strong></span>}
                {done && isWinner && <em>ELEGIDO</em>}
              </div>
            </div>
          </li>;
        })}
      </ol>
      {done && (winnerId
        ? <div className="reveal-final">
          <Crest teams={teams} teamId={winnerId} name={auction.winner.name} className="reveal-final-crest"/>
          <p className="reveal-stamp">🚨 HERE WE GO! 🚨</p>
          <p className="reveal-headline"><b>{player.name.toUpperCase()}</b> FIRMA POR <b>{auction.winner.name.toUpperCase()}</b></p>
          <p className="reveal-sub">POR {gp(auction.winner.amount)} · LAS RAZONES SALEN EN LA NOTICIA DEL FICHAJE</p>
        </div>
        : <div className="reveal-final">
          <p className="reveal-stamp muted">🤷 SIGUE LIBRE</p>
          <p className="reveal-headline">NINGÚN CLUB CONVENCIÓ A <b>{player.name.toUpperCase()}</b></p>
        </div>)}
      {done && <button type="button" className="action-button positive reveal-ok" onClick={onClose}>CERRAR</button>}
      {!done && onSkip && <button type="button" className="link-button reveal-skip" onClick={onSkip}>SALTAR ›</button>}
    </div>
  </div>, document.body);
}
