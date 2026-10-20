import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

const SEASONS = [2, 3, 4, 5, 6];
const upper = text => String(text ?? '').toUpperCase();
const SALARY_STEP = 10;
const roundStep = amount => Math.max(SALARY_STEP, Math.round(amount / SALARY_STEP) * SALARY_STEP);

// Los años elegidos antes de activar el sistema son una proyección: quedan en este navegador.
const draftKey = teamId => `payroll-years:${teamId}`;
function loadDraft(teamId) {
  try { return JSON.parse(window.localStorage.getItem(draftKey(teamId)) ?? '{}') || {}; } catch { return {}; }
}
function saveDraft(teamId, draft) {
  try { window.localStorage.setItem(draftKey(teamId), JSON.stringify(draft)); } catch { /* sin almacenamiento: la proyección sigue funcionando */ }
}

function RenewalForm({ team, contract, onDone }) {
  const quote = contract.renewalQuote;
  const [raise, setRaise] = useState(String(Math.min(100, quote?.minRaisePercent ?? 1)));
  const [seasons, setSeasons] = useState('2');
  const renew = useApiMutation((body, signal) => endpoints.renewContract(team.id, body, signal), { onSuccess: onDone });
  if (!quote) return null;
  const offered = roundStep(contract.salary * (1 + Number(raise || 0) / 100));
  return <div className="payroll-renewal">
    <p><b>{upper(contract.playerName)}</b> TERMINÓ SU CONTRATO. PIDE AL MENOS {gp(quote.demand)} AL AÑO (UN AUMENTO DE {quote.minRaisePercent}% O MÁS)
      {!quote.feasible && ' — ESO ES MÁS DEL 100% QUE SE PUEDE OFRECER: NO ACEPTARÁ RENOVAR'}. SI NO SE RENUEVA ANTES DEL CIERRE DEL MERCADO, SALE A AGENCIA LIBRE SIN CASTIGO.</p>
    <div className="payroll-renewal-fields">
      <label>AUMENTO %<input type="number" min="1" max="100" step="1" value={raise} onChange={event => setRaise(event.target.value)}/></label>
      <label>TEMPORADAS<select value={seasons} onChange={event => setSeasons(event.target.value)}>{SEASONS.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <span className="payroll-offer">SUELDO NUEVO: <b>{gp(offered)}</b></span>
      <button type="button" className="action-button positive" disabled={renew.loading || !quote.feasible} onClick={() => renew.execute({ playerId: contract.playerId, seasons: Number(seasons), raisePercent: Number(raise) })}>{renew.loading ? 'RENOVANDO…' : 'RENOVAR'}</button>
    </div>
    <FormFeedback mutation={renew}/>
  </div>;
}

function TerminateButton({ team, contract, onDone }) {
  const [confirming, setConfirming] = useState(false);
  const release = useApiMutation(signal => endpoints.releasePlayer(contract.playerId, { teamId: team.id }, signal), { onSuccess: () => { setConfirming(false); onDone(); } });
  if (!confirming) return <button type="button" className="ghost" onClick={() => setConfirming(true)}>RESCINDIR</button>;
  return <span className="offer-confirm" role="group" aria-label="CONFIRMAR RESCISIÓN">
    <span>¿RESCINDIR A {upper(contract.playerName)}? PAGAS {gp(contract.terminationCost)} (50% DE {contract.seasonsLeft} TEMPORADA(S)), NO RECIBES NADA Y BAJA LA REPUTACIÓN. NO SE DESHACE.</span>
    <button type="button" disabled={release.loading} onClick={() => release.execute()}>{release.loading ? 'RESCINDIENDO…' : 'SÍ, RESCINDIR'}</button>
    <button type="button" className="ghost" disabled={release.loading} onClick={() => setConfirming(false)}>VOLVER</button>
    <FormFeedback mutation={release}/>
  </span>;
}

function SeasonsSelect({ team, contract, onDone }) {
  const change = useApiMutation((body, signal) => endpoints.setContractSeasons(team.id, contract.id, body, signal), { onSuccess: onDone });
  return <span><select aria-label={`Temporadas de ${contract.playerName}`} value={contract.seasons} disabled={change.loading}
    onChange={event => change.execute({ seasons: Number(event.target.value) })}>{SEASONS.map(n => <option key={n} value={n}>{n}</option>)}</select><FormFeedback mutation={change}/></span>;
}

function StartContracts({ onDone }) {
  const [confirming, setConfirming] = useState(false);
  const start = useApiMutation(signal => endpoints.startContracts({}, signal), { onSuccess: () => { setConfirming(false); onDone(); } });
  return <section className="payroll-admin">
    <p>ADMIN: EL SISTEMA DE CONTRATOS TODAVÍA NO ESTÁ ACTIVO. AL ACTIVARLO SE CREAN LOS CONTRATOS (2 TEMPORADAS) DE TODAS LAS PLANTILLAS, EL TORNEO EN CURSO NO SE COBRA, SE COBRAN LOS TORNEOS DE LIGA QUE SE CREEN DESDE AHORA Y LA REPUTACIÓN PARTE DE CERO.</p>
    {confirming
      ? <div className="offer-confirm" role="group" aria-label="CONFIRMAR ACTIVACIÓN">
        <span>¿ACTIVAR LOS CONTRATOS EN TODA LA LIGA? NO SE DESHACE SOLO.</span>
        <button type="button" disabled={start.loading} onClick={() => start.execute()}>{start.loading ? 'ACTIVANDO…' : 'SÍ, ACTIVAR'}</button>
        <button type="button" className="ghost" disabled={start.loading} onClick={() => setConfirming(false)}>VOLVER</button>
      </div>
      : <button type="button" className="action-button" onClick={() => setConfirming(true)}>ACTIVAR CONTRATOS</button>}
    <FormFeedback mutation={start}/>
  </section>;
}

/** Nómina del club: proyección antes del v11 y, con el sistema activo, contratos, renovaciones y rescisiones. */
export function PayrollTab({ team, balance, onChanged }) {
  const { canEditTeam, isAdmin } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.teamContracts(team.id, signal), [team.id]);
  const [draft, setDraft] = useState(() => loadDraft(team.id));
  const refresh = () => { query.retry(); onChanged?.(); };
  const projection = query.data?.projection;
  const contracts = query.data?.contracts ?? [];
  const enabled = Boolean(projection?.enabled);
  const contractByPlayer = new Map(contracts.map(contract => [contract.playerId, contract]));
  const setYears = (playerId, years) => { const next = { ...draft, [playerId]: years }; setDraft(next); saveDraft(team.id, next); };
  const yearsFor = player => draft[player.playerId] ?? 2;
  const payroll = enabled ? projection.payroll : (projection?.players ?? []).reduce((sum, player) => sum + player.projectedSalary, 0);
  const cap = projection?.cap ?? null;
  const seasonsCovered = payroll > 0 && typeof balance === 'number' ? Math.floor(balance / payroll * 10) / 10 : null;
  const expired = contracts.filter(contract => contract.status === 'expired');

  return <section className="payroll-tab">
    <header className="payroll-head">
      <h2>NÓMINA</h2>
      <p>{enabled
        ? 'CADA JUGADOR TIENE UN CONTRATO DE 2 A 6 TEMPORADAS. SU SUELDO ES EL 10% DE SU VALOR AL FIRMAR, QUEDA CONGELADO Y SE COBRA AL TERMINAR CADA TORNEO DE LIGA MIENTRAS SIGA EN EL CLUB.'
        : 'ASÍ SE VERÍA TU NÓMINA CON EL SISTEMA DE CONTRATOS: SUELDO ANUAL = 10% DEL VALOR DE CADA JUGADOR, COBRADO AL TERMINAR CADA TORNEO DE LIGA. ELIGE LOS AÑOS PARA SIMULAR; TODAVÍA NO SE COBRA NADA.'}</p>
    </header>
    <DataState query={query}/>
    {projection && <>
      <div className="payroll-tiles">
        <div><small>{enabled ? 'NÓMINA ANUAL' : 'NÓMINA PROYECTADA'}</small><b>{gp(payroll)}</b></div>
        <div><small>TOPE DE NÓMINA</small><b>{cap === null ? 'SIN DEFINIR' : gp(cap)}</b>{cap !== null && payroll > cap && <em>TE PASAS POR {gp(payroll - cap)}</em>}</div>
        <div><small>SALDO</small><b>{gp(balance)}</b></div>
        <div><small>ALCANZA PARA</small><b>{seasonsCovered === null ? '—' : `${seasonsCovered.toLocaleString('es-CL')} TEMPORADAS`}</b></div>
      </div>
      {isAdmin && !enabled && <StartContracts onDone={refresh}/>}
      {canEdit && expired.map(contract => <RenewalForm key={contract.id} team={team} contract={contract} onDone={refresh}/>)}
      <div className="payroll-table-wrap"><table className="payroll-table">
        <thead><tr><th>JUGADOR</th><th>VALOR</th><th>SUELDO/AÑO</th><th>TEMPORADAS</th><th>ESTADO</th>{canEdit && enabled && <th></th>}</tr></thead>
        <tbody>{projection.players.map(player => {
          const contract = contractByPlayer.get(player.playerId);
          const salary = contract?.salary ?? player.projectedSalary;
          const editable = canEdit && contract && contract.status === 'active' && contract.seasonsPaid === 0;
          return <tr key={player.playerId}>
            <td><b>{player.playerName}</b> <small>{player.position}</small></td>
            <td>{gp(player.marketValue)}</td>
            <td>{gp(salary)}</td>
            <td>{contract
              ? (editable ? <SeasonsSelect team={team} contract={contract} onDone={refresh}/> : `${contract.seasonsPaid}/${contract.seasons} PAGADAS`)
              : (canEdit ? <select aria-label={`Temporadas proyectadas de ${player.playerName}`} value={yearsFor(player)} onChange={event => setYears(player.playerId, Number(event.target.value))}>{SEASONS.map(n => <option key={n} value={n}>{n}</option>)}</select> : '—')}</td>
            <td>{!contract ? 'PROYECCIÓN' : contract.status === 'expired' ? 'VENCIDO: RENOVAR' : `QUEDAN ${contract.seasonsLeft}`}</td>
            {canEdit && enabled && <td>{contract && contract.status === 'active' ? <TerminateButton team={team} contract={contract} onDone={refresh}/> : null}</td>}
          </tr>;
        })}</tbody>
      </table></div>
      {!enabled && canEdit && <p className="poll-hint">COSTO TOTAL DE LOS CONTRATOS SIMULADOS (SUELDO × AÑOS ELEGIDOS): {gp(projection.players.reduce((sum, player) => sum + player.projectedSalary * yearsFor(player), 0))}.</p>}
    </>}
  </section>;
}
