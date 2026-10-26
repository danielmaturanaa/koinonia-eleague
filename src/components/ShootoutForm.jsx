import { useState } from 'react';
import { Button } from '../ui/index.js';
import { TeamMark } from './TeamMark.jsx';

const upper = text => String(text ?? '').toUpperCase();

/** Resultado de una tanda de penales: un marcador por equipo; gana el que convirtió más. */
export function ShootoutForm({ home, away, loading = false, label = 'EMPATE · ANOTA LA TANDA DE PENALES', onSubmit }) {
  const [homeKicks, setHomeKicks] = useState('');
  const [awayKicks, setAwayKicks] = useState('');
  const filled = homeKicks !== '' && awayKicks !== '';
  const h = Number(homeKicks);
  const a = Number(awayKicks);
  const inRange = filled && [h, a].every(kicks => Number.isInteger(kicks) && kicks >= 0 && kicks <= 30);
  const valid = inRange && h !== a;
  const winner = h > a ? home : away;
  const submit = event => {
    event.preventDefault();
    if (valid) onSubmit({ winnerTeamId: winner.id, penalties: { winner: Math.max(h, a), loser: Math.min(h, a) } });
  };
  return <form className="shootout-form" onSubmit={submit}>
    <small>{label}</small>
    <div className="shootout-inputs">
      {[[home, homeKicks, setHomeKicks], [away, awayKicks, setAwayKicks]].map(([team, value, set]) => <label key={team.id}>
        <span><TeamMark team={team}/>{upper(team.name)}</span>
        <input type="number" inputMode="numeric" min="0" max="30" step="1" value={value} onChange={event => set(event.target.value)} aria-label={`Penales convertidos por ${team.name}`}/>
      </label>)}
    </div>
    {inRange && h === a && <p className="shootout-hint">UNA TANDA NO TERMINA EMPATADA: EL GANADOR CONVIRTIÓ MÁS.</p>}
    <Button type="submit" size="sm" disabled={!valid || loading}>{valid ? `GANA ${upper(winner.name)} ${Math.max(h, a)}–${Math.min(h, a)}` : 'ANOTAR PENALES'}</Button>
  </form>;
}
