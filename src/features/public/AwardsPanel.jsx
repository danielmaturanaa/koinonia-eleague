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
    default: return detail.votes !== undefined ? plural(detail.votes, 'voto', 'votos') : '';
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
    <HowItWorks><p>Al terminar el torneo se entregan solos la <b>Bota de Oro</b> (el goleador), el <b>Guante de Oro</b> (el arquero de la valla menos batida en la liga), el <b>Golden Boy</b> (el mejor de 21 años o menos) y el <b>DT del torneo</b> (el que más superó lo que le pedía su directiva).</p><p>El <b>Balón de Oro</b> lo votan los presis durante 3 días, sin poder votar por los suyos. El ganador es la portada del <b>EA FC</b>, y la del <b>eFootball</b> va al más votado de otro club. Los premios no cambian el precio de nadie: suben el ánimo del jugador y quedan en su ficha.</p></HowItWorks>
  </section>;
}

function BallonVote({ tournament, voting, onVoted }) {
  const { isAdmin } = useAuth();
  const myVote = voting.myVotes?.[0] ?? null;
  const vote = useApiMutation((body, signal) => endpoints.voteBallon(tournament.id, body, signal), { onSuccess: onVoted });
  const close = useApiMutation(signal => endpoints.closeBallon(tournament.id, signal), { onSuccess: onVoted });
  const teamId = voting.voterTeamId;
  return <Card tone="navy" className="ballon-vote" title="VOTA EL BALÓN DE ORO" aside={<Chip icon="clock">CIERRA EN {closesIn(voting.closesAt)}</Chip>}>
    <p className="ballon-vote-count">VOTARON {voting.voted} DE {voting.voters} CLUBES. Mientras está abierta no se ve quién va ganando.</p>
    <ul className="ballon-shortlist">{voting.shortlist.map(candidate => {
      const own = candidate.teamId === teamId;
      const chosen = myVote?.playerId === candidate.playerId;
      return <li key={candidate.playerId} className={`${chosen ? 'is-chosen' : ''} ${own ? 'is-own' : ''}`}>
        <div><EntityLink to="player" id={candidate.playerId}><b>{upper(candidate.name)}</b></EntityLink><small>{upper(candidate.teamName)} · {upper(candidate.reasons.join(' · '))}</small></div>
        {teamId && (own
          ? <small className="ballon-own">TU CLUB</small>
          : <Button size="sm" variant={chosen ? 'primary' : 'ghost'} disabled={vote.loading || chosen} onClick={() => vote.execute({ teamId, playerId: candidate.playerId })}>{chosen ? 'TU VOTO' : 'VOTAR'}</Button>)}
      </li>;
    })}</ul>
    {!teamId && <p className="club-life-hint">Votan los presis de los clubes que jugaron el torneo.</p>}
    {vote.error && <Notice tone="error">{vote.error.message}</Notice>}
    {isAdmin && <Button size="sm" variant="ghost" icon="gavel" disabled={close.loading} onClick={() => close.execute()}>CERRAR LA VOTACIÓN AHORA</Button>}
    {close.error && <Notice tone="error">{close.error.message}</Notice>}
  </Card>;
}

function BallonResults({ voting }) {
  const ranked = voting.shortlist.filter(candidate => candidate.votes).sort((a, b) => b.votes - a.votes);
  if (!ranked.length) return null;
  return <Card title="VOTACIÓN DEL BALÓN DE ORO" className="ballon-results">
    <ol>{ranked.map(candidate => <li key={candidate.playerId}><span>{upper(candidate.name)} <small>{upper(candidate.teamName)}</small></span><b>{plural(candidate.votes, 'VOTO', 'VOTOS')}</b></li>)}</ol>
  </Card>;
}
