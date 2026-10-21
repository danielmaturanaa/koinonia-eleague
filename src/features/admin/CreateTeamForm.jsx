import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';

const EMPTY = { name: '', presidentName: '', imageUrl: '', stadium: '', kind: 'club' };

/** Alta de un club o una selección (solo admins; vive en la Sala de control). */
export function CreateTeamForm({ onChanged }) {
  const [form, setForm] = useState(EMPTY);
  const mutation = useApiMutation((body, signal) => endpoints.createTeam(body, signal), { onSuccess: () => { setForm(EMPTY); onChanged?.(); } });
  const submit = event => { event.preventDefault(); mutation.execute(Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))); };
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  return <form className="admin-form create-team-form" onSubmit={submit}><label>NOMBRE<input required name="name" value={form.name} onChange={change}/></label><label>PRESIDENTE<input name="presidentName" value={form.presidentName} onChange={change}/></label><label>ESTADIO<input name="stadium" maxLength="100" value={form.stadium} onChange={change}/></label><label>EMBLEMA URL<input type="url" name="imageUrl" value={form.imageUrl} onChange={change}/></label><label>TIPO<select name="kind" value={form.kind} onChange={change}><option value="club">CLUB</option><option value="national_team">SELECCIÓN</option></select></label><button className="action-button" disabled={mutation.loading}>{mutation.loading ? 'CREANDO...' : 'CREAR EQUIPO'}</button><FormFeedback mutation={mutation}/></form>;
}
