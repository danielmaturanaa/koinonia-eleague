import { Button, Card, Chip, HowItWorks, Stat } from '../../ui/index.js';
import { gpLabel } from '../../utils/money.js';
import { BoardPanel } from './BoardPanel.jsx';
import { ReputationSummary } from './Reputation.jsx';

/**
 * Directiva: lo que te exige la directiva este torneo, cómo está la caja ante la regla de quiebra y tu reputación como
 * presidente. Todo lo que "te evalúan" en un solo lugar.
 */
export function DirectivaTab({ team, balance, onReputation }) {
  const reputation = team.president?.reputation ?? null;
  const known = balance !== null && balance !== undefined;
  const red = known && balance < 0;
  return <div className="directiva-tab">
    <BoardPanel team={team}/>
    <Card title="SALUD DE LA CAJA" aside={known && <Chip tone={red ? 'red' : 'green'} icon={red ? 'warning' : 'check'}>{red ? 'EN ROJO' : 'EN VERDE'}</Chip>}>
      <Stat label="EN CAJA" value={known ? gpLabel(balance) : '—'} tone={red ? 'red' : 'default'}
        hint={red ? 'SI ARRANCAS EL PRÓXIMO TORNEO ASÍ, LA DIRECTIVA TE AVISA; DOS SEGUIDOS Y VENDE A TUS JUGADORES MÁS CAROS' : 'AL ARRANCAR CADA TORNEO DE LIGA SE REVISA LA CAJA'}/>
      <HowItWorks title="¿Cómo funciona la quiebra?">
        <p>Al arrancar cada torneo de liga (con los premios del anterior ya pagados) la directiva revisa la caja. En rojo no puedes comprar y baja tu reputación. Dos arranques seguidos en rojo: la directiva interviene y vende a los jugadores más caros al 75% de su valor hasta volver a positivo.</p>
      </HowItWorks>
    </Card>
    {reputation && <Card title="TU REPUTACIÓN" aside={<Button size="sm" variant="ghost" onClick={onReputation}>Ver el ranking</Button>}>
      <ReputationSummary reputation={reputation} clubCount={reputation.clubCount}/>
    </Card>}
  </div>;
}
