import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { GpInput } from '../../../components/GpInput.jsx';
import { HowItWorks, Icon } from '../../../ui/index.js';
import { gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { TransferChat } from './TransferChat.jsx';

const upper = text => String(text ?? '').toUpperCase();
const ROLES = [['', 'SIN PROMETER ROL'], ['crucial', 'CRUCIAL'], ['importante', 'IMPORTANTE'], ['rotacion', 'ROTACIÓN'], ['esporadico', 'ESPORÁDICO']];
const ROLE_LABEL = Object.fromEntries(ROLES.filter(([key]) => key));
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

/** Medidor de ganas de ir: la marca del medio es desde donde acepta; muestra cuánto cambió con lo último que hiciste. */
function Meter({ interest, verdict }) {
  const previous = useRef(interest);
  const [change, setChange] = useState(0);
  useEffect(() => {
    if (typeof previous.current === 'number' && interest !== previous.current) setChange(interest - previous.current);
    previous.current = interest;
  }, [interest]);
  return <div className="consent-meter-wrap">
    <div className="consent-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={interest} aria-label={`Ganas de ir: ${interest} de 100`}>
      {/* El degradado es de toda la barra (rojo → verde); lo que falta lo tapa una cubierta desde la derecha. */}
      <span className="consent-meter-cover" style={{ width: `${100 - interest}%` }}/>
      <i className="consent-meter-goal" aria-hidden="true"/>
    </div>
    <div className="consent-meter-legend">
      <b className={`consent-verdict is-${verdict.tone}`}><Icon name={verdict.icon} size={12}/> {verdict.label}</b>
      {change !== 0 && <span key={`${interest}`} className={`consent-change ${change > 0 ? 'up' : 'down'}`}>{change > 0 ? '▲' : '▼'} {Math.abs(change)}</span>}
      <small>ACEPTA DESDE LA MARCA</small>
    </div>
  </div>;
}

/**
 * Visto bueno del jugador en un traspaso o trueque: qué dice su representante, por qué, y las tres formas de
 * convencerlo: hablar con él (si el club que lo recibe es el tuyo), una prima de fichaje y un rol prometido.
 * `onVerdict` avisa si ya acepta.
 */
export function ConsentPanel({ player, toTeam, payer, leavingIds = [], terms, onChange, onVerdict }) {
  const { isPresidentOf } = useAuth();
  const bonus = Number(terms?.signingBonus) || 0;
  const role = terms?.promisedRole ?? '';
  const settledBonus = useSettled(bonus);
  const [talkRevision, setTalkRevision] = useState(0);
  const [talking, setTalking] = useState(false);
  const canTalk = Boolean(toTeam && isPresidentOf(toTeam.id));
  const query = useApiQuery(signal => player && toTeam ? endpoints.playerConsent(player.id, {
    toTeamId: toTeam.id, leaving: leavingIds.filter(Boolean).join(','), signingBonus: settledBonus || undefined, promisedRole: role || undefined,
  }, signal) : Promise.resolve({ data: null }), [player?.id, toTeam?.id, leavingIds.join(','), settledBonus, role, talkRevision]);
  const quote = query.data;
  const stale = settledBonus !== bonus;
  useEffect(() => { setTalking(false); }, [player?.id, toTeam?.id]);
  // Sin contratos activos el servidor no exige el visto bueno: se muestra, pero no frena la oferta.
  useEffect(() => { onVerdict?.(quote && !stale ? (quote.required === false ? 'acepta' : quote.verdict) : null); }, [quote?.verdict, quote?.required, stale]);
  if (!player || !toTeam) return null;
  const verdict = quote ? VERDICT[quote.verdict] : null;
  const asked = quote?.bonusAsked ?? 0;
  const talk = quote?.reasons?.find(reason => reason.key === 'charla')?.delta ?? 0;
  const setRole = value => onChange?.({ ...terms, promisedRole: value || null });
  const hopeless = quote?.verdict === 'rechaza' && !bonus;
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
      <Meter interest={quote.interest} verdict={verdict}/>
      {quote.reasons?.length > 0 && <ul className="consent-reasons">{quote.reasons.slice(0, 6).map(reason => <li key={reason.key} className={reason.delta >= 0 ? 'up' : 'down'}>
        <i aria-hidden="true">{reason.delta >= 0 ? '▲' : '▼'}</i><span>{upper(reason.text)}</span>
      </li>)}</ul>}
      {quote.wantsOut && <p className="consent-note">PIDIÓ SALIR DE SU CLUB: ACEPTA CASI CUALQUIER DESTINO.</p>}
      {quote.derby && <p className="consent-note is-derby"><Icon name="fire" size={12}/> CRUCE ENTRE CLÁSICOS: SI LLEGA, SU NUEVA HINCHADA LO MIRARÁ CON DESCONFIANZA.</p>}

      {quote.verdict !== 'acepta' || bonus > 0 || role || canTalk ? <div className="consent-levers" role="group" aria-label="Cómo convencerlo">
        <h4>{quote.verdict === 'acepta' ? 'YA DICE QUE SÍ · PUEDES IGUAL' : 'CÓMO CONVENCERLO'}</h4>
        {canTalk && <div className={`consent-lever ${talking ? 'is-open' : ''}`}>
          <span className="consent-lever-title"><Icon name="mail" size={14}/> HABLAR CON ÉL</span>
          <small>{talk ? `LA CHARLA YA ${talk > 0 ? 'SUMA' : 'RESTA'} ${Math.abs(talk)}` : 'TE PREGUNTA POR TU CLUB; RESPONDES CON DATOS REALES'}</small>
          <button type="button" className="consent-lever-action" aria-expanded={talking} onClick={() => setTalking(value => !value)}>{talking ? 'OCULTAR CHAT' : talk ? 'SEGUIR LA CHARLA' : 'ABRIR CHAT'}</button>
        </div>}
        {!hopeless && <label className="consent-lever">
          <span className="consent-lever-title"><Icon name="coin" size={14}/> PRIMA DE FICHAJE</span>
          <small>{payer ? `LA PAGA ${upper(payer)} · ` : ''}MÁX. {gp(quote.bonusMax)}</small>
          <GpInput value={bonus || ''} min={0} max={quote.bonusMax} placeholder="0" onChange={event => onChange?.({ ...terms, signingBonus: Number(event.target.value) || 0 })} aria-label="Prima de fichaje"/>
          {asked > 0 && asked !== bonus && <button type="button" className="consent-lever-quick" onClick={() => onChange?.({ ...terms, signingBonus: asked })}>DARLE LO QUE PIDE · {gp(asked)}</button>}
        </label>}
        {!hopeless && <label className="consent-lever">
          <span className="consent-lever-title"><Icon name="contract" size={14}/> ROL PROMETIDO</span>
          <small>QUEDA EN SU CONTRATO</small>
          <select value={role} onChange={event => setRole(event.target.value)}>{ROLES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          {quote.roleAsked && role !== quote.roleAsked && <button type="button" className="consent-lever-quick" onClick={() => setRole(quote.roleAsked)}>PIDE SER {ROLE_LABEL[quote.roleAsked]}</button>}
        </label>}
        {hopeless && <p className="consent-note is-bad">NO HAY PRIMA QUE LO CONVENZA{canTalk ? ': PRUEBA HABLANDO CON ÉL, O BUSCA OTRO JUGADOR.' : '. BUSCA OTRO JUGADOR.'}</p>}
      </div> : null}
      {talking && canTalk && <TransferChat player={player} teamId={toTeam.id} onChanged={() => setTalkRevision(value => value + 1)} onPromiseRole={value => setRole(value)} onClose={() => setTalking(false)}/>}
      <HowItWorks><p>El jugador compara tu club con el suyo (minutos, compañeros, DT, historia y proyecto) y suma su ánimo, su lealtad y si lo mandan al clásico rival. La plata no cuenta, porque su sueldo viaja tal cual.</p><p>La <b>charla</b> mueve hasta ±10 según lo que respondas. La <b>prima</b> va directo al jugador y la paga el club que lo recibe (tope: 15% de su valor). El <b>rol prometido</b> queda en su contrato: si no se cumple, se molesta.</p></HowItWorks>
    </>}
  </fieldset>;
}
