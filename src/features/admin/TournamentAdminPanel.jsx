import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiMutation } from './useApiMutation.js';
import { TeamMark } from '../../components/TeamMark.jsx';

function MutationAction({ action, label, confirmText, onChanged, danger = false }) {
  const mutation = useApiMutation(signal => action(signal), { onSuccess: onChanged });
  const run = () => { if (!confirmText || window.confirm(confirmText)) mutation.execute(); };
  return <div className="mutation-action"><button className={`action-button ${danger ? 'danger' : ''}`} disabled={mutation.loading} onClick={run}>{label}</button><FormFeedback mutation={mutation}/></div>;
}

// Premios sugeridos (se pre-llenan y el admin los puede cambiar antes de otorgar):
// liga: 1.º 200.000 y bajando de a 20.000; playoffs: semifinalistas cupón 10%,
// subcampeón cupón 15% + 20.000 y campeón cupón 20% + 40.000.
const LEAGUE_FIRST = 200000;
const LEAGUE_STEP = 20000;
const PLAYOFF_PRIZES = {
  champion: { label: 'CAMPEÓN', gp: 40000, coupon: 20 },
  runnerUp: { label: 'SUBCAMPEÓN', gp: 20000, coupon: 15 },
  semifinal: { label: 'SEMIFINALISTA', gp: 0, coupon: 10 },
};
// La tabla de premios parte por los playoffs (campeón, subcampeón, semifinalistas) y sigue con el resto según la liga.
const PLACE_ORDER = { champion: 0, runnerUp: 1, semifinal: 2 };
const COUPON_OPTIONS = [0, 10, 15, 20];
const gpText = value => `${Number(value || 0).toLocaleString('es-CL')} GP`;

/** Cómo terminó cada club en los playoffs del torneo (si los hubo y ya se jugaron). */
function playoffPlaces(playoffs) {
  const places = {};
  for (const series of playoffs?.series ?? []) {
    if (!series.winnerTeamId) continue;
    const loser = series.homeTeam.id === series.winnerTeamId ? series.awayTeam.id : series.homeTeam.id;
    if (series.round === 'final') { places[series.winnerTeamId] = 'champion'; places[loser] = 'runnerUp'; }
    else if (!places[loser]) places[loser] = 'semifinal';
  }
  return places;
}

function suggested(rows, places) {
  return Object.fromEntries(rows.map((row, index) => {
    const prize = PLAYOFF_PRIZES[places[row.team_id]];
    return [row.team_id, { league: String(Math.max(0, LEAGUE_FIRST - LEAGUE_STEP * index)), playoff: String(prize?.gp ?? 0), coupon: String(prize?.coupon ?? 0) }];
  }));
}

