import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { gpLabel } from '../../utils/money.js';

const upper = text => String(text ?? '').toUpperCase();
const CATEGORIES = ['S', 'A', 'B', 'C', 'D'];

/** Catálogo de estadios de la liga: cada uno tiene un solo dueño y cada club puede tener uno. Comprar o cambiar mueve plata del saldo. */
export function StadiumTab({ team, balance, onChanged }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.stadiums(signal), [team.id]);
  const rows = Array.isArray(query.data) ? query.data : [];
  const mine = rows.find(row => row.teamId === team.id) ?? null;
  const [confirming, setConfirming] = useState(null);
  const act = useApiMutation((operation, signal) => operation(signal), { onSuccess: () => { setConfirming(null); query.retry(); onChanged?.(); } });
  const netCost = stadium => stadium.price - (mine?.price ?? 0);
  return <section className="stadium-tab">
    <header><h2>ESTADIO</h2><p>CADA ESTADIO TIENE UN SOLO DUEÑO Y CADA CLUB PUEDE TENER UNO. COMPRARLO DESCUENTA SU PRECIO DEL SALDO; SI YA TENÍAS UNO, SE TE REEMBOLSA A SU PRECIO Y SOLO PAGAS LA DIFERENCIA. POR AHORA ES SOLO ESTÉTICO: DA EL NOMBRE A TU ESTADIO.</p></header>
    <DataState query={query}/>
    {mine && <div className="stadium-mine"><span>🏟️ TU ESTADIO: <b>{upper(mine.name)}</b> · CATEGORÍA {mine.category} · {gpLabel(mine.price)}</span>
      {canEdit && (confirming === 'sell'
        ? <span className="offer-confirm">¿VENDERLO Y RECUPERAR {gpLabel(mine.price)}?
          <button type="button" disabled={act.loading} onClick={() => act.execute(signal => endpoints.sellStadium(team.id, signal))}>SÍ, VENDER</button>
          <button type="button" className="ghost" onClick={() => setConfirming(null)}>VOLVER</button></span>
        : <button type="button" className="ghost" onClick={() => setConfirming('sell')}>VENDER</button>)}
    </div>}
    <FormFeedback mutation={act}/>
    {CATEGORIES.map(category => {
      const items = rows.filter(row => row.category === category);
      if (!items.length) return null;
      return <div className="stadium-group" key={category}>
        <h3>CATEGORÍA {category}</h3>
        <div className="stadium-grid">{items.map(stadium => {
          const owned = stadium.teamId === team.id;
          const free = !stadium.teamId;
          const cost = netCost(stadium);
          const affordable = balance === null || balance === undefined || cost <= balance;
          return <article key={stadium.id} className={`stadium-card ${owned ? 'is-mine' : ''} ${free ? '' : 'is-taken'}`}>
            <b>{stadium.name}</b>
            <small>{upper(stadium.kind)} · {gpLabel(stadium.price)}</small>
            {owned ? <em>✅ ES TUYO</em> : free
              ? (canEdit && (confirming === stadium.id
                ? <span className="offer-confirm">{mine ? `¿CAMBIAR? PAGAS ${gpLabel(Math.max(0, cost))}${cost < 0 ? ` Y RECIBES ${gpLabel(-cost)}` : ''}.` : `¿COMPRAR POR ${gpLabel(stadium.price)}?`}
                  <button type="button" disabled={act.loading} onClick={() => act.execute(signal => endpoints.buyStadium(team.id, stadium.id, signal))}>SÍ</button>
                  <button type="button" className="ghost" onClick={() => setConfirming(null)}>VOLVER</button></span>
                : <button type="button" disabled={!affordable} title={affordable ? undefined : 'No te alcanza el saldo'} onClick={() => setConfirming(stadium.id)}>{mine ? 'CAMBIAR A ESTE' : 'COMPRAR'}</button>))
              : <em>DE {upper(stadium.teamEmoji ?? '')} {upper(stadium.teamName)}</em>}
          </article>;
        })}</div>
      </div>;
    })}
  </section>;
}
