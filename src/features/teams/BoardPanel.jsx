import { endpoints } from '../../api/endpoints.js';
import { gpLabel } from '../../utils/money.js';
import { useApiQuery } from '../public/useApiQuery.js';
import { HowItWorks } from '../../ui/index.js';

const STATUS = { pending: ['⏳', 'EN CURSO'], met: ['✅', 'CUMPLIDO'], failed: ['❌', 'FALLADO'] };
const upper = text => String(text ?? '').toUpperCase();

/** Lo que la directiva le exige al club en el torneo en curso, y cómo le fue en los anteriores. */
export function BoardPanel({ team }) {
  const query = useApiQuery(signal => endpoints.teamObjectives(team.id, signal), [team.id]);
  const rows = Array.isArray(query.data) ? query.data : [];
  if (!rows.length) return null;
  const tournaments = [...new Set(rows.map(row => row.tournamentId))];
  const [current, ...past] = tournaments;
  const of = id => rows.filter(row => row.tournamentId === id);
  const block = id => <div className="board-block" key={id}>
    <h4>{upper(of(id)[0].tournamentName)}</h4>
    <ul>{of(id).map(row => {
      const [icon, label] = STATUS[row.status];
      return <li key={row.id} className={`board-${row.status}`}>
        <span>{icon}</span>
        <span><b>{upper(row.text)}</b><small>{label}{row.status !== 'pending' && row.kind !== 'payroll' ? ` · TERMINASTE ${row.result}º` : ''}</small></span>
        <em>{row.status === 'failed' ? `ÁNIMO ${row.moodEffect}` : `PREMIO ${gpLabel(row.reward)}${row.status === 'met' ? ` · ÁNIMO +${row.moodEffect}` : ''}`}</em>
      </li>;
    })}</ul>
  </div>;
  return <section className="board-panel">
    <header><h3>OBJETIVOS DE LA DIRECTIVA</h3><p>SE EVALÚAN AL TERMINAR EL TORNEO.</p><HowItWorks><p>La directiva te exige esto según lo que vale tu plantel. Si cumples hay premio y los jugadores se animan; si fallas, se desaniman.</p></HowItWorks></header>
    {block(current)}
    {past.length > 0 && <details><summary>TORNEOS ANTERIORES</summary>{past.map(block)}</details>}
  </section>;
}