export function TournamentAwardsPanel({ tournament, onChanged }) {
  const standings = useApiQuery(signal => endpoints.standings(tournament.id, {}, signal), [tournament.id]);
  const playoffs = useApiQuery(signal => endpoints.playoffs(tournament.id, signal).catch(() => ({ data: null })), [tournament.id]);
  const rows = Array.isArray(standings.data) ? standings.data : [];
  const places = playoffPlaces(playoffs.data);
  const [values, setValues] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(null);
  // Se pre-llena apenas llegan la tabla y los playoffs; después manda lo que edite el admin.
  const ready = !standings.loading && !playoffs.loading && rows.length > 0;
  useEffect(() => { setValues(null); setDone(null); setConfirming(false); }, [tournament.id]);
  useEffect(() => { if (ready && values === null) setValues(suggested(rows, places)); }, [ready, values]);
  const form = values ?? {};
  const set = (teamId, field, value) => setValues(current => ({ ...current, [teamId]: { ...current[teamId], [field]: value } }));
  const grants = rows.map((row, index) => {
    const entry = form[row.team_id] ?? {};
    return { row, position: index + 1, place: places[row.team_id] ?? null,
      league: Number(entry.league || 0), playoff: Number(entry.playoff || 0), coupon: Number(entry.coupon || 0) };
  }).filter(item => item.league > 0 || item.playoff > 0 || item.coupon > 0);
  const ordered = rows.map((row, index) => ({ row, position: index + 1 }))
    .sort((a, b) => (PLACE_ORDER[places[a.row.team_id]] ?? 3) - (PLACE_ORDER[places[b.row.team_id]] ?? 3) || a.position - b.position);
  const totalGp = grants.reduce((sum, item) => sum + item.league + item.playoff, 0);
  const totalCoupons = grants.filter(item => item.coupon > 0).length;
  const mutation = useApiMutation(async signal => {
    for (const grant of grants) {
      const teamId = grant.row.team_id;
      const placeLabel = grant.place ? PLAYOFF_PRIZES[grant.place].label.toLowerCase() : null;
      if (grant.league > 0) await endpoints.creditTeam(teamId, { amount: grant.league, reason: `Premio ${tournament.name} · ${grant.position}.º de la liga` }, signal);
      if (grant.playoff > 0) await endpoints.creditTeam(teamId, { amount: grant.playoff, reason: `Premio ${tournament.name} · ${placeLabel ?? 'playoffs'}` }, signal);
      if (grant.coupon > 0) await endpoints.grantCoupon(teamId, { percent: grant.coupon, tournamentId: tournament.id, reason: `${tournament.name}${placeLabel ? ` · ${placeLabel}` : ''}` }, signal);
    }
    return { data: { teams: grants.length, totalGp, totalCoupons } };
  }, { onSuccess: () => { setDone({ teams: grants.length, totalGp, totalCoupons }); setConfirming(false); onChanged?.(); } });

  if (done) return <section className="tournament-awards"><p className="form-feedback success">✅ PREMIOS OTORGADOS: {gpText(done.totalGp)} Y {done.totalCoupons} CUPÓN(ES) A {done.teams} CLUBES. CADA PRESI USA SUS CUPONES DESDE LA FICHA DE SU CLUB, Y SE AVISA EN DISCORD.</p></section>;
  return <section className="tournament-awards">
    <header><div><h3>CLASIFICACIÓN FINAL Y PREMIOS</h3><p>VIENEN PRE-LLENADOS (1.º DE LA LIGA 200.000 Y BAJANDO DE A 20.000; SEMIFINALISTAS CUPÓN 10%; SUBCAMPEÓN CUPÓN 15% + 20.000; CAMPEÓN CUPÓN 20% + 40.000). REVISA, AJUSTA Y OTORGA TODO CON UN SOLO GUARDADO.</p></div><b>{gpText(totalGp)}{totalCoupons ? ` · ${totalCoupons} 🎟️` : ''}</b></header>
    <DataState query={standings}/>
    {rows.length > 0 && <div className="tournament-awards-table"><table>
      <thead><tr><th title="Posición en la liga"># LIGA</th><th>CLUB</th><th>PTS</th><th>GP LIGA</th><th>PLAYOFFS</th><th>GP PLAYOFFS</th><th>CUPÓN REBAJA SALARIAL</th></tr></thead>
      <tbody>{ordered.map(({ row, position }) => {
        const entry = form[row.team_id] ?? {};
        const place = places[row.team_id];
        return <tr key={row.team_id}>
          <td>{position}</td><td>{row.name}</td><td><b>{row.points}</b></td>
          <td><input aria-label={`GP de liga para ${row.name}`} type="number" min="0" step="1000" value={entry.league ?? ''} onChange={event => set(row.team_id, 'league', event.target.value)} placeholder="0"/></td>
          <td>{place ? PLAYOFF_PRIZES[place].label : '—'}</td>
          <td><input aria-label={`GP de playoffs para ${row.name}`} type="number" min="0" step="1000" value={entry.playoff ?? ''} onChange={event => set(row.team_id, 'playoff', event.target.value)} placeholder="0"/></td>
          <td><select aria-label={`Cupón para ${row.name}`} value={entry.coupon ?? '0'} onChange={event => set(row.team_id, 'coupon', event.target.value)}>
            {COUPON_OPTIONS.map(percent => <option key={percent} value={percent}>{percent ? `🎟️ ${percent}%` : 'SIN CUPÓN'}</option>)}
          </select></td>
        </tr>;
      })}</tbody>
    </table></div>}
    {rows.length > 0 && !playoffs.data && <p className="poll-hint">ESTE TORNEO NO TIENE PLAYOFFS: SOLO SE PRE-LLENAN LOS PREMIOS DE LA LIGA.</p>}
    {confirming
      ? <div className="offer-confirm" role="group" aria-label="CONFIRMAR PREMIOS">
        <span>¿OTORGAR {gpText(totalGp)}{totalCoupons ? ` Y ${totalCoupons} CUPÓN(ES)` : ''} A {grants.length} CLUBES? SE ACREDITA AL TIRO Y NO SE DESHACE SOLO.</span>
        <div className="mini-actions">
          <button type="button" disabled={mutation.loading} onClick={() => mutation.execute()}>{mutation.loading ? 'OTORGANDO…' : 'SÍ, OTORGAR'}</button>
          <button type="button" className="ghost" disabled={mutation.loading} onClick={() => setConfirming(false)}>VOLVER</button>
        </div>
      </div>
      : <div className="button-row">
        <button className="action-button tournament-awards-save" disabled={!grants.length} onClick={() => setConfirming(true)}>GUARDAR Y OTORGAR PREMIOS</button>
        <button type="button" className="action-button ghost-button" disabled={!ready} onClick={() => setValues(suggested(rows, places))}>VOLVER A LOS SUGERIDOS</button>
      </div>}
    {mutation.error && <p className="form-feedback error" role="alert">{mutation.error.message}</p>}
  </section>;
}

