import { useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { DataState, PageHeader } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';

const FILTERS = [['all', 'TODOS'], ['admins', 'ADMINS'], ['presidents', 'PRESIS'], ['members', 'MIEMBROS']];
const ROLE_LABEL = { owner: 'DUEÑO', admin: 'ADMIN', president: 'PRESI', member: 'MIEMBRO' };

// SQLite guarda "YYYY-MM-DD HH:MM:SS" en UTC, sin zona.
function since(value) {
  if (!value) return 'AÚN NO HA ENTRADO';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(`${value.replace(' ', 'T')}Z`).getTime()) / 60000));
  if (minutes < 2) return 'INGRESÓ AHORA';
  if (minutes < 60) return `INGRESÓ HACE ${minutes} MIN`;
  if (minutes < 1440) return `INGRESÓ HACE ${Math.round(minutes / 60)} H`;
  return `INGRESÓ HACE ${Math.round(minutes / 1440)} D`;
}

function Avatar({ person }) {
  const initial = (person.username ?? person.presidentName ?? '?').trim().charAt(0).toUpperCase();
  return person.avatarUrl
    ? <img className="person-avatar" src={person.avatarUrl} alt="" width="44" height="44" loading="lazy" referrerPolicy="no-referrer"/>
    : <span className="person-avatar person-avatar-empty" aria-hidden="true">{initial}</span>;
}

function PersonRow({ person, clubs, holders, viewerIsOwner, onChanged }) {
  const [teamId, setTeamId] = useState('');
  const name = person.username ?? person.presidentName ?? 'SIN NOMBRE';
  const team = person.teams[0];
  const done = { onSuccess: onChanged };
  const link = useApiMutation((id, signal) => endpoints.linkTeamDiscord(id, { discordUserId: person.discordUserId }, signal), done);
  const unlink = useApiMutation((signal) => endpoints.unlinkTeamDiscord(team.id, signal), done);
  const grant = useApiMutation((signal) => endpoints.grantAdmin(person.discordUserId, signal), done);
  const revoke = useApiMutation((signal) => endpoints.revokeAdmin(person.discordUserId, signal), done);
  const busy = link.loading || unlink.loading || grant.loading || revoke.loading;
  const feedback = [link, unlink, grant, revoke].find(item => item.error || item.success);
  const replaced = teamId ? holders.get(teamId) : null;

  const submitLink = () => {
    const club = clubs.find(item => item.id === teamId);
    const warning = replaced && replaced.discordUserId !== person.discordUserId ? ` Esto desvincula a ${replaced.username ?? replaced.presidentName}.` : '';
    if (club && window.confirm(`¿Vincular a ${name} como presi de ${club.name}?${warning}`)) link.execute(club.id);
  };

  return <li className={`person-row role-${person.role}`}>
    <Avatar person={person}/>
    <div className="person-identity">
      <b>{name}</b>
      <small>{since(person.lastLoginAt)}</small>
      <code title="ID de Discord">{person.discordUserId}</code>
    </div>
    <div className="person-badges">
      <span className={`role-badge role-badge-${person.role}`}>{ROLE_LABEL[person.role]}</span>
      {team && <span className="role-badge role-badge-team" title={person.presidentName ?? ''}>{team.name}{person.teams.length > 1 ? ` +${person.teams.length - 1}` : ''}</span>}
    </div>
    <div className="person-actions">
      {team
        ? <button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Desvincular a ${name} de ${team.name}? Ya no podrá editar el equipo.`)) unlink.execute(); }}>DESVINCULAR DE EQUIPO</button>
        : <div className="person-link">
          <select aria-label={`Equipo de ${name}`} value={teamId} onChange={event => setTeamId(event.target.value)}>
            <option value="">VINCULAR COMO PRESI DE…</option>
            {clubs.map(club => <option key={club.id} value={club.id}>{club.name}{holders.get(club.id) ? ` · reemplaza a ${holders.get(club.id).username ?? holders.get(club.id).presidentName}` : ''}</option>)}
          </select>
          <button type="button" disabled={!teamId || busy} onClick={submitLink}>VINCULAR</button>
        </div>}
      {person.role === 'admin' && viewerIsOwner && <button type="button" className="danger" disabled={busy} onClick={() => { if (window.confirm(`¿Quitar el rol de admin a ${name}?`)) revoke.execute(); }}>QUITAR ADMIN</button>}
      {person.role !== 'admin' && person.role !== 'owner' && viewerIsOwner && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Hacer admin a ${name}? Podrá gestionar equipos, jugadores, torneos, mercado y GP.`)) grant.execute(); }}>HACER ADMIN</button>}
    </div>
    {feedback && <div className="person-feedback"><FormFeedback mutation={feedback}/></div>}
  </li>;
}

