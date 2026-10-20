import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { SigningSheet } from './SigningSheet.jsx';

const SEASONS = [2, 3, 4, 5, 6];
const upper = text => String(text ?? '').toUpperCase();

// Los años elegidos antes de activar el sistema son una proyección: quedan en este navegador.
const draftKey = teamId => `payroll-years:${teamId}`;
function loadDraft(teamId) {
  try { return JSON.parse(window.localStorage.getItem(draftKey(teamId)) ?? '{}') || {}; } catch { return {}; }
}
function saveDraft(teamId, draft) {
  try { window.localStorage.setItem(draftKey(teamId), JSON.stringify(draft)); } catch { /* sin almacenamiento: la proyección sigue funcionando */ }
}

/** Puntos de los torneos de un contrato: llenos los ya pagados, vacíos los que quedan. */
function SeasonDots({ paid, total }) {
  return <span className="season-dots" aria-label={`${paid} de ${total} torneos pagados`}>{Array.from({ length: total }, (_, index) => <i key={index} className={index < paid ? 'paid' : ''}/>)}</span>;
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

function YearsChips({ value, onChange, disabled = false, label }) {
  return <span className="chips years-chips" role="group" aria-label={label}>{SEASONS.map(n => <button type="button" key={n} disabled={disabled} className={value === n ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>)}</span>;
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

/** Nómina del club: la real (contratos firmados) y la proyección (qué pasaría con el sueldo del 10% y los años que elijas). */
export function PayrollTab({ team, balance, onChanged }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.teamContracts(team.id, signal), [team.id]);
  // Cambiar años, renovar y negociar contratos solo se puede con el mercado abierto.
  const market = useApiQuery(signal => endpoints.marketStatus(signal).catch(() => ({ data: { open: false } })), []);
  const marketOpen = Boolean(market.data?.open);
  const [draft, setDraft] = useState(() => loadDraft(team.id));
  const [view, setView] = useState(null);
  const [signedIds, setSignedIds] = useState([]);
  const [signedSnapshots, setSignedSnapshots] = useState({});
  const refresh = () => { query.retry(); onChanged?.(); };
  const projection = query.data?.projection;
  const contracts = query.data?.contracts ?? [];
  const enabled = Boolean(projection?.enabled);
  const current = view ?? (enabled ? 'actual' : 'proyeccion');
  const cap = projection?.cap ?? null;

  // Las hojas que ya se firmaron siguen a la vista (con su firma animada) aunque el contrato ya no esté vencido.
  const expired = contracts.filter(contract => contract.renewable);
  const sheets = [...expired, ...signedIds.filter(id => !expired.some(contract => contract.id === id)).map(id => signedSnapshots[id]).filter(Boolean)];
  const keepSigned = contract => { setSignedSnapshots(items => ({ ...items, [contract.id]: contract })); setSignedIds(ids => ids.includes(contract.id) ? ids : [...ids, contract.id]); };

  const setYears = (playerId, years) => { const next = { ...draft, [playerId]: years }; setDraft(next); saveDraft(team.id, next); };
  const simulated = (projection?.players ?? []).map(player => ({ ...player, years: draft[player.playerId] ?? 2 }));
  const simulatedPayroll = simulated.reduce((sum, player) => sum + player.projectedSalary, 0);
  const simulatedTotal = simulated.reduce((sum, player) => sum + player.projectedSalary * player.years, 0);
  const livePayroll = projection?.payroll ?? 0;
  const remainingCost = contracts.filter(contract => contract.status === 'active' && !contract.endsWith).reduce((sum, contract) => sum + contract.salary * contract.seasonsLeft, 0);
  const covered = payroll => payroll > 0 && typeof balance === 'number' ? `${(Math.floor(balance / payroll * 10) / 10).toLocaleString('es-CL')} TORNEOS` : '—';

  return <section className="payroll-tab">
    <header className="payroll-head">
      <h2>NÓMINA</h2>
      <nav className="payroll-views" role="tablist" aria-label="Vista de la nómina">
        <button type="button" role="tab" aria-selected={current === 'actual'} className={current === 'actual' ? 'on' : ''} onClick={() => setView('actual')}>NÓMINA ACTUAL</button>
        <button type="button" role="tab" aria-selected={current === 'proyeccion'} className={current === 'proyeccion' ? 'on' : ''} onClick={() => setView('proyeccion')}>PROYECCIÓN</button>
      </nav>
    </header>
    <DataState query={query}/>
    {projection && current === 'actual' && <>
      <p className="payroll-note">CADA JUGADOR TIENE UN CONTRATO DE 2 A 6 TORNEOS. SU SUELDO ES EL 10% DE SU VALOR AL FIRMAR, QUEDA CONGELADO Y SE COBRA AL TERMINAR CADA TORNEO DE LIGA MIENTRAS SIGA EN EL CLUB.</p>
      {!enabled && <>
        <p className="payroll-empty">LOS CONTRATOS TODAVÍA NO ESTÁN ACTIVOS: ENTRAN CON EL TORNEO v11. MIENTRAS TANTO MIRA LA <button type="button" className="link-button" onClick={() => setView('proyeccion')}>PROYECCIÓN</button> PARA PLANIFICAR.</p>
      </>}
      {enabled && <>
        {canEdit && !marketOpen && <p className="payroll-empty">🔒 SIN MERCADO ABIERTO: LOS AÑOS DE LOS CONTRATOS Y LAS RENOVACIONES SOLO SE CAMBIAN EN PERIODOS DE MERCADO. RESCINDIR SE PUEDE SIEMPRE, CON INDEMNIZACIÓN Y CASTIGO.</p>}
        <Tiles items={[
          ['NÓMINA ANUAL', gp(livePayroll)],
          ['TOPE DE NÓMINA', cap === null ? 'SIN DEFINIR' : gp(cap), cap !== null && livePayroll > cap ? `TE PASAS POR ${gp(livePayroll - cap)}` : null],
          ['SALDO', gp(balance)],
          ['ALCANZA PARA', covered(livePayroll)],
          ['POR PAGAR EN CONTRATOS', gp(remainingCost)],
        ]}/>
        {canEdit && <RenewAll team={team} expiredCount={expired.length} onDone={refresh} marketOpen={marketOpen}/>}
        {canEdit && sheets.map(contract => <SigningSheet key={contract.id} team={team} contract={contract} args={query.data?.arguments ?? []} maxRounds={query.data?.maxRounds ?? 3} marketOpen={marketOpen} onDone={refresh} onAccepted={() => keepSigned(contract)}/>)}
        <div className="payroll-grid">{contracts.map(contract => <article key={contract.id} className={`payroll-card ${contract.status}`}>
          <header><PlayerFace src={contract.faceUrl} name={contract.playerName}/><div><b>{contract.playerName}</b><small>{contract.position} · VALE {gp(contract.marketValue)}</small></div></header>
          <div className="payroll-card-salary"><b>{gp(contract.salary)}</b><small>POR TORNEO</small></div>
          <div className="payroll-card-years">
            {!contract.endsWith && <SeasonDots paid={contract.seasonsPaid} total={contract.seasons}/>}
            <span>{contract.status === 'expired' ? 'VENCIDO: RENOVAR' : contract.endsWith ? `VIGENTE: TERMINA CON EL ${upper(contract.endsWith.name)}` : `QUEDAN ${contract.seasonsLeft} DE ${contract.seasons} TORNEOS`}</span>
          </div>
          {canEdit && contract.status === 'active' && contract.seasonsPaid === 0 && marketOpen && <ContractYears team={team} contract={contract} onDone={refresh}/>}
          {canEdit && contract.status === 'active' && <TerminateButton team={team} contract={contract} onDone={refresh}/>}
        </article>)}</div>
      </>}
    </>}
    {projection && current === 'proyeccion' && <>
      <p className="payroll-note">ASÍ SE VERÍA TU NÓMINA CON CONTRATOS: SUELDO = 10% DEL VALOR DE CADA JUGADOR POR TORNEO DE LIGA. ELIGE LOS TORNEOS DE CADA CONTRATO PARA SIMULAR; NO SE COBRA NADA TODAVÍA.</p>
      <Tiles items={[
        ['NÓMINA ANUAL PROYECTADA', gp(simulatedPayroll)],
        ['TOPE DE NÓMINA', cap === null ? 'SIN DEFINIR' : gp(cap), cap !== null && simulatedPayroll > cap ? `TE PASAS POR ${gp(simulatedPayroll - cap)}` : null],
        ['SALDO', gp(balance)],
        ['ALCANZA PARA', covered(simulatedPayroll)],
        ['COSTO TOTAL DE LOS CONTRATOS', gp(simulatedTotal)],
      ]}/>
      <div className="payroll-grid">{simulated.map(player => <article key={player.playerId} className="payroll-card">
        <header><PlayerFace src={player.faceUrl} name={player.playerName}/><div><b>{player.playerName}</b><small>{player.position} · VALE {gp(player.marketValue)}</small></div></header>
        <div className="payroll-card-salary"><b>{gp(player.projectedSalary)}</b><small>POR TORNEO</small></div>
        {canEdit
          ? <YearsChips value={player.years} onChange={years => setYears(player.playerId, years)} label={`Torneos proyectados de ${player.playerName}`}/>
          : <span className="payroll-card-years"><span>{player.years} TORNEOS</span></span>}
        <small className="payroll-card-total">{player.years} TORNEOS × {gp(player.projectedSalary)} = <b>{gp(player.projectedSalary * player.years)}</b></small>
      </article>)}</div>
    </>}
  </section>;
}
