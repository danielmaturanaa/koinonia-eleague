import { useMemo, useState } from 'react';
import { Card, Chip, HowItWorks } from '../../ui/index.js';
import { WORLD_MASK } from './worldMask.js';

const upper = text => String(text ?? '').toUpperCase();
const people = value => Number(value ?? 0).toLocaleString('es-CL');
const compact = value => {
  const number = Number(value ?? 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: number >= 100_000_000 ? 0 : number >= 10_000_000 ? 1 : 2 })} M`;
  if (number >= 10_000) return `${Math.round(number / 1000).toLocaleString('es-CL')} MIL`;
  return people(number);
};
const percent = (part, total) => (total ? Math.round(part / total * 100) : 0);

// Bandera con emoji (Inglaterra y Escocia tienen la suya; si el sistema no la dibuja, se ven las letras).
const SUBDIVISION = { ENG: 'gbeng', SCO: 'gbsct' };
const flag = code => (SUBDIVISION[code]
  ? `\u{1F3F4}${[...SUBDIVISION[code]].map(char => String.fromCodePoint(0xE0000 + char.charCodeAt(0))).join('')}\u{E007F}`
  : [...code].map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65)).join(''));

// Celdas de tierra del mapa (una vez): columna, fila y su centro en grados.
const LAND = (() => {
  const { step, top, rows } = WORLD_MASK;
  const cells = [];
  rows.forEach((hex, y) => [...hex].forEach((digit, nibble) => {
    const bits = parseInt(digit, 16);
    for (let bit = 0; bit < 4; bit += 1) {
      if (!(bits & (8 >> bit))) continue;
      const x = nibble * 4 + bit;
      cells.push({ x, y, lon: -180 + (x + 0.5) * step, lat: top - (y + 0.5) * step });
    }
  }));
  return cells;
})();
const WIDTH = WORLD_MASK.cols;
const HEIGHT = WORLD_MASK.rows.length;
const toX = lon => (lon + 180) / WORLD_MASK.step;
const toY = lat => (WORLD_MASK.top - lat) / WORLD_MASK.step;

/**
 * Calor de cada celda: cada país irradia sus hinchas alrededor de su centro (más lejos si es un país grande).
 * Escala logarítmica para que se vean también los países con pocos hinchas.
 */
function heatLevels(countries) {
  const sources = countries.filter(country => country.fans > 0).map(country => ({
    ...country, sigma: Math.min(12, Math.max(3.5, 3 + Math.sqrt(country.population ?? 10) * 0.45)),
  }));
  const heat = LAND.map(cell => sources.reduce((sum, source) => {
    const dx = (cell.lon - source.lon) * Math.cos(cell.lat * Math.PI / 180);
    const dy = cell.lat - source.lat;
    return sum + source.fans * Math.exp(-(dx * dx + dy * dy) / (2 * source.sigma * source.sigma));
  }, 0));
  const max = Math.max(1, ...heat);
  return heat.map(value => {
    const share = value / max;
    return share < 0.004 ? 0 : share < 0.03 ? 1 : share < 0.12 ? 2 : share < 0.35 ? 3 : 4;
  });
}

/** Mapa de hinchas: dónde viven, cuántos en el país del club y cuántos afuera, y de dónde sale el número. */
export function FanMap({ fans, title = 'HINCHAS EN EL MUNDO' }) {
  const countries = fans.map ?? [];
  const levels = useMemo(() => heatLevels(countries), [countries]);
  const [focus, setFocus] = useState(null);
  if (!countries.length) return null;
  const top = countries.slice(0, 6);
  const shownFans = top.reduce((sum, country) => sum + country.fans, 0);
  const biggest = Math.max(1, ...top.map(country => country.fans));
  const others = countries.filter(country => country.fans > 0).length - top.length;
  const abroad = fans.followers - fans.homeFans;
  const homeShare = percent(fans.homeFans, fans.followers);
  const origin = fans.origin;
  const formula = origin?.formula;
  return <Card title={title} className="fan-map-card" aside={<Chip icon="people">{compact(fans.followers)}</Chip>}>
    <div className="fan-map">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Mapa de hinchas: ${top.map(country => `${country.name} ${compact(country.fans)}`).join(', ')}`}>
        {LAND.map((cell, index) => <rect key={index} x={cell.x + 0.14} y={cell.y + 0.14} width="0.72" height="0.72" className={`l${levels[index]}`}/>)}
        {/* Al revés, para que el 1 (casi siempre el país del club) quede encima si se topan. */}
        {top.map((country, index) => ({ country, index })).reverse().map(({ country, index }) => <g key={country.code} className={`fan-pin ${focus === country.code ? 'is-focus' : ''} ${country.home ? 'is-home' : ''}`}
          transform={`translate(${toX(country.lon)} ${toY(country.lat)})`}>
          <rect x="-1" y="-1" width="2" height="2"/>
          <text y="0.05">{index + 1}</text>
          <title>{`${country.name}: ${people(country.fans)} hinchas`}</title>
        </g>)}
      </svg>
      <div className="fan-map-legend" aria-hidden="true"><span>POCOS</span>{[1, 2, 3, 4].map(level => <i key={level} className={`l${level}`}/>)}<span>MUCHOS</span></div>
    </div>
    <div className="fan-split" aria-label={`${homeShare}% en ${fans.countryName}, ${100 - homeShare}% afuera`}>
      <span className="fan-split-home" style={{ flexGrow: Math.max(homeShare, 8) }}><small>{flag(fans.country)} EN {upper(fans.countryName)}</small><b>{compact(fans.homeFans)}</b></span>
      <span className="fan-split-abroad" style={{ flexGrow: Math.max(100 - homeShare, 8) }}><small>🌍 EN EL RESTO DEL MUNDO</small><b>{compact(abroad)}</b></span>
    </div>
    <ol className="fan-countries">
      {top.map((country, index) => <li key={country.code} className={focus === country.code ? 'is-focus' : ''}
        onMouseEnter={() => setFocus(country.code)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(country.code)} onBlur={() => setFocus(null)} tabIndex={0}>
        <i>{index + 1}</i>
        <span>{flag(country.code)} {upper(country.name)}{country.home && <em>CASA</em>}</span>
        <span className="fan-country-bar" aria-hidden="true"><span style={{ width: `${percent(country.fans, biggest)}%` }}/></span>
        <b>{compact(country.fans)}</b>
      </li>)}
    </ol>
    {others > 0 && <p className="fan-others">Y {compact(fans.followers - shownFans)} MÁS REPARTIDOS EN {others} PAÍSES.</p>}
    {formula && <HowItWorks title="¿De dónde salen estos números?">
      <p>Los clubes de la liga son gigantes, como los grandes de verdad. Son personas que se declaran hinchas, no seguidores de redes.</p>
      <ul>
        <li><b>Cuántos son: el prestigio.</b> El club más prestigioso de la liga parte con 500 millones y el resto, hacia abajo hasta 50 millones. Tu prestigio es {Math.round(formula.prestige * 100)} de 100 (el más grande tiene {Math.round(formula.topPrestige * 100)}): mezcla historial ({people(formula.honorPoints)} puntos de títulos, finales y playoffs) y plantel ({Math.round(formula.squadShare * 100)}% del más caro de la liga).</li>
        <li><b>Dónde viven: el país.</b> En {formula.countryName} ({people(formula.population)} millones de habitantes) vive una parte; el resto se reparte por el mundo según la población de cada país, cuánto le gusta el fútbol y sus lazos con {formula.countryName}.</li>
      </ul>
      <p>Partiste con <b>{compact(origin.start)}</b> y {origin.change >= 0 ? 'ganaste' : 'perdiste'} <b>{compact(Math.abs(origin.change))}</b> jugando: partidos, clásicos, títulos, posición final y conciertos.</p>
      <p>Al estadio van los que viven cerca: los de {formula.countryName} y unos pocos de afuera que viajan. Los derechos de TV, en cambio, miran a todos tus hinchas en el mundo.</p>
    </HowItWorks>}
  </Card>;
}
