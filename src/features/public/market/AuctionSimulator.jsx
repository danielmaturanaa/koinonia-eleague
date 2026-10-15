import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { PlayerFace } from '../../../components/PlayerFace.jsx';
import { gp } from '../DataStates.jsx';
import { PlayerPicker } from './PlayerPicker.jsx';
import { Stars } from './stars.jsx';

const TOPIC_LABEL = { minutos: 'MINUTOS', companeros: 'COMPAÑEROS', dt: 'ENTRENADOR', prestigio: 'PRESTIGIO', proyecto: 'PROYECTO' };
const FACTOR_LABEL = { dinero: 'DINERO', minutos: 'MINUTOS', companeros: 'COMPAÑEROS', dt: 'ENTRENADOR', prestigio: 'PRESTIGIO', proyecto: 'PROYECTO', reputacion: 'REPUTACIÓN' };
const TRAIT_LABEL = { ganador: 'GANADOR', titular: 'TITULAR', sociable: 'SOCIABLE', mercenario: 'MERCENARIO', ego: 'EGO', leal: 'LEAL' };
const KIND = { dato: 'DATO', promesa: 'PROMESA', argumento: 'ARGUMENTO', negativa: 'HONESTA' };
const year = value => (value ? String(value).slice(0, 4) : '…');

function Counter({ label, value, onChange }) {
  return <span className="sim-counter">{label}
    <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`MENOS ${label}`}>−</button>
    <b>{value}</b>
    <button type="button" onClick={() => onChange(Math.min(2, value + 1))} aria-label={`MÁS ${label}`}>+</button>
  </span>;
}

/**
 * Simulador de subastas con datos reales (solo para el encargado de la liga): eliges jugador, clubes, ofertas y
 * respuestas, y ves al instante rasgos, pesos, notas, temperatura y quién ganaría. No escribe nada.
 */
