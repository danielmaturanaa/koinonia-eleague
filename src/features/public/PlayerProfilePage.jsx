import { endpoints } from '../../api/endpoints.js';
import { EntityLink } from '../../components/EntityLink.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { DataState, OverallBadge, gp } from './DataStates.jsx';
import { PlayerActions, PlayerAdmin } from './PlayersPage.jsx';
import { LinkedCardDetails } from './EfootballCard.jsx';
import { useApiQuery } from './useApiQuery.js';
import { addToComparison, comparisonCandidate, readComparison, writeComparison } from '../../utils/playerComparison.js';

export function PlayerProfilePage({ playerId, teams = [], onBack, backLabel = '← VOLVER A JUGADORES' }) {
  const profile = useApiQuery(signal => endpoints.player(playerId, signal), [playerId]);
  const player = profile.data;
  const colors = player?.team?.colors ?? {};
  // Suma al jugador a la selección del comparador y abre la pestaña Comparador.
  const compare = current => {
    writeComparison(addToComparison(readComparison(), comparisonCandidate({ playerId: current.id, pesId: current.efootballPesId, variation: current.efootballVariation, name: current.name, faceUrl: current.faceUrl })));
    window.location.hash = '/equipos/jugadores?tab=comparador';
  };
  const cardStyle = { '--club-primary': colors.primary ?? '#062764', '--club-secondary': colors.secondary ?? '#10285b', '--club-tertiary': colors.tertiary ?? '#ffd42a' };
  return <main className="newspaper data-page player-profile-page"><section className="data-paper">
    <div className="player-profile-actions"><button className="back-button" onClick={onBack}>{backLabel}</button>{player && <button type="button" className="action-button" onClick={() => compare(player)}>⇄ COMPARAR</button>}</div><DataState query={profile}/>
    {player && <article className="player-profile-card" style={cardStyle}><header>{player.team?.imageUrl && <img className="player-banner-team-mark" src={player.team.imageUrl} alt="" onError={event => { event.currentTarget.hidden = true; }}/>}<div className="player-profile-portrait"><PlayerFace src={player.faceUrl} name={player.name} className="player-profile-face"/></div><div className="player-profile-heading"><small>FICHA DE JUGADOR</small><h1>{player.name}</h1><p className="player-profile-chips"><em>{player.position ?? '—'}</em><OverallBadge value={player.external?.overall}/><strong>{gp(player.gpValue)}</strong><span>{player.team?.name ?? 'AGENTE LIBRE'}</span></p></div></header>
      <dl className="player-profile-facts"><div><dt>EQUIPO</dt><dd className="player-team-value"><EntityLink to="team" id={player.team?.id}>{player.team?.imageUrl && <img src={player.team.imageUrl} alt="" onError={event => { event.currentTarget.hidden = true; }}/>} {player.team?.name ?? 'AGENTE LIBRE'}</EntityLink></dd></div><div><dt>POSICIÓN</dt><dd>{player.position ?? '—'}</dd></div><div><dt>MEDIA eFOOTBALL</dt><dd><OverallBadge value={player.external?.overall}/></dd></div><div><dt>NACIONALIDAD</dt><dd>{player.flag && <i className="player-flag">{player.flag}</i>} {player.nationality ?? player.external?.nationality ?? 'NO INFORMADA'}</dd></div><div><dt>VALOR LIGA</dt><dd>{gp(player.gpValue)}</dd></div><div><dt>VALOR eFOOTBALLDB</dt><dd>{player.external ? gp(player.external.gpPrice) : '—'}</dd></div><div><dt>GOLES HISTÓRICOS</dt><dd>{player.goals ?? 0}</dd></div></dl>
      <section className="player-tournament-form"><header><h2>RENDIMIENTO EN TORNEOS ACTIVOS</h2><small>GOLES REGISTRADOS</small></header>{player.activeGoals?.length ? <div>{player.activeGoals.map(tournament => <article key={tournament.name}><b>{tournament.name}</b><strong>{tournament.goals} GOL{tournament.goals === 1 ? '' : 'ES'}</strong></article>)}</div> : <p>AÚN NO REGISTRA GOLES EN UN TORNEO ACTIVO.</p>}</section>
      {player.efootballPesId && <p className="player-data-source-note">FICHA, FOTO Y MEDIA SE ACTUALIZAN CON EL CATÁLOGO eFOOTBALLDB. EL VALOR GP DE LA LIGA SE MANTIENE SIN CAMBIOS.</p>}
      {player.efootballPesId && <LinkedCardDetails pesId={player.efootballPesId} variation={player.efootballVariation ?? 0}/>}
      <details className="player-management"><summary>GESTIÓN DEL JUGADOR</summary><div><PlayerActions key={`actions-${player.team?.id ?? 'free'}`} player={player} teams={teams} onChanged={() => profile.retry()}/><PlayerAdmin key={`admin-${player.id}-${player.gpValue}`} player={player} onChanged={() => profile.retry()}/></div></details>
    </article>}
  </section></main>;
}
