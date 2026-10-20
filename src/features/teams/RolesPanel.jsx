import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { MoodMeter, ROLES, roleLabel } from './SigningSheet.jsx';

const TRAIT_LABEL = { ganador: 'GANADOR', titular: 'TITULAR', sociable: 'SOCIABLE', mercenario: 'MERCENARIO', ego: 'EGO', leal: 'LEAL' };

function RoleSelect({ team, row, onDone }) {
  const change = useApiMutation((body, signal) => endpoints.setPlayerRole(team.id, row.playerId, body, signal), { onSuccess: onDone });
  return <span><select aria-label={`Rol de ${row.name}`} value={row.role} disabled={change.loading} onChange={event => change.execute({ role: event.target.value })}>
    {ROLES.map(([key, label]) => <option key={key} value={key}>{label}{!row.assigned && key === row.suggestedRole ? ' (SUGERIDO)' : ''}</option>)}
  </select><FormFeedback mutation={change}/></span>;
}

/** El presi asigna el rol de cada jugador (él es quien juega); el ánimo de cada uno depende de eso y de lo que cree merecer. */
export function RolesPanel({ team }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.teamRoles(team.id, signal), [team.id]);
  const rows = Array.isArray(query.data) ? query.data : [];
  return <section className="roles-panel">
    <header><h3>ROLES Y ÁNIMO</h3><p>EL ROL LO ELIGES TÚ, QUE ERES QUIEN JUEGA. CADA JUGADOR CREE MERECER UN ROL SEGÚN LO QUE VALE EN LA LIGA; SU ÁNIMO SALE DE ESO, DEL RENDIMIENTO DEL EQUIPO, SU SUELDO Y SU PERSONALIDAD. SI LO TIENES POR DEBAJO DE LO QUE CREE MERECER, SE ENOJA Y PIDE MÁS (O SE NIEGA) AL RENOVAR. PASA EL MOUSE POR UNA FILA PARA VER POR QUÉ.</p></header>
    <DataState query={query}/>
    {rows.length > 0 && <div className="payroll-table-wrap"><table className="payroll-table roles-table">
      <thead><tr><th>JUGADOR</th><th>ROL</th><th>CREE MERECER</th><th>ÁNIMO</th><th>PERSONALIDAD</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.playerId} title={row.reasons.map(reason => `${reason.delta > 0 ? '+' : '−'}${Math.abs(reason.delta)} ${reason.text}`).join('\n')}>
        <td><span className="roles-player"><PlayerFace src={row.faceUrl} name={row.name}/><span><b>{row.name}</b> <small>{row.position}</small></span></span></td>
        <td>{canEdit ? <RoleSelect team={team} row={row} onDone={query.retry}/> : roleLabel(row.role)}</td>
        <td className={ROLES.findIndex(([key]) => key === row.role) > ROLES.findIndex(([key]) => key === row.expectedRole) ? 'role-under' : ''}>{roleLabel(row.expectedRole)}</td>
        <td><MoodMeter mood={row.mood} label={row.moodLabel}/></td>
        <td><small>{row.traits.map(trait => TRAIT_LABEL[trait] ?? trait).join(' · ')}</small></td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
