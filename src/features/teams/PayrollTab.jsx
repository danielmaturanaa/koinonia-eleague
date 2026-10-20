import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { GpInput } from '../../components/GpInput.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { PLAYOFF_PRIZES, leaguePrize, maxSalaryFor, simulate } from '../../utils/payrollSim.js';
import { BalanceLine, PayrollBars } from './PayrollCharts.jsx';
import { SigningSheet } from './SigningSheet.jsx';

const SEASONS = [2, 3, 4, 5, 6];
const upper = text => String(text ?? '').toUpperCase();
const PLAYOFF_LABEL = { none: 'SIN PREMIO DE PLAYOFFS', semifinal: 'SEMIFINALISTA (SIN PREMIO)', runnerUp: 'SUBCAMPEÓN', champion: 'CAMPEÓN' };

// ---------- almacenamiento local (la simulación y la forma de verla son solo de este navegador) ----------
const readJson = (key, fallback) => { try { return JSON.parse(window.localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } };
const writeJson = (key, value) => { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento: sigue funcionando */ } };

const DEFAULT_SIM = { players: {}, raise: 15, renew: true, position: 4, playoff: 'none' };
function loadSim(teamId) {
  const stored = readJson(`payroll-sim:${teamId}`, null);
  if (stored) return { ...DEFAULT_SIM, ...stored };
  // Compatibilidad: antes solo se guardaban los años elegidos por jugador.
  const years = readJson(`payroll-years:${teamId}`, {});
  return { ...DEFAULT_SIM, players: Object.fromEntries(Object.entries(years).map(([id, value]) => [id, { years: value }])) };
}

function useSim(teamId) {
  const [sim, setSim] = useState(() => loadSim(teamId));
  const change = patch => setSim(current => { const next = { ...current, ...patch }; writeJson(`payroll-sim:${teamId}`, next); return next; });
  const changePlayer = (playerId, patch) => change({ players: { ...sim.players, [playerId]: { ...sim.players[playerId], ...patch } } });
  const reset = () => change({ ...DEFAULT_SIM });
  return { sim, change, changePlayer, reset };
}

function useLayout() {
  const [layout, setLayout] = useState(() => (readJson('payroll-layout', 'cards') === 'table' ? 'table' : 'cards'));
  return [layout, value => { setLayout(value); writeJson('payroll-layout', value); }];
}

// ---------- piezas pequeñas ----------
/** Cuánto cobra respecto a su valor de mercado; la barra llena es el tope del 20%. */
function ShareBar({ salary, value, compact = false }) {
  const share = value > 0 ? salary / value : 0;
  const percent = Math.round(share * 1000) / 10;
  const tone = share > 0.2 ? 'over' : share > 0.15 ? 'high' : share > 0.1 ? 'mid' : 'ok';
  return <span className={`share-bar ${tone}`} title={`Cobra ${percent.toLocaleString('es-CL')}% de su valor de mercado. El máximo permitido es 20%.`}>
    <span className="share-track"><i style={{ width: `${Math.min(100, (share / 0.2) * 100)}%` }}/></span>
    <b>{percent.toLocaleString('es-CL')}%{!compact && <small> DE SU VALOR · MÁX. 20%</small>}</b>
  </span>;
}

function LayoutToggle({ layout, onChange }) {
  return <span className="layout-toggle" role="group" aria-label="Forma de ver la nómina">
    <button type="button" className={layout === 'cards' ? 'on' : ''} onClick={() => onChange('cards')}>▦ TARJETAS</button>
    <button type="button" className={layout === 'table' ? 'on' : ''} onClick={() => onChange('table')}>☰ TABLA</button>
  </span>;
}

function SeasonDots({ paid, total }) {
  return <span className="season-dots" aria-label={`${paid} de ${total} torneos pagados`}>{Array.from({ length: total }, (_, index) => <i key={index} className={index < paid ? 'paid' : ''}/>)}</span>;
}

