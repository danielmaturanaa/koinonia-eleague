import { endpoints } from '../api/endpoints.js';
import { useApiMutation } from '../features/admin/useApiMutation.js';
import { Modal, Notice } from '../ui/index.js';
import { ShootoutForm } from './ShootoutForm.jsx';
import { TeamMark } from './TeamMark.jsx';

const STAGE_KIND = { preseason: 'preseason', promotion: 'promotion' };

/**
 * Se abre al finalizar un partido que necesita un clasificado (copa, giras, promoción o global de playoffs empatado):
 * quién pasó por penales y cómo terminó la tanda. Si se cierra sin anotar, la ficha deja el botón para volver a abrirlo.
 */
export function PenaltiesModal({ match, resolveTeam = team => team, onClose, onDone }) {
  const save = useApiMutation(({ winnerTeamId, penalties }, signal) => (match.playoffSeriesId
    ? endpoints.resolvePlayoffTiebreak(match.playoffSeriesId, winnerTeamId, penalties, signal)
    : endpoints.setMatchWinner(match.id, { ...(STAGE_KIND[match.stage] ? { kind: STAGE_KIND[match.stage] } : {}), winnerTeamId, penalties }, signal)),
  { onSuccess: () => { onDone?.(); onClose(); } });
  const home = resolveTeam(match.homeTeam);
  const away = resolveTeam(match.awayTeam);
  const series = Boolean(match.playoffSeriesId);
  return <Modal title="🥅 PENALES" onClose={onClose}>
    <div className="penalties-modal">
      <p className="penalties-score"><TeamMark team={home}/><b>{home.name}</b><strong>{match.homeScore}–{match.awayScore}</strong><b>{away.name}</b><TeamMark team={away}/></p>
      <p className="penalties-why">{series ? 'EL GLOBAL DE LA SERIE QUEDÓ EMPATADO.' : 'EL PARTIDO TERMINÓ EMPATADO.'} ¿QUIÉN PASÓ Y CÓMO TERMINÓ LA TANDA?</p>
      <ShootoutForm home={home} away={away} loading={save.loading} label="PENALES CONVERTIDOS POR CADA EQUIPO" onSubmit={save.execute}/>
      {save.error && <Notice tone="error">{save.error.message}</Notice>}
    </div>
  </Modal>;
}
