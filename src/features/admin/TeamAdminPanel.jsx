import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { teamBalance, teamCoachName, teamCoachPhoto } from '../../utils/teamPresentation.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';

const numberOrUndefined = value => value === '' ? undefined : Number(value);

function MediaImageField({ label, entityType, entityId, onUploaded }) {
  const upload = useApiMutation((file, signal) => endpoints.uploadImage(file, { entityType, entityId }, signal), {
    onSuccess: response => onUploaded(response?.data?.secureUrl ?? response?.secureUrl ?? ''),
  });
  return <div className="media-image-field"><label>{label}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={upload.loading} onChange={event => { const file = event.target.files?.[0]; if (file) upload.execute(file); }}/></label><small>JPG, PNG, WEBP, GIF O AVIF · MÁXIMO 5 MB</small><FormFeedback mutation={upload}/></div>;
}

export function ProfileForm({ team, onChanged }) {
  const [form, setForm] = useState({ name: team.name ?? '', imageUrl: team.imageUrl ?? '' });
  useEffect(() => setForm({ name: team.name ?? '', imageUrl: team.imageUrl ?? '' }), [team]);
  const mutation = useApiMutation((body, signal) => endpoints.updateTeam(team.id, body, signal), { onSuccess: onChanged });
  const submit = event => { event.preventDefault(); mutation.execute(form); };
  return <form className="admin-form" onSubmit={submit}><label>NOMBRE<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))}/></label><MediaImageField label="SUBIR NUEVO EMBLEMA" entityType="team" entityId={team.id} onUploaded={imageUrl => setForm(current => ({ ...current, imageUrl }))}/><button className="action-button" disabled={mutation.loading}>GUARDAR PERFIL</button><FormFeedback mutation={mutation}/></form>;
}

export function PresidentForm({ team, onChanged }) {
  const president = team.president;
  const [form, setForm] = useState({ name: president?.name ?? team.presidentName ?? '', imageUrl: president?.imageUrl ?? '' });
  useEffect(() => setForm({ name: president?.name ?? team.presidentName ?? '', imageUrl: president?.imageUrl ?? '' }), [president?.id, president?.name, president?.imageUrl, team.presidentName]);
  const mutation = useApiMutation((body, signal) => endpoints.updatePresident(president.id, body, signal), { onSuccess: onChanged });
  if (!president?.id) return <p className="admin-empty">ESTE EQUIPO NO TIENE UN PRESIDENTE EDITABLE ASIGNADO.</p>;
  return <form className="admin-form" onSubmit={event => { event.preventDefault(); mutation.execute(form); }}><label>NOMBRE DEL PRESIDENTE<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))}/></label><MediaImageField label="SUBIR FOTO DEL PRESIDENTE" entityType="president" entityId={president.id} onUploaded={imageUrl => setForm(current => ({ ...current, imageUrl }))}/><button className="action-button" disabled={mutation.loading}>GUARDAR PRESIDENTE</button><FormFeedback mutation={mutation}/></form>;
}

export function CoachForm({ team, onChanged }) {
  const coachId = team.coach?.id ?? team.manager?.id ?? team.coachId ?? team.managerId;
  const presentedName = teamCoachName(team);
  const presentedPhoto = teamCoachPhoto(team);
  const [form, setForm] = useState({
    name: presentedName === 'No informado' ? '' : presentedName,
    imageUrl: presentedPhoto,
  });
  useEffect(() => setForm({
    name: presentedName === 'No informado' ? '' : presentedName,
    imageUrl: presentedPhoto,
  }), [coachId, presentedName, presentedPhoto]);
  const mutation = useApiMutation((body, signal) => coachId
    ? endpoints.updateCoach(coachId, body, signal)
    : endpoints.createCoach({ ...body, teamId: team.id }, signal), { onSuccess: onChanged });
  return <form className="admin-form" onSubmit={event => { event.preventDefault(); mutation.execute({ name: form.name.trim(), imageUrl: form.imageUrl }); }}><label>NOMBRE DEL DT<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="DIRECTOR TÉCNICO"/></label><MediaImageField label="SUBIR FOTO DEL DT" entityType="coach" entityId={coachId} onUploaded={imageUrl => setForm(current => ({ ...current, imageUrl }))}/><button className="action-button" disabled={!form.name.trim() || mutation.loading}>GUARDAR DT</button><FormFeedback mutation={mutation}/></form>;
}

function TeamProfileEditor({ team, onChanged }) {
  return <div className="team-profile-editor"><section><h2>PERFIL DEL CLUB</h2><ProfileForm team={team} onChanged={onChanged}/></section><section><h2>PRESIDENTE</h2><PresidentForm team={team} onChanged={onChanged}/></section><section><h2>DIRECTOR TÉCNICO</h2><CoachForm team={team} onChanged={onChanged}/></section><section><h2>PRESUPUESTO</h2><BudgetForm team={team} onChanged={onChanged}/></section></div>;
}

