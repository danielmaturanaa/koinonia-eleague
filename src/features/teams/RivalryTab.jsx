import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { EntityLink } from '../../components/EntityLink.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { Button, Card, Chip, ConfirmStep, EmptyState, Icon, Notice, useToast } from '../../ui/index.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();
const KIND_LABEL = { natural: 'NATURAL (POR EL HISTORIAL)', elegido: 'ELEGIDO POR EL PRESI' };
const kindsText = kinds => (kinds.length > 1 ? 'NATURAL Y ELEGIDO' : KIND_LABEL[kinds[0]] ?? '');

function Record({ h2h }) {
  const total = Math.max(1, h2h.played);
  return <div className="h2h-record">
    <div className="h2h-numbers">
      <span className="win"><b>{h2h.wins}</b><small>GANADOS</small></span>
      <span className="draw"><b>{h2h.draws}</b><small>EMPATES</small></span>
      <span className="loss"><b>{h2h.losses}</b><small>PERDIDOS</small></span>
    </div>
    <div className="h2h-bar" aria-hidden="true">
      <span className="win" style={{ flex: h2h.wins / total }}/><span className="draw" style={{ flex: h2h.draws / total }}/><span className="loss" style={{ flex: h2h.losses / total }}/>
    </div>
    <p className="h2h-goals">{h2h.played} PARTIDOS · GOLES {h2h.goalsFor}-{h2h.goalsAgainst}</p>
  </div>;
}

const gameText = game => `${game.goalsFor}-${game.goalsAgainst} · ${upper(game.tournament)}${game.stage !== 'league' ? (String(game.slot ?? '').startsWith('F') ? ' · FINAL' : ' · PLAYOFFS') : ''}`;

