import { useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { Button, Card, Chip, ConfirmStep, Icon, Notice, useToast } from '../../ui/index.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { gpLabel } from '../../utils/money.js';

const upper = text => String(text ?? '').toUpperCase();
const CATEGORIES = ['S', 'A', 'B', 'C', 'D'];

/** Catálogo de estadios de la liga: cada uno tiene un solo dueño y cada club puede tener uno. Comprar o cambiar mueve plata del saldo. */
export function StadiumTab({ team, balance, onChanged }) {
  const { canEditTeam } = useAuth();
  const toast = useToast();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.stadiums(signal), [team.id]);
  const rows = Array.isArray(query.data) ? query.data : [];
  const mine = rows.find(row => row.teamId === team.id) ?? null;
  const [confirming, setConfirming] = useState(null);
  const message = useRef('');
  const act = useApiMutation((operation, signal) => operation(signal), { onSuccess: () => { setConfirming(null); toast({ tone: 'money', title: message.current }); query.retry(); onChanged?.(); } });
  const run = (operation, text) => { message.current = text; act.execute(operation); };
  const netCost = stadium => stadium.price - (mine?.price ?? 0);
  return <section className="stadium-tab">
    <header><h2>ESTADIO</h2><p>CADA ESTADIO TIENE UN SOLO DUEÑO Y CADA CLUB PUEDE TENER UNO. COMPRARLO DESCUENTA SU PRECIO DEL SALDO; SI YA TENÍAS UNO, SE TE REEMBOLSA A SU PRECIO Y SOLO PAGAS LA DIFERENCIA. POR AHORA ES SOLO ESTÉTICO: DA EL NOMBRE A TU ESTADIO.</p></header>
    <DataState query={query}/>
    {mine && <Card tone="gold" className="stadium-mine">
      <span><Icon name="stadium" size={20}/> TU ESTADIO: <b>{upper(mine.name)}</b> <Chip tone="navy">CATEGORÍA {mine.category}</Chip> {gpLabel(mine.price)}</span>
      {canEdit && (confirming === 'sell'
        ? <ConfirmStep message={`¿VENDERLO Y RECUPERAR ${gpLabel(mine.price)}?`} confirmLabel="SÍ, VENDER" danger busy={act.loading} onConfirm={() => run(signal => endpoints.sellStadium(team.id, signal), `VENDISTE ${upper(mine.name)}`)} onCancel={() => setConfirming(null)}/>
        : <Button variant="ghost" size="sm" onClick={() => setConfirming('sell')}>VENDER</Button>)}
    </Card>}
    {act.error && <Notice tone="error">{act.error.message}</Notice>}
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
          return <Card as="article" key={stadium.id} tone="paper" className={`stadium-card ${owned ? 'is-mine' : ''} ${free ? '' : 'is-taken'}`}>
            <b>{stadium.name}</b>
            <small>{upper(stadium.kind)} · {gpLabel(stadium.price)}{stadium.capacity ? ` · ${stadium.capacity.toLocaleString('es-CL')} ESPECTADORES` : ''}</small>
            {owned ? <Chip tone="green" icon="check">ES TUYO</Chip> : free
              ? (canEdit && (confirming === stadium.id
                ? <ConfirmStep message={mine ? `¿CAMBIAR? PAGAS ${gpLabel(Math.max(0, cost))}${cost < 0 ? ` Y RECIBES ${gpLabel(-cost)}` : ''}.` : `¿COMPRAR POR ${gpLabel(stadium.price)}?`} busy={act.loading} onConfirm={() => run(signal => endpoints.buyStadium(team.id, stadium.id, signal), `${mine ? 'CAMBIASTE A' : 'COMPRASTE'} ${upper(stadium.name)}`)} onCancel={() => setConfirming(null)}/>
                : <Button size="sm" icon={affordable ? 'coin' : 'lock'} disabled={!affordable} title={affordable ? undefined : 'No te alcanza el saldo'} onClick={() => setConfirming(stadium.id)}>{mine ? 'CAMBIAR A ESTE' : 'COMPRAR'}</Button>))
              : <Chip icon="lock">DE {upper(stadium.teamName)}</Chip>}
          </Card>;
        })}</div>
      </div>;
    })}
  </section>;
}
