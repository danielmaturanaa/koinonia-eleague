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

const ROLE_HINT = { crucial: 'Juega todo', importante: 'Casi siempre', rotacion: 'A veces', esporadico: 'Poco' };
const rank = role => ROLES.findIndex(([key]) => key === role);
const signedReason = reason => `${reason.delta > 0 ? '+' : '−'}${Math.abs(reason.delta)} ${reason.text}`;

/** Tarjeta de un jugador: su ánimo y el rol, que el presi cambia con un toque (el que cree merecer va marcado con ★). */
function RoleCard({ team, row, canEdit, locked, onDone }) {
  const change = useApiMutation((body, signal) => endpoints.setPlayerRole(team.id, row.playerId, body, signal), { onSuccess: onDone });
  const under = rank(row.role) > rank(row.expectedRole);
  const tone = row.mood >= 58 ? 'good' : row.mood >= 42 ? 'mid' : 'bad';
  const top = [...(row.reasons ?? [])].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  return <article className={`role-card mood-${tone} ${under ? 'is-under' : ''}`} title={(row.reasons ?? []).map(signedReason).join('\n')}>
    <header>
      <PlayerFace src={row.faceUrl} name={row.name}/>
      <span><b>{row.name}</b><small>{[row.position, ...row.traits.map(trait => (TRAIT_LABEL[trait] ?? trait).toLowerCase())].filter(Boolean).join(' · ')}</small></span>
    </header>
    <div className="role-mood"><MoodMeter mood={row.mood} label={row.moodLabel}/></div>
    {top && <p className="role-reason">{signedReason(top)}</p>}
    {canEdit
      ? <div className="role-pills" role="radiogroup" aria-label={`Rol de ${row.name}`}>{ROLES.map(([key, label]) => <button type="button" key={key} role="radio" aria-checked={row.role === key}
        className={`${row.role === key ? 'on' : ''} ${row.expectedRole === key ? 'wanted' : ''}`} disabled={change.loading || locked || row.role === key}
        title={`${ROLE_HINT[key]}${row.expectedRole === key ? ' · el que cree merecer' : ''}`} onClick={() => change.execute({ role: key })}>
        {row.expectedRole === key && <i aria-hidden="true">★</i>}{label.charAt(0) + label.slice(1).toLowerCase()}
      </button>)}</div>
      : <p className="role-current">Rol: <b>{roleLabel(row.role).toLowerCase()}</b></p>}
    {under && <p className="role-warning">Cree merecer <b>{roleLabel(row.expectedRole).toLowerCase()}</b>: así se va a enojar.</p>}
    <FormFeedback mutation={change}/>
  </article>;
}

/** El presi asigna el rol de cada jugador (él es quien juega); el ánimo de cada uno depende de eso y de lo que cree merecer. */
export function RolesPanel({ team }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.teamRoles(team.id, signal), [team.id]);
  const marketOpen = useMarketOpen();
  const rows = Array.isArray(query.data) ? query.data : [];
  // Primero los que están por debajo de lo que creen merecer o con el ánimo bajo: son los que piden atención.
  const sorted = [...rows].sort((a, b) => (rank(b.role) > rank(b.expectedRole)) - (rank(a.role) > rank(a.expectedRole)) || a.mood - b.mood);
  const unhappy = rows.filter(row => row.mood < 42 || rank(row.role) > rank(row.expectedRole)).length;
  return <section className="roles-panel">
    <header><h3>ROLES Y ÁNIMO</h3><p>{rows.length ? (unhappy ? `${unhappy} jugador${unhappy === 1 ? '' : 'es'} necesita${unhappy === 1 ? '' : 'n'} atención; van primero.` : 'Todos contentos con su rol.') : ''} El rol lo eliges tú: la ★ marca el que cada uno cree merecer.</p>
      <HowItWorks><p>Cada jugador cree merecer un rol según lo que vale en la liga. Su ánimo sale de eso, del rendimiento del equipo, su sueldo y su personalidad. Si lo tienes por debajo de lo que cree merecer, pide más (o se niega) al renovar. Pasa el mouse por una tarjeta para ver todo lo que le mueve el ánimo.</p></HowItWorks></header>
    {canEdit && marketOpen && <p className="payroll-empty">🔒 Mercado abierto: los roles están bloqueados para no manipular los fichajes. Se pueden cambiar mientras se juega el torneo.</p>}
    <DataState query={query}/>
    {rows.length > 0 && <div className="role-grid">{sorted.map(row => <RoleCard key={row.playerId} team={team} row={row} canEdit={canEdit} locked={marketOpen} onDone={query.retry}/>)}</div>}
  </section>;
}
