import { DataState, formatDate, gp } from '../DataStates.jsx';

/* Resumen del club del presi: saldo, margen contra el tope de plantilla y estado del mercado. */
export function marketStatusText(status) {
  if (!status) return null;
  if (!status.open) return 'MERCADO CERRADO';
  return `MERCADO ABIERTO · CIERRA ${formatDate(status.closesAt).toUpperCase()}`;
}

export function clubFigures(profile) {
  if (!profile) return null;
  const balance = Number(profile.balance);
  const squadValue = Number(profile.squadValue);
  const limit = Number(profile.squadValueLimit);
  return {
    balance: Number.isFinite(balance) ? balance : null,
    squadValue: Number.isFinite(squadValue) ? squadValue : null,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    room: Number.isFinite(squadValue) && Number.isFinite(limit) && limit > 0 ? Math.max(0, limit - squadValue) : null,
  };
}

/* Por qué un club no puede pagar un fichaje (texto en mayúsculas), o null si puede. */
// Abrir una encuesta es una propuesta: solo la frena el mercado cerrado. El saldo se exige al confirmar la
// compra, y el tope de plantilla se revisa al cierre del mercado (hasta entonces el presi puede ordenarse).
export function signingBlocker(figures, price, marketOpen) {
  return marketOpen === false ? 'EL MERCADO ESTÁ CERRADO.' : null;
}

/** Avisos que no frenan: qué pasaría con el saldo y el tope si la compra se concreta. */
export function signingNotes(figures, price) {
  if (!figures || price == null) return [];
  const notes = [];
  if (figures.balance !== null && figures.balance < price) notes.push(`OJO: PARA CONFIRMAR LA COMPRA NECESITAS ${gp(price)} DE SALDO (HOY TIENES ${gp(figures.balance)}).`);
  if (figures.room !== null && price > figures.room) notes.push(`OJO: CON ÉL QUEDARÍAS ${gp(price - figures.room)} SOBRE EL TOPE. TIENES HASTA EL CIERRE DEL MERCADO PARA ORDENARTE.`);
  return notes;
}

export function MyClubPanel({ team, figures, profileQuery, status, statusQuery }) {
  return <section className="market-section market-myclub">
    <header><h2>MI CLUB {team && <small>{team.name}</small>}</h2><p>{marketStatusText(status) ?? 'ESTADO DEL MERCADO NO DISPONIBLE'}</p></header>
    {profileQuery && <DataState query={profileQuery}/>}
    {figures && <dl className="market-figures">
      <div><dt>SALDO</dt><dd>{figures.balance === null ? '—' : gp(figures.balance)}</dd></div>
      <div><dt>VALOR DE PLANTILLA</dt><dd>{figures.squadValue === null ? '—' : gp(figures.squadValue)}</dd></div>
      <div><dt>MARGEN BAJO EL TOPE</dt><dd>{figures.room === null ? '—' : gp(figures.room)}</dd><small>TOPE {figures.limit === null ? '—' : gp(figures.limit)}</small></div>
    </dl>}
    {statusQuery?.error && statusQuery.error.status !== 404 && <p className="signing-warning">NO SE PUDO LEER EL ESTADO DEL MERCADO.</p>}
  </section>;
}