function YearsChips({ value, onChange, disabled = false, label }) {
  return <span className="chips years-chips" role="group" aria-label={label}>{SEASONS.map(n => <button type="button" key={n} disabled={disabled} className={value === n ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>)}</span>;
}

function TerminateButton({ team, contract, onDone }) {
  const [confirming, setConfirming] = useState(false);
  const release = useApiMutation(signal => endpoints.releasePlayer(contract.playerId, { teamId: team.id }, signal), { onSuccess: () => { setConfirming(false); onDone(); } });
  if (!confirming) return <button type="button" className="ghost" onClick={() => setConfirming(true)}>{contract.endsWith ? 'SOLTAR' : 'RESCINDIR'}</button>;
  return <span className="offer-confirm" role="group" aria-label="CONFIRMAR RESCISIÓN">
    <span>{contract.endsWith
      ? `¿SOLTAR A ${upper(contract.playerName)}? SU CONTRATO TERMINA CON EL ${upper(contract.endsWith.name)}: NO PAGAS NADA, NO RECIBES NADA Y NO BAJA LA REPUTACIÓN. QUEDA AGENTE LIBRE.`
      : `¿RESCINDIR A ${upper(contract.playerName)}? PAGAS ${gp(contract.terminationCost)} (50% DE ${contract.seasonsLeft} TORNEO(S)), NO RECIBES NADA Y BAJA LA REPUTACIÓN. NO SE DESHACE.`}</span>
    <button type="button" disabled={release.loading} onClick={() => release.execute()}>{release.loading ? 'ESPERA…' : contract.endsWith ? 'SÍ, SOLTAR' : 'SÍ, RESCINDIR'}</button>
    <button type="button" className="ghost" disabled={release.loading} onClick={() => setConfirming(false)}>VOLVER</button>
    <FormFeedback mutation={release}/>
  </span>;
}

function ContractYears({ team, contract, onDone }) {
  const change = useApiMutation((body, signal) => endpoints.setContractSeasons(team.id, contract.id, body, signal), { onSuccess: onDone });
  return <><YearsChips value={contract.seasons} disabled={change.loading} onChange={seasons => change.execute({ seasons })} label={`Torneos de ${contract.playerName}`}/><FormFeedback mutation={change}/></>;
}

const OUTCOME_LABEL = { accepted: ['✅', 'ACEPTÓ'], counter: ['🤝', 'CONTRAOFERTA'], refused: ['❌', 'SE NEGÓ'], error: ['⚠️', 'NO SE PUDO'] };

/** Una misma propuesta para todos los jugadores con contrato vencido; cada uno responde por su cuenta. */
function RenewAll({ team, expiredCount, onDone, marketOpen }) {
  const [seasons, setSeasons] = useState(3);
  const [raise, setRaise] = useState(15);
  const [results, setResults] = useState(null);
  const send = useApiMutation((body, signal) => endpoints.negotiateAllContracts(team.id, body, signal), { onSuccess: response => { setResults(response?.data ?? []); onDone(); } });
  if (!expiredCount && !results) return null;
  return <section className="renew-all">
    <header><h3>RENOVAR A TODOS</h3><p>{expiredCount} JUGADOR(ES) CON CONTRATO VENCIDO O QUE TERMINA CON EL TORNEO EN CURSO. LA MISMA PROPUESTA PARA TODOS: CADA UNO ACEPTA, CONTRAOFERTA O SE NIEGA SEGÚN SU ÁNIMO Y PERSONALIDAD. A LOS QUE NO ACEPTEN LOS NEGOCIAS UNO A UNO EN SU HOJA (HASTA 3 PROPUESTAS EN TOTAL).</p></header>
    {expiredCount > 0 && !marketOpen && <p className="payroll-empty">🔒 SIN MERCADO ABIERTO: LAS RENOVACIONES SOLO SE HACEN EN PERIODOS DE MERCADO.</p>}
    {expiredCount > 0 && marketOpen && <div className="renew-all-form">
      <span className="chips">{SEASONS.map(n => <button type="button" key={n} className={seasons === n ? 'on' : ''} onClick={() => setSeasons(n)}>{n} TORNEOS</button>)}</span>
      <span className="sheet-slider"><input type="range" min="1" max="100" value={raise} onChange={event => setRaise(Number(event.target.value))} aria-label="Aumento de sueldo en porcentaje"/><b>+{raise}%</b></span>
      <button type="button" className="action-button positive" disabled={send.loading} onClick={() => send.execute({ seasons, raisePercent: raise })}>{send.loading ? 'ENVIANDO…' : 'ENVIAR A TODOS'}</button>
    </div>}
    <FormFeedback mutation={send}/>
    {results && <ul className="renew-all-results">{results.map(item => { const [icon, label] = OUTCOME_LABEL[item.outcome] ?? ['•', item.outcome]; return <li key={item.playerId} className={item.outcome}><b>{icon} {item.name}</b> <small>{label}</small> <span>{item.reply}</span></li>; })}</ul>}
  </section>;
}

function Tiles({ items }) {
  return <div className="payroll-tiles">{items.map(([label, value, note]) => <div key={label}><small>{label}</small><b>{value}</b>{note && <em>{note}</em>}</div>)}</div>;
}

const covered = (payroll, balance) => (payroll > 0 && typeof balance === 'number' ? `${(Math.floor(balance / payroll * 10) / 10).toLocaleString('es-CL')} TORNEOS` : '—');

// ---------- vista REAL ----------
function RealView({ team, query, balance, marketOpen, canEdit, layout, refresh }) {
  const projection = query.data?.projection;
  const contracts = query.data?.contracts ?? [];
  const enabled = Boolean(projection?.enabled);
  const cap = projection?.cap ?? null;
  const livePayroll = projection?.payroll ?? 0;
  const [signedIds, setSignedIds] = useState([]);
  const [signedSnapshots, setSignedSnapshots] = useState({});
  // Las hojas que ya se firmaron siguen a la vista (con su firma animada) aunque el contrato ya no esté vencido.
  const renewables = contracts.filter(contract => contract.renewable);
  const sheets = [...renewables, ...signedIds.filter(id => !renewables.some(contract => contract.id === id)).map(id => signedSnapshots[id]).filter(Boolean)];
  const keepSigned = contract => { setSignedSnapshots(items => ({ ...items, [contract.id]: contract })); setSignedIds(ids => ids.includes(contract.id) ? ids : [...ids, contract.id]); };
  const remainingCost = contracts.filter(contract => contract.status === 'active' && !contract.endsWith).reduce((sum, contract) => sum + contract.salary * contract.seasonsLeft, 0);
  const contractText = contract => (contract.status === 'expired' ? 'VENCIDO: RENOVAR' : contract.endsWith ? `VIGENTE: TERMINA CON EL ${upper(contract.endsWith.name)}` : `QUEDAN ${contract.seasonsLeft} DE ${contract.seasons} TORNEOS`);
  const editable = contract => canEdit && marketOpen && contract.status === 'active' && contract.seasonsPaid === 0;
  const actions = contract => <>
    {editable(contract) && <ContractYears team={team} contract={contract} onDone={refresh}/>}
    {canEdit && contract.status === 'active' && <TerminateButton team={team} contract={contract} onDone={refresh}/>}
  </>;

  return <div className="payroll-real">
    <div className="view-badge real">📄 NÓMINA REAL · CONTRATOS FIRMADOS</div>
    <p className="payroll-note">CADA JUGADOR TIENE UN CONTRATO DE 2 A 6 TORNEOS. SU SUELDO QUEDA CONGELADO Y SE COBRA AL TERMINAR CADA TORNEO DE LIGA MIENTRAS SIGA EN EL CLUB. NADIE PUEDE COBRAR MÁS DEL 20% DE SU VALOR DE MERCADO.</p>
    {!enabled && <p className="payroll-empty">LOS CONTRATOS TODAVÍA NO ESTÁN ACTIVOS. MIENTRAS TANTO USA LA SIMULACIÓN PARA PLANIFICAR.</p>}
    {enabled && <>
      {canEdit && !marketOpen && <p className="payroll-empty">🔒 SIN MERCADO ABIERTO: LOS AÑOS DE LOS CONTRATOS Y LAS RENOVACIONES SOLO SE CAMBIAN EN PERIODOS DE MERCADO. RESCINDIR SE PUEDE SIEMPRE, CON INDEMNIZACIÓN Y CASTIGO.</p>}
      <Tiles items={[
        ['NÓMINA ANUAL', gp(livePayroll)],
        ['TOPE DE NÓMINA', cap === null ? 'SIN DEFINIR' : gp(cap), cap !== null && livePayroll > cap ? `TE PASAS POR ${gp(livePayroll - cap)}` : null],
        ['SALDO', gp(balance)],
        ['ALCANZA PARA', covered(livePayroll, balance)],
        ['POR PAGAR EN CONTRATOS', gp(remainingCost)],
      ]}/>
      {canEdit && <RenewAll team={team} expiredCount={renewables.length} onDone={refresh} marketOpen={marketOpen}/>}
      {canEdit && sheets.map(contract => <SigningSheet key={contract.id} team={team} contract={contract} args={query.data?.arguments ?? []} maxRounds={query.data?.maxRounds ?? 3} marketOpen={marketOpen} onDone={refresh} onAccepted={() => keepSigned(contract)}/>)}
      {layout === 'cards'
        ? <div className="payroll-grid">{contracts.map(contract => <article key={contract.id} className={`payroll-card ${contract.status}`}>
          <header><PlayerFace src={contract.faceUrl} name={contract.playerName}/><div><b>{contract.playerName}</b><small>{contract.position} · VALE {gp(contract.marketValue)}</small></div></header>
          <div className="payroll-card-salary"><b>{gp(contract.salary)}</b><small>POR TORNEO</small></div>
          <ShareBar salary={contract.salary} value={contract.marketValue}/>
          <div className="payroll-card-years">
            {!contract.endsWith && <SeasonDots paid={contract.seasonsPaid} total={contract.seasons}/>}
            <span>{contractText(contract)}</span>
          </div>
          {actions(contract)}
        </article>)}</div>
        : <div className="ptable-wrap"><table className="ptable">
          <thead><tr><th>JUGADOR</th><th>VALOR</th><th>SUELDO / TORNEO</th><th>% DEL VALOR</th><th>CONTRATO</th>{canEdit && <th></th>}</tr></thead>
          <tbody>{contracts.map(contract => <tr key={contract.id} className={contract.status}>
            <td><span className="ptable-player"><PlayerFace src={contract.faceUrl} name={contract.playerName}/><span><b>{contract.playerName}</b> <small>{contract.position}</small></span></span></td>
            <td>{gp(contract.marketValue)}</td>
            <td><b>{gp(contract.salary)}</b></td>
            <td><ShareBar salary={contract.salary} value={contract.marketValue} compact/></td>
            <td><span className="ptable-contract">{!contract.endsWith && <SeasonDots paid={contract.seasonsPaid} total={contract.seasons}/>}<small>{contractText(contract)}</small></span></td>
            {canEdit && <td className="ptable-actions">{actions(contract)}</td>}
          </tr>)}</tbody>
        </table></div>}
    </>}
  </div>;
}

// ---------- vista SIMULACIÓN ----------
function SimView({ team, projection, balance, canEdit, layout }) {
  const { sim, change, changePlayer, reset } = useSim(team.id);
  const cap = projection?.cap ?? null;
  const rows = (projection?.players ?? []).map(player => {
    const own = sim.players[player.playerId] ?? {};
    const years = own.years ?? (player.contract ? Math.max(1, player.contract.seasons - player.contract.seasonsPaid) : 2);
    const salary = own.salary ?? player.contract?.salary ?? player.projectedSalary;
    const limit = player.salaryCap ?? maxSalaryFor(player.marketValue);
    return { ...player, years, salary, over: salary > limit };
  });
  const timeline = simulate(rows.map(row => ({ value: row.marketValue, salary: row.salary, years: row.years })), {
    raise: sim.raise, renew: sim.renew, position: sim.position, playoff: sim.playoff, balance: typeof balance === 'number' ? balance : 0, cap,
  });
  const payroll = rows.reduce((sum, row) => sum + row.salary, 0);
  const total = rows.reduce((sum, row) => sum + row.salary * row.years, 0);
  const overCount = rows.filter(row => row.over).length;
  const first = timeline[0];

  const salaryInput = row => canEdit
    ? <GpInput aria-label={`Sueldo simulado de ${row.playerName}`} value={row.salary} onChange={event => changePlayer(row.playerId, { salary: event.target.value === '' ? undefined : Number(event.target.value) })}/>
    : <b>{gp(row.salary)}</b>;
  const yearsInput = row => (canEdit ? <YearsChips value={row.years} onChange={years => changePlayer(row.playerId, { years })} label={`Torneos simulados de ${row.playerName}`}/> : <span>{row.years} TORNEOS</span>);

  return <div className="payroll-sim">
    <div className="view-badge sim">🧪 SIMULACIÓN · NADA DE ESTO ES REAL NI SE COBRA</div>
    <p className="payroll-note">PRUEBA SUELDOS, AÑOS Y UN AUMENTO AL RENOVAR PARA VER CÓMO SE MUEVEN LA NÓMINA Y EL SALDO EN LOS PRÓXIMOS TORNEOS. USA LOS VALORES DE MERCADO DE HOY (CAMBIAN CON CADA REFRESCO DE TRANSFERMARKT) Y TODO QUEDA SOLO EN ESTE NAVEGADOR. SI UN JUGADOR PASA EL 20% DE SU VALOR, SALE EN ROJO: ESE SUELDO NO SE PODRÍA FIRMAR.</p>
    <section className="sim-controls">
      <label>AUMENTO AL RENOVAR<span className="sheet-slider"><input type="range" min="0" max="100" value={sim.raise} onChange={event => change({ raise: Number(event.target.value) })} aria-label="Aumento al renovar en porcentaje"/><b>+{sim.raise}%</b></span></label>
      <label className="sim-check"><input type="checkbox" checked={sim.renew} onChange={event => change({ renew: event.target.checked })}/> RENOVAR A QUIEN LE VENZA EL CONTRATO</label>
      <label>PUESTO EN LA LIGA<select value={sim.position} onChange={event => change({ position: Number(event.target.value) })}>{Array.from({ length: 8 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}.º · {gp(leaguePrize(n))}</option>)}</select></label>
      <label>PLAYOFFS<select value={sim.playoff} onChange={event => change({ playoff: event.target.value })}>{Object.keys(PLAYOFF_PRIZES).map(key => <option key={key} value={key}>{PLAYOFF_LABEL[key]}{PLAYOFF_PRIZES[key] ? ` · ${gp(PLAYOFF_PRIZES[key])}` : ''}</option>)}</select></label>
      {canEdit && <button type="button" className="ghost" onClick={reset}>RESTABLECER</button>}
    </section>
    <Tiles items={[
      ['NÓMINA ANUAL SIMULADA', gp(payroll)],
      ['TOPE DE NÓMINA', cap === null ? 'SIN DEFINIR' : gp(cap), cap !== null && payroll > cap ? `TE PASAS POR ${gp(payroll - cap)}` : null],
      ['SALDO HOY', gp(balance)],
      ['SALDO AL TORNEO 1', first ? gp(first.balance) : '—', first && first.net < 0 ? 'GASTAS MÁS DE LO QUE GANAS' : null],
      ['COSTO TOTAL DE LOS CONTRATOS', gp(total)],
    ]}/>
    {overCount > 0 && <p className="payroll-empty sim-warn">⚠️ {overCount} JUGADOR(ES) SOBRE EL 20% DE SU VALOR: ESOS SUELDOS NO SE PODRÍAN FIRMAR.</p>}
    {layout === 'cards'
      ? <div className="payroll-grid">{rows.map(row => <article key={row.playerId} className={`payroll-card sim-card ${row.over ? 'over' : ''}`}>
        <header><PlayerFace src={row.faceUrl} name={row.playerName}/><div><b>{row.playerName}</b><small>{row.position} · VALE {gp(row.marketValue)}</small></div></header>
        {salaryInput(row)}
        <ShareBar salary={row.salary} value={row.marketValue}/>
        {yearsInput(row)}
        <small className="payroll-card-total">{row.years} TORNEOS × {gp(row.salary)} = <b>{gp(row.salary * row.years)}</b></small>
      </article>)}</div>
      : <div className="ptable-wrap"><table className="ptable sim">
        <thead><tr><th>JUGADOR</th><th>VALOR</th><th>SUELDO / TORNEO</th><th>% DEL VALOR</th><th>TORNEOS</th><th>COSTO TOTAL</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.playerId} className={row.over ? 'over' : ''}>
          <td><span className="ptable-player"><PlayerFace src={row.faceUrl} name={row.playerName}/><span><b>{row.playerName}</b> <small>{row.position}</small></span></span></td>
          <td>{gp(row.marketValue)}</td>
          <td className="ptable-salary">{salaryInput(row)}</td>
          <td><ShareBar salary={row.salary} value={row.marketValue} compact/></td>
          <td>{yearsInput(row)}</td>
          <td>{gp(row.salary * row.years)}</td>
        </tr>)}</tbody>
      </table></div>}

    <section className="sim-timeline">
      <h3>PRÓXIMOS TORNEOS</h3>
      <div className="sim-charts">
        <figure><figcaption>NÓMINA POR TORNEO{cap !== null ? ' Y TOPE' : ''}</figcaption><PayrollBars rows={timeline} cap={cap}/></figure>
        <figure><figcaption>SALDO PROYECTADO</figcaption><BalanceLine rows={timeline} start={typeof balance === 'number' ? balance : 0}/></figure>
      </div>
      <div className="ptable-wrap"><table className="ptable sim-timeline-table">
        <thead><tr><th>TORNEO</th><th>NÓMINA</th><th>PREMIOS</th><th>NETO</th><th>SALDO</th><th>CONTRATOS QUE VENCEN</th></tr></thead>
        <tbody>{timeline.map(row => <tr key={row.torneo} className={row.overCap || row.balance < 0 ? 'over' : ''}>
          <td><b>T{row.torneo}</b></td><td>{gp(row.payroll)}{row.overCap ? ' ⚠️' : ''}</td><td>{gp(row.prize)}</td>
          <td className={row.net < 0 ? 'neg' : ''}>{row.net >= 0 ? '+' : '−'}{gp(Math.abs(row.net))}</td><td className={row.balance < 0 ? 'neg' : ''}>{gp(row.balance)}</td>
          <td>{row.expiring ? `${row.expiring} (${sim.renew ? `RENUEVAN +${sim.raise}%` : 'SALEN'})` : '—'}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="payroll-note">T1 ES EL PRIMER TORNEO CON CONTRATOS. LOS PREMIOS SON LOS DE LA TABLA DE LA LIGA SEGÚN EL PUESTO QUE ELIJAS (EL MISMO TODOS LOS TORNEOS); NO INCLUYE FICHAJES NI VENTAS.</p>
    </section>
  </div>;
}

/** Nómina del club: la real (contratos firmados) y la simulación (qué pasaría con otros sueldos, años y premios). */
export function PayrollTab({ team, balance, onChanged }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.teamContracts(team.id, signal), [team.id]);
  // Cambiar años, renovar y negociar contratos solo se puede con el mercado abierto.
  const market = useApiQuery(signal => endpoints.marketStatus(signal).catch(() => ({ data: { open: false } })), []);
  const marketOpen = Boolean(market.data?.open);
  const [view, setView] = useState(null);
  const [layout, setLayout] = useLayout();
  const refresh = () => { query.retry(); onChanged?.(); };
  const projection = query.data?.projection;
  const current = view ?? (projection?.enabled ? 'actual' : 'proyeccion');

  return <section className={`payroll-tab ${current === 'proyeccion' ? 'is-sim' : 'is-real'}`}>
    <header className="payroll-head">
      <h2>NÓMINA</h2>
      <div className="payroll-head-tools">
        <LayoutToggle layout={layout} onChange={setLayout}/>
        <nav className="payroll-views" role="tablist" aria-label="Vista de la nómina">
          <button type="button" role="tab" aria-selected={current === 'actual'} className={current === 'actual' ? 'on' : ''} onClick={() => setView('actual')}>📄 NÓMINA ACTUAL</button>
          <button type="button" role="tab" aria-selected={current === 'proyeccion'} className={`sim-tab ${current === 'proyeccion' ? 'on' : ''}`} onClick={() => setView('proyeccion')}>🧪 SIMULACIÓN</button>
        </nav>
      </div>
    </header>
    <DataState query={query}/>
    {projection && current === 'actual' && <RealView team={team} query={query} balance={balance} marketOpen={marketOpen} canEdit={canEdit} layout={layout} refresh={refresh}/>}
    {projection && current === 'proyeccion' && <SimView team={team} projection={projection} balance={balance} canEdit={canEdit} layout={layout}/>}
  </section>;
}
