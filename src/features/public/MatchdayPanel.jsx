import { rivalryOf } from '../../utils/rivalry.js';
import { endpoints } from '../../api/endpoints.js';
import { Chip, Icon } from '../../ui/index.js';
import { gp } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();
const people = value => Number(value ?? 0).toLocaleString('es-CL');

/** Día de partido: estadio, asistencia y taquilla (o la previa de cuánta gente se espera) y si es clásico. */
export function MatchdayPanel({ match, revision }) {
  const query = useApiQuery(signal => match?.id ? endpoints.matchday(match.id, signal).catch(() => ({ data: null })) : Promise.resolve({ data: null }), [match?.id, match?.status, revision]);
  const data = query.data;
  if (!data || (!data.gate && !data.forecast && !data.derby)) return null;
  const gate = data.gate;
  const forecast = data.forecast;
  const numbers = gate ?? forecast;
  // La previa ya trae cuántos irían (un partido importante tiene piso: una semifinal casi se llena, una final se llena).
  const expected = forecast ? (forecast.attendance ?? Math.min(forecast.demand, forecast.capacity)) : 0;
  const occupancy = numbers ? Math.min(100, Math.round((gate ? gate.attendance : expected) / Math.max(1, numbers.capacity) * 100)) : 0;
  const importance = forecast?.importance ?? null;
  const rivalry = rivalryOf({ rivalry: data.rivalry, derby: data.derby, officialDerby: data.officialDerby });
  return <section className={`match-card-panel matchday-panel ${data.derby ? 'is-derby' : ''}`}>
    <h2>DÍA DE PARTIDO {rivalry && <Chip tone={rivalry.kind === 'derbi' ? 'navy' : rivalry.kind === 'superclasico' ? 'yellow' : 'red'} icon={rivalry.icon}>{upper(rivalry.label)}</Chip>}{importance && !['clásico', 'superclásico', 'derbi'].includes(importance) && <Chip icon="star">{upper(importance)}</Chip>}</h2>
    {numbers && <div className="matchday-venue">
      <div>
        <small><Icon name="stadium" size={14}/> {numbers.neutral ? 'Final en cancha neutral · ' : ''}{upper(numbers.venue)}</small>
        <b>{gate ? (gate.closedDoors ? 'A PUERTAS CERRADAS' : `${people(gate.attendance)} PERSONAS`) : `SE ESPERAN ~${people(expected)}`}</b>
        <span className="gate-bar"><span style={{ width: `${occupancy}%` }}/><em>{occupancy}% DE {people(numbers.capacity)}</em></span>
      </div>
      <dl>
        <div><dt>ENTRADA</dt><dd>{upper(numbers.tier)} · {numbers.price} €</dd></div>
        {gate ? <div><dt>TAQUILLA</dt><dd>{gp(gate.revenue)}{gate.neutral ? ' (MITAD Y MITAD)' : rivalry?.kind === 'derbi' || rivalry?.both ? ' (20% PARA LA VISITA)' : ''}</dd></div>
          : <div><dt>SI SE LLENA</dt><dd>{forecast.full ? 'SE LLENA' : 'QUEDARÍAN ASIENTOS LIBRES'}</dd></div>}
        {(gate?.leftOutside ?? forecast?.leftOutside) > 0 && <div><dt>SE QUEDAN AFUERA</dt><dd>{people(gate?.leftOutside ?? forecast.leftOutside)}</dd></div>}
      </dl>
    </div>}
    {data.derby && data.headToHead && data.headToHead.played > 0 && <p className="matchday-h2h"><Icon name={rivalry?.icon ?? 'fire'} size={14}/> HISTORIAL {rivalry?.named ? `DE ${upper(rivalry.label)}` : rivalry?.kind === 'derbi' ? 'DEL DERBI' : 'DEL CLÁSICO'}: {data.headToHead.wins} GANADOS PARA {upper(match.homeTeam?.name)}, {data.headToHead.draws} EMPATES Y {data.headToHead.losses} PARA {upper(match.awayTeam?.name)}.</p>}
  </section>;
}
