import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { useAuth } from '../../app/AuthGate.jsx';
import { DataState } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const DEBOUNCE_MS = 400;
const OUTCOME_LABELS = [['home', 'L'], ['draw', 'E'], ['away', 'V']];

// Porcentaje legible: nunca muestra 0% ni 100% si todavía no es seguro.
function pct(value) {
  if (value == null) return '—';
  if (value <= 0) return '0';
  if (value >= 1) return '100';
  if (value < 0.005) return '<1';
  if (value > 0.995) return '>99';
  return String(Math.round(value * 100));
}

const heat = value => ({ '--heat': Math.min(1, Math.max(0, value)).toFixed(3) });

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ProbabilityTable({ group, resolveTeam, focusTeamId, onPick, scenario = false }) {
  const size = group.teams.length;
  const zoneOf = position => group.zones.find(zone => position >= zone.from && position <= zone.to);
  const rows = [...group.teams].sort((a, b) => b.expectedPoints - a.expectedPoints || a.position - b.position);
  return <div className="table-scroll projection-table-scroll"><table className="projection-table">
    <thead><tr><th className="projection-team-col">EQUIPO</th><th title="Puntos actuales">PTS</th><th title="Puntos esperados al final">xPTS</th><th title="Rango de puntos posible">RANGO</th>
      {group.zones.map(zone => <th key={zone.key} className={`projection-zone-head zone-${zone.key}`}>{zone.label} %</th>)}
      {Array.from({ length: size }, (_, index) => <th key={index} className={zoneOf(index + 1) ? `zone-edge zone-${zoneOf(index + 1).key}` : ''}>{index + 1}°</th>)}
    </tr></thead>
    <tbody>{rows.map(row => <tr key={row.teamId} className={row.teamId === focusTeamId ? 'is-focus' : ''}>
      <td className="projection-team-col"><button type="button" onClick={() => onPick?.(row.teamId)} title={`¿Qué necesita ${row.name}?`}><TeamMark team={resolveTeam({ id: row.teamId, name: row.name, emoji: row.emoji })}/><span>{row.name}</span></button></td>
      <td className={scenario && row.scenarioPoints !== row.points ? 'projection-scenario-points' : ''} title={scenario ? 'Puntos considerando los resultados fijados' : 'Puntos oficiales'}>{scenario ? row.scenarioPoints : row.points}</td><td><b>{row.expectedPoints.toFixed(1)}</b></td><td className="projection-range">{row.minPoints}–{row.maxPoints}</td>
      {group.zones.map(zone => <td key={zone.key} className="projection-zone-cell"><b>{pct(row.zones[zone.key])}</b></td>)}
      {row.positions.map((value, index) => <td key={index} className={`projection-heat ${value >= 0.5 ? 'is-dark' : ''}`} style={heat(value)}>{value > 0 ? pct(value) : '·'}</td>)}
    </tr>)}</tbody>
  </table></div>;
}

function ScoreInput({ value, onChange, label }) {
  return <input type="number" inputMode="numeric" min="0" max="30" aria-label={label} value={value} onChange={event => onChange(event.target.value)}/>;
}

function ScenarioMatch({ match, value, onChange }) {
  const exact = value && typeof value === 'object';
  const outcome = exact ? (value.homeScore > value.awayScore ? 'home' : value.homeScore < value.awayScore ? 'away' : 'draw') : value;
  const setScore = (side, raw) => {
    const current = exact ? value : { homeScore: 0, awayScore: 0 };
    const number = raw === '' ? 0 : Math.max(0, Math.min(30, Math.floor(Number(raw)) || 0));
    onChange({ ...current, [side]: number });
  };
  return <li className={`scenario-match ${value ? 'is-fixed' : ''}`}>
    <span className="scenario-team scenario-home">{match.homeTeam.name}</span>
    <div className="scenario-pick" role="group" aria-label={`${match.homeTeam.name} contra ${match.awayTeam.name}`}>
      {OUTCOME_LABELS.map(([key, label]) => <button type="button" key={key} aria-pressed={outcome === key && !exact} className={outcome === key ? (exact ? 'active exact' : 'active') : ''}
        title={`${label === 'L' ? `Gana ${match.homeTeam.name}` : label === 'V' ? `Gana ${match.awayTeam.name}` : 'Empate'} · ${pct(match.odds[key])}%`}
        onClick={() => onChange(outcome === key && !exact ? null : key)}>{label}<small>{pct(match.odds[key])}%</small></button>)}
      <button type="button" className={`scenario-exact-toggle ${exact ? 'active' : ''}`} aria-pressed={exact} title="Marcador exacto" onClick={() => onChange(exact ? null : { homeScore: 0, awayScore: 0 })}>#</button>
    </div>
    <span className="scenario-team scenario-away">{match.awayTeam.name}</span>
    {exact && <div className="scenario-score"><ScoreInput label={`Goles de ${match.homeTeam.name}`} value={value.homeScore} onChange={raw => setScore('homeScore', raw)}/><b>–</b><ScoreInput label={`Goles de ${match.awayTeam.name}`} value={value.awayScore} onChange={raw => setScore('awayScore', raw)}/></div>}
    {match.status === 'live' && <em className="scenario-live">EN VIVO: SE SIMULA DESDE CERO</em>}
  </li>;
}

