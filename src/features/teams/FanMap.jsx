import { useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { Button, Card, Chip, HowItWorks, useToast } from '../../ui/index.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { CHILE_MASK } from './chileMask.js';
import { COMUNAS } from './comunas.js';

const upper = text => String(text ?? '').toUpperCase();
const people = value => Number(value ?? 0).toLocaleString('es-CL');
const compact = value => {
  const number = Number(value ?? 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: number >= 10_000_000 ? 1 : 2 })} M`;
  if (number >= 10_000) return `${Math.round(number / 1000).toLocaleString('es-CL')} MIL`;
  return people(number);
};
const percent = (part, total) => (total ? Math.round(part / total * 100) : 0);

// Bandera con emoji (Inglaterra tiene la suya; si el sistema no la dibuja, se ven las letras).
const SUBDIVISION = { ENG: 'gbeng', SCO: 'gbsct' };
const flag = code => (SUBDIVISION[code]
  ? `\u{1F3F4}${[...SUBDIVISION[code]].map(char => String.fromCodePoint(0xE0000 + char.charCodeAt(0))).join('')}\u{E007F}`
  : [...code].map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65)).join(''));

// Celdas de tierra de Chile (una vez): columna, fila y su centro en grados.
const LAND = (() => {
  const { step, top, left, rows } = CHILE_MASK;
  const cells = [];
  rows.forEach((hex, y) => [...hex].forEach((digit, nibble) => {
    const bits = parseInt(digit, 16);
    for (let bit = 0; bit < 4; bit += 1) {
      if (!(bits & (8 >> bit))) continue;
      const x = nibble * 4 + bit;
      cells.push({ x, y, lon: left + (x + 0.5) * step, lat: top - (y + 0.5) * step });
    }
  }));
  return cells;
})();
const WIDTH = CHILE_MASK.cols;
const HEIGHT = CHILE_MASK.rows.length;
const toX = lon => (lon - CHILE_MASK.left) / CHILE_MASK.step;
const toY = lat => (CHILE_MASK.top - lat) / CHILE_MASK.step;

// Dónde vive la gente en Chile (población aproximada, en millones): los hinchas se reparten en torno a las ciudades.
const CITIES = [
  [-33.45, -70.65, 7.1], [-33.05, -71.6, 1.0], [-36.83, -73.05, 0.95], [-29.9, -71.25, 0.45], [-23.65, -70.4, 0.4], [-38.74, -72.6, 0.35],
  [-34.17, -70.74, 0.3], [-35.43, -71.65, 0.25], [-18.48, -70.31, 0.22], [-20.21, -70.15, 0.25], [-41.47, -72.94, 0.25], [-53.16, -70.91, 0.13],
  [-39.82, -73.24, 0.2], [-36.6, -72.1, 0.2], [-22.46, -68.93, 0.18], [-27.37, -70.33, 0.16], [-40.57, -73.13, 0.15],
];

/** Calor de cada celda: las ciudades irradian gente y cada casa marcada suma un foco. Escala por raíz para que se vean también las zonas chicas. */
function heatLevels(homes) {
  const sources = [
    ...CITIES.map(([lat, lon, weight]) => ({ lat, lon, weight, sigma: Math.max(0.35, 0.3 + weight * 0.12) })),
    ...homes.map(home => ({ lat: home.lat, lon: home.lon, weight: 1.2, sigma: 0.3 })),
  ];
  const heat = LAND.map(cell => sources.reduce((sum, source) => {
    const dx = (cell.lon - source.lon) * Math.cos(cell.lat * Math.PI / 180);
    const dy = cell.lat - source.lat;
    return sum + source.weight * Math.exp(-(dx * dx + dy * dy) / (2 * source.sigma * source.sigma));
  }, 0));
  const max = Math.max(1e-6, ...heat);
  return heat.map(value => {
    const share = Math.sqrt(value / max);
    return share < 0.05 ? 0 : share < 0.22 ? 1 : share < 0.45 ? 2 : share < 0.7 ? 3 : 4;
  });
}

function AddHome({ fans, onChanged }) {
  const toast = useToast();
  const [comuna, setComuna] = useState('');
  const add = useApiMutation((body, signal) => endpoints.addFanHome(fans.teamId, body, signal), { onSuccess: () => { toast({ tone: 'success', title: 'Casa marcada en el mapa' }); setComuna(''); onChanged?.(); } });
  const submit = event => {
    event.preventDefault();
    const found = COMUNAS.find(([name]) => name === comuna);
    if (found) add.execute({ label: found[0], lat: found[1], lon: found[2] });
  };
  return <form className="fan-home-form" onSubmit={submit}>
    <label>SUMAR UNA CASA (SOLO SE MUESTRA LA COMUNA)
      <select value={comuna} onChange={event => setComuna(event.target.value)}>
        <option value="">ELIGE LA COMUNA…</option>
        {COMUNAS.map(([name]) => <option key={name} value={name}>{upper(name)}</option>)}
      </select>
    </label>
    <Button type="submit" disabled={!comuna || add.loading}>MARCAR</Button>
  </form>;
}

/** Mapa de hinchas: viven en Chile y en el país del club. Chile se ve en el mapa (con las casas marcadas); el país del club, en números. */
export function FanMap({ fans, title = 'HINCHAS EN CHILE Y EN TU PAÍS', onChanged }) {
  const { canEditTeam } = useAuth();
  const homes = fans.homes ?? [];
  const levels = useMemo(() => heatLevels(homes), [homes]);
  const toast = useToast();
  const remove = useApiMutation((homeId, signal) => endpoints.removeFanHome(fans.teamId, homeId, signal), { onSuccess: () => { toast({ tone: 'success', title: 'Casa sacada del mapa' }); onChanged?.(); } });
  const chileRow = (fans.map ?? []).find(row => row.code === 'CL');
  const countryRow = (fans.map ?? []).find(row => row.code === fans.country);
  const abroad = fans.country !== 'CL';
  const origin = fans.origin;
  const formula = origin?.formula;
  const homeShare = percent(fans.homeFans, fans.followers);
  return <Card id="ver-hinchas" title={title} className="fan-map-card" aside={<Chip icon="people">{compact(fans.followers)}</Chip>}>
    <div className="fan-map fan-map-chile">
      <div className="fan-map-canvas">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Mapa de Chile con ${compact(chileRow?.fans ?? 0)} hinchas${homes.length ? ` y ${homes.length} casa${homes.length === 1 ? '' : 's'} marcada${homes.length === 1 ? '' : 's'}` : ''}`}>
          {LAND.map((cell, index) => <rect key={index} x={cell.x + 0.14} y={cell.y + 0.14} width="0.72" height="0.72" className={`l${levels[index]}`}/>)}
          {homes.map(home => <g key={home.id} className="fan-pin is-home" transform={`translate(${toX(home.lon)} ${toY(home.lat)})`}>
            <rect x="-1.4" y="-1.4" width="2.8" height="2.8"/>
            <title>{`Casa de un hincha · ${home.label}`}</title>
          </g>)}
        </svg>
        <div className="fan-map-legend" aria-hidden="true"><span>POCOS</span>{[1, 2, 3, 4].map(level => <i key={level} className={`l${level}`}/>)}<span>MUCHOS</span></div>
      </div>
      <div className="fan-map-side">
        <div className="fan-split fan-split-column">
          {abroad && <span className="fan-split-home"><small>{flag(fans.country)} EN {upper(fans.countryName)}</small><b>{compact(countryRow?.fans ?? fans.homeFans)}</b><em>{homeShare}% DE TUS HINCHAS</em></span>}
          <span className={abroad ? 'fan-split-abroad' : 'fan-split-home'}><small>{flag('CL')} EN CHILE</small><b>{compact(chileRow?.fans ?? 0)}</b>{abroad && <em>{100 - homeShare}% DE TUS HINCHAS</em>}</span>
        </div>
        <section className="fan-homes">
          <h4>CASAS MARCADAS <small>{homes.length}</small></h4>
          {homes.length === 0 && <p className="fan-others">NINGUNA TODAVÍA. EL MAPA REPARTE A LOS HINCHAS POR LAS CIUDADES, SEGÚN LA GENTE QUE VIVE EN CADA UNA.</p>}
          <ul>{homes.map(home => <li key={home.id}><span>{upper(home.label)}</span>{canEditTeam?.(fans.teamId) && <button type="button" onClick={() => remove.execute(home.id)} disabled={remove.loading} aria-label={`Sacar la casa de ${home.label}`}>×</button>}</li>)}</ul>
          {canEditTeam?.(fans.teamId) && <AddHome fans={fans} onChanged={onChanged}/>}
        </section>
      </div>
    </div>
    {formula && <HowItWorks title="¿De dónde salen estos números?">
      <p>Son personas que se declaran hinchas, no seguidores de redes. Viven en dos lugares: Chile, donde se juega la liga, y el país de tu club ({formula.countryName}).</p>
      <ul>
        <li><b>Cuántos son: la grandeza del club.</b> Tu club está en {Math.round((formula.greatness ?? 0) * 100)} de 100 entre los clubes de la liga (títulos, finales, playoffs y plantel). Los más grandes tienen una parte mayor de su país, y los pequeños, una parte chica.</li>
        <li><b>Dónde viven.</b> {abroad ? `En ${formula.countryName} vive la mayor parte (el país tiene ${people(formula.population)} millones de habitantes). Un club de afuera también se hace querer en Chile, más cuanto más grande es y más atractiva es su liga.` : `Tu club es chileno: todos tus hinchas están en Chile.`}</li>
      </ul>
      <p>Partiste con <b>{compact(origin.start)}</b> y {origin.change >= 0 ? 'ganaste' : 'perdiste'} <b>{compact(Math.abs(origin.change))}</b> jugando: partidos, clásicos, títulos, posición final y conciertos.</p>
      <p>Todos pueden ir al estadio, pero un club grande llena aunque no sea día de clásico; uno chico depende más del rival. Los derechos de TV miran a todos tus hinchas.</p>
    </HowItWorks>}
  </Card>;
}
