import { endpoints } from '../../api/endpoints.js';
import { useApiQuery } from './useApiQuery.js';
import { gpLabel } from '../../utils/money.js';

const MatchRules = () => <section className="rules-section">
  <h2>1. Configuración de Partidos y Jugabilidad</h2>
  <ul>
    <li><strong>Creación de la Sala (Localía):</strong> El jugador que figure como equipo local en el calendario tiene la responsabilidad de crear la sala de juego.</li>
    <li><strong>Formato de Liga:</strong> El partido debe configurarse en <strong>10 minutos</strong> y con la condición de los jugadores en <strong>“Excelente Estado”</strong> para ambos equipos.</li>
    <li><strong>Formato de Copa (Eliminatorias):</strong> En los encuentros de eliminación directa deben estar activadas obligatoriamente las opciones de <strong>Prórroga y Penales</strong>.</li>
    <li><strong>Interrupciones y Caídas del Servidor:</strong> Se deberá crear una nueva sala y jugar un partido de <strong>5 minutos</strong> para simular el tiempo restante. Alternativamente, ambos jugadores pueden acordar un partido normal de 10 minutos disputando únicamente un tiempo.</li>
  </ul>
</section>;

const Sanctions = () => <section className="rules-section">
  <h2>2. Régimen de Sanciones (W.O.)</h2>
  <ul>
    <li><strong>Abandono de Partido:</strong> Si un jugador se retira de la sala o deja el mando intencionalmente, perderá automáticamente por <strong>10 a 0</strong>.</li>
    <li><strong>Ausencia e Inactividad:</strong> Quien no se presente o no manifieste interés en coordinar dentro de <strong>3 días</strong>, perderá por W.O. con marcador de <strong>3 a 0</strong>.</li>
  </ul>
</section>;

const Divisions = () => <section className="rules-section">
  <h2>3. Sistema de Divisiones (Ascensos y Descensos)</h2>
  <p>El flujo entre divisiones se define al concluir la temporada:</p>
  <table className="rules-table"><thead><tr><th>Posición final</th><th>Resolución</th></tr></thead><tbody>
    <tr><td><strong>Último lugar</strong> de Primera División</td><td>Desciende automáticamente a Segunda División.</td></tr>
    <tr><td><strong>Primer lugar</strong> de Segunda División</td><td>Asciende automáticamente a Primera División.</td></tr>
    <tr><td><strong>Penúltimo de Primera</strong> vs. <strong>2.º de Segunda</strong></td><td>Juegan un partido de promoción. El ganador permanece o asciende a Primera División.</td></tr>
  </tbody></table>
</section>;

const Transfers = ({ squadValueLimit, payrollCap, contractsEnabled }) => <section className="rules-section">
  <h2>4. Mercado de Fichajes, Contratos y Traspasos</h2>
  <h3>4.1 Negociaciones y Trueques</h3>
  <ul>
    <li>La compra de un jugador perteneciente a otro club deberá respetar el precio de negociación impuesto por su presidente.</li>
    <li>Los presidentes pueden acordar el valor monetario que estimen conveniente por una venta directa.</li>
    <li>Se permiten los trueques de jugador por jugador y de jugador más dinero por otro jugador.</li>
  </ul>
  <h3>4.2 Liberación y Cláusulas de Salida</h3>
  <ul>
    <li>Un presidente puede liberar a un jugador y recibirá una compensación baja (20% de su valor). El jugador pasará a la agencia libre con su valor de mercado. Con contratos (desde el v11) liberar a alguien con contrato vigente es rescindir: ver sección 6.</li>
    <li>Los presidentes pueden blindar jugadores mediante una <strong>Cláusula de Salida</strong>.</li>
    <li>Si otro club paga la cláusula establecida, el equipo vendedor <strong>no puede retractarse</strong>.</li>
    <li>Toda venta, cláusula o liberación debe informarse al área encargada de presupuestos para su registro oficial.</li>
  </ul>
  <h3>4.3 Subastas a Final de Temporada</h3>
  <p>Si dos o más presidentes desean adquirir al mismo jugador libre al final de la temporada, la operación se resolverá mediante una <strong>subasta</strong> entre los clubes interesados.</p>
  <h3>4.4 Fair Play Financiero</h3>
  {contractsEnabled
    ? <ul>
      <li>Desde el torneo v11 el límite es la <strong>nómina</strong> (la suma de los sueldos anuales de la plantilla): <strong>{payrollCap === null ? 'el tope lo define la liga' : `${gpLabel(payrollCap)} al año`}</strong>. Es un tope de aviso: se revisa al <strong>cierre del mercado</strong> y no frena operaciones durante él.</li>
      <li>El tope de valor total de la plantilla deja de aplicarse. El valor de mercado de cada jugador viene de Transfermarkt y no cambia por traspasos, trueques, subastas ni liberaciones.</li>
    </ul>
    : <ul>
      <li>El valor total de una plantilla no podrá superar <strong>{squadValueLimit === null ? 'el tope definido por la liga' : gpLabel(squadValueLimit)}</strong> (valor a definir por la liga). Durante el mercado puedes pasarte mientras ordenas tu plantel: el tope se revisa al <strong>cierre del mercado</strong>. Lo que sí frena una compra es el saldo: no puedes pagar más de lo que tienes.</li>
      <li>Para este cálculo siempre se utilizará el valor de mercado del jugador, independientemente del precio pagado en una negociación. El valor de mercado viene de Transfermarkt y no cambia por traspasos, trueques, subastas ni liberaciones.</li>
      <li>Desde el torneo v11 este límite se reemplaza por un tope de nómina (ver sección 6).</li>
    </ul>}