/** Nombre propio de una rivalidad: el vigente, la propuesta pendiente (aceptar o rechazar si es del otro) y proponer uno. */
function RivalryName({ team, other, naming, canEdit, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const propose = useApiMutation((name, signal) => endpoints.proposeRivalryName(team.id, other.id, name, signal), { onSuccess: () => { setEditing(false); setValue(''); onChanged(); } });
  const answer = useApiMutation((accept, signal) => endpoints.answerRivalryName(team.id, other.id, accept, signal), { onSuccess: onChanged });
  const error = propose.error ?? answer.error;
  return <div className="rivalry-name">
    {naming?.name && <p className="rivalry-name-current">«{naming.name}»</p>}
    {naming?.proposed && (naming.proposedByMe
      ? <small>PROPUSISTE «{naming.proposed}»: FALTA QUE {upper(other.name)} LO ACEPTE.</small>
      : <div className="rivalry-name-pending"><small>{upper(other.name)} PROPONE LLAMARLA «{naming.proposed}».</small>
        {canEdit && <><Button size="sm" disabled={answer.loading} onClick={() => answer.execute(true)}>ACEPTAR</Button><Button size="sm" variant="ghost" disabled={answer.loading} onClick={() => answer.execute(false)}>NO</Button></>}</div>)}
    {canEdit && (editing
      ? <form className="rivalry-name-form" onSubmit={event => { event.preventDefault(); propose.execute(value); }}>
        <input value={value} maxLength={40} placeholder="El Clásico del Sur" aria-label="Nombre de la rivalidad" onChange={event => setValue(event.target.value)} autoFocus/>
        <Button type="submit" size="sm" disabled={propose.loading}>PROPONER</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>CANCELAR</Button>
      </form>
      : !naming?.proposedByMe && <button type="button" className="rivalry-name-edit" onClick={() => setEditing(true)}>✎ {naming?.name ? 'PROPONER OTRO NOMBRE' : 'PONERLE NOMBRE A LA RIVALIDAD'}</button>)}
    {error && <Notice tone="error">{error.message}</Notice>}
  </div>;
}

/** Los derbis: rivalidades de vecinos que elige el presi (varios, hasta el máximo), con sugeridos por país y hinchada cercana. */
function DerbySection({ team, data, canEdit, onChanged }) {
  const toast = useToast();
  const [picking, setPicking] = useState(null);
  const choose = useApiMutation(({ rivalTeamId, on }, signal) => endpoints.setDerby(team.id, rivalTeamId, on, signal), {
    onSuccess: () => { setPicking(null); toast({ tone: 'success', title: 'DERBIS ACTUALIZADOS' }); onChanged(); },
  });
  const derbi = data.derbi;
  if (!derbi) return null;
  const full = derbi.rivals.length >= derbi.max;
  return <>
    {derbi.rivals.map(item => <Card key={item.club.id} tone="navy" className="rivalry-hero is-derbi">
      <div className="rivalry-side"><TeamMark team={team} className="rivalry-crest"/><b>{upper(team.name)}</b></div>
      <div className="rivalry-vs">
        <Icon name="bolt" size={28}/>
        <strong>VS</strong>
        <Chip tone="navy" icon="bolt">{item.mutual ? 'DERBI DE LOS DOS' : 'DERBI'}</Chip>
        <RivalryName team={team} other={item.club} naming={item.naming} canEdit={canEdit} onChanged={onChanged}/>
      </div>
      <div className="rivalry-side"><EntityLink to="team" id={item.club.id}><TeamMark team={item.club} className="rivalry-crest"/></EntityLink><b>{upper(item.club.name)}</b></div>
    </Card>)}
    {derbi.admirers?.length > 0 && <p className="club-life-hint"><Icon name="bolt" size={12}/> TE TIENEN DE DERBI: {derbi.admirers.map(club => upper(club.name)).join(' · ')}.</p>}
    {canEdit && <Card title="TUS DERBIS" aside={<Chip icon="bolt" tone="navy">{derbi.rivals.length} DE {derbi.max}</Chip>}>
      <p className="club-life-hint">El derbi es la rivalidad de vecinos: viaja el triple de hinchada visitante, el estadio llena al menos el 85% y la visita se lleva el 20% de la taquilla. Puedes tener hasta {derbi.max} y cambiarlos cuando quieras. Te sugerimos los de tu país y los que tienen la hinchada cerca; puede ser también tu clásico.</p>
      <ul className="rival-candidates">{derbi.candidates.map(candidate => <li key={candidate.teamId} className={candidate.chosen ? 'is-current' : ''}>
        <TeamMark team={candidate}/>
        <span><b>{upper(candidate.name)}</b><small>{[...candidate.reasons.map(upper), candidate.pointsAtUs ? 'TE TIENE DE DERBI' : null].filter(Boolean).join(' · ') || 'SIN VÍNCULO DE BARRIO'}</small></span>
        {candidate.suggested && !candidate.chosen && <Chip tone="navy" icon="bolt">SUGERIDO</Chip>}
        {candidate.chosen
          ? <Button size="sm" variant="ghost" disabled={choose.loading} onClick={() => choose.execute({ rivalTeamId: candidate.teamId, on: false })}>SACAR</Button>
          : picking === candidate.teamId
            ? <ConfirmStep message={`¿Sumar a ${upper(candidate.name)} como derbi?`} confirmLabel="SÍ" busy={choose.loading} onConfirm={() => choose.execute({ rivalTeamId: candidate.teamId, on: true })} onCancel={() => setPicking(null)}/>
            : <Button size="sm" variant="ghost" disabled={full} title={full ? `Ya tienes ${derbi.max}: saca uno primero` : undefined} onClick={() => setPicking(candidate.teamId)}>SUMAR</Button>}
      </li>)}</ul>
      {choose.error && <Notice tone="error">{choose.error.message}</Notice>}
    </Card>}
  </>;
}

/** Las rivalidades del club: clásicos (natural y elegido), superclásico, derbi, sus nombres y el cara a cara; el presi elige cuando quiera. */
export function RivalryTab({ team, teams = [] }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const toast = useToast();
  const query = useApiQuery(signal => endpoints.teamRivalry(team.id, signal), [team.id]);
  const [picking, setPicking] = useState(null);
  const [viewing, setViewing] = useState(null);
  const choose = useApiMutation((rivalTeamId, signal) => endpoints.setRival(team.id, rivalTeamId, signal), {
    onSuccess: result => { setPicking(null); toast({ tone: 'success', title: result?.data?.chosen ? `ELEGISTE A ${upper(result.data.chosen.name)} COMO CLÁSICO` : 'Quitaste el clásico elegido: queda el natural' }); query.retry(); },
  });
  const data = query.data;
  if (!data) return <DataState query={query}/>;
  const byId = new Map(teams.map(item => [item.id, item]));
  const rivals = (data.rivals ?? []).map(item => ({ ...item, club: { ...item.club, ...(byId.get(item.club.id) ?? {}) } }));
  // El cara a cara que se mira: el que tocó el presi, o el principal (el elegido, si hay).
  const shown = rivals.find(item => item.club.id === viewing) ?? rivals.find(item => item.club.id === data.rival?.id) ?? rivals[0] ?? null;
  const rival = shown?.club ?? null;
  const h2h = shown?.headToHead ?? null;
  const streak = h2h?.streak ? `${h2h.streak.count} PARTIDO${h2h.streak.count === 1 ? '' : 'S'} ${h2h.streak.kind === 'sin_perder' ? 'SIN PERDER' : 'SIN GANAR'}` : null;
  return <section className="rivalry-tab">
    {!rivals.length ? <EmptyState icon="fire" title="SIN CLÁSICO TODAVÍA">FALTAN PARTIDOS PARA QUE NAZCA UNA RIVALIDAD. {canEdit ? 'Puedes elegir un rival abajo.' : ''}</EmptyState>
      : rivals.map(item => <Card key={item.club.id} tone="navy" className={`rivalry-hero ${item.superclasico ? 'is-official is-super' : ''} ${rivals.length > 1 && shown?.club.id === item.club.id ? 'is-shown' : ''}`}>
        <div className="rivalry-side"><TeamMark team={team} className="rivalry-crest"/><b>{upper(team.name)}</b></div>
        <div className="rivalry-vs">
          <Icon name={item.superclasico ? 'crown' : 'fire'} size={28}/>
          <strong>VS</strong>
          <Chip tone={item.superclasico ? 'yellow' : 'red'} icon={item.superclasico ? 'crown' : 'fire'}>{item.superclasico ? 'EL SUPERCLÁSICO' : item.mutual ? 'CLÁSICO DE LOS DOS' : 'CLÁSICO DE UN LADO'}</Chip>
          <small>{kindsText(item.kinds)}{item.derbi ? ' · TAMBIÉN DERBI' : ''}</small>
          <RivalryName team={team} other={item.club} naming={item.naming} canEdit={canEdit} onChanged={query.retry}/>
          {rivals.length > 1 && shown?.club.id !== item.club.id && <Button size="sm" variant="ghost" onClick={() => setViewing(item.club.id)}>VER CARA A CARA</Button>}
        </div>
        <div className="rivalry-side"><EntityLink to="team" id={item.club.id}><TeamMark team={item.club} className="rivalry-crest"/></EntityLink><b>{upper(item.club.name)}</b></div>
      </Card>)}
    {rivals.length > 1 && rival && <p className="club-life-hint">CARA A CARA CON {upper(rival.name)}.</p>}
    {h2h && h2h.played > 0 && <div className="rivalry-grid">
      <Card title="CARA A CARA"><Record h2h={h2h}/>
        {h2h.last.length > 0 && <div className="h2h-last" aria-label="Últimos cruces">{h2h.last.map(game => <EntityLink key={game.matchId} to="match" id={game.matchId} className={`club-form-pill form-${game.result}`} title={gameText(game)}>{game.result}</EntityLink>)}</div>}
        {streak && <p className="h2h-streak"><Icon name={h2h.streak.kind === 'sin_perder' ? 'star' : 'warning'} size={14}/> VAS {streak}</p>}
      </Card>
      <Card title="LOS RÉCORDS">
        <dl className="h2h-facts">
          <div><dt>MAYOR GOLEADA A FAVOR</dt><dd>{h2h.biggestWin ? <EntityLink to="match" id={h2h.biggestWin.matchId}>{gameText(h2h.biggestWin)}</EntityLink> : '—'}</dd></div>
          <div><dt>MAYOR GOLEADA EN CONTRA</dt><dd>{h2h.biggestLoss ? <EntityLink to="match" id={h2h.biggestLoss.matchId}>{gameText(h2h.biggestLoss)}</EntityLink> : '—'}</dd></div>
          <div><dt>ELIMINATORIAS</dt><dd>{h2h.knockouts.played ? `${h2h.knockouts.wins} GANADAS · ${h2h.knockouts.losses} PERDIDAS` : 'NUNCA SE CRUZARON'}</dd></div>
          <div><dt>FINALES</dt><dd>{h2h.finals.played ? `${h2h.finals.played} (${h2h.finals.wins} GANADAS)` : 'NINGUNA'}</dd></div>
          <div><dt>CRUZARON LA VEREDA</dt><dd>{h2h.transfers ? `${h2h.transfers} TRASPASO${h2h.transfers === 1 ? '' : 'S'} ENTRE AMBOS` : 'NADIE'}</dd></div>
        </dl>
      </Card>
    </div>}
    <Card title="QUÉ MUEVE CADA RIVALIDAD">
      <ul className="rivalry-effects">
        <li><Icon name="fire" size={16}/> <b>Clásico:</b> la demanda de entradas sube 60%; ganarlo suma hinchas y ánimo más que cualquier partido y perderlo duele el doble. Un jugador duda antes de irse al clásico rival.</li>
        <li><Icon name="crown" size={16}/> <b>El Superclásico:</b> uno solo en toda la liga, el que define la administración. La demanda sube 90%, el estadio casi se llena y la noticia sale con su etiqueta.</li>
        <li><Icon name="bolt" size={16}/> <b>Derbis</b> (hasta 3 por club): viaja el triple de hinchada visitante, el estadio llena al menos el 85% y la visita se lleva el 20% de la taquilla. Ganarlo o perderlo mueve a la hinchada casi como un clásico.</li>
        <li><Icon name="star" size={16}/> <b>Clásico y derbi a la vez:</b> el partido del año. Todo un poco más fuerte.</li>
      </ul>
    </Card>
    {data.admirers?.length > 0 && <p className="club-life-hint"><Icon name="fire" size={12}/> TE TIENEN DE RIVAL: {data.admirers.map(club => upper(club.name)).join(' · ')}.</p>}
    {canEdit && <Card title="ELEGIR CLÁSICO" aside={<Chip icon="check">Lo cambias cuando quieras</Chip>}>
      <p className="club-life-hint">Además del rival natural (que sale solo del historial), eliges uno: los dos partidos son clásico. Puede ser el mismo. El puntaje sale del historial: partidos, eliminatorias, finales, goleadas y traspasos entre ambos.</p>
      <ul className="rival-candidates">{data.candidates.map(candidate => {
        const max = Math.max(1, ...data.candidates.map(item => item.score));
        const current = data.chosen?.id === candidate.teamId;
        return <li key={candidate.teamId} className={current ? 'is-current' : ''}>
          <TeamMark team={candidate}/>
          <span><b>{upper(candidate.name)}</b><small>{candidate.matches} PARTIDOS{candidate.pointsAtUs ? ' · TE TIENE DE RIVAL' : ''}{data.natural?.id === candidate.teamId ? ' · TU NATURAL' : ''}</small></span>
          <span className="rival-score" aria-label={`Puntaje ${candidate.score}`}><span style={{ width: `${candidate.score / max * 100}%` }}/></span>
          {current ? <Chip tone="red" icon="fire">ELEGIDO</Chip>
            : picking === candidate.teamId
              ? <ConfirmStep message={`¿Elegir a ${upper(candidate.name)} como tu clásico? Lo puedes cambiar cuando quieras.`} confirmLabel="SÍ, ELEGIRLO" busy={choose.loading} onConfirm={() => choose.execute(candidate.teamId)} onCancel={() => setPicking(null)}/>
              : <Button size="sm" variant="ghost" onClick={() => setPicking(candidate.teamId)}>ELEGIR</Button>}
        </li>;
      })}</ul>
      {data.chosen && <Button variant="ghost" size="sm" disabled={choose.loading} onClick={() => choose.execute(null)}>QUITAR EL ELEGIDO ({upper(data.chosen.name)}){data.natural ? ` · QUEDA EL NATURAL: ${upper(data.natural.name)}` : ''}</Button>}
      {choose.error && <Notice tone="error">{choose.error.message}</Notice>}
    </Card>}
    <DerbySection team={team} data={data} canEdit={canEdit} onChanged={query.retry}/>
  </section>;
}
