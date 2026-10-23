import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { Button, Card, Chip, ConfirmStep, HowItWorks, Icon } from '../../ui/index.js';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();
const SIZE_TONE = { global: 'green', regional: 'yellow', local: 'default' };
const CUSTOM = '__otro';

/** Camiseta del club: su equipo base real y las marcas que trae (pecho, marca deportiva, manga, espalda, pantalón). Cada una paga por torneo. */
export function ClubKit({ team, onChanged }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.teamKit(team.id, signal), [team.id]);
  const [editing, setEditing] = useState(false);
  const kit = query.data;
  if (!kit) return <DataState query={query}/>;
  const done = () => { setEditing(false); query.retry(); onChanged?.(); };
  return <Card title="CAMISETA Y AUSPICIADORES" className="club-kit"
    aside={canEdit && !editing ? <button type="button" className="club-inline-edit" onClick={() => setEditing(true)}>✎ CAMBIAR</button> : <Chip icon="coin">{gp(kit.perTournament)} POR TORNEO</Chip>}>
    {editing ? <KitEditor team={team} kit={kit} onDone={done} onCancel={() => setEditing(false)}/> : <>
      <p className="club-kit-base"><Icon name="shirt" size={16}/> {kit.baseClub ? <>EQUIPO BASE: <b>{upper(kit.baseClub.name)}</b></> : 'TODAVÍA NO TIENE EQUIPO BASE'}</p>
      <ul className="club-kit-slots">{kit.slots.map(slot => <li key={slot.slot} className={slot.brand ? '' : 'is-empty'}>
        <small>{upper(slot.label)}</small>
        <b>{slot.brand ? upper(slot.brand) : '—'}</b>
        {slot.brand && <span><Chip tone={SIZE_TONE[slot.size]}>{upper(slot.sizeLabel)}</Chip> {gp(slot.perTournament)}</span>}
      </li>)}</ul>
      <HowItWorks><p>En el juego se usa la camiseta real del equipo base, con sus marcas. Cada marca le paga al club al terminar cada torneo de liga: el pecho es el que más paga, después la marca deportiva, la manga, la espalda y el pantalón. Una marca global paga más que una regional o local, y un club más grande cobra más.</p><p>Si cambias de equipo base, cambian todas las marcas. También puedes corregir una a mano; el tamaño de una marca nueva lo define la administración.</p></HowItWorks>
      {kit.paid > 0 && <p className="club-life-hint">Ya cobraste {gp(kit.paid)} de auspicios de camiseta.</p>}
    </>}
  </Card>;
}

function KitEditor({ team, kit, onDone, onCancel }) {
  const { isAdmin } = useAuth();
  const catalog = useApiQuery(signal => endpoints.baseClubs(signal), []);
  const [base, setBase] = useState(kit.baseClub?.key ?? (kit.baseClub ? CUSTOM : ''));
  const [customName, setCustomName] = useState(kit.baseClub && !kit.baseClub.key ? kit.baseClub.name : '');
  const [slots, setSlots] = useState(() => Object.fromEntries(kit.slots.map(slot => [slot.slot, { brand: slot.brand ?? '', size: slot.size ?? 'local' }])));
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { setConfirming(false); }, [base]);
  const mutation = useApiMutation((body, signal) => endpoints.setTeamKit(team.id, body, signal), { onSuccess: onDone });
  const baseChanged = base !== (kit.baseClub?.key ?? (kit.baseClub ? CUSTOM : '')) || (base === CUSTOM && customName.trim() !== (kit.baseClub?.name ?? ''));
  const chosen = catalog.data?.find(club => club.key === base);
  const save = () => {
    if (baseChanged) {
      mutation.execute(base === CUSTOM ? { baseClubName: customName.trim(), slots: Object.fromEntries(Object.entries(slots).map(([key, value]) => [key, value.brand.trim() ? value : null])) } : { baseClubKey: base });
      return;
    }
    mutation.execute({ slots: Object.fromEntries(Object.entries(slots).map(([key, value]) => [key, value.brand.trim() ? { brand: value.brand.trim(), ...(isAdmin ? { size: value.size } : {}) } : null])) });
  };
  return <div className="club-kit-editor">
    <label className="club-kit-field"><span>EQUIPO BASE</span>
      <select value={base} onChange={event => setBase(event.target.value)} disabled={!catalog.data}>
        {!kit.baseClub && <option value="">Elige un club…</option>}
        {(catalog.data ?? []).map(club => <option key={club.key} value={club.key}>{club.name}</option>)}
        <option value={CUSTOM}>Otro club (escribo las marcas)</option>
      </select>
    </label>
    {base === CUSTOM && <label className="club-kit-field"><span>NOMBRE DEL CLUB</span><input value={customName} maxLength={80} placeholder="Real Madrid" onChange={event => setCustomName(event.target.value)}/></label>}
    {baseChanged && chosen && <p className="club-life-hint">Con {chosen.name} la camiseta trae: {chosen.slots.map(slot => `${slot.label.toLowerCase()} ${slot.brand}`).join(' · ')}.</p>}
    {(!baseChanged || base === CUSTOM) && <div className="club-kit-rows">{kit.slots.map(slot => <div key={slot.slot} className="club-kit-row">
      <span>{upper(slot.label)}</span>
      <input value={slots[slot.slot].brand} maxLength={60} placeholder="Sin marca" aria-label={`Marca de ${slot.label}`}
        onChange={event => setSlots(current => ({ ...current, [slot.slot]: { ...current[slot.slot], brand: event.target.value } }))}/>
      {isAdmin && <select value={slots[slot.slot].size} aria-label={`Tamaño de la marca de ${slot.label}`} onChange={event => setSlots(current => ({ ...current, [slot.slot]: { ...current[slot.slot], size: event.target.value } }))}>
        <option value="global">Global</option><option value="regional">Regional</option><option value="local">Local</option>
      </select>}
    </div>)}</div>}
    {!isAdmin && (!baseChanged || base === CUSTOM) && <p className="club-life-hint">Una marca que no esté en el catálogo entra como local; la administración puede subirle el tamaño.</p>}
    <div className="club-nickname-actions">
      <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={mutation.loading}>Cancelar</Button>
      {baseChanged && !confirming
        ? <Button type="button" size="sm" disabled={mutation.loading || !base || (base === CUSTOM && !customName.trim())} onClick={() => setConfirming(true)}>Cambiar equipo base</Button>
        : !baseChanged && <Button type="button" size="sm" disabled={mutation.loading} onClick={save}>Guardar marcas</Button>}
    </div>
    {baseChanged && confirming && <ConfirmStep message="¿Cambiar de equipo base? Se reemplazan todas las marcas de la camiseta." confirmLabel="SÍ, CAMBIAR" busy={mutation.loading} onConfirm={save} onCancel={() => setConfirming(false)}/>}
    <FormFeedback mutation={mutation}/>
  </div>;
}
