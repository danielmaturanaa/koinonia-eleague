import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound } from '../../audio/synth.js';

// Efectos del partido en 8 bits: el estadio con las hinchadas de cada club (saltan y agitan banderas con un gol) y el
// sonido de goles, rojas, el pitazo inicial, el entretiempo y el final. Solo suena lo que pasa mientras miras.

const colorsOf = team => ({ primary: team?.colors?.primary ?? '#062764', secondary: team?.colors?.secondary ?? '#ffffff' });
// Pseudoazar estable por posición (sin Math.random: cada render dibuja lo mismo).
const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

/**
 * El estadio en pixel art: cielo de noche con torres de luz, techo, tribunas en gradas (más chicas hacia arriba, mitad
 * hinchada local y mitad visita, con sus colores), un cartel LED que corre y el borde del pasto.
 * `excite`: 'home' | 'away' | null (esa hinchada salta y agita banderas; las luces destellan).
 */
export function PixelCrowd({ home, away, excite = null, rows = 6, perSide = 64 }) {
  const sides = [['home', colorsOf(home)], ['away', colorsOf(away)]];
  const board = `KOINONIA E-LEAGUE · ${home?.name ?? 'LOCAL'} VS ${away?.name ?? 'VISITA'} · FÚTBOL VIRTUAL, PASIÓN REAL · `;
  return <div className={`pixel-arena ${excite ? 'is-goal' : ''}`} aria-hidden="true">
    <div className="arena-sky"><i className="arena-light left"/><i className="arena-light right"/></div>
    <div className="arena-roof"/>
    <div className="arena-stands">
      {sides.map(([side, colors]) => <div key={side} className={`arena-side ${excite === side ? 'is-excited' : ''}`}>
        {Array.from({ length: rows }, (_, row) => <div key={row} className="arena-row" style={{ '--size': `${5 + row}px` }}>
          {Array.from({ length: perSide - (rows - 1 - row) * 2 }, (_, seat) => {
            const roll = hash(row + (side === 'away' ? 50 : 0), seat);
            const shirt = roll % 5 === 0 ? colors.secondary : colors.primary;
            return <i key={seat} className={roll % 9 === 0 ? 'has-flag' : ''} style={{ '--shirt': shirt, '--flag': roll % 2 ? colors.primary : colors.secondary, '--skin': SKIN[roll % SKIN.length], '--delay': `${(roll % 900) / 1000}s` }}><b/><s/></i>;
          })}
        </div>)}
      </div>)}
    </div>
    <div className="arena-board"><span>{board.repeat(4)}</span></div>
    <div className="arena-grass"/>
  </div>;
}

const SOUND = { goal: 'goal', red: 'whistle', kickoff: 'whistle', halftime: 'whistle', fulltime: 'whistle' };

/** Evento en curso (la hinchada que festeja salta unos segundos) y cómo dispararlo con su sonido. */
export function useMatchFx() {
  const [fx, setFx] = useState(null);
  const timer = useRef(null);
  const fire = useCallback(event => {
    playSound(SOUND[event.kind] ?? 'notify');
    if (event.kind === 'fulltime') window.setTimeout(() => playSound('whistle'), 450);
    window.clearTimeout(timer.current);
    setFx({ id: Date.now(), ...event });
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
