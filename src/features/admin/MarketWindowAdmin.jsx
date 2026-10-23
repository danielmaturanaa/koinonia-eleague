import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { useApiMutation } from './useApiMutation.js';
import { FormFeedback } from './FormFeedback.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { Button, ConfirmStep } from '../../ui/index.js';

const when = value => (value ? new Date(value).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }) : '');
// Lo que se escribe en el formulario es hora de Chile, esté donde esté el navegador del admin.
function chileToIso(value) {
  const [day, time] = String(value).split('T');
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, date, hour, minute);
  const offsetAt = instant => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - Math.floor(instant / 60_000) * 60_000;
  };
  // Dos pasadas bastan para caer bien cerca de un cambio de horario.
  let instant = guess - offsetAt(guess);
  instant = guess - offsetAt(instant);
  return new Date(instant).toISOString();
}

// Por defecto el cierre queda en 3 días a las 22:00.
const defaultClose = () => {
  const date = new Date(Date.now() + 3 * 86_400_000);
  date.setHours(22, 0, 0, 0);
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T22:00`;
};

/** Botón del admin para terminar el período de renovaciones (con confirmación en línea). */
export function StartTransactionsButton({ expired = 0, onDone }) {
  const [confirming, setConfirming] = useState(false);
  const start = useApiMutation(signal => endpoints.startTransactions(signal), { onSuccess: () => { setConfirming(false); onDone?.(); } });
  return <div className="market-phase-action">
    {confirming
      ? <ConfirmStep busy={start.loading} onConfirm={() => start.execute()} onCancel={() => setConfirming(false)} confirmLabel="SÍ, PASAR A TRANSACCIONES"
        message={expired ? `${expired} jugador${expired === 1 ? '' : 'es'} con contrato vencido sin renovar quedan libres al tiro y se pueden fichar en este mercado. No se deshace.` : 'Todos renovaron: se abren fichajes, traspasos y trueques. No se deshace.'}/>
      : <Button variant="positive" onClick={() => setConfirming(true)}>PASAR A TRANSACCIONES</Button>}
    <FormFeedback mutation={start}/>
  </div>;
}

/** Aviso para todos cuando el mercado está en el período de renovaciones (con el botón del admin para terminarlo). */
export function MarketPhaseBanner({ status, onChanged }) {
  const { isAdmin } = useAuth();
  if (!status?.open || status.phase !== 'renewals') return null;
  return <div className="market-phase-banner" role="status">
    <b>🔁 PERÍODO DE RENOVACIONES</b>
    <p>Ahora solo se renuevan contratos (en Nómina de tu club). Fichajes, traspasos y trueques se abren cuando un admin pase el mercado a transacciones; ahí los vencidos que nadie renovó quedan libres.{status.expiredContracts ? ` Quedan ${status.expiredContracts} contrato${status.expiredContracts === 1 ? '' : 's'} vencido${status.expiredContracts === 1 ? '' : 's'} sin renovar en la liga.` : ''}</p>
    {isAdmin && <StartTransactionsButton expired={status.expiredContracts} onDone={onChanged}/>}
  </div>;
}

/** Abrir el mercado desde la web (con o sin período de renovaciones) y pasar a transacciones. El bot lo anuncia en Discord. */
export function MarketWindowAdmin() {
  const status = useApiQuery(signal => endpoints.marketStatus(signal), []);
  const [closesAt, setClosesAt] = useState(defaultClose);
  const [minimum, setMinimum] = useState(2);
  const [renewals, setRenewals] = useState(true);
  const open = useApiMutation((body, signal) => endpoints.openMarket(body, signal), { onSuccess: () => status.retry() });
  const data = status.data;
  if (!data) return null;
  if (data.open) {
    return <div className="market-window-admin">
      <p><b>{data.phase === 'renewals' ? '🔁 ABIERTO · PERÍODO DE RENOVACIONES' : '🟢 ABIERTO · TRANSACCIONES'}</b> · cierra el {when(data.closesAt)}. El cierre y los cambios de hora siguen en Discord (<code>/mercado editar</code>, <code>/mercado cerrar</code>).</p>
      {data.phase === 'renewals' && <StartTransactionsButton expired={data.expiredContracts} onDone={() => status.retry()}/>}
    </div>;
  }
  const submit = event => {
    event.preventDefault();
    open.execute({ closesAt: chileToIso(closesAt), minConfirmations: Number(minimum), renewals });
  };
  return <form className="admin-form market-window-admin" onSubmit={submit}>
    <p>🔒 El mercado está cerrado.</p>
    <label>CIERRA (HORA DE CHILE)<input type="datetime-local" required value={closesAt} onChange={event => setClosesAt(event.target.value)}/></label>
    <label>CONFIRMACIONES PARA COMPRAR UN LIBRE<input type="number" min="1" required value={minimum} onChange={event => setMinimum(event.target.value)}/></label>
    <label className="arrival-check"><input type="checkbox" checked={renewals} onChange={event => setRenewals(event.target.checked)}/> EMPEZAR CON PERÍODO DE RENOVACIONES</label>
    <small className="control-note">{renewals
      ? 'Primero solo se renueva. Cuando quieras, pasas a transacciones: los vencidos sin renovar quedan libres y se abren fichajes y traspasos.'
      : 'Sin renovaciones: los contratos vencidos quedan libres al abrir y se pueden fichar en este mismo mercado.'}</small>
    <Button variant="positive" type="submit" disabled={open.loading}>{open.loading ? 'ABRIENDO…' : 'ABRIR MERCADO'}</Button>
    <FormFeedback mutation={open}/>
  </form>;
}