function StatusPanel({ tournament, onChanged, onDeleted }) {
  const [status, setStatus] = useState(tournament.status === 'completed' ? 'completed' : 'active');
  const [championPolicy, setChampionPolicy] = useState(tournament.championPolicy ?? 'regular_season');
  const update = useApiMutation((value, signal) => endpoints.updateTournamentStatus(tournament.id, value, signal), { onSuccess: onChanged });
  const policy = useApiMutation((value, signal) => endpoints.updateTournamentChampionPolicy(tournament.id, value, signal), { onSuccess: onChanged });
  const remove = useApiMutation(signal => endpoints.deleteTournament(tournament.id, signal), { onSuccess: onDeleted });
  const save = () => { if (window.confirm(`¿CAMBIAR EL ESTADO DE ${tournament.name} A ${status.toUpperCase()}?`)) update.execute(status); };
  const saveChampionPolicy = () => { if (window.confirm(championPolicy === 'playoffs' ? `¿DEFINIR QUE EL CAMPEÓN DE ${tournament.name} SEA EL GANADOR DE LOS PLAYOFFS? SE RETIRARÁ CUALQUIER TÍTULO Y NOTICIA DE CAMPEÓN DE FASE REGULAR.` : `¿DEFINIR QUE EL CAMPEÓN DE ${tournament.name} SEA EL LÍDER DE LA FASE REGULAR?`)) policy.execute(championPolicy); };
  const deleteTournament = () => { if (window.confirm(`¿ELIMINAR DEFINITIVAMENTE ${tournament.name} Y SUS DATOS RELACIONADOS?`)) remove.execute(); };
  return <section className="tournament-admin-section"><p>ESTADO ACTUAL: <b>{String(tournament.status).toUpperCase()}</b></p><div className="admin-form compact-form"><label>NUEVO ESTADO<select value={status} onChange={event => setStatus(event.target.value)}><option value="active">ACTIVO</option><option value="completed">COMPLETADO</option></select></label><button className="action-button" disabled={update.loading} onClick={save}>ACTUALIZAR ESTADO</button>{tournament.format === 'league' && <><label>CAMPEONES DE LA LIGA<select value={championPolicy} onChange={event => setChampionPolicy(event.target.value)}><option value="regular_season">FASE REGULAR</option><option value="playoffs">PLAYOFFS</option><option value="both">AMBOS TÍTULOS</option></select></label><button className="action-button" disabled={policy.loading || championPolicy === tournament.championPolicy} onClick={saveChampionPolicy}>ACTUALIZAR REGLA</button></>}<button className="action-button danger" disabled={remove.loading} onClick={deleteTournament}>ELIMINAR TORNEO</button><FormFeedback mutation={update.error || update.success ? update : policy.error || policy.success ? policy : remove}/></div>{tournament.status === 'completed' && <TournamentAwardsPanel tournament={tournament} onChanged={onChanged}/>}</section>;
}

