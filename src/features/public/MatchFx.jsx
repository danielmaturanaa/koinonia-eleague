import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound } from '../../audio/synth.js';

// Efectos del partido en 8 bits: el estadio en 360 con las hinchadas de cada club (saltan y agitan banderas con un gol,
// pifian al rival y en el clásico tiran vasos y se agarran) y el sonido de goles, rojas, pitazos y la hinchada (grabaciones reales).
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

/**
 * Ánimo de cada hinchada. Con un evento en curso: festeja la del gol, pifia la otra (y en el clásico se agarran). Si no,
 * mientras se juega alientan todo el rato, más fuerte mientras mejor les va; perdiendo por goleada (3 o más) se apagan.
 */
function moodOf(fx, side, derby, score) {
  if (!fx) {
    if (!score) return '';
    const diff = side === 'home' ? score.home - score.away : score.away - score.home;
    return diff >= 1 ? 'is-chanting is-winning' : diff <= -3 ? 'is-quiet' : 'is-chanting';
  }
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

/** Cabecera (detrás de cada arco): ambas son del local; la visita tiene un solo sector, en la tribuna del fondo. */
function EndStand({ side, local }) {
  return <div className={`stadium360-end ${side === 'away' ? 'east' : 'west'}`}>
    <div className={`arena-side ${local.mood}`}>
      {Array.from({ length: 34 }, (_, row) => <div key={row} className="arena-row">
        {Array.from({ length: 3 }, (_, seat) => <Fan key={seat} colors={local.colors} roll={hash(row + (side === 'away' ? 400 : 300), seat)}/>)}
      </div>)}
    </div>
  </div>;
}

/**
 * El estadio en 360: la tribuna del fondo de frente (con el único sector de la visita a la derecha), las cabeceras de cada barra a los lados y
 * la tribuna de abajo de espaldas (todo local), con la cancha al medio y lo que se le pase (el marcador) encima del pasto.
 * `fx`: el evento en curso. `derby`: en el clásico la hinchada que recibe el gol tira vasos y se agarra. `score`: el marcador
 * mientras se juega ({ home, away }; null si el partido no está en juego), para que alienten según cómo les va.
 */
export function PixelStadium({ home, away, fx = null, derby = false, score = null, children }) {
  const sides = [{ side: 'home', colors: colorsOf(home), mood: moodOf(fx, 'home', derby, score) }, { side: 'away', colors: colorsOf(away), mood: moodOf(fx, 'away', derby, score) }];
  const board = `KOINONIA E-LEAGUE · ${home?.name ?? 'LOCAL'} VS ${away?.name ?? 'VISITA'} · ${derby ? '¡CLÁSICO! · ' : ''}FÚTBOL VIRTUAL, PASIÓN REAL · `;
  const throwing = derby && fx?.kind === 'goal' ? (fx.side === 'home' ? 'away' : 'home') : null;
  return <div className={`pixel-arena pixel-stadium360 ${fx?.kind === 'goal' ? 'is-goal' : ''}`}>
    <div className="arena-sky" aria-hidden="true"><i className="arena-light left"/><i className="arena-light right"/>{derby && <span className="arena-derby">CLÁSICO</span>}</div>
    <div className="arena-roof" aria-hidden="true"/>
    <div className="arena-stands" aria-hidden="true"><SideStand sides={sides} rows={4} perSide={76} sizeOf={row => 4 + row}/></div>
    <div className="arena-board" aria-hidden="true"><span>{board.repeat(4)}</span></div>
    <div className="stadium360-middle">
      <EndStand side="home" local={sides[0]}/>
      <div className="stadium360-pitch">
        <div className="stadium360-lines" aria-hidden="true"><i className="pitch-half"/><i className="pitch-circle"/><i className="pitch-box left"/><i className="pitch-box right"/></div>
        {throwing && <div key={fx.id} className={`arena-cups from-${throwing}`} aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ '--x': `${4 + ((index * 37) % 42)}%`, '--delay': `${(index % 5) * 0.18}s`, '--spin': index % 2 ? '1' : '-1' }}/>)}</div>}
        <div className="stadium360-center">{children}</div>
      </div>
      <EndStand side="away" local={sides[0]}/>
    </div>
    <div className="arena-board south" aria-hidden="true"><span>{board.repeat(4)}</span></div>
    <div className="arena-stands south" aria-hidden="true"><SideStand sides={[sides[0]]} rows={2} perSide={110} back sizeOf={row => 7 + row * 2}/></div>
  </div>;
}

// Lo que suena con cada evento: [sonido, a los cuántos ms]. En modo estadio son grabaciones reales (silbato, rugido, festejo,
// canto, aplausos); en la vista clásica, los sonidos en 8 bits de siempre.
let goalTurn = 0;
function soundsFor(kind, { stadium }, side) {
  if (!stadium) {
    if (kind === 'goal') return [['goal', 0]];
    if (kind === 'fulltime') return [['whistle', 0], ['whistle', 450]];
    return [[kind === 'notify' ? 'notify' : 'whistle', 0]];
  }
  // Gol del local: explota el estadio. Gol de la visita: la mayoría (local) pifia y se escucha bajito el sector visitante.
  if (kind === 'goal') {
    if (side === 'away') return [['boo', 0], ['awayCheer', 300]];
    goalTurn += 1;
    return [[goalTurn % 2 ? 'celebration' : 'celebration2', 0]];
  }
  if (kind === 'red') return [['referee', 0]];
  if (kind === 'kickoff') return [['referee', 0], ['chant', 900]];
  if (kind === 'halftime') return [['referee', 0], ['referee', 500]];
  if (kind === 'fulltime') return [['referee', 0], ['referee', 500], ['referee', 1000], ['applause', 1600]];
  return [['notify', 0]];
}

/** Evento en curso (con un gol, las hinchadas reaccionan 15 s; con lo demás, unos segundos) y cómo dispararlo con sus sonidos. `derby`: es clásico. */
export function useMatchFx({ derby = false, stadium = true } = {}) {
  const [fx, setFx] = useState(null);
  const timer = useRef(null);
  const options = useRef({ derby, stadium });
  options.current = { derby, stadium };
  const fire = useCallback(event => {
    for (const [sound, delay] of soundsFor(event.kind, options.current, event.side)) {
      if (delay) window.setTimeout(() => playSound(sound), delay); else playSound(sound);
    }
    window.clearTimeout(timer.current);
    setFx({ id: Date.now(), ...event });
    timer.current = window.setTimeout(() => setFx(null), event.kind === 'goal' ? 15000 : 2800);
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
