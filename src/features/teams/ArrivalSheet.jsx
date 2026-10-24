import { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { GpInput } from '../../components/GpInput.jsx';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { useApiQuery } from '../public/useApiQuery.js';
import { gpLabel } from '../../utils/money.js';
import { Button, HowItWorks } from '../../ui/index.js';

const SEASONS = [2, 4, 6];
const upper = text => String(text ?? '').toUpperCase();

/** Cómo llegaría con lo que le das: la suma de lo que le mueve el ánimo y por qué. */
function ArrivalMood({ preview }) {
  if (!preview) return null;
  const tone = preview.total < -5 ? 'bad' : preview.total < 0 ? 'mid' : 'good';
  const label = preview.total < -5 ? 'LLEGA MOLESTO' : preview.total < 0 ? 'LLEGA ALGO MOLESTO' : preview.total > 0 ? 'LLEGA CON GANAS' : 'LLEGA CONFORME';
  return <div className={`arrival-mood ${tone}`} role="status" aria-live="polite">
    <b>{label}{preview.total ? ` (${preview.total > 0 ? '+' : '−'}${Math.abs(preview.total)} DE ÁNIMO)` : ''}</b>
    {preview.effects.length > 0 && <ul>{preview.effects.map(effect => <li key={effect.reason} className={effect.delta < 0 ? 'down' : 'up'}><b>{effect.delta > 0 ? '+' : '−'}{Math.abs(effect.delta)}</b> {effect.reason}</li>)}</ul>}
  </div>;
}

/**
 * Hoja de firma de un jugador que llegó por traspaso o trueque: pide sueldo, primas, dorsal y a veces la capitanía.
 * El presi decide qué le da; con menos de lo que pide llega igual, pero molesto.
 */
function ArrivalSheet({ team, arrival, onDone }) {
  const { ask } = arrival;
  const askedBonus = ask.goalBonus + ask.playoffBonus + ask.titleBonus > 0;
  const [seasons, setSeasons] = useState(2);
  const [salary, setSalary] = useState(String(ask.salary));
  const [keepBonus, setKeepBonus] = useState(askedBonus);
  const [giveShirt, setGiveShirt] = useState(ask.asksShirt);
  const [giveCaptain, setGiveCaptain] = useState(ask.captain);
  const [signed, setSigned] = useState(null);
  const terms = { seasons, salary: Number(salary) || 0, giveShirt, giveCaptain,
    ...(keepBonus ? { goalBonus: ask.goalBonus, playoffBonus: ask.playoffBonus, titleBonus: ask.titleBonus } : {}) };
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const key = JSON.stringify(terms);
  useEffect(() => {
    if (signed) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      endpoints.previewArrival(team.id, arrival.contractId, terms)
        .then(response => { if (active) { setPreview(response?.data ?? null); setPreviewError(''); } })
        .catch(error => { if (active) { setPreview(null); setPreviewError(error.message); } });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [team.id, arrival.contractId, key, signed]);
  const sign = useApiMutation((body, signal) => endpoints.signArrival(team.id, arrival.contractId, body, signal), {
    onSuccess: response => { setSigned(response?.data ?? true); onDone?.(); },
  });

  return <article className={`signing-sheet arrival-sheet ${signed ? 'accepted' : ''}`}>
    <header className="sheet-head">
      <small>CONTRATO DE LLEGADA · {upper(team.name)}</small>
      <div className="sheet-player">
        <PlayerFace src={arrival.faceUrl} name={arrival.playerName}/>
        <div><h3>{arrival.playerName}</h3><span>{arrival.position} · VALE {gpLabel(ask.value)}{ask.previous ? ` · GANABA ${gpLabel(ask.previous.salary)} EN ${upper(ask.previous.teamName)}` : ''}</span></div>
      </div>
    </header>
    <div className="arrival-asks">
      <h4>LO QUE PIDE</h4>
      <ul>
        <li><i aria-hidden="true">✍️</i>SUELDO DE {gpLabel(ask.salary)} POR TORNEO</li>
        {askedBonus && <li><i aria-hidden="true">🎯</i>MANTENER SUS PRIMAS</li>}
        {ask.asksShirt && <li><i aria-hidden="true">👕</i>LA {ask.shirt.number} (HOY LA USA {upper(ask.shirt.holderName)})</li>}
        {ask.captain && <li><i aria-hidden="true">©️</i>LA CINTA DE CAPITÁN</li>}
      </ul>
    </div>

    {signed
      ? <><p className="sheet-terms">CONTRATO FIRMADO: <b>{seasons} TORNEOS</b> · <b>{gpLabel(terms.salary)} POR TORNEO</b></p><div className="sheet-stamp good" role="status">FIRMADO ✔</div></>
      : <div className="sheet-form">
        <div className="sheet-row"><span>TORNEOS</span><div className="chips">{SEASONS.map(n => <button type="button" key={n} className={seasons === n ? 'on' : ''} onClick={() => setSeasons(n)}>{n}</button>)}</div></div>
        <div className="sheet-row"><span>SUELDO POR TORNEO</span><div className="arrival-salary">
          <GpInput value={salary} min={ask.floor} max={ask.cap} onChange={event => setSalary(event.target.value)} aria-label="Sueldo por torneo"/>
          <small>ENTRE {gpLabel(ask.floor)} (10% DE SU VALOR) Y {gpLabel(ask.cap)} (20%)</small>
          {Number(salary) !== ask.salary && <button type="button" className="ghost" onClick={() => setSalary(String(ask.salary))}>DARLE LO QUE PIDE</button>}
        </div></div>
        {askedBonus && <label className="arrival-check"><input type="checkbox" checked={keepBonus} onChange={event => setKeepBonus(event.target.checked)}/> MANTENERLE LAS PRIMAS ({[ask.goalBonus && `${gpLabel(ask.goalBonus)} POR GOL`, ask.playoffBonus && `${gpLabel(ask.playoffBonus)} POR PLAYOFFS`, ask.titleBonus && `${gpLabel(ask.titleBonus)} POR TÍTULO`].filter(Boolean).join(' · ')})</label>}
        {ask.asksShirt && <label className="arrival-check"><input type="checkbox" checked={giveShirt} onChange={event => setGiveShirt(event.target.checked)}/> DARLE LA {ask.shirt.number} ({upper(ask.shirt.holderName)} PASA A OTRO NÚMERO)</label>}
        {ask.captain && <label className="arrival-check"><input type="checkbox" checked={giveCaptain} onChange={event => setGiveCaptain(event.target.checked)}/> DARLE LA CINTA DE CAPITÁN</label>}
        {previewError ? <p className="form-feedback error" role="alert">{previewError}</p> : <ArrivalMood preview={preview}/>}
        <div className="sheet-actions">
          <Button variant="positive" disabled={sign.loading || Boolean(previewError)} onClick={() => sign.execute(terms)}>{sign.loading ? 'FIRMANDO…' : 'FIRMAR CONTRATO'}</Button>
        </div>
        <FormFeedback mutation={sign}/>
      </div>}
  </article>;
}

/** Los que llegaron por traspaso o trueque y esperan que el presi firme su contrato. */
export function ArrivalSheets({ team, onDone }) {
  const query = useApiQuery(signal => endpoints.teamArrivals(team.id, signal).catch(() => ({ data: [] })), [team.id]);
  const [kept, setKept] = useState([]);
  const pending = Array.isArray(query.data) ? query.data : [];
  // Las hojas recién firmadas siguen a la vista (con el sello) hasta salir de la pestaña.
  const shown = [...pending, ...kept.filter(item => !pending.some(row => row.contractId === item.contractId))];
  if (!shown.length) return null;
  return <section className="arrival-sheets">
    <header><h3>LLEGARON: CONTRATOS POR FIRMAR</h3><p>Cada uno llegó con lo que pide. Puedes darle menos: llega igual, pero molesto. Si no firmas antes de que cierre el mercado, queda firmado con lo que pidió.</p>
      <HowItWorks><p>En un traspaso o trueque el contrato no viaja: el jugador firma uno nuevo con tu club. Lo que pide toma como referencia lo que ganaba antes y nunca baja de eso. El sueldo va entre el 10% y el 20% de su valor.</p></HowItWorks></header>
    {shown.map(arrival => <ArrivalSheet key={arrival.contractId} team={team} arrival={arrival} onDone={() => { setKept(items => [...items.filter(item => item.contractId !== arrival.contractId), arrival]); query.retry(); onDone?.(); }}/>)}
  </section>;
}