</section>;

const Prizes = () => <>
  <section className="rules-section">
    <h2>5. Sistema de Premios</h2>
    <h3>Tabla de la liga</h3>
    <ul><li><strong>1.º:</strong> 200 M GP</li><li><strong>Desde el 2.º:</strong> 20 M GP menos por cada puesto (2.º 180 M, 3.º 160 M, 4.º 140 M, y así).</li></ul>
    <h3>Playoffs</h3>
    <ul>
      <li><strong>Campeón:</strong> 40 M GP.</li>
      <li><strong>Subcampeón:</strong> 20 M GP.</li>
    </ul>
    <p>Los premios de los playoffs se suman a los de la tabla.</p>
  </section>
</>;

const Contracts = ({ payrollCap }) => <section className="rules-section">
  <h2>6. Contratos y Nómina (desde el torneo v11)</h2>
  <h3>6.1 Duración</h3>
  <ul>
    <li>Todo contrato inicial o renovación dura entre <strong>2 y 6 temporadas</strong>, según lo defina el Presidente al firmar. Una temporada es un torneo de liga terminado.</li>
    <li>Un mánager puede renovar a un jugador las veces que quiera. Puedes cambiar los años de un contrato mientras no se haya cobrado su primera temporada.</li>
  </ul>
  <h3>6.2 Sueldo y cobro</h3>
  <ul>
    <li>El sueldo anual es el <strong>10% del valor de mercado</strong> del jugador al firmar y queda congelado durante todo el contrato. No se paga por adelantado: se cobra al terminar cada torneo de liga, mientras el jugador siga en el club.</li>
    <li>Al renovar, el sueldo sube entre <strong>1% y 100%</strong>. El jugador pide como mínimo su sueldo actual o el 10% de su valor de hoy, el que sea mayor; si no le ofreces eso, rechaza.</li>
    <li>La nómina del club es la suma de los sueldos de su plantilla y {payrollCap === null ? 'tiene un tope que define la liga' : `no debería pasar de ${gpLabel(payrollCap)} al año`}. Es un aviso al cierre del mercado y no bloquea operaciones.</li>
  </ul>
  <h3>6.3 Término, rescisión y salidas</h3>
  <ul>
    <li>Cuando el contrato cumple todas sus temporadas, el jugador sigue en el club hasta el cierre del mercado: se renueva, o pasa a la agencia libre <strong>sin castigo</strong> para la subasta.</li>
    <li>No se puede soltar a un jugador antes de que termine su contrato sin consecuencias: rescindir cuesta una <strong>indemnización del 50% de las temporadas que faltan</strong>, sin reembolso, y el presidente sufre un castigo de reputación.</li>
    <li>Un jugador con contrato vigente solo puede cambiar de club en periodos de mercado: por traspaso directo o pagando su cláusula de salida. El contrato acompaña al jugador a su nuevo club.</li>
  </ul>
  <h3>6.4 Reputación</h3>
  <p>Con el sistema de contratos la reputación de todos los clubes parte de cero. Los títulos y finales (palmarés) se mantienen intactos.</p>
</section>;

export function RulesPage() {
  const rules = useApiQuery(signal => endpoints.leagueRules(signal), []);
  const squadValueLimit = Number(rules.data?.squadValueLimit) > 0 ? Number(rules.data.squadValueLimit) : null;
  const payrollCap = Number(rules.data?.payrollCap) > 0 ? Number(rules.data.payrollCap) : null;
  const contractsEnabled = Boolean(rules.data?.contractsEnabled);
  return <main className="newspaper"><article className="data-paper rules-paper">
    <header className="rules-header"><p>KOINONIA e-LEAGUE · DOCUMENTO OFICIAL</p><h1>Reglamento Oficial de la Liga eFootball</h1></header>
    <p className="rules-intro">Este documento establece la normativa oficial para el desarrollo de la liga, incluyendo reglas de jugabilidad, sanciones, sistema de divisiones, mercado de fichajes y sistema de premiación. Todos los presidentes y participantes están obligados a cumplir estas normativas.</p>
    <MatchRules/><Sanctions/><Divisions/><Transfers squadValueLimit={squadValueLimit} payrollCap={payrollCap} contractsEnabled={contractsEnabled}/><Prizes/><Contracts payrollCap={payrollCap}/>
  </article></main>;
}
