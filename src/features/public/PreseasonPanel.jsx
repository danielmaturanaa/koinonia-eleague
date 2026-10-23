import { useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { EntityLink } from '../../components/EntityLink.jsx';
import { Button, Card, Chip, ConfirmStep, HowItWorks, Notice } from '../../ui/index.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();
const ROUND_LABEL = { QF: 'CUARTOS DE FINAL', SF: 'SEMIFINALES', F: 'FINAL', '3P': 'TERCER LUGAR' };
const roundOf = slot => (slot.startsWith('QF') ? 'QF' : slot.startsWith('SF') ? 'SF' : slot);
const PLACE = ['CAMPEÓN', '2.º', '3.º', '4.º'];

/** Cuadro de un torneo de pretemporada: rondas, resultados y el ganador por penales cuando hubo empate. */
export function PreseasonBracket({ bracket, onChanged }) {
  const { canOperateMatches } = useAuth();
  const winner = useApiMutation(({ matchId, teamId }, signal) => endpoints.setMatchWinner(matchId, { kind: 'preseason', winnerTeamId: teamId }, signal), { onSuccess: onChanged });
  const rounds = ['QF', 'SF', 'F', '3P'].map(key => [key, bracket.matches.filter(match => roundOf(match.slot) === key)]).filter(([, list]) => list.length);
  return <div className="preseason-bracket">
    <div className="preseason-rounds">{rounds.map(([key, list]) => <section key={key} className={`preseason-round round-${key}`}>
      <h4>{ROUND_LABEL[key]}</h4>
      {list.map(match => {
        const side = (teamId, name, score) => <div className={`preseason-side ${match.winnerTeamId === teamId ? 'is-winner' : ''}`}>
          <EntityLink to="team" id={teamId}>{upper(name)}</EntityLink><b>{match.status === 'finished' ? score : '–'}</b>
        </div>;
        return <article key={match.id} className="preseason-match">
          {side(match.homeTeamId, match.homeName, match.homeScore)}
          {side(match.awayTeamId, match.awayName, match.awayScore)}
          {match.status !== 'finished' && <EntityLink to="match" id={match.id} className="preseason-play">{match.status === 'live' ? 'EN VIVO →' : 'JUGAR →'}</EntityLink>}
          {match.needsWinner && (canOperateMatches
            ? <div className="preseason-penalties"><small>EMPATE: ¿QUIÉN GANÓ POR PENALES?</small>
              <Button size="sm" variant="ghost" disabled={winner.loading} onClick={() => winner.execute({ matchId: match.id, teamId: match.homeTeamId })}>{upper(match.homeName)}</Button>
              <Button size="sm" variant="ghost" disabled={winner.loading} onClick={() => winner.execute({ matchId: match.id, teamId: match.awayTeamId })}>{upper(match.awayName)}</Button></div>
            : <small className="preseason-penalties">EMPATE: FALTA ANOTAR QUIÉN GANÓ POR PENALES</small>)}
        </article>;
      })}
    </section>)}</div>
    {winner.error && <Notice tone="error">{winner.error.message}</Notice>}
    {bracket.standings && <ol className="preseason-standings">{bracket.standings.map((row, index) => <li key={row.teamId}>
      <span>{index < 4 ? PLACE[index] : 'CUARTOS'}</span><EntityLink to="team" id={row.teamId}>{upper(bracket.teamNames?.[row.teamId] ?? '')}</EntityLink><b>{gp(row.prize)}</b>
    </li>)}</ol>}
  </div>;
}

/** Pretemporada: los torneos de esta temporada y el formulario para organizar uno (4 u 8 clubes, cruces a mano). */
export function PreseasonPanel({ teams = [], myTeamId = null }) {
  const { isAdmin, canEditTeam } = useAuth();
  const query = useApiQuery(signal => endpoints.preseasons(signal), []);
  const [creating, setCreating] = useState(false);
  const data = query.data;
  if (!data) return <DataState query={query}/>;
  const canOrganize = isAdmin || (myTeamId && canEditTeam(myTeamId) && !data.busyTeamIds.includes(myTeamId));
  const names = Object.fromEntries(teams.map(team => [team.id, team.name]));
  return <Card title={`PRETEMPORADA${data.season ? ` · ${upper(data.season)}` : ''}`} className="preseason-panel"
    aside={canOrganize && !creating ? <Button size="sm" icon="trophy" onClick={() => setCreating(true)}>ORGANIZAR TORNEO</Button> : null}>
    {creating && <PreseasonForm teams={teams} busy={data.busyTeamIds} prizes={data.prizes} myTeamId={myTeamId} onDone={() => { setCreating(false); query.retry(); }} onCancel={() => setCreating(false)}/>}
    {data.tournaments.length
      ? data.tournaments.map(item => <section key={item.id} className="preseason-item">
        <header><a href={`#/torneos?torneo=${item.id}`}><b>{upper(item.name)}</b></a><Chip tone={item.status === 'completed' ? 'green' : 'yellow'}>{item.status === 'completed' ? 'TERMINADO' : `${item.size} CLUBES · EN JUEGO`}</Chip></header>
        <PreseasonBracket bracket={{ ...item, teamNames: names }} onChanged={query.retry}/>
      </section>)
      : !creating && <p className="club-life-hint">Todavía no hay torneos de pretemporada esta temporada.</p>}
    <HowItWorks><p>Un presi arma un torneo de 4 u 8 clubes y elige los cruces. Es a partido único (si empatan, se define por penales), con final y partido por el 3.er lugar, y se juega en el eFootball como cualquier partido. Todos recaudan: el local reparte la taquilla con la visita y la organización paga premios por puesto. Cada club juega una pretemporada por temporada.</p><p>Es un amistoso: no cuenta para la forma, el cara a cara, las suspensiones, los sueldos ni la directiva. El plantel que la juega llega más motivado al torneo (y el campeón, un poco más).</p></HowItWorks>
  </Card>;
}

function PreseasonForm({ teams, busy, prizes, myTeamId, onDone, onCancel }) {
  const { isAdmin } = useAuth();
  const clubs = useMemo(() => teams.filter(team => team.kind !== 'national_team' && !team.hidden && !busy.includes(team.id)), [teams, busy]);
  const [size, setSize] = useState(4);
  const [name, setName] = useState('');
  const [slots, setSlots] = useState(() => [myTeamId ?? '', '', '', '', '', '', '', ''].slice(0, 8));
  const [confirming, setConfirming] = useState(false);
  const create = useApiMutation((body, signal) => endpoints.createPreseason(body, signal), { onSuccess: onDone });
  const chosen = slots.slice(0, size);
  const ready = chosen.every(Boolean) && new Set(chosen).size === size && (isAdmin || chosen.includes(myTeamId));
  const setSlot = (index, value) => setSlots(current => current.map((item, position) => (position === index ? value : item)));
  const prizeList = prizes?.[size] ?? [];
  return <div className="preseason-form">
    <div className="preseason-form-row">
      <label className="club-kit-field"><span>NOMBRE</span><input value={name} maxLength={60} placeholder="Copa de Verano" onChange={event => setName(event.target.value)}/></label>
      <div className="preseason-size" role="group" aria-label="Cantidad de clubes">{[4, 8].map(value => <Button key={value} size="sm" variant={size === value ? 'primary' : 'ghost'} onClick={() => setSize(value)}>{value} CLUBES</Button>)}</div>
    </div>
    <div className="preseason-slots">{Array.from({ length: size / 2 }, (_, pair) => <div key={pair} className="preseason-pair">
      <small>{size === 8 ? `CUARTOS ${pair + 1}` : `SEMI ${pair + 1}`}</small>
      {[pair * 2, pair * 2 + 1].map(index => <select key={index} value={slots[index]} aria-label={`Club ${index + 1}`} onChange={event => setSlot(index, event.target.value)}>
        <option value="">{index % 2 === 0 ? 'Local…' : 'Visita…'}</option>
        {clubs.map(team => <option key={team.id} value={team.id} disabled={chosen.includes(team.id) && slots[index] !== team.id}>{team.name}</option>)}
      </select>)}
    </div>)}</div>
    <p className="club-life-hint">Premios por puesto: {prizeList.slice(0, 4).map((amount, index) => `${PLACE[index].toLowerCase()} ${gp(amount)}`).join(' · ')}{size === 8 ? ` · eliminados en cuartos ${gp(prizeList[4])}` : ''}. Además, cada partido reparte la taquilla mitad y mitad.</p>
    {!isAdmin && myTeamId && !chosen.includes(myTeamId) && <p className="club-life-hint">Tu club tiene que estar en el cuadro.</p>}
    <div className="club-nickname-actions">
      <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={create.loading}>Cancelar</Button>
      {!confirming && <Button type="button" size="sm" disabled={!ready || create.loading} onClick={() => setConfirming(true)}>Crear torneo</Button>}
    </div>
    {confirming && <ConfirmStep message="¿Crear el torneo con estos cruces? Los partidos quedan listos para jugarse." confirmLabel="SÍ, CREAR" busy={create.loading}
      onConfirm={() => create.execute({ name: name.trim() || undefined, slots: chosen, teamId: myTeamId })} onCancel={() => setConfirming(false)}/>}
    {create.error && <Notice tone="error">{create.error.message}</Notice>}
  </div>;
}
