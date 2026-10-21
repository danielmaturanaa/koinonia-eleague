import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound } from '../../audio/synth.js';

// Efectos del partido en 8 bits: el estadio en 360 con las hinchadas de cada club (saltan y agitan banderas con un gol,
// pifian al rival y en el clásico tiran vasos y se agarran) y el sonido de goles, rojas, pitazos y la hinchada.
// Solo suena lo que pasa mientras miras.

const colorsOf = team => ({ primary: team?.colors?.primary ?? '#062764', secondary: team?.colors?.secondary ?? '#ffffff' });
// Pseudoazar estable por posición (sin Math.random: cada render dibuja lo mismo).
const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIR = ['#1b1209', '#3b2412', '#5a3a1c', '#0d0d0d', '#a8743a'];

function Fan({ colors, roll, back = false }) {
  const shirt = roll % 5 === 0 ? colors.secondary : colors.primary;
  return <i className={roll % 9 === 0 ? 'has-flag' : ''} style={{ '--shirt': shirt, '--flag': roll % 2 ? colors.primary : colors.secondary,
    '--skin': back ? HAIR[roll % HAIR.length] : SKIN[roll % SKIN.length], '--delay': `${(roll % 900) / 1000}s` }}><b/><s/></i>;
}

/** Ánimo de cada hinchada según lo que pasó: festeja la del gol, pifia la otra (y en el clásico se agarran). */
function moodOf(fx, side, derby) {
  if (!fx) return '';
  const angry = derby ? 'is-booing is-fighting' : 'is-booing';
  if (fx.kind === 'goal') return fx.side === side ? 'is-excited' : angry;
  if (fx.kind === 'red') return fx.side === side ? angry : '';
  if (fx.kind === 'kickoff' || fx.kind === 'fulltime') return 'is-cheering';
  return '';
}

const Fight = () => <span className="arena-fight"><i/><i/><i/><em>✶</em><em>✶</em></span>;

/** Tribuna larga: la del fondo de frente (más chicos arriba) o la de abajo de espaldas (más cerca, se les ve el pelo). */
function SideStand({ sides, rows, perSide, back = false, sizeOf }) {
  return sides.map(({ side, colors, mood }) => <div key={side} className={`arena-side ${mood}`}>
    {Array.from({ length: rows }, (_, row) => <div key={row} className="arena-row" style={{ '--size': `${sizeOf(row)}px` }}>
      {Array.from({ length: perSide - (back ? row : rows - 1 - row) * 2 }, (_, seat) => <Fan key={seat} colors={colors} back={back} roll={hash(row + (side === 'away' ? 50 : 0) + (back ? 200 : 0), seat)}/>)}
    </div>)}
    {mood.includes('is-fighting') && <Fight/>}
  </div>);
}

/** Cabecera: la barra de cada club detrás de su arco. La de la visita es chica: el resto de esa cabecera es del local. */
function EndRows({ count, colors, offset }) {
  return Array.from({ length: count }, (_, row) => <div key={row} className="arena-row">
    {Array.from({ length: 3 }, (_, seat) => <Fan key={seat} colors={colors} roll={hash(row + offset, seat)}/>)}
  </div>);
}
function EndStand({ side, colors, mood, local }) {
  const away = side === 'away';
  return <div className={`stadium360-end ${away ? 'east' : 'west'}`}>
    {away && <div className={`arena-side ${local.mood}`}><EndRows count={20} colors={local.colors} offset={500}/></div>}
    <div className={`arena-side ${away ? 'is-visitors' : ''} ${mood}`}><EndRows count={away ? 14 : 34} colors={colors} offset={away ? 400 : 300}/>{mood.includes('is-fighting') && <Fight/>}</div>
  </div>;
}

/**
 * El estadio en 360: la tribuna del fondo de frente (casi dos tercios del local, el resto de la visita), las cabeceras de cada barra a los lados y
 * la tribuna de abajo de espaldas, con la cancha al medio y lo que se le pase (el marcador) encima del pasto.
 * `fx`: el evento en curso. `derby`: en el clásico la hinchada que recibe el gol tira vasos y se agarra.
 */
