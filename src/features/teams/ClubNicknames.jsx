import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { Button, Card } from '../../ui/index.js';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';

const ARTICLES = ['el', 'la', 'los', 'las'];
const MAX_NICKNAMES = 8;
const capitalize = text => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** "la Vecchia Signora" → "La Vecchia Signora", para mostrarlo solo (títulos, tarjetas). */
export const nicknameTitle = label => (label ? capitalize(label) : '');

/** Apodos del club en la pestaña Historia. El presi los edita; el principal va primero y destacado. */
export function ClubNicknames({ team, canEdit, onChanged }) {
  const nicknames = team.nicknames ?? [];
  const [editing, setEditing] = useState(false);
  return <Card title="APODOS" className="club-nicknames" aside={canEdit && !editing ? <button type="button" className="club-inline-edit" onClick={() => setEditing(true)}>✎ EDITAR</button> : null}>
    {editing
      ? <NicknamesEditor team={team} onDone={() => setEditing(false)} onChanged={onChanged}/>
      : nicknames.length
        ? <ul className="club-nickname-list">{nicknames.map(item => <li key={item.id} className={item.primary ? 'is-primary' : ''}>{capitalize(item.label)}{item.primary && <small>PRINCIPAL</small>}</li>)}</ul>
        : <p className="empty-copy">{canEdit ? 'Todavía no tiene apodos. Agrega cómo le dicen al club: las noticias los van a usar.' : 'Este club todavía no tiene apodos.'}</p>}
  </Card>;
}

function NicknamesEditor({ team, onDone, onChanged }) {
  const fromTeam = () => (team.nicknames ?? []).map(item => ({ article: item.article, name: item.name, primary: item.primary }));
  const [rows, setRows] = useState(() => (fromTeam().length ? fromTeam() : [{ article: 'los', name: '', primary: true }]));
  useEffect(() => { setRows(fromTeam().length ? fromTeam() : [{ article: 'los', name: '', primary: true }]); }, [team.id]);
  const mutation = useApiMutation((nicknames, signal) => endpoints.setTeamNicknames(team.id, nicknames, signal), { onSuccess: () => { onChanged?.(); onDone(); } });
  const update = (index, patch) => setRows(current => current.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  const makePrimary = index => setRows(current => current.map((row, position) => ({ ...row, primary: position === index })));
  const remove = index => setRows(current => {
    const next = current.filter((_, position) => position !== index);
    return next.length && !next.some(row => row.primary) ? next.map((row, position) => ({ ...row, primary: position === 0 })) : next;
  });
  const add = () => setRows(current => [...current, { article: 'los', name: '', primary: !current.length }]);
  const submit = event => {
    event.preventDefault();
    mutation.execute(rows.filter(row => row.name.trim()).map(row => ({ ...row, name: row.name.trim() })));
  };
  return <form className="club-nickname-editor" onSubmit={submit}>
    <p className="club-life-hint">Elige el artículo y escribe el apodo, sin repetir el artículo: «Los» + «Gunners». El principal es el que más usan las noticias.</p>
    {rows.map((row, index) => <div className="club-nickname-row" key={index}>
      <select value={row.article} onChange={event => update(index, { article: event.target.value })} aria-label="Artículo">
        {ARTICLES.map(article => <option key={article} value={article}>{capitalize(article)}</option>)}
      </select>
      <input value={row.name} maxLength={40} placeholder="Gunners" onChange={event => update(index, { name: event.target.value })} aria-label="Apodo"/>
      <label className="club-nickname-primary"><input type="radio" name="primary-nickname" checked={row.primary} onChange={() => makePrimary(index)}/> Principal</label>
      <button type="button" className="club-nickname-remove" onClick={() => remove(index)} aria-label="Quitar apodo">✕</button>
    </div>)}
    {rows.length < MAX_NICKNAMES && <Button type="button" size="sm" variant="ghost" onClick={add}>+ Agregar apodo</Button>}
    <div className="club-nickname-actions">
      <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={mutation.loading}>Cancelar</Button>
      <Button type="submit" size="sm" disabled={mutation.loading}>Guardar apodos</Button>
    </div>
    <FormFeedback mutation={mutation}/>
  </form>;
}
