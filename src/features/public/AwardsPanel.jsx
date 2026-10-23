import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { EntityLink } from '../../components/EntityLink.jsx';
import { Button, Card, Chip, EmptyState, HowItWorks, Icon, Notice, PlayerAvatar } from '../../ui/index.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();
// Orden en que se muestran los premios y su ícono.
const ORDER = [
  ['balon_oro', 'ball'], ['bota_oro', 'star'], ['guante_oro', 'shield'], ['golden_boy', 'fire'], ['dt_torneo', 'contract'], ['portada_eafc', 'camera'], ['portada_efootball', 'camera'],
];
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const detailText = award => {
  const detail = award.detail ?? {};
  switch (award.award) {
    case 'bota_oro': return plural(detail.goals ?? 0, 'gol', 'goles');
    case 'guante_oro': return `${plural(detail.conceded ?? 0, 'gol', 'goles')} en contra`;
    case 'golden_boy': return `${detail.age} años · ${plural(detail.goals ?? 0, 'gol', 'goles')}`;
    case 'dt_torneo': return detail.margin > 0 ? `superó su meta por ${plural(detail.margin, 'puesto', 'puestos')}` : 'cumplió su meta';
    case 'balon_oro': return `${pct(detail.total)} de los puntos`;
    default: return detail.votes !== undefined ? `${Number(detail.votes).toLocaleString('es-CL')} votos en X` : '';
  }
};
const closesIn = value => {
  const hours = Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 3_600_000));
  return hours >= 24 ? `${Math.round(hours / 24)} DÍAS` : `${hours} H`;
};

/** Premios individuales del torneo: Balón de Oro (lo votan los presis), Bota y Guante de Oro, Golden Boy, DT del torneo y las portadas. */
export function AwardsPanel({ tournament, resolveTeam }) {
  const query = useApiQuery(signal => endpoints.tournamentAwards(tournament.id, signal), [tournament.id]);
  const data = query.data;
  if (!data) return <section className="workspace-panel"><DataState query={query}/></section>;
  const byAward = new Map();
  for (const award of data.awards) byAward.set(award.award, [...(byAward.get(award.award) ?? []), award]);
  return <section className="workspace-panel awards-panel">
    <h3>PREMIOS DEL TORNEO</h3>
    {data.voting?.status === 'open' && <BallonVote tournament={tournament} voting={data.voting} onVoted={query.retry}/>}
    {data.awards.length
      ? <div className="awards-grid">{ORDER.filter(([key]) => byAward.has(key)).map(([key, icon]) => <Card key={key} as="article" className={`award-card award-${key}`}>
        <header><span className="award-badge" aria-hidden="true"><Icon name={icon} size={20}/></span><b>{upper(byAward.get(key)[0].label)}</b></header>
        {byAward.get(key).map(award => <div className="award-winner" key={award.playerId ?? award.coachId ?? award.teamId}>
          {award.playerId && <PlayerAvatar name={award.playerName} src={award.faceUrl}/>}
          <div>
            {award.playerId ? <EntityLink to="player" id={award.playerId}><strong>{upper(award.playerName)}</strong></EntityLink> : <strong>{upper(award.coachName)}</strong>}
            <small><EntityLink to="team" id={award.teamId}>{upper(resolveTeam?.({ id: award.teamId })?.name ?? award.teamName)}</EntityLink> · {upper(detailText(award))}</small>
          </div>
        </div>)}
      </Card>)}</div>
      : <EmptyState icon="trophy" title="TODAVÍA NO HAY PREMIOS">{tournament.status === 'completed' ? 'Este torneo terminó antes de que existieran los premios individuales.' : 'Se entregan al terminar el torneo.'}</EmptyState>}
    {data.voting?.status === 'closed' && <BallonResults voting={data.voting}/>}
    <HowItWorks><p>Al terminar el torneo se entregan solos la <b>Bota de Oro</b> (el goleador), el <b>Guante de Oro</b> (el arquero de la valla menos batida en la liga), el <b>Golden Boy</b> (el mejor de 21 años o menos) y el <b>DT del torneo</b> (el que más superó lo que le pedía su directiva).</p><p>El <b>Balón de Oro</b> lo votan 20 periodistas de la liga, todos los jugadores de los planteles (no se votan a sí mismos) y los presis, que pesan poco: es simbólico y pueden votar por los suyos. Las <b>portadas del EA FC y del eFootball</b> las vota la gente en X; cada comunidad tiene sus gustos y las dos portadas nunca quedan en el mismo club. Los premios no cambian el precio de nadie: suben el ánimo del jugador y quedan en su ficha.</p></HowItWorks>
  </section>;
}