export function PeoplePage({ teams = [] }) {
  const { isAdmin, isOwner } = useAuth();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const people = useApiQuery(signal => isAdmin ? endpoints.people(signal) : Promise.resolve({ data: [] }), [isAdmin]);
  const list = Array.isArray(people.data) ? people.data : [];
  const clubs = useMemo(() => teams.filter(team => team.kind !== 'national_team').sort((a, b) => a.name.localeCompare(b.name, 'es')), [teams]);
  // Quién es hoy el presi vinculado de cada equipo, para avisar cuándo un vínculo reemplaza a otro.
  const holders = useMemo(() => new Map(list.flatMap(person => person.teams.map(team => [team.id, person]))), [list]);
  const needle = search.trim().toLowerCase();
  const visible = list.filter(person => {
    const matchesFilter = filter === 'all'
      || (filter === 'admins' && (person.role === 'owner' || person.role === 'admin'))
      || (filter === 'presidents' && person.teams.length > 0)
      || (filter === 'members' && person.role === 'member');
    const haystack = [person.username, person.presidentName, person.discordUserId, ...person.teams.map(team => team.name)].join(' ').toLowerCase();
    return matchesFilter && (!needle || haystack.includes(needle));
  });
  const unlinked = clubs.filter(club => !holders.has(club.id));

  if (!isAdmin) {
    return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="ADMINISTRACIÓN" title="PERSONAS Y PERMISOS"/><p className="empty-copy data-empty">SOLO LOS ADMINISTRADORES PUEDEN VER ESTA PÁGINA.</p></section></main>;
  }
  return <main className="newspaper data-page"><section className="data-paper people-paper">
    <PageHeader kicker="ADMINISTRACIÓN" title="PERSONAS Y PERMISOS"/>
    <p className="people-intro">Aquí aparece quien ha entrado con Discord. Vincula a cada persona con su equipo para que pueda editarlo{isOwner ? ' y nombra admins' : ''}. {!isOwner && 'Solo los dueños pueden nombrar admins.'}</p>
    {unlinked.length > 0 && <p className="people-alert" role="status"><b>{unlinked.length} {unlinked.length === 1 ? 'EQUIPO' : 'EQUIPOS'} SIN PRESI VINCULADO:</b> {unlinked.map(club => club.name).join(', ')}.</p>}
    <div className="people-tools">
      <div className="people-filters" role="tablist" aria-label="Filtrar personas">{FILTERS.map(([id, label]) => <button type="button" role="tab" key={id} aria-selected={filter === id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="BUSCAR NOMBRE, EQUIPO O ID" aria-label="Buscar personas"/>
    </div>
    <DataState query={people}/>
    {!people.loading && !people.error && list.length > 0 && (visible.length
      ? <ul className="people-list">{visible.map(person => <PersonRow key={person.discordUserId} person={person} clubs={clubs} holders={holders} viewerIsOwner={isOwner} onChanged={people.retry}/>)}</ul>
      : <p className="empty-copy data-empty">NADIE COINCIDE CON ESE FILTRO.</p>)}
  </section></main>;
}
