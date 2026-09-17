import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { defaultFormationPositions } from '../../utils/formationPositions.js';
import { teamBalance, teamCoachName, teamCoachPhoto } from '../../utils/teamPresentation.js';
import { readPersonProfile, savePersonProfile } from '../../utils/personProfile.js';
import { fallbackKitColors } from '../news/newsSceneRenderer.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';

const numberOrUndefined = value => value === '' ? undefined : Number(value);

function MediaImageField({ label, entityType, entityId, onUploaded }) {
  const upload = useApiMutation((file, signal) => endpoints.uploadImage(file, { entityType, entityId }, signal), {
    onSuccess: response => onUploaded(response?.data?.secureUrl ?? response?.secureUrl ?? ''),
  });
  return <div className="media-image-field"><label>{label}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={upload.loading} onChange={event => { const file = event.target.files?.[0]; if (file) upload.execute(file); }}/></label><small>JPG, PNG, WEBP, GIF O AVIF · MÁXIMO 5 MB</small><FormFeedback mutation={upload}/></div>;
}

function ColorPickerField({ label, value, onChange }) {
  const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  const pickFromScreen = async () => {
    try {
      const result = await new window.EyeDropper().open();
      if (result?.sRGBHex) onChange(result.sRGBHex.toUpperCase());
    } catch {
      // usuario canceló la pipeta
    }
  };
  return <label className="color-picker-field">
    {label}
    <span className="color-picker-controls">
      <input type="color" value={value} onChange={event => onChange(event.target.value.toUpperCase())}/>
      <input type="text" value={value} maxLength={7} onChange={event => onChange(event.target.value.toUpperCase())}/>
      {supportsEyeDropper && <button type="button" className="color-eyedropper-button" onClick={pickFromScreen} aria-label={`Elegir ${label.toLowerCase()} con pipeta`} title="Elegir color con pipeta">💧</button>}
    </span>
  </label>;
}

export function ProfileForm({ team, onChanged, onSaved }) {
  const buildForm = source => ({
    name: source.name ?? '',
    imageUrl: source.imageUrl ?? '',
    colors: {
      primary: source.colors?.primary ?? fallbackKitColors.team.shirt,
      secondary: source.colors?.secondary ?? fallbackKitColors.team.shorts,
      tertiary: source.colors?.tertiary ?? fallbackKitColors.team.socks,
    },
  });
  const [form, setForm] = useState(() => buildForm(team));
  useEffect(() => setForm(buildForm(team)), [team]);
  const mutation = useApiMutation((body, signal) => endpoints.updateTeam(team.id, body, signal), { onSuccess: result => { onChanged?.(result); onSaved?.(); } });
  const submit = event => { event.preventDefault(); mutation.execute(form); };
  const setColor = (key, color) => setForm(current => ({ ...current, colors: { ...current.colors, [key]: color } }));
  return <form className="admin-form" onSubmit={submit}>
    <label>NOMBRE<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))}/></label>
    <MediaImageField label="SUBIR NUEVO EMBLEMA" entityType="team" entityId={team.id} onUploaded={imageUrl => setForm(current => ({ ...current, imageUrl }))}/>
    {form.imageUrl && <div className="color-pick-preview">
      <img src={form.imageUrl} alt="Escudo del club, para usar con la pipeta"/>
      <small>USA LA PIPETA SOBRE ESTE ESCUDO — AQUÍ SE VE A COLOR REAL, SIN EL FONDO OSCURO DEL MODAL</small>
    </div>}
    <ColorPickerField label="COLOR PRIMARIO" value={form.colors.primary} onChange={color => setColor('primary', color)}/>
    <ColorPickerField label="COLOR SECUNDARIO" value={form.colors.secondary} onChange={color => setColor('secondary', color)}/>
    <ColorPickerField label="COLOR TERCIARIO" value={form.colors.tertiary} onChange={color => setColor('tertiary', color)}/>
    <button className="action-button" disabled={mutation.loading}>GUARDAR PERFIL</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function CustomFieldsEditor({ fields, onChange }) {
  const update = (index, key, value) => onChange(fields.map((field, current) => current === index ? { ...field, [key]: value } : field));
  return <fieldset className="custom-fields-editor"><legend>CAMPOS PERSONALIZADOS</legend>{fields.map((field, index) => <div className="custom-field-row" key={field.key || index}><input value={field.label} onChange={event => update(index, 'label', event.target.value)} placeholder="Etiqueta (ej: Apodo)"/><input value={field.value} onChange={event => update(index, 'value', event.target.value)} placeholder="Valor"/><button type="button" onClick={() => onChange(fields.filter((_, current) => current !== index))} aria-label="Quitar campo">×</button></div>)}<button type="button" className="action-button" onClick={() => onChange([...fields, { key: '', label: '', value: '' }])}>+ AGREGAR CAMPO</button></fieldset>;
}