function BallonVote({ tournament, voting, onVoted }) {
  const { isAdmin } = useAuth();
  const myVote = voting.myVotes?.[0] ?? null;
  const vote = useApiMutation((body, signal) => endpoints.voteBallon(tournament.id, body, signal), { onSuccess: onVoted });
  const close = useApiMutation(signal => endpoints.closeBallon(tournament.id, signal), { onSuccess: onVoted });
  const teamId = voting.voterTeamId;
  const weight = Math.round((voting.weights?.presidents ?? 0) * 100);
  return <Card tone="navy" className="ballon-vote" title="VOTA EL BALÓN DE ORO" aside={<Chip icon="clock">CIERRA EN {closesIn(voting.closesAt)}</Chip>}>
    <p className="ballon-vote-count">VOTAN {Math.round((voting.weights?.journalists ?? 0) * 100)}% LOS PERIODISTAS, {Math.round((voting.weights?.players ?? 0) * 100)}% LOS JUGADORES DE LA LIGA Y {weight}% LOS PRESIS (ES SIMBÓLICO). VOTARON {voting.voted} DE {voting.voters} PRESIS.</p>
    <ul className="ballon-shortlist">{voting.shortlist.map(candidate => {
      const chosen = myVote?.playerId === candidate.playerId;
      return <li key={candidate.playerId} className={chosen ? 'is-chosen' : ''}>
        <div><EntityLink to="player" id={candidate.playerId}><b>{upper(candidate.name)}</b></EntityLink><small>{upper(candidate.teamName)} · {upper(candidate.reasons.join(' · '))}</small></div>
        {teamId && <Button size="sm" variant={chosen ? 'primary' : 'ghost'} disabled={vote.loading || chosen} onClick={() => vote.execute({ teamId, playerId: candidate.playerId })}>{chosen ? 'TU VOTO' : 'VOTAR'}</Button>}
      </li>;
    })}</ul>
    {!teamId && <p className="club-life-hint">Votan los presis de los clubes que jugaron el torneo. Puedes votar por uno de los tuyos.</p>}
    {vote.error && <Notice tone="error">{vote.error.message}</Notice>}
    {isAdmin && <Button size="sm" variant="ghost" icon="gavel" disabled={close.loading} onClick={() => close.execute()}>CERRAR LA VOTACIÓN AHORA</Button>}
    {close.error && <Notice tone="error">{close.error.message}</Notice>}
  </Card>;
}

const pct = value => `${String(value ?? 0).replace('.', ',')}%`;

function BallonResults({ voting }) {
  const ballon = voting.results?.ballon;
  const covers = voting.results?.covers;
  if (!ballon) return null;
  return <>
    <Card title="ASÍ SE VOTÓ EL BALÓN DE ORO" className="ballon-results">
      <div className="ballon-table-scroll"><table className="ballon-table">
        <thead><tr><th>Jugador</th><th title={`${ballon.voters.journalists} periodistas`}>Periodistas</th><th title={`${ballon.voters.players} jugadores`}>Jugadores</th><th>Presis</th><th>Total</th></tr></thead>
        <tbody>{ballon.rows.filter(row => row.total > 0).map((row, index) => <tr key={row.playerId} className={index === 0 ? 'is-winner' : ''}>
          <td><EntityLink to="player" id={row.playerId}>{upper(row.name)}</EntityLink><small>{upper(row.teamName)}</small></td>
          <td>{pct(row.journalists)}</td><td>{pct(row.players)}</td><td>{pct(row.presidents)}</td><td><b>{pct(row.total)}</b></td>
        </tr>)}</tbody>
      </table></div>
      {ballon.sample?.length > 0 && <div className="ballon-ballots"><small>ALGUNAS PAPELETAS DE LA PRENSA</small>
        <ul>{ballon.sample.map(item => <li key={item.name}><b>{item.name}</b> <i>({item.outlet})</i>: {item.picks.join(', ')}</li>)}</ul></div>}
    </Card>
    {covers && <div className="awards-covers">{[['portada_eafc', 'PORTADA DEL EA FC'], ['portada_efootball', 'PORTADA DEL EFOOTBALL']].map(([key, title]) => <Card key={key} title={`${title} · VOTACIÓN EN X`} className="cover-poll">
      <ol>{(covers[key] ?? []).slice(0, 5).map(row => <li key={row.playerId}><span>{upper(row.name)} <small>{upper(row.teamName)}</small></span><b>{people(row.votes)}</b></li>)}</ol>
    </Card>)}</div>}
  </>;
}

const people = value => Number(value ?? 0).toLocaleString('es-CL');
