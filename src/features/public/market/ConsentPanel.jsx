import { useEffect, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { GpInput } from '../../../components/GpInput.jsx';
import { Icon } from '../../../ui/index.js';
import { gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();
const ROLES = [['', 'SIN PROMETER ROL'], ['crucial', 'CRUCIAL'], ['importante', 'IMPORTANTE'], ['rotacion', 'ROTACIÓN'], ['esporadico', 'ESPORÁDICO']];
const VERDICT = {
  acepta: { label: 'DA EL VISTO BUENO', icon: 'check', tone: 'ok' },
  condiciones: { label: 'PIDE CONDICIONES', icon: 'handshake', tone: 'warn' },
  rechaza: { label: 'NO QUIERE IR', icon: 'cross', tone: 'bad' },
};
const STYLE_ICON = { superagente: 'star', tiburon: 'gavel', papa: 'people', amigo: 'ball' };

/** Espera a que el valor deje de cambiar (para no consultar al jugador en cada tecla). */
function useSettled(value, delay = 350) {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setSettled(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return settled;
}

/**
 * Visto bueno del jugador en un traspaso o trueque: qué dice su representante, por qué, y lo que se le ofrece para
 * convencerlo (prima de fichaje que paga el club que lo recibe y, opcional, un rol prometido). `onVerdict` avisa si ya acepta.
 */
export function ConsentPanel({ player, toTeam, payer, leavingIds = [], terms, onChange, onVerdict }) {
  const bonus = Number(terms?.signingBonus) || 0;
  const role = terms?.promisedRole ?? '';
  const settledBonus = useSettled(bonus);
  const query = useApiQuery(signal => player && toTeam ? endpoints.playerConsent(player.id, {
    toTeamId: toTeam.id, leaving: leavingIds.filter(Boolean).join(','), signingBonus: settledBonus || undefined, promisedRole: role || undefined,
  }, signal) : Promise.resolve({ data: null }), [player?.id, toTeam?.id, leavingIds.join(','), settledBonus, role]);
  const quote = query.data;
  const stale = settledBonus !== bonus;
  // Sin contratos activos el servidor no exige el visto bueno: se muestra, pero no frena la oferta.
  useEffect(() => { onVerdict?.(quote && !stale ? (quote.required === false ? 'acepta' : quote.verdict) : null); }, [quote?.verdict, quote?.required, stale]);
  if (!player || !toTeam) return null;
  const verdict = quote ? VERDICT[quote.verdict] : null;
  const asked = quote?.bonusAsked ?? 0;
  return <fieldset className={`consent-panel ${verdict ? `is-${verdict.tone}` : ''}`} aria-busy={query.loading || stale}>
    <legend><Icon name="handshake" size={14}/> VISTO BUENO DE {upper(player.name)}</legend>
    {query.error && <p className="form-feedback error" role="alert">{query.error.message}</p>}
    {!quote && !query.error && <p className="consent-loading">PREGUNTANDO AL REPRESENTANTE…</p>}
    {quote && <>
      <div className="consent-agent">
        <span className="consent-agent-face" aria-hidden="true"><Icon name={STYLE_ICON[quote.agent?.style] ?? 'mic'} size={22}/></span>
        <div>
          <small>{upper(quote.agent?.label)} · {upper(quote.agent?.name)}</small>
          <blockquote>«{quote.line}»</blockquote>
        </div>
      </div>
      <div className="consent-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={quote.interest} aria-label="Ganas de ir">
        <span style={{ width: `${quote.interest}%` }}/>
        <b>{verdict.label}</b>
      </div>
      {quote.reasons?.length > 0 && <ul className="consent-reasons">{quote.reasons.slice(0, 5).map(reason => <li key={reason.key} className={reason.delta >= 0 ? 'up' : 'down'}>
        <i aria-hidden="true">{reason.delta >= 0 ? '▲' : '▼'}</i>{upper(reason.text)}
      </li>)}</ul>}
      {quote.wantsOut && <p className="consent-note">PIDIÓ SALIR DE SU CLUB: ACEPTA CASI CUALQUIER DESTINO.</p>}
      {quote.derby && <p className="consent-note is-derby"><Icon name="fire" size={12}/> ES UN CRUCE ENTRE CLÁSICOS: SI LLEGA, SU NUEVA HINCHADA LO MIRARÁ CON DESCONFIANZA.</p>}
      {quote.verdict !== 'rechaza' || bonus > 0 ? <div className="consent-offer">
        <label>PRIMA DE FICHAJE {payer ? `(LA PAGA ${upper(payer)})` : ''}
          <GpInput value={bonus || ''} min={0} max={quote.bonusMax} placeholder="0" onChange={event => onChange?.({ ...terms, signingBonus: Number(event.target.value) || 0 })} aria-label="Prima de fichaje"/>
        </label>
        <label>ROL QUE LE PROMETES
          <select value={role} onChange={event => onChange?.({ ...terms, promisedRole: event.target.value || null })}>{ROLES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        </label>
        <div className="consent-quick">
          {asked > 0 && asked !== bonus && <button type="button" onClick={() => onChange?.({ ...terms, signingBonus: asked })}>DARLE LO QUE PIDE: {gp(asked)}</button>}
          {quote.roleAsked && role !== quote.roleAsked && <button type="button" onClick={() => onChange?.({ ...terms, promisedRole: quote.roleAsked })}>PROMETERLE SER {upper(quote.roleAsked === 'rotacion' ? 'rotación' : quote.roleAsked === 'esporadico' ? 'esporádico' : quote.roleAsked)}</button>}
        </div>
        <p className="poll-hint">LA PRIMA VA DIRECTO AL JUGADOR (MÁXIMO {gp(quote.bonusMax)}, EL 15% DE SU VALOR). EL ROL PROMETIDO QUEDA EN SU CONTRATO: SI NO SE CUMPLE, SE MOLESTA.</p>
      </div> : <p className="consent-note is-bad">NO HAY PRIMA QUE LO CONVENZA. BUSCA OTRO JUGADOR O ESPERA A QUE CAMBIE SU SITUACIÓN.</p>}
    </>}
  </fieldset>;
}