function ParticipationPanel({ tournament, teams, onChanged }) {
  const candidates = teams.filter(team => team.kind === tournament.competitorKind);
  const [selected, setSelected] = useState(() => (tournament.teams ?? []).map(team => team.id));
  useEffect(() => setSelected((tournament.teams ?? []).map(team => team.id)), [tournament.id, tournament.teams]);
  const mutation = useApiMutation((teamIds, signal) => endpoints.replaceTournamentParticipations(tournament.id, teamIds, signal), { onSuccess: onChanged });
  const toggle = teamId => setSelected(current => current.includes(teamId) ? current.filter(id => id !== teamId) : [...current, teamId]);
  const invalidKnockout = tournament.format === 'knockout' && (selected.length < 2 || (selected.length & (selected.length - 1)) !== 0);
  const save = () => { if (window.confirm(`¿GUARDAR ${selected.length} PARTICIPANTES? EL SORTEO ACTUAL SE REINICIARÁ.`)) mutation.execute(selected); };
  if (tournament.rosterLocked) return <section className="tournament-admin-section"><p>LA NÓMINA DE <b>{tournament.teams?.length ?? 0} PARTICIPANTES</b> ESTÁ BLOQUEADA PORQUE EL FIXTURE YA FUE CREADO.</p></section>;
  return <section className="tournament-admin-section"><p>SELECCIONA LOS PARTICIPANTES. PODRÁS CAMBIARLOS HASTA GENERAR EL FIXTURE: <b>{selected.length}</b></p><div className="division-team-list">{candidates.map(team => <label key={team.id}><input type="checkbox" checked={selected.includes(team.id)} onChange={() => toggle(team.id)}/><span>{team.name}</span></label>)}</div>{invalidKnockout && <p className="admin-empty compact">LA ELIMINACIÓN DIRECTA REQUIERE 2, 4, 8, 16… PARTICIPANTES.</p>}<button className="action-button" disabled={selected.length < 2 || invalidKnockout || mutation.loading} onClick={save}>GUARDAR PARTICIPANTES</button><FormFeedback mutation={mutation}/></section>;
}

function DrawPanel({ tournament, onChanged }) {
  const participants = tournament.teams ?? [];
  const [labels, setLabels] = useState(() => Object.fromEntries(participants.map((team, index) => [team.id, team.groupLabel ?? (index % 2 ? 'B' : 'A')])));
  const mutation = useApiMutation((groups, signal) => endpoints.drawTournament(tournament.id, groups, signal), { onSuccess: onChanged });
  const groups = participants.reduce((result, team) => {
    const label = String(labels[team.id] ?? '').trim().toUpperCase();
    if (label) (result[label] ??= []).push(team.id);
    return result;
  }, {});
  const submit = () => {
    if (Object.values(groups).flat().length !== participants.length) return;
    if (window.confirm(`¿SORTEAR ${participants.length} PARTICIPANTES EN ${Object.keys(groups).length} GRUPOS?`)) mutation.execute(groups);
  };
  return <section className="tournament-admin-section"><p>ASIGNA UNA ETIQUETA DE GRUPO A CADA PARTICIPANTE.</p><div className="draw-team-list">{participants.map(team => <label key={team.id}><span>{team.name}</span><input maxLength="4" aria-label={`Grupo de ${team.name}`} value={labels[team.id] ?? ''} onChange={event => setLabels(current => ({ ...current, [team.id]: event.target.value }))}/></label>)}</div><button className="action-button" disabled={!participants.length || mutation.loading || Object.values(groups).flat().length !== participants.length} onClick={submit}>GUARDAR SORTEO</button><FormFeedback mutation={mutation}/></section>;
}

