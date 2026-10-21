import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { MoodMeter, ROLES, roleLabel } from './SigningSheet.jsx';
import { Button, HowItWorks } from '../../ui/index.js';

const TRAIT_LABEL = { ganador: 'GANADOR', titular: 'TITULAR', sociable: 'SOCIABLE', mercenario: 'MERCENARIO', ego: 'EGO', leal: 'LEAL' };

/** El mercado abierto bloquea los roles (para no manipular los fichajes): solo se cambian mientras se juega el torneo. */
export function useMarketOpen() {
  const status = useApiQuery(signal => endpoints.marketStatus(signal).catch(() => ({ data: { open: false } })), []);
  return Boolean(status.data?.open);
}

/** `showWanted`: agrega el botón "CAMBIAR A <el rol que el jugador cree merecer>" (en la bandeja). */
export function RoleSelect({ team, row, onDone, locked = false, showWanted = false }) {
  const change = useApiMutation((body, signal) => endpoints.setPlayerRole(team.id, row.playerId, body, signal), { onSuccess: onDone });
  const wanted = row.expectedRole && row.expectedRole !== row.role ? row.expectedRole : null;
  return <span className="role-select"><select aria-label={`Rol de ${row.name}`} value={row.role} disabled={change.loading || locked} title={locked ? 'Con el mercado abierto los roles están bloqueados' : undefined} onChange={event => change.execute({ role: event.target.value })}>
    {ROLES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
  </select>{showWanted && wanted && <Button variant="positive" disabled={change.loading || locked} onClick={() => change.execute({ role: wanted })}>CAMBIAR A {roleLabel(wanted)}</Button>}<FormFeedback mutation={change}/></span>;
}

/** El presi asigna el rol de cada jugador (él es quien juega); el ánimo de cada uno depende de eso y de lo que cree merecer. */
export function RolesPanel({ team }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.teamRoles(team.id, signal), [team.id]);
  const marketOpen = useMarketOpen();
  const rows = Array.isArray(query.data) ? query.data : [];
  return <section className="roles-panel">
    <header><h3>ROLES Y ÁNIMO</h3><p>El rol lo eliges tú. Si es menor al que cree merecer, se enoja.</p><HowItWorks><p>Cada jugador cree merecer un rol según lo que vale en la liga. Su ánimo sale de eso, del rendimiento del equipo, su sueldo y su personalidad. Si lo tienes por debajo de lo que cree merecer, pide más (o se niega) al renovar. Pasa el mouse por una fila para ver por qué.</p></HowItWorks></header>
    {canEdit && marketOpen && <p className="payroll-empty">🔒 Mercado abierto: los roles están bloqueados para no manipular los fichajes. Se pueden cambiar mientras se juega el torneo.</p>}
    <DataState query={query}/>
    {rows.length > 0 && <div className="payroll-table-wrap"><table className="payroll-table roles-table">
      <thead><tr><th>JUGADOR</th><th>ROL</th><th>CREE MERECER</th><th>ÁNIMO</th><th>PERSONALIDAD</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.playerId} title={row.reasons.map(reason => `${reason.delta > 0 ? '+' : '−'}${Math.abs(reason.delta)} ${reason.text}`).join('\n')}>
        <td><span className="roles-player"><PlayerFace src={row.faceUrl} name={row.name}/><span><b>{row.name}</b> <small>{row.position}</small></span></span></td>
        <td>{canEdit ? <RoleSelect team={team} row={row} onDone={query.retry} locked={marketOpen}/> : roleLabel(row.role)}</td>
        <td className={ROLES.findIndex(([key]) => key === row.role) > ROLES.findIndex(([key]) => key === row.expectedRole) ? 'role-under' : ''}>{roleLabel(row.expectedRole)}</td>
        <td><MoodMeter mood={row.mood} label={row.moodLabel}/></td>
        <td><small>{row.traits.map(trait => TRAIT_LABEL[trait] ?? trait).join(' · ')}</small></td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
