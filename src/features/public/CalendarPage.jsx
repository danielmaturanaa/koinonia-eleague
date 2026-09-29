import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { DataState, PageHeader } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const UNSCHEDULED = 'sin-dia';


// Revisión de un día: cuántos juega cada equipo (debería ser `perDay`) y cruces repetidos.
function dayWarnings(matches, teams, perDay) {
  const count = new Map(teams.map(team => [team.id, 0]));
  const pairs = new Map();
  for (const match of matches) {
    [match.homeTeam.id, match.awayTeam.id].forEach(id => count.set(id, (count.get(id) ?? 0) + 1));
    const pair = [match.homeTeam.id, match.awayTeam.id].sort().join('|');
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  return {
    offCount: teams.map(team => ({ team, games: count.get(team.id) ?? 0 })).filter(row => row.games !== perDay),
    repeated: [...pairs.values()].some(value => value > 1),
  };
}

function CalendarBlock({ match, resolveTeam, canMove, selected, dimmed, onSelect, onOpen }) {
  const hasScore = match.status === 'finished' || match.status === 'live';
  const side = key => <span className="calendar-team"><TeamMark team={resolveTeam(match[`${key}Team`])}/><b>{match[`${key}Team`].name}</b>{hasScore && <strong>{match[`${key}Score`]}</strong>}</span>;
  return <div className={`calendar-block calendar-${match.status} ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
    draggable={canMove} onDragStart={event => { event.dataTransfer.setData('text/plain', match.id); event.dataTransfer.effectAllowed = 'move'; }}
    onClick={() => (canMove ? onSelect(match.id) : onOpen(match.id))} role="button" tabIndex={0}
    onKeyDown={event => { if (event.key === 'Enter') (canMove ? onSelect(match.id) : onOpen(match.id)); }}>
    <small><span>FECHA {match.roundNumber ?? '—'}</span>{match.status === 'live' ? <em>EN VIVO</em> : match.status === 'finished' ? <em>FINAL</em> : null}
      <button type="button" className="calendar-open" onClick={event => { event.stopPropagation(); onOpen(match.id); }} aria-label="Ver partido">VER ›</button></small>
    {side('home')}{side('away')}
  </div>;
}

export function CalendarPage({ teams, navigate }) {
  const { isAdmin } = useAuth();
  const tournaments = useApiQuery(signal => endpoints.tournaments({ status: 'active', page: 1, pageSize: 100 }, signal));
  const leagues = (tournaments.data ?? []).filter(item => item.format === 'league');
  const [tournamentId, setTournamentId] = useState('');
  const activeId = tournamentId || leagues[0]?.id || '';
  const fixtures = useApiQuery(signal => activeId ? endpoints.fixtures(activeId, signal) : Promise.resolve({ data: [] }), [activeId]);
  const [overrides, setOverrides] = useState({});
  const [extraDays, setExtraDays] = useState([]);
  const [selected, setSelected] = useState(null);
  const [focusTeam, setFocusTeam] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const [perDay, setPerDay] = useState(4);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [status, setStatus] = useState({ busy: false, error: '', message: '' });

  useEffect(() => { setOverrides({}); setExtraDays([]); setSelected(null); }, [activeId, fixtures.data]);

  const teamIndex = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const resolveTeam = team => ({ ...team, ...(teamIndex.get(team?.id) ?? {}) });
  const matches = useMemo(() => (Array.isArray(fixtures.data) ? fixtures.data : [])
    .filter(match => match.stage !== 'playoffs' && match.status !== 'cancelled')
    .map(match => (match.id in overrides ? { ...match, calendarDay: overrides[match.id] } : match)), [fixtures.data, overrides]);
  const participants = useMemo(() => {
    const byId = new Map();
    matches.forEach(match => [match.homeTeam, match.awayTeam].forEach(team => byId.set(team.id, team)));
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, 'es'));
  }, [matches]);
  const columns = useMemo(() => {
    const days = [...new Set([...matches.map(match => match.calendarDay).filter(Boolean), ...extraDays])].sort((left, right) => left - right);
    // Resaltando un equipo, sus partidos suben al principio de cada día; el resto sigue por fecha del fixture.
    const involves = match => Boolean(focusTeam) && (match.homeTeam.id === focusTeam || match.awayTeam.id === focusTeam);
    const order = (left, right) => Number(involves(right)) - Number(involves(left)) || (left.roundNumber ?? 0) - (right.roundNumber ?? 0);
    const list = days.map(day => ({ key: String(day), day, rows: matches.filter(match => match.calendarDay === day).sort(order) }));
    const unscheduled = matches.filter(match => !match.calendarDay).sort(order);
    return unscheduled.length ? [{ key: UNSCHEDULED, day: null, rows: unscheduled }, ...list] : list;
  }, [matches, extraDays, focusTeam]);
  const scheduledCount = matches.filter(match => match.calendarDay).length;

  const move = async (matchId, day) => {
    const match = matches.find(item => item.id === matchId);
    const target = day ?? null;
    setSelected(null);
    if (!match || (match.calendarDay ?? null) === target) return;
    setOverrides(current => ({ ...current, [matchId]: target }));
    setStatus({ busy: false, error: '', message: '' });
    try {
      await endpoints.setMatchCalendarDay(matchId, target);
    } catch (error) {
      setOverrides(current => ({ ...current, [matchId]: match.calendarDay ?? null }));
      setStatus({ busy: false, error: error.message, message: '' });
    }
  };
  const autoSchedule = async () => {
    setConfirmAuto(false);
    setStatus({ busy: true, error: '', message: '' });
    try {
      const result = await endpoints.scheduleCalendar(activeId, { matchesPerDay: Number(perDay) });
      const days = result?.data?.days;
      const conflicts = result?.data?.conflicts ?? 0;
      setStatus({ busy: false, error: '', message: `CALENDARIO ARMADO EN ${days} DÍAS${conflicts ? ` · ${conflicts} CRUCES NO CUADRARON: REVISA LOS AVISOS` : ''}.` });
      fixtures.retry();
    } catch (error) {
      setStatus({ busy: false, error: error.message, message: '' });
    }
  };
  const addDay = () => setExtraDays(current => [...current, Math.max(0, ...columns.map(column => column.day ?? 0)) + 1]);
  const dropProps = (key, day) => isAdmin ? {
    onDragOver: event => { event.preventDefault(); setDragOver(key); },
    onDragLeave: () => setDragOver(current => (current === key ? null : current)),
    onDrop: event => { event.preventDefault(); setDragOver(null); move(event.dataTransfer.getData('text/plain'), day); },
  } : {};

  return <main className="newspaper data-page"><section className="data-paper">
    <PageHeader kicker="CALENDARIO Y ACTAS" title="CALENDARIO"><div className="news-header-actions"><button className="page-action" onClick={() => navigate('/partidos')}>← PARTIDOS</button></div></PageHeader>
    <DataState query={tournaments}/>
    <div className="filter-bar calendar-toolbar">
      {leagues.length > 1 && <select value={activeId} onChange={event => setTournamentId(event.target.value)} aria-label="Torneo">{leagues.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
      <select value={focusTeam} onChange={event => setFocusTeam(event.target.value)} aria-label="Resaltar equipo"><option value="">RESALTAR EQUIPO…</option>{participants.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
      {isAdmin && <>
        <label className="calendar-field">POR DÍA<input type="number" min="1" max="20" value={perDay} onChange={event => setPerDay(event.target.value)}/></label>
        {confirmAuto
          ? <span className="calendar-confirm">¿REEMPLAZAR LOS DÍAS ACTUALES?<button className="action-button" onClick={autoSchedule}>SÍ, ARMAR</button><button className="action-button" onClick={() => setConfirmAuto(false)}>NO</button></span>
          : <button className="action-button" disabled={status.busy || !activeId} onClick={() => (scheduledCount ? setConfirmAuto(true) : autoSchedule())}>ARMAR AUTOMÁTICO</button>}
        <button className="action-button" onClick={addDay}>+ DÍA</button>
      </>}
    </div>
    {isAdmin && <p className="calendar-help">ARRASTRA UN PARTIDO A OTRO DÍA, O TÓCALO Y LUEGO TOCA «MOVER AQUÍ». EL AUTOMÁTICO RESPETA EL ORDEN DEL FIXTURE: CADA DÍA, CADA EQUIPO JUEGA SUS {perDay} SIGUIENTES.</p>}
    {status.error && <p className="calendar-status error">{status.error}</p>}
    {status.message && <p className="calendar-status">{status.message}</p>}
    <DataState query={fixtures}/>
    {!fixtures.loading && !fixtures.error && (columns.length
      ? <div className="calendar-board" style={{ '--days': columns.length }}>{columns.map(column => {
        const { offCount, repeated } = column.day ? dayWarnings(column.rows, participants, Number(perDay)) : { offCount: [], repeated: false };
        return <section key={column.key} className={`calendar-day ${dragOver === column.key ? 'drag-over' : ''} ${column.day ? '' : 'unscheduled'}`} {...dropProps(column.key, column.day)}>
          <header>
            <h3>{column.day ? `DÍA ${column.day}` : 'SIN DÍA'}</h3>
            <small>{column.rows.filter(match => match.status === 'finished').length} / {column.rows.length} JUGADOS</small>
            {column.day && column.rows.length > 0 && (offCount.length || repeated
              ? <p className="calendar-warn">{repeated && <span>CRUCE REPETIDO</span>}{offCount.map(row => <span key={row.team.id} title={row.team.name}><TeamMark team={resolveTeam(row.team)}/>{row.games}</span>)}</p>
              : <p className="calendar-ok">✓ TODOS JUEGAN {perDay}</p>)}
            {isAdmin && selected && <button className="calendar-move-here" onClick={() => move(selected, column.day)}>MOVER AQUÍ</button>}
          </header>
          <div className="calendar-blocks">{column.rows.map(match => <CalendarBlock key={match.id} match={match} resolveTeam={resolveTeam} canMove={isAdmin}
            selected={selected === match.id} dimmed={Boolean(focusTeam) && match.homeTeam.id !== focusTeam && match.awayTeam.id !== focusTeam}
            onSelect={id => setSelected(current => (current === id ? null : id))} onOpen={id => navigate(`/partidos/${encodeURIComponent(id)}`)}/>)}</div>
        </section>;
      })}</div>
      : <p className="empty-copy">NO HAY PARTIDOS DE LIGA EN LOS TORNEOS ACTIVOS.</p>)}
  </section></main>;
}