function FixturesPanel({ tournament, onChanged }) {
  const [groupLabel, setGroupLabel] = useState('');
  const [legs, setLegs] = useState('1');
  const roundRobin = useApiMutation((body, signal) => endpoints.generateRoundRobin(tournament.id, body, signal), { onSuccess: onChanged });
  const groups = useApiMutation((body, signal) => endpoints.generateGroupFixtures(tournament.id, body, signal), { onSuccess: onChanged });
  const payload = () => ({ ...(groupLabel.trim() ? { groupLabel: groupLabel.trim().toUpperCase() } : {}), ...(legs ? { legs: Number(legs) } : {}) });
  const generate = (kind, mutation) => { if (window.confirm(`¿GENERAR EL FIXTURE ${kind} PARA ${tournament.name}?`)) mutation.execute(payload()); };
  const teamCount = tournament.teams?.length ?? 0;
  return <section className="tournament-admin-section"><p>{teamCount} PARTICIPANTES{teamCount % 2 ? ' · HABRÁ UN DESCANSO POR JORNADA.' : ''}</p><div className="admin-form compact-form"><label>GRUPO OPCIONAL<input maxLength="4" value={groupLabel} onChange={event => setGroupLabel(event.target.value)}/></label><label>VUELTAS<select value={legs} onChange={event => setLegs(event.target.value)}><option value="1">1</option><option value="2">2</option></select></label><button className="action-button" disabled={roundRobin.loading} onClick={() => generate('ROUND ROBIN', roundRobin)}>ROUND ROBIN</button><button className="action-button" disabled={groups.loading} onClick={() => generate('DE GRUPOS', groups)}>FIXTURE DE GRUPOS</button><FormFeedback mutation={roundRobin.error || roundRobin.success ? roundRobin : groups}/></div></section>;
}

function BracketPanel({ tournament, onChanged }) {
  const [directPerGroup, setDirectPerGroup] = useState('2');
  const [bestThirdCount, setBestThirdCount] = useState('0');
  const bracket = useApiMutation((body, signal) => endpoints.generateBracket(tournament.id, body, signal), { onSuccess: onChanged });
  const create = event => {
    event.preventDefault();
    const body = { ...(directPerGroup ? { directPerGroup: Number(directPerGroup) } : {}), ...(bestThirdCount ? { bestThirdCount: Number(bestThirdCount) } : {}) };
    if (window.confirm('¿GENERAR O ACTUALIZAR LA LLAVE DEL TORNEO?')) bracket.execute(body);
  };
  return <section className="tournament-admin-section"><form className="admin-form compact-form" onSubmit={create}><label>DIRECTOS POR GRUPO<input type="number" min="0" step="1" value={directPerGroup} onChange={event => setDirectPerGroup(event.target.value)}/></label><label>MEJORES TERCEROS<input type="number" min="0" step="1" value={bestThirdCount} onChange={event => setBestThirdCount(event.target.value)}/></label><button className="action-button" disabled={bracket.loading}>GENERAR LLAVE</button><FormFeedback mutation={bracket}/></form><div className="admin-action-grid"><MutationAction label="AVANZAR LLAVE" confirmText="¿AVANZAR LOS GANADORES A LA SIGUIENTE RONDA?" action={signal => endpoints.advanceBracket(tournament.id, signal)} onChanged={onChanged}/><MutationAction label="CUARTOS DE COPA" confirmText="¿GENERAR LOS CUARTOS DE FINAL DE COPA?" action={signal => endpoints.generateCupQuarterfinals(tournament.id, signal)} onChanged={onChanged}/><MutationAction label="OCTAVOS MUNDIAL" confirmText="¿GENERAR LOS OCTAVOS DE FINAL DEL MUNDIAL?" action={signal => endpoints.generateWorldRoundOf16(tournament.id, signal)} onChanged={onChanged}/></div></section>;
}

