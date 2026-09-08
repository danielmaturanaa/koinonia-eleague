import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';

export function TeamsPage({ teams, loading, onChoose, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', presidentName: '', imageUrl: '', kind: 'club' });
  const mutation = useApiMutation((body, signal) => endpoints.createTeam(body, signal), {
    onSuccess: () => { setForm({ name: '', presidentName: '', imageUrl: '', kind: 'club' }); onChanged?.(); },
  });
  const submit = event => { event.preventDefault(); mutation.execute(Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))); };
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  return <main className="newspaper teams-page"><section className={`team-list-paper ${showForm ? 'with-form' : ''}`}>
    <header className="team-page-header"><p>BASE DE DATOS DE LA LIGA</p><h1>SELECCIÓN DE EQUIPOS</h1><span>{teams.length} EQUIPOS REGISTRADOS</span><button className="admin-toggle" onClick={() => setShowForm(value => !value)}>{showForm ? 'CERRAR' : '+ CREAR EQUIPO'}</button></header>
    {showForm && <form className="admin-form create-team-form" onSubmit={submit}><label>NOMBRE<input required name="name" value={form.name} onChange={change}/></label><label>PRESIDENTE<input name="presidentName" value={form.presidentName} onChange={change}/></label><label>EMBLEMA URL<input type="url" name="imageUrl" value={form.imageUrl} onChange={change}/></label><label>TIPO<select name="kind" value={form.kind} onChange={change}><option value="club">CLUB</option><option value="national_team">SELECCIÓN</option></select></label><button className="action-button" disabled={mutation.loading}>{mutation.loading ? 'CREANDO...' : 'CREAR EQUIPO'}</button><FormFeedback mutation={mutation}/></form>}
    {loading ? <div className="arcade-state">CARGANDO EQUIPOS...</div> : <div className="team-grid">{teams.map(team =>
      <button className="team-choice" key={team.id} onClick={() => onChoose(team.id)}><TeamMark team={team}/><span><b>{team.name}</b><small>PRES. {team.president?.name ?? team.presidentName ?? 'SIN ASIGNAR'}</small><small>{team.playerCount ?? 0} JUGADORES · {team.currentDivision ?? 'LIGA ACTIVA'}</small></span><i>▶</i></button>)}</div>}
  </section></main>;
}