export function PresidentForm({ team, onChanged, onSaved }) {
  const president = team.president;
  const metadata = readPersonProfile('president', president);
  const [form, setForm] = useState({ name: president?.name ?? team.presidentName ?? '', imageUrl: president?.imageUrl ?? '', age: metadata.age, country: metadata.country, customFields: president?.customFields ?? [] });
  useEffect(() => {
    const nextMetadata = readPersonProfile('president', president);
    setForm({ name: president?.name ?? team.presidentName ?? '', imageUrl: president?.imageUrl ?? '', age: nextMetadata.age, country: nextMetadata.country, customFields: president?.customFields ?? [] });
  }, [president?.id, president?.name, president?.imageUrl, team.presidentName]);
  const mutation = useApiMutation((body, signal) => endpoints.updatePresident(president.id, body, signal), { onSuccess: result => {
    savePersonProfile('president', president.id, form);
    onChanged?.(result);
    onSaved?.();
  } });
  if (!president?.id) return <p className="admin-empty">ESTE EQUIPO NO TIENE UN PRESIDENTE EDITABLE ASIGNADO.</p>;
  return <form className="admin-form person-editor-form" onSubmit={event => { event.preventDefault(); mutation.execute({ name: form.name, imageUrl: form.imageUrl, age: form.age === '' ? null : Number(form.age), nationality: form.country, customFields: form.customFields }); }}><label>NOMBRE DEL PRESIDENTE<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))}/></label><label>EDAD<input type="number" min="1" max="120" value={form.age} onChange={event => setForm(current => ({ ...current, age: event.target.value }))}/></label><label>PAÍS<input value={form.country} onChange={event => setForm(current => ({ ...current, country: event.target.value }))} placeholder="PAÍS"/></label><CustomFieldsEditor fields={form.customFields} onChange={customFields => setForm(current => ({ ...current, customFields }))}/><MediaImageField label="SUBIR FOTO DEL PRESIDENTE" entityType="president" entityId={president.id} onUploaded={imageUrl => setForm(current => ({ ...current, imageUrl }))}/><button className="action-button" disabled={mutation.loading}>GUARDAR PRESIDENTE</button><FormFeedback mutation={mutation}/></form>;
}