function PlayoffsPanel({ tournament, teams, onChanged }) {
  const playoffs = useApiQuery(signal => endpoints.playoffs(tournament.id, signal), [tournament.id]);
  const [form, setForm] = useState({ pairingMode: 'seeded', semifinalLegs: '1', finalLegs: '1', semi1a: '', semi1b: '', semi2a: '', semi2b: '' });
  const create = useApiMutation((body, signal) => endpoints.createPlayoffs(tournament.id, body, signal), { onSuccess: () => { playoffs.retry(); onChanged(); } });
  const tiebreak = useApiMutation(({ seriesId, winnerTeamId }, signal) => endpoints.resolvePlayoffTiebreak(seriesId, winnerTeamId, signal), { onSuccess: () => { playoffs.retry(); onChanged(); } });
  const configured = playoffs.data;
  const submit = event => {
    event.preventDefault();
    const body = { pairingMode: form.pairingMode, semifinalLegs: Number(form.semifinalLegs), finalLegs: Number(form.finalLegs) };
    if (form.pairingMode === 'custom') body.semifinalPairs = [[form.semi1a, form.semi1b], [form.semi2a, form.semi2b]];
    if (window.confirm('¿CONFIRMAR LOS PLAYOFFS? LA CLASIFICACIÓN Y LAS LLAVES QUEDARÁN FIJADAS.')) create.execute(body);
  };
  const team = id => teams.find(item => item.id === id);
  return <section className="tournament-admin-section"><DataState query={playoffs}/>{configured ? <div className="playoff-admin-summary"><p><b>PLAYOFFS {configured.status.toUpperCase()}</b> · SEMIS A {configured.semifinalLegs === 1 ? 'PARTIDO ÚNICO' : 'IDA Y VUELTA'} · FINAL A {configured.finalLegs === 1 ? 'PARTIDO ÚNICO' : 'IDA Y VUELTA'}</p><div className="playoff-qualifiers">{configured.qualifiers.map(row => <span key={row.teamId}><b>#{row.rank}</b><TeamMark team={team(row.teamId) ?? row}/>{row.name}</span>)}</div>{configured.series.filter(series => series.status === 'awaiting_tiebreak').map(series => <div className="playoff-tiebreak" key={series.id}><span>{series.round === 'final' ? 'FINAL' : `SEMIFINAL ${series.slot}`} EMPATADA: REGISTRA EL GANADOR POR PENALES.</span><button className="action-button" disabled={tiebreak.loading} onClick={() => tiebreak.execute({ seriesId: series.id, winnerTeamId: series.homeTeam.id })}>{series.homeTeam.name}</button><button className="action-button" disabled={tiebreak.loading} onClick={() => tiebreak.execute({ seriesId: series.id, winnerTeamId: series.awayTeam.id })}>{series.awayTeam.name}</button></div>)}<FormFeedback mutation={tiebreak}/></div> : <form className="admin-form compact-form" onSubmit={submit}><label>CRUCES<select value={form.pairingMode} onChange={event => setForm(current => ({ ...current, pairingMode: event.target.value }))}><option value="seeded">1° VS 4° · 2° VS 3°</option><option value="custom">ELEGIR MANUALMENTE</option></select></label><label>SEMIFINALES<select value={form.semifinalLegs} onChange={event => setForm(current => ({ ...current, semifinalLegs: event.target.value }))}><option value="1">PARTIDO ÚNICO</option><option value="2">IDA Y VUELTA</option></select></label><label>FINAL<select value={form.finalLegs} onChange={event => setForm(current => ({ ...current, finalLegs: event.target.value }))}><option value="1">PARTIDO ÚNICO</option><option value="2">IDA Y VUELTA</option></select></label>{form.pairingMode === 'custom' && <><label>SEMIFINAL 1 · EQUIPO 1<select required value={form.semi1a} onChange={event => setForm(current => ({ ...current, semi1a: event.target.value }))}><option value="">ELEGIR</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>SEMIFINAL 1 · EQUIPO 2<select required value={form.semi1b} onChange={event => setForm(current => ({ ...current, semi1b: event.target.value }))}><option value="">ELEGIR</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>SEMIFINAL 2 · EQUIPO 1<select required value={form.semi2a} onChange={event => setForm(current => ({ ...current, semi2a: event.target.value }))}><option value="">ELEGIR</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>SEMIFINAL 2 · EQUIPO 2<select required value={form.semi2b} onChange={event => setForm(current => ({ ...current, semi2b: event.target.value }))}><option value="">ELEGIR</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></>}<button className="action-button" disabled={create.loading}>CREAR PLAYOFFS</button><FormFeedback mutation={create}/></form>}</section>;
}

function DivisionsPanel({ tournament, teams, onChanged }) {
  const [selected, setSelected] = useState([]);
  const initialize = useApiMutation((ids, signal) => endpoints.initializeDivisions(ids, signal), { onSuccess: onChanged });
  const toggle = id => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 6 ? [...current, id] : current);
  const runInitialize = () => { if (selected.length === 6 && window.confirm('¿INICIALIZAR LAS DIVISIONES CON ESTOS SEIS EQUIPOS EN PRIMERA?')) initialize.execute(selected); };
  return <section className="tournament-admin-section"><p>SELECCIONA EXACTAMENTE SEIS EQUIPOS PARA PRIMERA DIVISIÓN: <b>{selected.length}/6</b></p><div className="division-team-list">{teams.map(team => <label key={team.id}><input type="checkbox" checked={selected.includes(team.id)} onChange={() => toggle(team.id)}/><span>{team.name}</span></label>)}</div><button className="action-button" disabled={selected.length !== 6 || initialize.loading} onClick={runInitialize}>INICIALIZAR DIVISIONES</button><FormFeedback mutation={initialize}/><div className="admin-action-grid"><MutationAction label="APLICAR ASCENSO" confirmText="¿APLICAR EL ASCENSO DEFINIDO POR ESTE TORNEO?" action={signal => endpoints.applyPromotion(tournament.id, signal)} onChanged={onChanged}/><MutationAction label="MOVIMIENTOS DIVISIONALES" confirmText="¿APLICAR LOS MOVIMIENTOS DIVISIONALES DE ESTE TORNEO?" action={signal => endpoints.applyDivisionMovements(tournament.id, signal)} onChanged={onChanged}/></div></section>;
}

export function TournamentAdminPanel({ tournament, teams, onChanged, onDeleted }) {
  const [tab, setTab] = useState('status');
  const tabs = [['status','ESTADO'],['participants','PARTICIPANTES'],['draw','SORTEO'],['fixtures','CALENDARIO'],['bracket','LLAVES'],['playoffs','PLAYOFFS'], ...(tournament.divisionsReady ? [['divisions','DIVISIONES']] : [])];
  return <section className="tournament-admin"><nav>{tabs.map(([value, label]) => <button className={tab === value ? 'active' : ''} key={value} onClick={() => setTab(value)}>{label}</button>)}</nav>{tab === 'status' && <StatusPanel tournament={tournament} onChanged={onChanged} onDeleted={onDeleted}/>} {tab === 'participants' && <ParticipationPanel tournament={tournament} teams={teams} onChanged={onChanged}/>} {tab === 'draw' && <DrawPanel tournament={tournament} onChanged={onChanged}/>} {tab === 'fixtures' && <FixturesPanel tournament={tournament} onChanged={onChanged}/>} {tab === 'bracket' && <BracketPanel tournament={tournament} onChanged={onChanged}/>} {tab === 'playoffs' && <PlayoffsPanel tournament={tournament} teams={teams} onChanged={onChanged}/>} {tab === 'divisions' && tournament.divisionsReady && <DivisionsPanel tournament={tournament} teams={teams} onChanged={onChanged}/>}</section>;
}
