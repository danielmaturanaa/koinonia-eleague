import { endpoints } from '../../../api/endpoints.js';
import { useApiMutation } from '../../admin/useApiMutation.js';

/**
 * "ESTOY LISTO": el club avisa que ya terminó (oferta hecha y preguntas respondidas). Si cambia algo después
 * (sube la oferta, se retira, responde o deshace una respuesta) el servidor le quita el "listo".
 */
export function ReadyControl({ auction, teamId, onChanged }) {
  const ready = (auction.myReadyTeamIds ?? []).includes(teamId);
  const hasBid = (auction.myBids ?? []).some(bid => bid.teamId === teamId);
  const mutation = useApiMutation((body, signal) => endpoints.sealedAuctionAction(auction.id, 'ready', body, signal), { onSuccess: () => onChanged?.() });
  if (!hasBid) return <p className="poll-hint sealed-ready-missing">FALTA TU OFERTA PARA ESTAR LISTO.</p>;
  if (ready) {
    return <div className="sealed-ready on" role="status">
      <b>✅ ESTÁS LISTO</b>
      <p>YA NO FALTA NADA DE TU PARTE. SI CAMBIAS ALGO, TIENES QUE VOLVER A MARCARLO.</p>
      <div className="mini-actions"><button type="button" disabled={mutation.loading} onClick={() => mutation.execute({ teamId, ready: false })}>VOLVER A EDITAR</button></div>
      {mutation.error && <p className="form-feedback error" role="alert">{mutation.error.message}</p>}
    </div>;
  }
  return <div className="sealed-ready">
    <button type="button" className="action-button positive sealed-ready-btn" disabled={mutation.loading} onClick={() => mutation.execute({ teamId, ready: true })}>
      {mutation.loading ? 'MARCANDO…' : '🏁 ESTOY LISTO'}
    </button>
    <small>AVISA A TODOS QUE YA TERMINASTE: OFERTA HECHA Y PREGUNTAS RESPONDIDAS.</small>
    {mutation.error && <p className="form-feedback error" role="alert">{mutation.error.message}</p>}
  </div>;
}
