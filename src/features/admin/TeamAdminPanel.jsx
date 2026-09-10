import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { teamBalance, teamCoachName } from '../../utils/teamPresentation.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';

const numberOrUndefined = value => value === '' ? undefined : Number(value);

function MediaImageField({ label, entityType, entityId, onUploaded }) {
  const upload = useApiMutation((file, signal) => endpoints.uploadImage(file, { entityType, entityId }, signal), {
    onSuccess: response => onUploaded(response?.data?.secureUrl ?? response?.secureUrl ?? ''),
  });
  return <div className="media-image-field"><label>{label}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={upload.loading} onChange={event => { const file = event.target.files?.[0]; if (file) upload.execute(file); }}/></label><small>JPG, PNG, WEBP, GIF O AVIF · MÁXIMO 5 MB</small><FormFeedback mutation={upload}/></div>;
}

function ProfileForm({ team, onChanged }) {
  const [form, setForm] = useState({ name: team.name ?? '', imageUrl: team.imageUrl ?? '' });
  useEffect(() => setForm({ name: team.name ?? '', imageUrl: team.imageUrl ?? '' }), [team]);
  const mutation = useApiMutation((body, signal) => endpoints.updateTeam(team.id, body, signal), { onSuccess: onChanged });
  const submit = event => { event.preventDefault(); mutation.execute(form); };
  return <form className="admin-form" onSubmit={submit}><label>NOMBRE<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))}/></label><label>URL DEL EMBLEMA<input type="url" value={form.imageUrl} onChange={event => setForm(current => ({ ...current, imageUrl: event.target.value }))}/></label><MediaImageField label="SUBIR NUEVO EMBLEMA" entityType="team" entityId={team.id} onUploaded={imageUrl => setForm(current => ({ ...current, imageUrl }))}/><button className="action-button" disabled={mutation.loading}>GUARDAR PERFIL</button><FormFeedback mutation={mutation}/></form>;
}

function PresidentForm({ team, onChanged }) {
  const president = team.president;
  const [form, setForm] = useState({ name: president?.name ?? team.presidentName ?? '', imageUrl: president?.imageUrl ?? '' });
  useEffect(() => setForm({ name: president?.name ?? team.presidentName ?? '', imageUrl: president?.imageUrl ?? '' }), [president?.id, president?.name, president?.imageUrl, team.presidentName]);
  const mutation = useApiMutation((body, signal) => endpoints.updatePresident(president.id, body, signal), { onSuccess: onChanged });
  if (!president?.id) return <p className="admin-empty">ESTE EQUIPO NO TIENE UN PRESIDENTE EDITABLE ASIGNADO.</p>;
  return <form className="admin-form" onSubmit={event => { event.preventDefault(); mutation.execute(form); }}><label>NOMBRE DEL PRESIDENTE<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))}/></label><label>URL DE LA FOTO<input type="url" value={form.imageUrl} onChange={event => setForm(current => ({ ...current, imageUrl: event.target.value }))}/></label><MediaImageField label="SUBIR FOTO DEL PRESIDENTE" entityType="president" entityId={president.id} onUploaded={imageUrl => setForm(current => ({ ...current, imageUrl }))}/><button className="action-button" disabled={mutation.loading}>GUARDAR PRESIDENTE</button><FormFeedback mutation={mutation}/></form>;
}

function CoachForm({ team, onChanged }) {
  const coachId = team.coach?.id ?? team.manager?.id ?? team.coachId ?? team.managerId;
  const presentedName = teamCoachName(team);
  const [name, setName] = useState(presentedName === 'No informado' ? '' : presentedName);
  useEffect(() => setName(presentedName === 'No informado' ? '' : presentedName), [coachId, presentedName]);
  const mutation = useApiMutation((body, signal) => coachId
    ? endpoints.updateCoach(coachId, body, signal)
    : endpoints.createCoach({ ...body, teamId: team.id }, signal), { onSuccess: onChanged });
  return <form className="admin-form" onSubmit={event => { event.preventDefault(); mutation.execute({ name: name.trim() }); }}><label>NOMBRE DEL DT<input required value={name} onChange={event => setName(event.target.value)} placeholder="DIRECTOR TÉCNICO"/></label><button className="action-button" disabled={!name.trim() || mutation.loading}>{coachId ? 'GUARDAR DT' : 'CREAR DT'}</button><FormFeedback mutation={mutation}/></form>;
}