function ScenarioBoard({ group, fixed, setFixed, winnerTeam }) {
  const rounds = useMemo(() => {
    const byRound = new Map();
    for (const match of group.matches) {
      const key = match.round ?? 'sin-fecha';
      if (!byRound.has(key)) byRound.set(key, []);
      byRound.get(key).push(match);
    }
    return [...byRound];
  }, [group.matches]);
  const fixedCount = group.matches.filter(match => fixed[match.id] != null).length;
  const winAll = () => setFixed(current => {
    const next = { ...current };
    for (const match of group.matches) {
      if (match.homeTeam.id === winnerTeam.teamId) next[match.id] = 'home';
      if (match.awayTeam.id === winnerTeam.teamId) next[match.id] = 'away';
    }
    return next;
  });
  const clear = () => setFixed(current => Object.fromEntries(Object.entries(current).filter(([id]) => !group.matches.some(match => match.id === id))));
  if (!group.matches.length) return <p className="empty-copy">NO QUEDAN PARTIDOS PENDIENTES.</p>;
  return <div className="scenario-board">
    <div className="scenario-actions">
      <span>{fixedCount ? `${fixedCount} DE ${group.matches.length} FIJADOS` : `${group.matches.length} PARTIDOS POR JUGAR`}</span>
      <button type="button" className="action-button" onClick={clear} disabled={!fixedCount}>LIMPIAR</button>
      {winnerTeam && <button type="button" className="action-button positive" onClick={winAll}>FIJAR VICTORIAS DE {winnerTeam.name}</button>}
    </div>
    {rounds.map(([round, matches]) => <section className="scenario-round" key={round}>
      <h4>{round === 'sin-fecha' ? 'SIN FECHA' : `FECHA ${round}`}</h4>
      <ul>{matches.map(match => <ScenarioMatch key={match.id} match={match} value={fixed[match.id] ?? null}
        onChange={value => setFixed(current => { const next = { ...current }; if (value == null) delete next[match.id]; else next[match.id] = value; return next; })}/>)}</ul>
    </section>)}
  </div>;
}

const STATUS_HEADLINE = { clinched: 'ASEGURADO', eliminated: 'SIN OPCIONES', tiebreak: 'SE DEFINE POR DIFERENCIA DE GOL', open: 'EN CARRERA' };

