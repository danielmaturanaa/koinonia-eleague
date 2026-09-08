import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { TeamMark } from '../../components/TeamMark.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { teamBalance, teamCoachName } from '../../utils/teamPresentation.js';
import { DataState, PageHeader, gp } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

function NationalTeamCard({ team, clubs, onChanged }) {
  const [clubId, setClubId] = useState(team.club?.id ?? '');
  const assign = useApiMutation((selectedClubId, signal) => endpoints.assignNationalTeam(team.id, selectedClubId, signal), { onSuccess: onChanged });
  const release = useApiMutation((signal) => endpoints.releaseNationalTeam(team.id, signal), { onSuccess: onChanged });
  return <article><TeamMark team={team}/><div><b>{team.name}</b><small>{team.club?.name ?? 'SIN CLUB ASIGNADO'}</small><select aria-label={`Club responsable de ${team.name}`} value={clubId} onChange={event => setClubId(event.target.value)}><option value="">SELECCIONAR CLUB</option>{clubs.map(club => <option value={club.id} key={club.id}>{club.name}</option>)}</select><div className="mini-actions"><button disabled={!clubId || assign.loading} onClick={() => assign.execute(clubId)}>ASIGNAR</button><button disabled={release.loading} onClick={() => release.execute()}>LIBERAR</button></div><FormFeedback mutation={assign.error || assign.success ? assign : release}/></div></article>;
}

function NationalTeamForm({ clubs, onChanged }) {
  const [form, setForm] = useState({ name: '', clubId: '', imageUrl: '' });
  const mutation = useApiMutation((body, signal) => endpoints.createNationalTeam(body, signal), { onSuccess: onChanged });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  return <form className="admin-form national-form" onSubmit={event => { event.preventDefault(); mutation.execute(Object.fromEntries(Object.entries(form).filter(([, value]) => value))); }}><label>NOMBRE<input required name="name" value={form.name} onChange={change}/></label><label>CLUB RESPONSABLE<select required name="clubId" value={form.clubId} onChange={change}><option value="">SELECCIONAR</option>{clubs.map(club => <option value={club.id} key={club.id}>{club.name}</option>)}</select></label><label>EMBLEMA URL<input type="url" name="imageUrl" value={form.imageUrl} onChange={change}/></label><button className="action-button" disabled={mutation.loading}>CREAR SELECCIÓN</button><FormFeedback mutation={mutation}/></form>;
}

export function TeamsDirectoryPage({ mode, teams, onChoose }) {
  const nationalTeams = useApiQuery(signal => mode === 'national' ? endpoints.nationalTeams({ page: 1, pageSize: 100 }, signal) : Promise.resolve({ data: [] }), [mode]);
  const needsDetails = mode === 'squads' || mode === 'budgets';
  const detailedTeams = useApiQuery(async signal => {
    if (!needsDetails || !teams.length) return { data: teams };
    const data = await Promise.all(teams.map(async team => {
      try {
        const response = await endpoints.team(team.id, signal);
        return { ...team, ...(response?.data ?? {}) };
      } catch (error) {
        if (error?.code === 'REQUEST_ABORTED') throw error;
        return team;
      }
    }));
    return { data };
  }, [needsDetails, teams]);
  if (mode === 'national') {
    return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="REPRESENTACIÓN INTERNACIONAL" title="SELECCIONES"/><NationalTeamForm clubs={teams} onChanged={nationalTeams.retry}/><DataState query={nationalTeams}/><div className="crest-gallery national-gallery">{(nationalTeams.data ?? []).map(team => <NationalTeamCard team={team} clubs={teams} onChanged={nationalTeams.retry} key={team.id}/>)}</div></section></main>;
  }

  const titles = {
    squads: ['PLANTILLAS', 'JUGADORES'], budgets: ['PRESUPUESTOS', 'SALDO GP'], presidents: ['PRESIDENTES', 'RESPONSABLE'], coaches: ['DIRECTORES TÉCNICOS', 'DT'], emblems: ['EMBLEMAS', ''],
  };
  const [title, metric] = titles[mode] ?? titles.squads;
  const visibleTeams = needsDetails ? detailedTeams.data ?? teams : teams;
  const detail = team => {
    const balance = teamBalance(team);
    if (mode === 'budgets') return balance === null ? 'SALDO NO INFORMADO' : gp(balance);
    if (mode === 'presidents') return team.president?.name ?? team.presidentName ?? 'SIN ASIGNAR';
    if (mode === 'coaches') return teamCoachName(team).toUpperCase();
    if (mode === 'squads') return `${team.playerCount ?? 0} ${metric} · ${balance === null ? 'SALDO NO INFORMADO' : `SALDO ${gp(balance)}`}`;
    return team.currentDivision ?? metric;
  };
  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="DIRECTORIO DE CLUBES" title={title}/>{needsDetails && detailedTeams.loading && <p className="directory-loading">ACTUALIZANDO SALDOS...</p>}<div className={mode === 'emblems' ? 'crest-gallery' : 'directory-grid'}>{visibleTeams.map(team => <button key={team.id} onClick={() => onChoose(team.id)}><TeamMark team={team}/><span><b>{team.name}</b>{mode !== 'emblems' && <small>{detail(team)}</small>}</span></button>)}</div></section></main>;
}