function BudgetForm({ team, onChanged }) {
  const balance = teamBalance(team) ?? 0;
  const [form, setForm] = useState({ amount: '', reason: '' });
  const credit = useApiMutation((body, signal) => endpoints.creditTeam(team.id, body, signal), { onSuccess: onChanged });
  const debit = useApiMutation((body, signal) => endpoints.debitTeam(team.id, body, signal), { onSuccess: onChanged });
  const payload = () => ({ amount: Number(form.amount), reason: form.reason });
  const submitCredit = () => credit.execute(payload());
  const submitDebit = () => {
    if (window.confirm(`¿DEBITAR ${form.amount} GP DE ${team.name}?`)) debit.execute(payload());
  };
  return <div className="admin-form"><p className="balance-label">SALDO INFORMADO <b>{balance.toLocaleString('es-CL')} GP</b></p><label>MONTO<input min="1" step="1" type="number" required value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))}/></label><label>MOTIVO<input value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))}/></label><div className="button-row"><button type="button" className="action-button positive" disabled={!form.amount || credit.loading || debit.loading} onClick={submitCredit}>ACREDITAR</button><button type="button" className="action-button danger" disabled={!form.amount || !form.reason || credit.loading || debit.loading} onClick={submitDebit}>DEBITAR</button></div><FormFeedback mutation={credit.error || credit.success ? credit : debit}/></div>;
}

function MemberEditor({ teamId, player, onChanged }) {
  const [form, setForm] = useState({ jerseyNumber: player.jerseyNumber ?? '', squadOrder: player.squadOrder ?? '', isStarter: Boolean(player.isStarter ?? player.section === 'starters') });
  const mutation = useApiMutation((body, signal) => endpoints.updateSquadMember(teamId, player.id, body, signal), { onSuccess: onChanged });
  const submit = event => { event.preventDefault(); mutation.execute({ jerseyNumber: numberOrUndefined(form.jerseyNumber), squadOrder: numberOrUndefined(form.squadOrder), isStarter: form.isStarter }); };
  return <form className="member-editor" onSubmit={submit}><b>{player.name}</b><label>DORSAL<input aria-label={`Dorsal de ${player.name}`} type="number" min="1" max="99" value={form.jerseyNumber} onChange={event => setForm(current => ({ ...current, jerseyNumber: event.target.value }))}/></label><label>ORDEN<input aria-label={`Orden de ${player.name}`} type="number" min="1" value={form.squadOrder} onChange={event => setForm(current => ({ ...current, squadOrder: event.target.value }))}/></label><label className="check-label"><input type="checkbox" checked={form.isStarter} onChange={event => setForm(current => ({ ...current, isStarter: event.target.checked }))}/> TITULAR</label><button disabled={mutation.loading}>GUARDAR</button><FormFeedback mutation={mutation}/></form>;
}

function SquadEditor({ team, squad, onChanged }) {
  if (!squad.length) return <p className="admin-empty">NO HAY JUGADORES ASIGNADOS A ESTE EQUIPO.</p>;
  return <div className="member-editor-list">{squad.map(player => <MemberEditor teamId={team.id} player={player} onChanged={onChanged} key={player.id}/>)}</div>;
}

function OrderEditor({ team, squad, onChanged }) {
  const [ordered, setOrdered] = useState([]);
  useEffect(() => setOrdered([...squad].sort((a, b) => (a.squadOrder ?? 999) - (b.squadOrder ?? 999))), [squad]);
  const mutation = useApiMutation((assignments, signal) => endpoints.updateSquadOrder(team.id, assignments, signal), { onSuccess: onChanged });
  const move = (index, delta) => setOrdered(current => {
    const next = [...current];
    const target = index + delta;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  return <div className="order-editor">{ordered.map((player, index) => <div key={player.id}><b>{index + 1}</b><span>{player.name}</span><button onClick={() => move(index, -1)} disabled={index === 0}>▲</button><button onClick={() => move(index, 1)} disabled={index === ordered.length - 1}>▼</button></div>)}<button className="action-button" disabled={!ordered.length || mutation.loading} onClick={() => mutation.execute(ordered.map((player, index) => ({ playerId: player.id, squadOrder: index + 1 })))}>GUARDAR ORDEN COMPLETO</button><FormFeedback mutation={mutation}/></div>;
}

export function TeamAdminPanel({ team, squad, onChanged }) {
  const [tab, setTab] = useState('profile');
  const tabs = [['profile','PERFIL'],['president','PRESIDENTE'],['coach','DT'],['budget','PRESUPUESTO'],['squad','PLANTEL'],['order','ORDEN']];
  return <section className="team-admin"><header><p>GESTIÓN PÚBLICA DEL EQUIPO</p><nav>{tabs.map(([value, label]) => <button className={tab === value ? 'active' : ''} onClick={() => setTab(value)} key={value}>{label}</button>)}</nav></header>{tab === 'profile' && <ProfileForm team={team} onChanged={onChanged}/>} {tab === 'president' && <PresidentForm team={team} onChanged={onChanged}/>} {tab === 'coach' && <CoachForm team={team} onChanged={onChanged}/>} {tab === 'budget' && <BudgetForm team={team} onChanged={onChanged}/>} {tab === 'squad' && <SquadEditor team={team} squad={squad} onChanged={onChanged}/>} {tab === 'order' && <OrderEditor team={team} squad={squad} onChanged={onChanged}/>}</section>;
}