export function PixelStadium({ home, away, fx = null, derby = false, children }) {
  const sides = [{ side: 'home', colors: colorsOf(home), mood: moodOf(fx, 'home', derby) }, { side: 'away', colors: colorsOf(away), mood: moodOf(fx, 'away', derby) }];
  const board = `KOINONIA E-LEAGUE · ${home?.name ?? 'LOCAL'} VS ${away?.name ?? 'VISITA'} · ${derby ? '¡CLÁSICO! · ' : ''}FÚTBOL VIRTUAL, PASIÓN REAL · `;
  const throwing = derby && fx?.kind === 'goal' ? (fx.side === 'home' ? 'away' : 'home') : null;
  return <div className={`pixel-arena pixel-stadium360 ${fx?.kind === 'goal' ? 'is-goal' : ''}`}>
    <div className="arena-sky" aria-hidden="true"><i className="arena-light left"/><i className="arena-light right"/>{derby && <span className="arena-derby">CLÁSICO</span>}</div>
    <div className="arena-roof" aria-hidden="true"/>
    <div className="arena-stands" aria-hidden="true"><SideStand sides={sides} rows={6} perSide={76} sizeOf={row => 5 + row}/></div>
    <div className="arena-board" aria-hidden="true"><span>{board.repeat(4)}</span></div>
    <div className="stadium360-middle">
      <EndStand {...sides[0]} local={sides[0]}/>
      <div className="stadium360-pitch">
        <div className="stadium360-lines" aria-hidden="true"><i className="pitch-half"/><i className="pitch-circle"/><i className="pitch-box left"/><i className="pitch-box right"/></div>
        {throwing && <div key={fx.id} className={`arena-cups from-${throwing}`} aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ '--x': `${4 + ((index * 37) % 42)}%`, '--delay': `${(index % 5) * 0.18}s`, '--spin': index % 2 ? '1' : '-1' }}/>)}</div>}
        <div className="stadium360-center">{children}</div>
      </div>
      <EndStand {...sides[1]} local={sides[0]}/>
    </div>
    <div className="arena-board south" aria-hidden="true"><span>{board.repeat(4)}</span></div>
    <div className="arena-stands south" aria-hidden="true"><SideStand sides={sides} rows={3} perSide={56} back sizeOf={row => 8 + row * 2}/></div>
  </div>;
}

// Lo que suena con cada evento: [sonido, a los cuántos ms]. En modo estadio se suma la hinchada (rugido y vasos).
function soundsFor(kind, { derby, stadium }) {
  const crowd = sounds => (stadium ? sounds : []);
  if (kind === 'goal') return [['goal', 0], ...crowd([['roar', 0], ...(derby ? [['cups', 1400]] : [])])];
  if (kind === 'red') return [['whistle', 0]];
  if (kind === 'kickoff') return [['whistle', 0], ...crowd([['roar', 300]])];
  if (kind === 'fulltime') return [['whistle', 0], ['whistle', 450], ...crowd([['roar', 900]])];
  if (kind === 'halftime') return [['whistle', 0]];
  return [['notify', 0]];
}

/** Evento en curso (las hinchadas reaccionan unos segundos) y cómo dispararlo con sus sonidos. `derby`: es clásico. */
export function useMatchFx({ derby = false, stadium = true } = {}) {
  const [fx, setFx] = useState(null);
  const timer = useRef(null);
  const options = useRef({ derby, stadium });
  options.current = { derby, stadium };
  const fire = useCallback(event => {
    for (const [sound, delay] of soundsFor(event.kind, options.current)) {
      if (delay) window.setTimeout(() => playSound(sound), delay); else playSound(sound);
    }
    window.clearTimeout(timer.current);
    setFx({ id: Date.now(), ...event });
    timer.current = window.setTimeout(() => setFx(null), event.kind === 'goal' ? 4200 : 2800);
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