function NeedsView({ group, teams, focusTeamId, setFocusTeamId, resolveTeam, onFix }) {
  const outlook = group?.outlook;
  const nameOf = id => teams.find(team => team.teamId === id)?.name ?? '?';
  const outcomeText = (entry, outcome) => outcome === 'draw' ? `${nameOf(entry.homeTeamId)} Y ${nameOf(entry.awayTeamId)} EMPATAN` : `GANA ${nameOf(outcome === 'home' ? entry.homeTeamId : entry.awayTeamId)}`;
  const focusTeam = teams.find(team => team.teamId === focusTeamId);
  return <div className="needs-view">
    <label className="needs-picker">EQUIPO<select value={focusTeamId ?? ''} onChange={event => setFocusTeamId(event.target.value || null)}>
      <option value="">ELEGIR EQUIPO…</option>{teams.map(team => <option key={team.teamId} value={team.teamId}>{team.name}</option>)}
    </select></label>
    {!focusTeamId && <p className="empty-copy">ELIGE UN EQUIPO PARA VER QUÉ NECESITA.</p>}
    {focusTeamId && outlook && <>
      <header className={`needs-headline status-${outlook.status}`}>
        <TeamMark team={resolveTeam({ id: focusTeam?.teamId, name: focusTeam?.name, emoji: focusTeam?.emoji })}/>
        <div><small>{outlook.goal.label}</small><h4>¿QUÉ NECESITA {focusTeam?.name}?</h4></div>
        <strong><b>{pct(outlook.probability)}%</b><span>{STATUS_HEADLINE[outlook.status]}</span></strong>
      </header>
      <ul className="needs-messages">{outlook.messages.map(message => <li key={message}>{message}</li>)}</ul>
      <dl className="needs-facts">
        <div><dt>PUNTOS HOY</dt><dd>{outlook.currentPoints}</dd></div>
        <div><dt>MÁXIMO POSIBLE</dt><dd>{outlook.maxPoints}</dd></div>
        <div><dt>LE QUEDAN</dt><dd>{outlook.remaining}</dd></div>
        <div><dt>{outlook.exact ? 'PUNTOS QUE LO ASEGURAN' : 'LO ASEGURAN (COTA)'}</dt><dd>{outlook.status === 'clinched' ? '✔' : outlook.safePoints ?? '—'}</dd></div>
      </dl>
      {!outlook.exact && <p className="needs-note">CON TANTOS PARTIDOS POR JUGAR, LA MATEMÁTICA EXACTA SE REEMPLAZA POR COTAS SEGURAS: LO QUE DICE &quot;SEGURO&quot; ES SEGURO, PERO PODRÍA BASTAR CON MENOS.</p>}
      {outlook.keyMatches.length > 0 && <section className="needs-key-matches"><h4>LOS PARTIDOS DE OTROS QUE MÁS LE IMPORTAN</h4><ul>
        {outlook.keyMatches.map(entry => <li key={entry.matchId}>
          <span className="needs-match-name">{nameOf(entry.homeTeamId)} – {nameOf(entry.awayTeamId)}</span>
          <span className="needs-conditional">{OUTCOME_LABELS.map(([key, label]) => <i key={key} className={entry.best === key ? 'best' : ''} title={`Si ${outcomeText(entry, key).toLowerCase()}`}>{label} {pct(entry.conditional[key])}%</i>)}</span>
          <span className="needs-best">LE CONVIENE: {outcomeText(entry, entry.best)}</span>
          <button type="button" className="action-button" onClick={() => onFix(entry.matchId, entry.best)}>FIJAR</button>
        </li>)}
      </ul></section>}
      {outlook.ownMatches.length > 0 && <section className="needs-key-matches"><h4>SUS PARTIDOS</h4><ul>
        {outlook.ownMatches.map(entry => <li key={entry.matchId}>
          <span className="needs-match-name">{nameOf(entry.homeTeamId)} – {nameOf(entry.awayTeamId)}</span>
          <span className="needs-conditional">{OUTCOME_LABELS.map(([key, label]) => <i key={key} className={entry.best === key ? 'best' : ''}>{label} {pct(entry.conditional[key])}%</i>)}</span>
        </li>)}
      </ul></section>}
    </>}
  </div>;
}

