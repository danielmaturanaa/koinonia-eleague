import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { MoodMeter, ROLES, moodTone, roleLabel } from './SigningSheet.jsx';
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

const ROLE_HINT = { crucial: 'Juega todo', importante: 'Casi siempre', rotacion: 'A veces', esporadico: 'Poco' };
const rank = role => ROLES.findIndex(([key]) => key === role);
const signedReason = reason => `${reason.delta > 0 ? '+' : '−'}${Math.abs(reason.delta)} ${reason.text}`;

/** Fila de un jugador: ánimo, rol (con un toque; ★ = el que cree merecer), lo que cree merecer y personalidad. */
function RoleRow({ team, row, canEdit, locked, onDone }) {
  const change = useApiMutation((body, signal) => endpoints.setPlayerRole(team.id, row.playerId, body, signal), { onSuccess: onDone });
  const under = rank(row.role) > rank(row.expectedRole);
  const top = [...(row.reasons ?? [])].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  return <tr className={`mood-${moodTone(row.mood)} ${under ? 'is-under' : ''}`} title={(row.reasons ?? []).map(signedReason).join('\n')}>
    <td><span className="roles-player"><PlayerFace src={row.faceUrl} name={row.name}/><span><b>{row.name}</b><small>{row.position}</small>
      {row.request && <em className={`role-request ${row.request.kind === 'leave' ? 'leave' : ''}`}>{row.request.kind === 'leave' ? 'PIDIÓ SALIR' : `PIDE ${row.request.kind === 'raise' ? 'SUELDO' : 'ROL'}${row.request.escalateAt ? ` · ${daysLeft(row.request.escalateAt)} D` : ''}`}</em>}</span></span></td>
    <td><MoodMeter mood={row.mood} label={row.moodLabel}/>{top && <small className="role-reason">{signedReason(top)}</small>}</td>
    <td>{canEdit
      ? <div className="role-pills" role="radiogroup" aria-label={`Rol de ${row.name}`}>{ROLES.map(([key, label]) => <button type="button" key={key} role="radio" aria-checked={row.role === key}
        className={`${row.role === key ? 'on' : ''} ${row.expectedRole === key ? 'wanted' : ''}`} disabled={change.loading || locked || row.role === key}
        title={`${ROLE_HINT[key]}${row.expectedRole === key ? ' · el que cree merecer' : ''}`} onClick={() => change.execute({ role: key })}>
        {row.expectedRole === key && <i aria-hidden="true">★</i>}{label.charAt(0) + label.slice(1).toLowerCase()}
      </button>)}</div>
      : <b className="role-now">{roleLabel(row.role).toLowerCase()}</b>}<FormFeedback mutation={change}/></td>
    <td className={under ? 'role-under' : ''}>{roleLabel(row.expectedRole).charAt(0) + roleLabel(row.expectedRole).slice(1).toLowerCase()}{under && <small>Le diste menos: se enoja.</small>}</td>
    <td><span className="role-traits">{row.traits.map(trait => <em key={trait}>{(TRAIT_LABEL[trait] ?? trait).toLowerCase()}</em>)}</span></td>
  </tr>;
}

// Urgencia: primero quien pidió salir, luego las peticiones abiertas por plazo (la que vence antes primero), después los que
// juegan por debajo de lo que creen merecer y, al final, por ánimo (el más bajo primero).
const deadline = row => (row.request?.kind === 'leave' ? -1 : row.request?.escalateAt ? Date.parse(row.request.escalateAt) : Infinity);
// Posición (por defecto): el orden de la alineación, del arquero hacia adelante, como en la cancha.
const SORTS = {
  posicion: (a, b) => (a.squadOrder ?? 99) - (b.squadOrder ?? 99) || (b.value ?? 0) - (a.value ?? 0),
  urgencia: (a, b) => deadline(a) - deadline(b) || (rank(b.role) > rank(b.expectedRole)) - (rank(a.role) > rank(a.expectedRole)) || a.mood - b.mood,
  animo: (a, b) => a.mood - b.mood,
  valor: (a, b) => (b.value ?? 0) - (a.value ?? 0),
  nombre: (a, b) => String(a.name).localeCompare(String(b.name), 'es'),
};
const SORT_LABELS = [['posicion', 'Posición'], ['urgencia', 'Urgencia'], ['animo', 'Ánimo'], ['valor', 'Valor'], ['nombre', 'Nombre']];
const daysLeft = value => Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / 86_400_000));

/** El presi asigna el rol de cada jugador (él es quien juega); el ánimo de cada uno depende de eso y de lo que cree merecer. */
export function RolesPanel({ team }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.teamRoles(team.id, signal), [team.id]);
  const marketOpen = useMarketOpen();
  const rows = Array.isArray(query.data) ? query.data : [];
  const [order, setOrder] = useState('posicion');
  // Titulares y suplentes por separado, cada grupo con el orden elegido.
  const groups = [['TITULARES', rows.filter(row => row.starter)], ['SUPLENTES', rows.filter(row => !row.starter)]]
    .map(([label, list]) => [label, [...list].sort(SORTS[order])]).filter(([, list]) => list.length);
  const unhappy = rows.filter(row => row.mood < 50 || rank(row.role) > rank(row.expectedRole)).length;
  return <section className="roles-panel">
    <header><h3>ROLES Y ÁNIMO</h3><p>{rows.length ? (unhappy ? `${unhappy} jugador${unhappy === 1 ? '' : 'es'} necesita${unhappy === 1 ? '' : 'n'} atención; con «Urgencia» van primero.` : 'Todos contentos con su rol.') : ''} El rol lo eliges tú: la ★ marca el que cada uno cree merecer.</p>
      <HowItWorks><p>Cada jugador cree merecer un rol según lo que vale en la liga. Su ánimo sale de eso, del rendimiento del equipo (los partidos de playoffs pesan el doble y pasar de ronda anima), su sueldo y su personalidad. Cada escalón que le subes o le bajas se nota. Si lo tienes por debajo de lo que cree merecer, pide más (o se niega) al renovar. Pasa el mouse por una fila para ver todo lo que le mueve el ánimo.</p><p>El rol solo cambia cuando tú lo cambias: mandar a alguien a la banca en la alineación no le cambia el rol. Al llegar un jugador nuevo recibe uno según lo que vale en tu plantel.</p></HowItWorks></header>
    {canEdit && marketOpen && <p className="payroll-empty">🔒 Mercado abierto: los roles están bloqueados para no manipular los fichajes. Se pueden cambiar mientras se juega el torneo; los que llegaron en este mercado sí se pueden ajustar ya.</p>}
    <DataState query={query}/>
    {rows.length > 0 && <div className="roles-sort" role="group" aria-label="Ordenar jugadores">ORDENAR POR {SORT_LABELS.map(([key, label]) => <button type="button" key={key} aria-pressed={order === key} className={order === key ? 'on' : ''} onClick={() => setOrder(key)}>{label}</button>)}</div>}
    {rows.length > 0 && <div className="roles-table-wrap"><table className="roles-table-new">
      <thead><tr><th>Jugador</th><th>Ánimo</th><th>Rol</th><th>Cree merecer</th><th>Personalidad</th></tr></thead>
      {groups.map(([label, list]) => <tbody key={label}>
        <tr className="roles-group"><th colSpan={5}>{label} <small>{list.length}</small></th></tr>
        {list.map(row => <RoleRow key={row.playerId} team={team} row={row} canEdit={canEdit} locked={row.roleLocked ?? marketOpen} onDone={query.retry}/>)}
      </tbody>)}
    </table></div>}
  </section>;
}
