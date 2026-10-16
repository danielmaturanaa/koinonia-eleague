import { endpoints } from '../../api/endpoints.js';
import { useApiQuery } from './useApiQuery.js';

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

const Transfers = ({ squadValueLimit }) => <section className="rules-section">
  <h2>4. Mercado de Fichajes, Contratos y Traspasos</h2>
  <h3>4.1 Negociaciones y Trueques</h3>
  <ul>
    <li>La compra de un jugador perteneciente a otro club deberá respetar el precio de negociación impuesto por su presidente.</li>
    <li>Los presidentes pueden acordar el valor monetario que estimen conveniente por una venta directa.</li>
    <li>Se permiten los trueques de jugador por jugador y de jugador más dinero por otro jugador.</li>
  </ul>
  <h3>4.2 Liberación y Cláusulas de Salida</h3>
  <ul>
    <li>Un presidente puede liberar a un jugador y recibirá una compensación baja. El jugador pasará a la agencia libre al precio estándar del juego.</li>
    <li>Los presidentes pueden blindar jugadores mediante una <strong>Cláusula de Salida</strong>.</li>
    <li>Si otro club paga la cláusula establecida, el equipo vendedor <strong>no puede retractarse</strong>.</li>
    <li>Toda venta, cláusula o liberación debe informarse al área encargada de presupuestos para su registro oficial.</li>
  </ul>
  <h3>4.3 Subastas a Final de Temporada</h3>
  <p>Si dos o más presidentes desean adquirir al mismo jugador libre al final de la temporada, la operación se resolverá mediante una <strong>subasta</strong> entre los clubes interesados.</p>
  <h3>4.4 Fair Play Financiero</h3>
  <ul>
    <li>El valor total de una plantilla no podrá superar <strong>{squadValueLimit === null ? 'el tope definido por la liga' : `${squadValueLimit.toLocaleString('es-CL')} GP`}</strong> (valor a definir por la liga). Durante el mercado puedes pasarte mientras ordenas tu plantel: el tope se revisa al <strong>cierre del mercado</strong>. Lo que sí frena una compra es el saldo: no puedes pagar más de lo que tienes.</li>
    <li>Para este cálculo siempre se utilizará el valor de mercado base del jugador, independientemente del precio pagado en una negociación.</li>
  </ul>
</section>;

const Prizes = () => <>
  <section className="rules-section">
    <h2>5. Sistema de Premios</h2>
    <h3>Tabla de la liga</h3>
    <ul><li><strong>1.º:</strong> 200.000 GP</li><li><strong>Desde el 2.º:</strong> 20.000 GP menos por cada puesto (2.º 180.000, 3.º 160.000, 4.º 140.000, y así).</li></ul>
    <h3>Playoffs</h3>
    <ul>
      <li><strong>Campeón:</strong> Cupón de Rebaja Salarial del 20% + 40.000 GP.</li>
      <li><strong>Subcampeón:</strong> Cupón de Rebaja Salarial del 15% + 20.000 GP.</li>
      <li><strong>Semifinalistas:</strong> Cupón de Rebaja Salarial del 10%.</li>
    </ul>
    <p>Los premios de los playoffs se suman a los de la tabla.</p>
  </section>
  <section className="rules-section">
    <h2>6. Cupones de Rebaja Salarial</h2>
    <ul>
      <li>Le bajan el valor a un jugador de tu plantel en el porcentaje del cupón (por ejemplo, uno de 100.000 GP con un cupón del 20% queda en 80.000 GP), lo que te deja más margen bajo el tope de plantilla.</li>
      <li>Cada jugador puede recibir <strong>una sola rebaja</strong> mientras esté en un mismo club.</li>
      <li>El cupón es del club que lo ganó y lo usa su Presidente desde la ficha del club en la web, cuando quiera. No vence. Cada uso se anuncia en Discord.</li>
      <li>No se puede usar en un jugador que esté amarrado por una promesa.</li>
    </ul>
  </section>
</>;

export function RulesPage() {
  const rules = useApiQuery(signal => endpoints.leagueRules(signal), []);
  const squadValueLimit = Number(rules.data?.squadValueLimit) > 0 ? Number(rules.data.squadValueLimit) : null;
  return <main className="newspaper"><article className="data-paper rules-paper">
    <header className="rules-header"><p>KOINONIA e-LEAGUE · DOCUMENTO OFICIAL</p><h1>Reglamento Oficial de la Liga eFootball</h1></header>
    <p className="rules-intro">Este documento establece la normativa oficial para el desarrollo de la liga, incluyendo reglas de jugabilidad, sanciones, sistema de divisiones, mercado de fichajes y sistema de premiación. Todos los presidentes y participantes están obligados a cumplir estas normativas.</p>
    <MatchRules/><Sanctions/><Divisions/><Transfers squadValueLimit={squadValueLimit}/><Prizes/>
  </article></main>;
}