/** Proyección de una liga activa: probabilidades, escenarios y "¿qué necesita?". Nada de esto es oficial. */
export function ProjectionPanel({ tournamentId, participantIds = [], initialTeamId = null, initialView = 'odds', resolveTeam }) {
  const { teamId: myTeamId } = useAuth();
  const participants = useMemo(() => new Set(participantIds.map(String)), [participantIds]);
  // En la página independiente los participantes se conocen al responder la proyección;
  // mientras tanto se conserva el equipo del enlace y la API confirma que participe.
  const validTeam = id => (id && (!participants.size || participants.has(String(id)) || participants.has(id)) ? id : null);
  const [view, setView] = useState(initialView);
  const [focusTeamId, setFocusTeamId] = useState(() => validTeam(initialTeamId) ?? validTeam(myTeamId));
  const [fixed, setFixed] = useState({});
  useEffect(() => { if (!focusTeamId) setFocusTeamId(validTeam(initialTeamId) ?? validTeam(myTeamId)); }, [participants]);
  const request = useDebounced(useMemo(() => ({ fixed, teamId: focusTeamId }), [fixed, focusTeamId]), DEBOUNCE_MS);
  const projection = useApiQuery(signal => (Object.keys(request.fixed).length
    ? endpoints.projectionScenario(tournamentId, { fixed: request.fixed, teamId: request.teamId }, signal)
    : endpoints.projection(tournamentId, { teamId: request.teamId ?? undefined }, signal)), [tournamentId, JSON.stringify(request)]);
  const data = projection.data;
  const groups = data?.groups ?? [];
  const allTeams = groups.flatMap(group => group.teams);
  const focusGroup = groups.find(group => group.teams.some(team => team.teamId === focusTeamId));
  const myTeam = allTeams.find(team => team.teamId === myTeamId);
  const winnerTeam = myTeam ?? allTeams.find(team => team.teamId === focusTeamId) ?? null;
  const fixedCount = Object.keys(fixed).length;
  const pick = teamId => { setFocusTeamId(teamId); setView('needs'); };
  const fix = (matchId, outcome) => { setFixed(current => ({ ...current, [matchId]: outcome })); setView('scenarios'); };
  const stale = projection.loading || request.fixed !== fixed || request.teamId !== focusTeamId;

  return <section className="workspace-panel projection-panel">
    <h3>CALCULADORA <small>{data ? `${data.runs.toLocaleString('es-CL')} SIMULACIONES` : 'CALCULANDO…'}</small></h3>
    <p className="projection-disclaimer" role="note"><b>NO ES UN RESULTADO OFICIAL.</b> PROBABILIDADES CALCULADAS SIMULANDO LOS PARTIDOS PENDIENTES CON EL MOTOR DEL SIMULADOR. NO SE GUARDA NADA.</p>
    {data && <label className="projection-team-picker">EQUIPO A ANALIZAR<select value={focusTeamId ?? ''} onChange={event => setFocusTeamId(event.target.value || null)}>
      <option value="">ELEGIR EQUIPO…</option>{allTeams.map(team => <option key={team.teamId} value={team.teamId}>{team.name}</option>)}
    </select></label>}
    <nav className="projection-tabs" role="tablist" aria-label="Vistas de la proyección">
      {[['odds', 'PROBABILIDADES'], ['scenarios', `ESCENARIOS${fixedCount ? ` (${fixedCount})` : ''}`], ['needs', '¿QUÉ NECESITA?']].map(([key, label]) =>
        <button type="button" role="tab" key={key} aria-selected={view === key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>)}
    </nav>
    {!data && <DataState query={projection}/>}
    {data && projection.error && <p className="projection-error" role="alert">{projection.error.message ?? 'NO SE PUDO RECALCULAR.'}</p>}
    {data && <div className={`projection-body ${stale ? 'is-updating' : ''}`} aria-busy={stale}>
      {fixedCount > 0 && view !== 'scenarios' && <p className="projection-scenario-note">CON {fixedCount} RESULTADO{fixedCount === 1 ? '' : 'S'} FIJADO{fixedCount === 1 ? '' : 'S'} EN ESCENARIOS · <button type="button" onClick={() => setFixed({})}>LIMPIAR</button></p>}
      {view === 'odds' && groups.map(group => <section key={group.groupLabel ?? 'liga'} className="projection-group">
        {group.groupLabel && <h4>DIVISIÓN {group.groupLabel}</h4>}
        <ProbabilityTable group={group} resolveTeam={resolveTeam} focusTeamId={focusTeamId} onPick={pick}/>
        <p className="projection-legend">xPTS: PUNTOS ESPERADOS · RANGO: MÍNIMO Y MÁXIMO POSIBLE · TOCA UN EQUIPO PARA VER QUÉ NECESITA.</p>
      </section>)}
      {view === 'scenarios' && groups.map(group => <section key={group.groupLabel ?? 'liga'} className="projection-group scenario-layout">
        {group.groupLabel && <h4>DIVISIÓN {group.groupLabel}</h4>}
        <ScenarioBoard group={group} fixed={fixed} setFixed={setFixed} winnerTeam={group.teams.some(team => team.teamId === winnerTeam?.teamId) ? winnerTeam : null}/>
        <div className="scenario-table"><h4>TABLA PROYECTADA <small>{fixedCount ? 'PTS INCLUYE RESULTADOS FIJADOS' : 'PTS OFICIALES'}</small></h4><ProbabilityTable group={group} resolveTeam={resolveTeam} focusTeamId={focusTeamId} onPick={pick} scenario/></div>
      </section>)}
      {view === 'needs' && <NeedsView group={focusGroup} teams={allTeams} focusTeamId={focusTeamId} setFocusTeamId={setFocusTeamId} resolveTeam={resolveTeam} onFix={fix}/>}
    </div>}
  </section>;
}

export function projectionLink(tournamentId, teamId) {
  return `/calculadora?torneo=${encodeURIComponent(tournamentId)}${teamId ? `&equipo=${encodeURIComponent(teamId)}` : ''}`;
}
