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

/** Los clásicos del club: el natural y el elegido (pueden ser el mismo), el cara a cara de cada uno y, para el presi, elegir cuando quiera. */
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
      : rivals.map(item => <Card key={item.club.id} tone="navy" className={`rivalry-hero ${item.official ? 'is-official' : ''} ${rivals.length > 1 && shown?.club.id === item.club.id ? 'is-shown' : ''}`}>
        <div className="rivalry-side"><TeamMark team={team} className="rivalry-crest"/><b>{upper(team.name)}</b></div>
        <div className="rivalry-vs">
          <Icon name="fire" size={28}/>
          <strong>VS</strong>
          <Chip tone={item.official ? 'red' : 'yellow'}>{item.official ? 'CLÁSICO OFICIAL' : 'RIVALIDAD DE UN LADO'}</Chip>
          <small>{kindsText(item.kinds)}</small>
          {rivals.length > 1 && shown?.club.id !== item.club.id && <Button size="sm" variant="ghost" onClick={() => setViewing(item.club.id)}>VER CARA A CARA</Button>}
        </div>
        <div className="rivalry-side"><EntityLink to="team" id={item.club.id}><TeamMark team={item.club} className="rivalry-crest"/></EntityLink><b>{upper(item.club.name)}</b></div>
      </Card>)}
    {rivals.some(item => !item.official) && <p className="club-life-hint">SI LOS DOS CLUBES SE TIENEN DE RIVAL (NATURAL O ELEGIDO), ES CLÁSICO OFICIAL: LA TAQUILLA Y LA HINCHADA SE MUEVEN TODAVÍA MÁS.</p>}
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
    <Card title="QUÉ MUEVE UN CLÁSICO">
      <ul className="rivalry-effects">
        <li><Icon name="ticket" size={16}/> La demanda de entradas sube 60% (90% si es oficial).</li>
        <li><Icon name="people" size={16}/> Ganarlo suma hinchas y ánimo más que cualquier partido; perderlo duele el doble.</li>
        <li><Icon name="handshake" size={16}/> Un jugador duda antes de irse al clásico rival, y si va, llega mirado de reojo.</li>
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
  </section>;
}