export function CoachForm({ team, onChanged, onSaved }) {
  const coachId = team.coach?.id ?? team.manager?.id ?? team.coachId ?? team.managerId;
  const coach = team.coach ?? team.manager ?? (coachId ? { id: coachId } : null);
  const presentedName = teamCoachName(team);
  const presentedPhoto = teamCoachPhoto(team);
  const metadata = readPersonProfile('coach', coach);
  const [form, setForm] = useState({
    name: presentedName === 'No informado' ? '' : presentedName,
    imageUrl: presentedPhoto,
    age: metadata.age,
    country: metadata.country, customFields: coach?.customFields ?? [],
  });
  useEffect(() => {
    const nextMetadata = readPersonProfile('coach', coach);
    setForm({
      name: presentedName === 'No informado' ? '' : presentedName,
      imageUrl: presentedPhoto,
      age: nextMetadata.age,
      country: nextMetadata.country, customFields: coach?.customFields ?? [],
    });
  }, [coachId, presentedName, presentedPhoto]);
  const mutation = useApiMutation((body, signal) => coachId
    ? endpoints.updateCoach(coachId, body, signal)
    : endpoints.createCoach({ ...body, teamId: team.id }, signal), { onSuccess: result => {
      savePersonProfile('coach', coachId ?? result?.data?.id ?? result?.id, form);
      onChanged?.(result);
      onSaved?.();
    } });
  return <form className="admin-form person-editor-form" onSubmit={event => { event.preventDefault(); mutation.execute({ name: form.name.trim(), imageUrl: form.imageUrl, age: form.age === '' ? null : Number(form.age), nationality: form.country, customFields: form.customFields }); }}><label>NOMBRE DEL DT<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="DIRECTOR TÉCNICO"/></label><label>EDAD<input type="number" min="1" max="120" value={form.age} onChange={event => setForm(current => ({ ...current, age: event.target.value }))}/></label><label>PAÍS<input value={form.country} onChange={event => setForm(current => ({ ...current, country: event.target.value }))} placeholder="PAÍS"/></label><CustomFieldsEditor fields={form.customFields} onChange={customFields => setForm(current => ({ ...current, customFields }))}/><MediaImageField label="SUBIR FOTO DEL DT" entityType="coach" entityId={coachId} onUploaded={imageUrl => setForm(current => ({ ...current, imageUrl }))}/><button className="action-button" disabled={!form.name.trim() || mutation.loading}>GUARDAR DT</button><FormFeedback mutation={mutation}/></form>;
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

const FLAG_REGEX = /^(\p{Regional_Indicator}{2})\s*/u;
function splitPlayerName(name) {
  const match = name?.match(FLAG_REGEX);
  const flag = match ? match[1] : '';
  const rest = (match ? name.slice(match[0].length) : (name ?? '')).trim();
  return { flag, name: rest };
}

const isStarterPlayer = player => typeof player?.isStarter === 'boolean' ? player.isStarter : player?.section === 'starters';

function FormationMarker({ player, x, y, selected, onSelect, onDrag, onDragEnd }) {
  const ref = useRef(null);
  const start = useRef(null);
  const moved = useRef(false);
  const handleDown = event => {
    start.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    ref.current?.setPointerCapture(event.pointerId);
  };
  const handleMove = event => {
    if (!start.current) return;
    const pitch = ref.current?.closest('.formation-pitch');
    if (!pitch) return;
    if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 5) moved.current = true;
    if (!moved.current) return;
    const rect = pitch.getBoundingClientRect();
    const px = Math.min(97, Math.max(3, ((event.clientX - rect.left) / rect.width) * 100));
    const py = Math.min(96, Math.max(4, ((event.clientY - rect.top) / rect.height) * 100));
    onDrag(player.id, px, py);
  };
  const handleUp = () => {
    if (moved.current) onDragEnd(player.id);
    else onSelect(player.id);
    start.current = null;
    moved.current = false;
  };
  const { flag, name } = splitPlayerName(player.name);
  return <button type="button" ref={element => { ref.current = element; }} className={`formation-marker${selected ? ' selected' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}
    onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={handleUp} aria-label={`${selected ? 'Deseleccionar' : 'Seleccionar o arrastrar a'} ${name}`}>
    <span className="club-pitch-number">{player.jerseyNumber ?? '–'}{flag && <i className="club-pitch-flag">{flag}</i>}</span>
    <span className="club-pitch-name">{name}</span>
  </button>;
}

export function FormationEditor({ team, squad, onChanged }) {
  const starters = squad.filter(isStarterPlayer);
  const substitutes = squad.filter(player => !isStarterPlayer(player));
  const [selected, setSelected] = useState(null);
  const [localPositions, setLocalPositions] = useState({});
  useEffect(() => setLocalPositions({}), [squad]);
  const defaults = defaultFormationPositions(starters);
  const positionOf = player => localPositions[player.id]
    ?? (player.pitchX != null && player.pitchY != null ? { x: player.pitchX, y: player.pitchY } : defaults[player.id])
    ?? { x: 50, y: 50 };

  const saveMutation = useApiMutation((body, signal) => endpoints.updateSquadMember(team.id, body.playerId, { pitchX: body.x, pitchY: body.y }, signal), { onSuccess: onChanged });
  const swapMutation = useApiMutation((substituteId, signal) => endpoints.swapSquadMembers(team.id, selected, substituteId, signal), { onSuccess: () => { setSelected(null); onChanged(); } });

  const handleDrag = (playerId, x, y) => setLocalPositions(current => ({ ...current, [playerId]: { x, y } }));
  const handleDragEnd = playerId => {
    const position = localPositions[playerId];
    if (position) saveMutation.execute({ playerId, x: position.x, y: position.y });
  };
  const handleSelect = playerId => setSelected(current => current === playerId ? null : playerId);
  const handleSwap = substituteId => { if (selected) swapMutation.execute(substituteId); };

  if (!starters.length) return <p className="admin-empty">NO HAY TITULARES DEFINIDOS.</p>;

  return <div className="formation-editor">
    <p className="squad-help">ARRASTRA A UN TITULAR PARA UBICARLO EN LA CANCHA. TÓCALO PARA SELECCIONARLO Y LUEGO TOCA UN SUPLENTE PARA QUE ENTRE EN SU LUGAR.</p>
    <div className="formation-pitch club-pitch">
      {starters.map(player => { const { x, y } = positionOf(player); return <FormationMarker key={player.id} player={player} x={x} y={y} selected={selected === player.id} onSelect={handleSelect} onDrag={handleDrag} onDragEnd={handleDragEnd}/>; })}
    </div>
    <div className="formation-bench">
      <h3>BANCA <small>{substitutes.length}</small></h3>
      {substitutes.length ? <div className="formation-bench-list">{substitutes.map(player => { const { name } = splitPlayerName(player.name); return <button type="button" key={player.id} className="formation-bench-player" disabled={!selected || swapMutation.loading} onClick={() => handleSwap(player.id)}><b>{player.jerseyNumber ?? '–'}</b><span>{name}</span><small>{player.position ?? '—'}</small></button>; })}</div> : <p className="empty-copy">SIN SUPLENTES.</p>}
    </div>
    <FormFeedback mutation={selected ? swapMutation : saveMutation}/>
  </div>;
}

export function TeamAdminPanel({ team, squad, onChanged }) {
  const [tab, setTab] = useState('profile');
  const tabs = [['profile','PERFIL'],['squad','PLANTEL']];
  return <section className="team-admin"><header><p>GESTIÓN PÚBLICA DEL EQUIPO</p><nav>{tabs.map(([value, label]) => <button className={tab === value ? 'active' : ''} onClick={() => setTab(value)} key={value}>{label}</button>)}</nav></header>{tab === 'profile' && <TeamProfileEditor team={team} onChanged={onChanged}/>} {tab === 'squad' && <SquadEditor team={team} squad={squad} onChanged={onChanged}/>}</section>;
}
