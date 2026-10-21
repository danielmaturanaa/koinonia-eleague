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
const SOURCE = { elegido: 'ELEGIDO POR EL PRESI', natural: 'RIVAL NATURAL (POR EL HISTORIAL)' };

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

/** El clásico del club: su rival, el cara a cara completo y, para el presi, elegir otro (una vez por temporada). */
export function RivalryTab({ team, teams = [] }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const toast = useToast();
  const query = useApiQuery(signal => endpoints.teamRivalry(team.id, signal), [team.id]);
  const [picking, setPicking] = useState(null);
  const choose = useApiMutation((rivalTeamId, signal) => endpoints.setRival(team.id, rivalTeamId, signal), {
    onSuccess: result => { setPicking(null); toast({ tone: 'success', title: result?.data?.rival ? `TU CLÁSICO AHORA ES ${upper(result.data.rival.name)}` : 'Volviste al rival natural' }); query.retry(); },
  });
  const data = query.data;
  if (!data) return <DataState query={query}/>;
  const byId = new Map(teams.map(item => [item.id, item]));
  const rival = data.rival ? { ...data.rival, ...(byId.get(data.rival.id) ?? {}) } : null;
  const h2h = data.headToHead;
  const streak = h2h?.streak ? `${h2h.streak.count} PARTIDO${h2h.streak.count === 1 ? '' : 'S'} ${h2h.streak.kind === 'sin_perder' ? 'SIN PERDER' : 'SIN GANAR'}` : null;
  return <section className="rivalry-tab">
    {!rival ? <EmptyState icon="fire" title="SIN CLÁSICO TODAVÍA">FALTAN PARTIDOS PARA QUE NAZCA UNA RIVALIDAD. {canEdit ? 'Puedes elegir un rival abajo.' : ''}</EmptyState>
      : <Card tone="navy" className={`rivalry-hero ${data.official ? 'is-official' : ''}`}>
        <div className="rivalry-side"><TeamMark team={team} className="rivalry-crest"/><b>{upper(team.name)}</b></div>
        <div className="rivalry-vs">
          <Icon name="fire" size={28}/>
          <strong>VS</strong>
          <Chip tone={data.official ? 'red' : 'yellow'}>{data.official ? 'CLÁSICO OFICIAL' : 'RIVALIDAD DE UN LADO'}</Chip>
          <small>{SOURCE[data.source] ?? ''}</small>
        </div>
        <div className="rivalry-side"><EntityLink to="team" id={rival.id}><TeamMark team={rival} className="rivalry-crest"/></EntityLink><b>{upper(rival.name)}</b></div>
      </Card>}
    {rival && !data.official && <p className="club-life-hint">{upper(rival.name)} TIENE OTRO RIVAL. SI LOS DOS SE ELIGEN, ES CLÁSICO OFICIAL: LA TAQUILLA Y LA HINCHADA SE MUEVEN TODAVÍA MÁS.</p>}
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
    <Card title="QUÉ MUEVE UN CLÁSICO">
      <ul className="rivalry-effects">
        <li><Icon name="ticket" size={16}/> La demanda de entradas sube 60% (90% si es oficial).</li>
        <li><Icon name="people" size={16}/> Ganarlo suma hinchas y ánimo más que cualquier partido; perderlo duele el doble.</li>
        <li><Icon name="handshake" size={16}/> Un jugador duda antes de irse al clásico rival, y si va, llega mirado de reojo.</li>
      </ul>
    </Card>
    {data.admirers?.length > 0 && <p className="club-life-hint"><Icon name="fire" size={12}/> TE TIENEN DE RIVAL: {data.admirers.map(club => upper(club.name)).join(' · ')}.</p>}
    {canEdit && <Card title="ELEGIR CLÁSICO" aside={<Chip icon={data.canChange ? 'check' : 'lock'}>{data.canChange ? 'Puedes cambiarlo una vez esta temporada' : 'YA LO CAMBIASTE ESTA TEMPORADA'}</Chip>}>
      <p className="club-life-hint">El puntaje sale del historial: partidos, eliminatorias, finales, goleadas y traspasos entre ambos (más alto si la rivalidad es pareja).</p>
      <ul className="rival-candidates">{data.candidates.map(candidate => {
        const max = Math.max(1, ...data.candidates.map(item => item.score));
        const current = rival?.id === candidate.teamId;
        return <li key={candidate.teamId} className={current ? 'is-current' : ''}>
          <TeamMark team={candidate}/>
          <span><b>{upper(candidate.name)}</b><small>{candidate.matches} PARTIDOS{candidate.pointsAtUs ? ' · TE TIENE DE RIVAL' : ''}{data.natural?.id === candidate.teamId ? ' · NATURAL' : ''}</small></span>
          <span className="rival-score" aria-label={`Puntaje ${candidate.score}`}><span style={{ width: `${candidate.score / max * 100}%` }}/></span>
          {current ? <Chip tone="red" icon="fire">TU CLÁSICO</Chip>
            : data.canChange && (picking === candidate.teamId
              ? <ConfirmStep message={`¿${upper(candidate.name)} es tu clásico? No podrás cambiarlo hasta la próxima temporada.`} confirmLabel="SÍ, ES MI CLÁSICO" busy={choose.loading} onConfirm={() => choose.execute(candidate.teamId)} onCancel={() => setPicking(null)}/>
              : <Button size="sm" variant="ghost" onClick={() => setPicking(candidate.teamId)}>ELEGIR</Button>)}
        </li>;
      })}</ul>
      {data.source === 'elegido' && data.canChange && data.natural && data.natural.id !== rival?.id && <Button variant="ghost" size="sm" disabled={choose.loading} onClick={() => choose.execute(null)}>VOLVER AL NATURAL ({upper(data.natural.name)})</Button>}
      {choose.error && <Notice tone="error">{choose.error.message}</Notice>}
    </Card>}
  </section>;
}