export function BudgetForm({ team, onChanged }) {
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

export function SquadEditor({ team, squad, onChanged }) {
  const [ordered, setOrdered] = useState([]);
  const [draggedId, setDraggedId] = useState('');
  useEffect(() => setOrdered([...squad].sort((a, b) => (a.squadOrder ?? 999) - (b.squadOrder ?? 999)).map(player => ({ ...player }))), [squad]);
  const mutation = useApiMutation(async (players, signal) => {
    await endpoints.updateSquadOrder(team.id, players.map((player, index) => ({ playerId: player.id, squadOrder: index + 1 })), signal);
    await Promise.all(players.map((player, index) => endpoints.updateSquadMember(team.id, player.id, {
      jerseyNumber: numberOrUndefined(player.jerseyNumber),
      isStarter: index < 11,
    }, signal)));
  }, { onSuccess: onChanged });
  const dropAt = (event, targetIndex) => {
    event.preventDefault();
    event.stopPropagation();
    const playerId = event.dataTransfer.getData('text/plain') || draggedId;
    setOrdered(current => {
      const sourceIndex = current.findIndex(player => player.id === playerId);
      if (sourceIndex < 0) return current;
      const next = [...current];
      if (targetIndex < next.length) [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
      else next.push(...next.splice(sourceIndex, 1));
      return next;
    });
    setDraggedId('');
  };
  const startDrag = (event, playerId) => {
    setDraggedId(playerId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', playerId);
  };
  const updateJersey = (playerId, jerseyNumber) => setOrdered(current => current.map(player => player.id === playerId ? { ...player, jerseyNumber } : player));
  const listHeader = <div className="squad-list-header"><b>N.º</b><small>POS.</small><span>NOMBRE</span><em>DORSAL</em></div>;
  const playerRow = (player, index) => <div className="squad-drag-row" key={player.id} onDragOver={event => event.preventDefault()} onDrop={event => dropAt(event, index)}>
    <button type="button" className="squad-slot-number" draggable onDragStart={event => startDrag(event, player.id)} onDragEnd={() => setDraggedId('')} aria-label={`Mover a ${player.name}`} title="Arrastrar jugador">{index + 1}</button>
    <small>{player.position ?? '—'}</small><strong>{player.name}</strong>
    <label><span>DORSAL</span><input aria-label={`Dorsal de ${player.name}`} type="number" min="1" max="99" value={player.jerseyNumber ?? ''} onChange={event => updateJersey(player.id, event.target.value)}/></label>
  </div>;
  if (!squad.length) return <p className="admin-empty">NO HAY JUGADORES ASIGNADOS A ESTE EQUIPO.</p>;
  return <div className="squad-board"><p className="squad-help">ARRASTRA DESDE EL NÚMERO DE UN JUGADOR Y SUÉLTALO SOBRE OTRO PARA INTERCAMBIARLOS. LOS PUESTOS 1 A 11 SON TITULARES.</p><div className="squad-board-columns"><section><h3>TITULARES <small>11 PUESTOS</small></h3>{listHeader}{Array.from({ length: 11 }, (_, index) => ordered[index] ? playerRow(ordered[index], index) : <div className="squad-empty-slot" key={index} onDragOver={event => event.preventDefault()} onDrop={event => dropAt(event, index)}><b>{index + 1}</b><span>ARRASTRA UN JUGADOR AQUÍ</span></div>)}</section><section className="substitutes-drop-zone" onDragOver={event => event.preventDefault()} onDrop={event => dropAt(event, ordered.length)}><h3>SUPLENTES <small>{Math.max(ordered.length - 11, 0)}</small></h3>{listHeader}{ordered.slice(11).map((player, offset) => playerRow(player, offset + 11))}{ordered.length <= 11 && <div className="squad-empty-slot"><span>ARRASTRA AQUÍ PARA MOVER A SUPLENTES</span></div>}</section></div><button className="action-button squad-save-button" disabled={!ordered.length || mutation.loading} onClick={() => mutation.execute(ordered)}>GUARDAR PLANTEL COMPLETO</button><FormFeedback mutation={mutation}/></div>;
}

export function TeamAdminPanel({ team, squad, onChanged }) {
  const [tab, setTab] = useState('profile');
  const tabs = [['profile','PERFIL'],['squad','PLANTEL']];
  return <section className="team-admin"><header><p>GESTIÓN PÚBLICA DEL EQUIPO</p><nav>{tabs.map(([value, label]) => <button className={tab === value ? 'active' : ''} onClick={() => setTab(value)} key={value}>{label}</button>)}</nav></header>{tab === 'profile' && <TeamProfileEditor team={team} onChanged={onChanged}/>} {tab === 'squad' && <SquadEditor team={team} squad={squad} onChanged={onChanged}/>}</section>;
}
