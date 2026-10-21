import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound } from '../../audio/synth.js';
import { TeamMark } from '../../components/TeamMark.jsx';

// Efectos del partido en 8 bits: hinchas de cada club que se mueven (y saltan con un gol) y carteles grandes con sonido
// para goles, rojas, el pitazo inicial, el entretiempo y el final. Solo suenan los eventos que pasan mientras miras.

const colorsOf = team => ({ primary: team?.colors?.primary ?? '#062764', secondary: team?.colors?.secondary ?? '#ffffff' });
// Pseudoazar estable por posición (sin Math.random: cada render dibuja lo mismo).
const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

/** Una tribuna en pixel art: mitad hinchas del local y mitad del visita, con sus colores. `excite`: 'home' | 'away' | null. */
export function PixelCrowd({ home, away, excite = null, rows = 4, perSide = 22 }) {
  const sides = [['home', colorsOf(home)], ['away', colorsOf(away)]];
  return <div className="pixel-crowd" aria-hidden="true">
    {sides.map(([side, colors]) => <div key={side} className={`pixel-crowd-side ${excite === side ? 'is-excited' : ''}`}>
      {Array.from({ length: rows }, (_, row) => <div key={row} className="pixel-crowd-row">
        {Array.from({ length: perSide }, (_, seat) => {
          const roll = hash(row + (side === 'away' ? 50 : 0), seat);
          const shirt = roll % 5 === 0 ? colors.secondary : colors.primary;
          return <i key={seat} style={{ '--shirt': shirt, '--skin': SKIN[roll % SKIN.length], '--delay': `${(roll % 900) / 1000}s` }}><b/><s/></i>;
        })}
      </div>)}
    </div>)}
  </div>;
}

/** Cartel grande del evento (gol, roja, pitazo) con papel picado en los colores del club. */
export function FxOverlay({ fx }) {
  if (!fx) return null;
  const colors = colorsOf(fx.team);
  return <div className={`match-fx match-fx--${fx.kind}`} role="status" aria-live="assertive" key={fx.id}>
    {fx.kind === 'goal' && <div className="match-fx-confetti" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <i key={index}
      style={{ left: `${(hash(index, 7) % 100)}%`, background: index % 3 ? colors.primary : colors.secondary, animationDelay: `${(hash(index, 3) % 600) / 1000}s` }}/>)}</div>}
    <div className="match-fx-card">
      {fx.team && <TeamMark team={fx.team} className="match-fx-crest"/>}
      <strong>{fx.title}</strong>
      {fx.detail && <small>{fx.detail}</small>}
    </div>
  </div>;
}

const SOUND = { goal: 'goal', red: 'whistle', kickoff: 'whistle', halftime: 'whistle', fulltime: 'whistle' };
const TITLE = { goal: '¡GOOOL!', red: '¡ROJA!', kickoff: '¡ARRANCA!', halftime: 'ENTRETIEMPO', fulltime: 'FINAL' };

/** Estado del efecto en curso y cómo dispararlo (suena y se muestra unos segundos). */
export function useMatchFx() {
  const [fx, setFx] = useState(null);
  const timer = useRef(null);
  const fire = useCallback(event => {
    playSound(SOUND[event.kind] ?? 'notify');
    if (event.kind === 'fulltime') window.setTimeout(() => playSound('whistle'), 450);
    window.clearTimeout(timer.current);
    setFx({ id: Date.now(), title: TITLE[event.kind], ...event });
    timer.current = window.setTimeout(() => setFx(null), event.kind === 'goal' ? 3600 : 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [fx, fire];
}

/**
 * Compara el partido en vivo entre una actualización y la siguiente y dispara lo que cambió: goles, rojas, el inicio y
 * el final. La primera carga no dispara nada (no es "en vivo" para quien recién entra).
 */
export function useLiveMatchFx(match, resolveTeam, fire) {
  const previous = useRef(null);
  useEffect(() => {
    if (!match) return;
    const now = { status: match.status, home: match.homeScore ?? 0, away: match.awayScore ?? 0, reds: match.redCards?.length ?? 0 };
    const before = previous.current;
    previous.current = now;
    if (!before || before.status === undefined) return;
    const home = resolveTeam(match.homeTeam);
    const away = resolveTeam(match.awayTeam);
    if (before.status === 'pending' && now.status === 'live') fire({ kind: 'kickoff', detail: `${home?.name} vs ${away?.name}` });
    if (now.home > before.home) fire({ kind: 'goal', side: 'home', team: home, detail: `${home?.name} ${now.home}-${now.away}` });
    else if (now.away > before.away) fire({ kind: 'goal', side: 'away', team: away, detail: `${away?.name} ${now.home}-${now.away}` });
    else if (now.reds > before.reds) {
      const card = match.redCards.at(-1);
      fire({ kind: 'red', side: card?.teamId === home?.id ? 'home' : 'away', team: card?.teamId === home?.id ? home : away, detail: card?.playerName });
    }
    if (before.status === 'live' && now.status === 'finished') fire({ kind: 'fulltime', detail: `${home?.name} ${now.home}-${now.away} ${away?.name}` });
  }, [match?.status, match?.homeScore, match?.awayScore, match?.redCards?.length]);
}