export function AuctionSimulator({ teams = [] }) {
  const clubs = useMemo(() => teams.filter(team => (team.kind ?? 'club') === 'club'), [teams]);
  const [player, setPlayer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState('');

  const update = (index, patch) => setEntries(current => current.map((entry, at) => (at === index ? { ...entry, ...patch } : entry)));
  const answer = (index, topic, code) => setEntries(current => current.map((entry, at) => (at === index ? { ...entry, answers: { ...entry.answers, [topic]: code || undefined } } : entry)));

  useEffect(() => {
    if (!player?.playerId) { setResult(null); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      endpoints.auctionSim({
        playerId: player.playerId,
        entries: entries.map(entry => ({ teamId: entry.teamId, offer: Number(entry.offer) || 0, answers: entry.answers, requests: entry.requests })),
      }, controller.signal)
        .then(response => { setResult(response.data); setError(null); })
        .catch(failure => { if (failure?.code !== 'REQUEST_ABORTED') setError(failure); })
        .finally(() => setLoading(false));
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [player?.playerId, JSON.stringify(entries)]);

  const addClub = teamId => {
    if (!teamId || entries.some(entry => entry.teamId === teamId)) return;
    setEntries(current => [...current, { teamId, offer: result?.minBid ?? '', answers: {}, requests: { accepted: 0, rejected: 0 } }]);
    setAdding('');
  };
  const byTeam = new Map((result?.clubs ?? []).map(item => [item.teamId, item]));
  const ranking = result?.ranking ?? [];
  const maxWeight = Math.max(1, ...Object.values(result?.weights ?? {}));

  return <section className="market-section sim">
    <header>
      <h2>🧪 SIMULADOR DE SUBASTAS <small>SOLO TÚ</small></h2>
      <p>DATOS REALES DEL JUGADOR Y DE LOS CLUBES. NADA DE ESTO SE GUARDA NI LO VE NADIE MÁS.</p>
    </header>
    <div className="sim-setup">
      <PlayerPicker value={player} onChange={setPlayer} status="registered" label="JUGADOR (CUALQUIERA)"/>
      {player && <label>AGREGAR CLUB
        <select value={adding} onChange={event => addClub(event.target.value)}>
          <option value="">ELEGIR CLUB…</option>
          {clubs.filter(team => !entries.some(entry => entry.teamId === team.id)).map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      </label>}
    </div>
    {error && <p className="form-feedback error" role="alert">{error.message}</p>}

    {result && <div className="sim-player">
      <PlayerFace src={result.player.faceUrl} name={result.player.name}/>
      <div>
        <h3>{result.player.name}</h3>
        <p className="poll-meta">{[result.player.position, result.player.nationality, result.player.age ? `${result.player.age} AÑOS` : null, result.player.overall ? `MEDIA ${result.player.overall}` : null, `VALE ${gp(result.player.gpValue)}`].filter(Boolean).join(' · ')}</p>
        <p className="sim-traits">{result.traits.map(trait => <span key={trait}>{TRAIT_LABEL[trait] ?? trait}</span>)}</p>
        {result.player.signals && <p className="poll-hint">TRAYECTORIA: {result.player.signals.clubs} CLUBES · MÁS LARGO {result.player.signals.longestYears} AÑOS · {result.player.signals.giantYears} AÑOS EN GRANDES{result.player.signals.moneyMoveYoung ? ' · SE FUE JOVEN POR PLATA' : ''}{result.player.signals.peakValueEur ? ` · VALOR MÁXIMO ${(result.player.signals.peakValueEur / 1e6).toLocaleString('es-CL')} M€` : ''}</p>}
        {!result.player.signals && <p className="poll-hint">SIN TRAYECTORIA DE TRANSFERMARKT TODAVÍA: RASGOS 100% SORTEADOS.</p>}
        {result.player.career?.length > 0 && <ol className="sim-career">{result.player.career.map((spell, index) => <li key={index}>{spell.club} <small>{year(spell.from)}–{spell.to ? year(spell.to) : 'HOY'}{spell.loan ? ' · PRÉSTAMO' : ''}</small></li>)}</ol>}
      </div>
      <div className="sim-weights" aria-label="CUÁNTO LE IMPORTA CADA TEMA">
        {Object.entries(result.weights).sort((a, b) => b[1] - a[1]).map(([factor, weight]) => <div key={factor}>
          <span>{FACTOR_LABEL[factor] ?? factor}</span>
          <i style={{ width: `${Math.round(weight / maxWeight * 100)}%` }}/>
          <b>{weight}%</b>
        </div>)}
      </div>
    </div>}

    {entries.length > 0 && <div className="sim-clubs">
      {entries.map((entry, index) => {
        const info = byTeam.get(entry.teamId);
        const row = ranking.find(item => item.teamId === entry.teamId);
        const isWinner = result?.winner?.teamId === entry.teamId;
        return <article key={entry.teamId} className={`sim-club ${isWinner ? 'winner' : ''}`}>
          <header>
            <b>{(clubs.find(team => team.id === entry.teamId)?.name ?? entry.teamId).toUpperCase()}{isWinner ? ' 🏆' : ''}</b>
            <button type="button" className="link-button muted" onClick={() => setEntries(current => current.filter((_, at) => at !== index))}>QUITAR</button>
          </header>
          <label>OFERTA (GP)<input type="number" value={entry.offer} min={result?.minBid ?? 0} max={result?.maxBid ?? undefined} onChange={event => update(index, { offer: event.target.value })}/></label>
          {(result?.order ?? Object.keys(TOPIC_LABEL)).filter(topic => TOPIC_LABEL[topic]).map(topic => <label key={topic}>{TOPIC_LABEL[topic]}
            <select value={entry.answers[topic] ?? ''} onChange={event => answer(index, topic, event.target.value)}>
              <option value="">(SIN RESPONDER)</option>
              {(info?.options?.[topic] ?? []).map(option => <option key={option.code} value={option.code}>[{KIND[option.kind] ?? option.kind}] {option.text}</option>)}
            </select>
          </label>)}
          <p className="sim-requests">PEDIDOS
            <Counter label="ACEPTADOS" value={entry.requests.accepted} onChange={value => update(index, { requests: { ...entry.requests, accepted: value } })}/>
            <Counter label="RECHAZADOS" value={entry.requests.rejected} onChange={value => update(index, { requests: { ...entry.requests, rejected: value } })}/>
          </p>
          {info && <dl className="sim-figures">
            <div><dt>TEMPERATURA</dt><dd>{info.temperature.value}°</dd></div>
            <div><dt>EXIGENCIA</dt><dd>{info.demand} <small>({info.maxRequests} PEDIDO{info.maxRequests === 1 ? '' : 'S'})</small></dd></div>
            <div><dt>REPUTACIÓN</dt><dd>{info.reputation}</dd></div>
            {row && <div><dt>ENCAJE</dt><dd>×{Number(row.fit).toLocaleString('es-CL', { minimumFractionDigits: 2 })}</dd></div>}
            {row && <div><dt>VALOR FINAL</dt><dd>{gp(row.value)}</dd></div>}
          </dl>}
          {row && <ul className="sim-notes">{Object.entries(row.notes).map(([factor, note]) => <li key={factor}><span>{FACTOR_LABEL[factor]}</span><Stars note={note} factor={factor}/><b>{note}</b></li>)}
            <li className="sum"><span>TOTAL</span><Stars note={row.total} factor="total"/><b>{row.total}</b></li></ul>}
          {!row && info && Number(entry.offer) < (result?.minBid ?? 0) && <p className="poll-hint warn">LA OFERTA ESTÁ BAJO EL MÍNIMO ({gp(result.minBid)}): NO PARTICIPA.</p>}
        </article>;
      })}
    </div>}

    {result && entries.length > 0 && <p className={`sim-verdict ${result.winner ? 'ok' : 'none'}`} aria-live="polite">
      {loading ? 'CALCULANDO…' : result.winner
        ? <>🏆 GANARÍA <b>{result.winner.teamName.toUpperCase()}</b> CON {gp(result.winner.offer)} (VALOR FINAL {gp(result.winner.value)})</>
        : result.rejectedAll ? '🤷 NADIE LO CONVENCE (NOTA BAJO 35): SEGUIRÍA LIBRE.' : 'AGREGA OFERTAS VÁLIDAS PARA VER QUIÉN GANA.'}
    </p>}
  </section>;
}
