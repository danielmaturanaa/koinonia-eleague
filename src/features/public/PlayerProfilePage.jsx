import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { boosterText, hasCoachBoost } from '../../utils/managerBoosters.js';
import { EntityLink } from '../../components/EntityLink.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { DataState, OverallBadge, gp } from './DataStates.jsx';
import { PlayerActions, PlayerAdmin } from './PlayersPage.jsx';
import { useAuth } from '../../app/AuthGate.jsx';
import { LinkedCardDetails } from './EfootballCard.jsx';
import { useApiQuery } from './useApiQuery.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { addToComparison, comparisonCandidate, readComparison, writeComparison } from '../../utils/playerComparison.js';

/** En la ficha de un agente libre, un presi le abre una encuesta de compra a su valor. */
function OpenPollFromProfile({ player }) {
  const { teamId: myTeamId } = useAuth();
  const [done, setDone] = useState(false);
  const open = useApiMutation((body, signal) => endpoints.openPoll(body, signal), { onSuccess: () => setDone(true) });
  if (!myTeamId || player.team) return null;
  if (done) return <p className="profile-poll done" role="status">✅ ENCUESTA ABIERTA POR {gp(player.gpValue)}. LA VES EN MERCADO → ENCUESTAS Y EN DISCORD. <a href="#/transferencias">IR A ENCUESTAS →</a></p>;
  return <div className="profile-poll">
    <button type="button" className="action-button positive" disabled={open.loading} onClick={() => { try { window.sessionStorage.setItem('mercado-pestana', 'encuestas'); } catch { /* sin almacenamiento */ } open.execute({ playerId: player.id, teamId: myTeamId }); }}>
      {open.loading ? 'ABRIENDO…' : `🗳️ ABRIR ENCUESTA · ${gp(player.gpValue)}`}
    </button>
    {open.error && <p className="form-feedback error" role="alert">{open.error.message}</p>}
  </div>;
}

/** En la ficha de un jugador de otro club: hacer oferta (abre el formulario con el jugador elegido) y seguirlo. */
function ClubActionsFromProfile({ player }) {
  const { teamId: myTeamId } = useAuth();
  const watchlist = useApiQuery(signal => (myTeamId ? endpoints.teamWatchlist(myTeamId, signal).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })), [myTeamId]);
  const watching = (Array.isArray(watchlist.data) ? watchlist.data : []).some(row => (row.playerId ?? row.id) === player.id);
  const toggle = useApiMutation((_, signal) => (watching ? endpoints.unwatchPlayer(myTeamId, player.id, signal) : endpoints.watchPlayer(myTeamId, player.id, signal)), { onSuccess: () => watchlist.retry() });
  if (!myTeamId || player.team?.id === myTeamId) return null;
  return <>
    {player.team && <a className="action-button positive" href={`#/transferencias?tab=ofertas&jugador=${encodeURIComponent(player.id)}&club=${encodeURIComponent(player.team.id)}`}>🤝 HACER OFERTA</a>}
    <button type="button" className="action-button" disabled={toggle.loading || watchlist.loading} aria-pressed={watching} onClick={() => toggle.execute()}>{watching ? '★ SIGUIENDO' : '☆ SEGUIR'}</button>
  </>;
}

export function PlayerProfilePage({ playerId, teams = [], onBack, backLabel = '← VOLVER A JUGADORES' }) {
  const { isAdmin } = useAuth();
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
    <div className="player-profile-actions"><button className="back-button" onClick={onBack}>{backLabel}</button>{player && <button type="button" className="action-button" onClick={() => compare(player)}>⇄ COMPARAR</button>}{player && <OpenPollFromProfile player={player}/>}{player && <ClubActionsFromProfile player={player}/>}</div><DataState query={profile}/>
    {player && <article className="player-profile-card" style={cardStyle}><header>{player.team?.imageUrl && <img className="player-banner-team-mark" src={player.team.imageUrl} alt="" onError={event => { event.currentTarget.hidden = true; }}/>}<div className="player-profile-portrait"><PlayerFace src={player.faceUrl} name={player.name} className="player-profile-face"/></div><div className="player-profile-heading"><small>FICHA DE JUGADOR</small><h1>{player.name}</h1><p className="player-profile-chips"><em>{player.position ?? '—'}</em><OverallBadge value={player.external?.overall}/><strong>{gp(player.gpValue)}</strong><span>{player.team?.name ?? 'AGENTE LIBRE'}</span></p></div></header>
      <dl className="player-profile-facts"><div><dt>EQUIPO</dt><dd className="player-team-value"><EntityLink to="team" id={player.team?.id}>{player.team?.imageUrl && <img src={player.team.imageUrl} alt="" onError={event => { event.currentTarget.hidden = true; }}/>} {player.team?.name ?? 'AGENTE LIBRE'}</EntityLink></dd></div><div><dt>POSICIÓN</dt><dd>{player.position ?? '—'}</dd></div><div><dt>MEDIA eFOOTBALL</dt><dd><OverallBadge value={player.external?.overall}/>{hasCoachBoost({ overall: player.external?.overall, overallWithCoach: player.external?.overallWithCoach }) && <span className="ovr-coach-note" title={`Potenciadores de ${player.coachManager?.name ?? 'su DT'}: ${(player.coachManager?.boosters ?? []).map(boosterText).join(', ')}`}> → <b>{player.external.overallWithCoach}</b> CON DT</span>}</dd></div><div><dt>NACIONALIDAD</dt><dd>{player.flag && <i className="player-flag">{player.flag}</i>} {player.nationality ?? player.external?.nationality ?? 'NO INFORMADA'}</dd></div><div><dt>VALOR LIGA</dt><dd>{gp(player.gpValue)}</dd></div><div><dt>VALOR eFOOTBALLDB</dt><dd>{player.external ? gp(player.external.gpPrice) : '—'}</dd></div><div><dt>GOLES HISTÓRICOS</dt><dd>{player.goals ?? 0}</dd></div></dl>
      <section className="player-tournament-form"><header><h2>RENDIMIENTO EN TORNEOS ACTIVOS</h2><small>GOLES REGISTRADOS</small></header>{player.activeGoals?.length ? <div>{player.activeGoals.map(tournament => <article key={tournament.name}><b>{tournament.name}</b><strong>{tournament.goals} GOL{tournament.goals === 1 ? '' : 'ES'}</strong></article>)}</div> : <p>AÚN NO REGISTRA GOLES EN UN TORNEO ACTIVO.</p>}</section>
      {player.efootballPesId && <p className="player-data-source-note">FICHA, FOTO Y MEDIA SE ACTUALIZAN CON EL CATÁLOGO eFOOTBALLDB. EL VALOR GP DE LA LIGA SE MANTIENE SIN CAMBIOS.</p>}
      {player.efootballPesId && <LinkedCardDetails pesId={player.efootballPesId} variation={player.efootballVariation ?? 0}/>}
      {isAdmin && <details className="player-management"><summary>GESTIÓN DEL JUGADOR</summary><div><PlayerActions key={`actions-${player.team?.id ?? 'free'}`} player={player} teams={teams} onChanged={() => profile.retry()}/><PlayerAdmin key={`admin-${player.id}-${player.gpValue}`} player={player} onChanged={() => profile.retry()}/></div></details>}
    </article>}
  </section></main>;
}
