import { endpoints } from '../../api/endpoints.js';
import { DataState, gp } from './DataStates.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { useApiQuery } from './useApiQuery.js';

export function PlayerProfilePage({ playerId, onBack }) {
  const profile = useApiQuery(signal => endpoints.player(playerId, signal), [playerId]);
  const refresh = useApiMutation(signal => endpoints.refreshEfootballPlayer(playerId, signal), { onSuccess: () => profile.retry() });
  const player = profile.data;
  const colors = player?.team?.colors ?? {};
  const cardStyle = { '--club-primary': colors.primary ?? '#062764', '--club-secondary': colors.secondary ?? '#10285b', '--club-tertiary': colors.tertiary ?? '#ffd42a' };
  return <main className="newspaper data-page player-profile-page"><section className="data-paper">
    <button className="back-button" onClick={onBack}>← VOLVER A JUGADORES</button><DataState query={profile}/>
    {player && <article className="player-profile-card" style={cardStyle}><header>{player.team?.imageUrl && <img className="player-banner-team-mark" src={player.team.imageUrl} alt="" onError={event => { event.currentTarget.hidden = true; }}/>}<div className="player-profile-portrait">{player.faceUrl ? <img className="player-profile-face" src={player.faceUrl} alt={`Foto de ${player.name}`} onError={event => { event.currentTarget.hidden = true; }}/> : <b>{player.name.slice(0, 1)}</b>}</div><div className="player-profile-heading"><small>FICHA DE JUGADOR</small><h1>{player.name}</h1><p>{player.flag && <i className="player-flag">{player.flag}</i>} {player.nationality ?? player.external?.nationality ?? 'NACIONALIDAD NO INFORMADA'}</p></div></header>
      <dl className="player-profile-facts"><div><dt>EQUIPO</dt><dd className="player-team-value">{player.team?.imageUrl && <img src={player.team.imageUrl} alt="" onError={event => { event.currentTarget.hidden = true; }}/>} {player.team?.name ?? 'AGENTE LIBRE'}</dd></div><div><dt>POSICIÓN</dt><dd>{player.position ?? '—'}</dd></div><div><dt>VALOR LIGA</dt><dd>{gp(player.gpValue)}</dd></div><div><dt>VALOR eFOOTBALLDB</dt><dd>{player.external ? gp(player.external.gpPrice) : '—'}{player.efootballPesId && <button className="player-efootball-refresh" disabled={refresh.loading} onClick={() => refresh.execute()} title="Actualizar foto y valor desde eFootballDB">↻</button>}</dd></div><div><dt>GOLES HISTÓRICOS</dt><dd>{player.goals ?? 0}</dd></div><div><dt>GOLES / PARTIDO MARCADO</dt><dd>{player.goalsPerScoringMatch ?? 0}</dd></div></dl>
      <section className="player-tournament-form"><header><h2>RENDIMIENTO EN TORNEOS ACTIVOS</h2><small>GOLES REGISTRADOS</small></header>{player.activeGoals?.length ? <div>{player.activeGoals.map(tournament => <article key={tournament.name}><b>{tournament.name}</b><strong>{tournament.goals} GOL{tournament.goals === 1 ? '' : 'ES'}</strong></article>)}</div> : <p>AÚN NO REGISTRA GOLES EN UN TORNEO ACTIVO.</p>}<small className="player-stat-note">La liga aún no registra minutos ni alineaciones por partido; la media usa los partidos en que anotó.</small></section>
      {refresh.error && <p className="player-refresh-error">{refresh.error.message}</p>}
    </article>}
  </section></main>;
}
