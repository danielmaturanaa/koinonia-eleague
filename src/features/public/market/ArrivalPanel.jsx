import { useEffect, useState } from 'react';
import { endpoints } from '../../../api/endpoints.js';
import { useAuth } from '../../../app/AuthGate.jsx';
import { HowItWorks, Icon } from '../../../ui/index.js';
import { gp } from '../DataStates.jsx';
import { useApiQuery } from '../useApiQuery.js';
import { TransferChat } from './TransferChat.jsx';

const upper = text => String(text ?? '').toUpperCase();

/** Lo que pediría al llegar, en una lista corta. */
function asksOf(ask) {
  const items = [`SUELDO DE ${gp(ask.salary)} POR TORNEO`];
  const bonuses = [ask.goalBonus && `${gp(ask.goalBonus)} POR GOL`, ask.playoffBonus && `${gp(ask.playoffBonus)} POR PLAYOFFS`, ask.titleBonus && `${gp(ask.titleBonus)} POR TÍTULO`].filter(Boolean);
  if (bonuses.length) items.push(`MANTENER SUS PRIMAS (${bonuses.join(' · ')})`);
  if (ask.asksShirt) items.push(`LA ${ask.shirt.number} (HOY LA USA ${upper(ask.shirt.holderName)})`);
  if (ask.captain) items.push('LA CINTA DE CAPITÁN');
  if (ask.bonusesHidden) items.push('SUS PRIMAS ACTUALES (LAS VES CUANDO LLEGUE)');
  return items;
}

/**
 * Cómo llegaría un jugador a `toTeam` en un traspaso o trueque. El trato lo cierran los presis (el jugador no lo frena);
 * al llegar firma un contrato nuevo y pide lo de acá abajo. Si el club que lo recibe es el tuyo, puedes hablar con él antes.
 */
export function ArrivalPanel({ player, toTeam, price = null, leavingIds = [] }) {
  const { isPresidentOf } = useAuth();
  const [talking, setTalking] = useState(false);
  const canTalk = Boolean(toTeam && isPresidentOf(toTeam.id));
  const query = useApiQuery(signal => player && toTeam ? endpoints.arrivalPreview(player.id, {
    toTeamId: toTeam.id, price: price || undefined, leaving: leavingIds.filter(Boolean).join(',') || undefined,
  }, signal) : Promise.resolve({ data: null }), [player?.id, toTeam?.id, price, leavingIds.join(',')]);
  useEffect(() => { setTalking(false); }, [player?.id, toTeam?.id]);
  if (!player || !toTeam) return null;
  const ask = query.data;
  return <fieldset className="consent-panel arrival-panel" aria-busy={query.loading}>
    <legend><Icon name="contract" size={14}/> CÓMO LLEGARÍA {upper(player.name)}{toTeam.name ? ` A ${upper(toTeam.name)}` : ''}</legend>
    {query.error && <p className="form-feedback error" role="alert">{query.error.message}</p>}
    {!ask && !query.error && <p className="consent-loading">REVISANDO SU CONTRATO…</p>}
    {ask && <>
      <p className="arrival-lead">El trato lo cierran los presis: el jugador no lo frena. Al llegar firma un <b>contrato nuevo</b> con el club que lo recibe.</p>
      {ask.previous && <p className="arrival-before">HOY GANA {gp(ask.previous.salary)} POR TORNEO EN {upper(ask.previous.teamName)}.</p>}
      <div className="arrival-asks">
        <h4>PEDIRÍA</h4>
        <ul>{asksOf(ask).map(item => <li key={item}><i aria-hidden="true">✍️</i>{item}</li>)}</ul>
        {ask.shirt?.free && <small>SU {ask.shirt.number} ESTÁ LIBRE: SE LA LLEVA AL LLEGAR.</small>}
      </div>
      {canTalk && <div className={`consent-lever ${talking ? 'is-open' : ''}`}>
        <span className="consent-lever-title"><Icon name="mail" size={14}/> HABLAR CON ÉL</span>
        <small>Si lo convences, llega con más ganas</small>
        <button type="button" className="consent-lever-action" aria-expanded={talking} onClick={() => setTalking(value => !value)}>{talking ? 'OCULTAR CHAT' : 'ABRIR CHAT'}</button>
      </div>}
      {talking && canTalk && <TransferChat player={player} teamId={toTeam.id} onChanged={() => query.retry()} onClose={() => setTalking(false)}/>}
      <HowItWorks><p>Cuando llega, el presi del club que lo recibe revisa lo que pide y firma. Le puede dar menos: el jugador llega igual, pero molesto (nunca furioso). Si nadie firma antes de que cierre el mercado, queda firmado con lo que pidió.</p><p>El sueldo va entre el 10% y el 20% de su valor. Las primas que tenía no se heredan: son solo una referencia de lo que pide. La capitanía solo la pide un jugador con recorrido.</p></HowItWorks>
    </>}
  </fieldset>;
}
