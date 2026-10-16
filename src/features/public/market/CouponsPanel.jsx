import { useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useApiMutation } from '../../admin/useApiMutation.js';
import { gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();

/** Un cupón disponible: eliges al jugador, ves cuánto queda valiendo y confirmas. */
function CouponUse({ coupon, players, onUsed }) {
  const [playerId, setPlayerId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const use = useApiMutation((body, signal) => endpoints.useCoupon(coupon.id, body, signal), { onSuccess: onUsed });
  const player = players.find(item => item.id === playerId);
  const after = player ? Math.round(player.gpValue * (100 - coupon.percent) / 100) : null;
  return <article className="coupon-card">
    <header><b>🎟️ REBAJA SALARIAL {coupon.percent}%</b>{coupon.reason && <small>{upper(coupon.reason)}</small>}</header>
    <label>JUGADOR<select value={playerId} onChange={event => { setPlayerId(event.target.value); setConfirming(false); }}>
      <option value="">ELEGIR JUGADOR</option>
      {players.map(item => <option key={item.id} value={item.id}>{item.name} · {item.position} · {gp(item.gpValue)}</option>)}
    </select></label>
    {player && <p className="coupon-preview">{upper(player.name)}: {gp(player.gpValue)} → <b>{gp(after)}</b> (LIBERAS {gp(player.gpValue - after)} DEL TOPE)</p>}
    {confirming
      ? <div className="offer-confirm" role="group" aria-label="CONFIRMAR CUPÓN">
        <span>¿USAR EL CUPÓN EN {upper(player?.name)}? NO SE DESHACE, Y A ÉL YA NO SE LE PODRÁ REBAJAR DE NUEVO EN TU CLUB.</span>
        <div className="mini-actions">
          <button type="button" disabled={use.loading} onClick={() => use.execute({ playerId })}>{use.loading ? 'APLICANDO…' : 'SÍ, USAR'}</button>
          <button type="button" className="ghost" disabled={use.loading} onClick={() => setConfirming(false)}>VOLVER</button>
        </div>
      </div>
      : <button type="button" className="action-button positive" disabled={!player} onClick={() => setConfirming(true)}>USAR CUPÓN</button>}
    {use.error && <p className="form-feedback error" role="alert">{use.error.message}</p>}
  </article>;
}

/** Cupones de Rebaja Salarial del club (premios de torneo). Si no tiene ninguno, no se muestra. */
export function CouponsPanel({ teamId, revision = 0, onChanged }) {
  const query = useApiQuery(signal => teamId ? endpoints.teamCoupons(teamId, signal).catch(() => ({ data: null })) : Promise.resolve({ data: null }), [teamId, revision]);
  const coupons = query.data?.coupons ?? [];
  if (!coupons.length) return null;
  const available = coupons.filter(item => item.status === 'available');
  const used = coupons.filter(item => item.status === 'used');
  const players = query.data?.eligiblePlayers ?? [];
  const refresh = () => { query.retry(); onChanged?.(); };
  return <section className="market-section market-coupons">
    <header><h2>🎟️ CUPONES DE REBAJA SALARIAL <small>{available.length}</small></h2><p>BAJAN EL VALOR DE UN JUGADOR DE TU PLANTEL EN SU PORCENTAJE (Y TE DEJAN MÁS MARGEN BAJO EL TOPE). CADA JUGADOR PUEDE RECIBIR UNA SOLA REBAJA MIENTRAS ESTÉ EN TU CLUB.</p></header>
    {available.length > 0 && (players.length
      ? <div className="coupon-list">{available.map(coupon => <CouponUse key={coupon.id} coupon={coupon} players={players} onUsed={refresh}/>)}</div>
      : <p className="empty-copy">TODOS TUS JUGADORES YA TUVIERON SU REBAJA EN ESTE CLUB.</p>)}
    {used.length > 0 && <ul className="coupon-used">{used.map(coupon => <li key={coupon.id}>✅ {coupon.percent}% · {coupon.player?.name ?? 'JUGADOR'}: {gp(coupon.oldValue)} → {gp(coupon.newValue)}</li>)}</ul>}
  </section>;
}
