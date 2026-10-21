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
    <li><strong>Ningún jugador puede cobrar más del 20% de su valor de mercado</strong> (se mide al firmar o renovar). Si su valor baja y el tope ya no alcanza ni para igualar su sueldo, no se puede renovar.</li>
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

const ClubSystems = () => <>
  <section className="rules-section">
    <h2>7. Roles, Ánimo y Peticiones de Jugadores</h2>
    <ul>
      <li>El Presidente asigna a cada jugador un rol: <strong>crucial, importante, rotación o esporádico</strong>. Los roles solo se cambian con el <strong>mercado cerrado</strong>.</li>
      <li>El ánimo del jugador (de 5 a 95) sale de su rol comparado con el que cree merecer, su sueldo frente a su valor, la forma del equipo, la reputación del club, los títulos, las promesas cumplidas y su personalidad. Un jugador muy molesto no se sienta a negociar su renovación.</li>
      <li>Cuando un jugador no está conforme (con su rol o con su sueldo) le escribe al Presidente y abre una <strong>petición</strong>. Se responde desde la Bandeja (o por Discord) con una promesa, un regalo de confianza (cuesta el 25% de su sueldo), paciencia o ignorándolo, y cada respuesta tiene consecuencias en su ánimo. Solo se puede responder con el <strong>mercado cerrado</strong>.</li>
      <li>Si la petición se ignora o no se responde a tiempo, el jugador <strong>pide salir</strong>: ya no se le puede renovar y solo queda venderlo o canjearlo.</li>
    </ul>
  </section>
  <section className="rules-section">
    <h2>8. Primas</h2>
    <ul>
      <li>Cada jugador puede tener tres primas, que paga el club: por <strong>gol</strong> (hasta el 1% de su valor por gol), por <strong>clasificar a playoffs</strong> (hasta el 5%, a los jugadores de los cuatro clasificados) y por <strong>título</strong> (hasta el 10%, al campeón de playoffs).</li>
      <li>Las primas se fijan solo con el <strong>mercado abierto</strong>. Se pagan al cerrar la temporada (goles), al comenzar los playoffs (clasificación) y al coronarse el campeón (título).</li>
      <li>La prima por gol cuenta para el tope del 20% del valor: se suman los goles que se esperan de su posición. Al renovar las primas se mantienen (recortadas si ya no caben con el nuevo sueldo); si el jugador cambia de club llega sin primas.</li>
    </ul>
  </section>
  <section className="rules-section">
    <h2>9. Directiva y Objetivos</h2>
    <ul>
      <li>Al comenzar cada torneo de liga la directiva le fija a cada club tres objetivos según lo que vale su plantel: terminar en el puesto que le corresponde por valor (<strong>de 5 a 30 M GP</strong>: cuanto más alta la meta, más paga; pedirle el 1.º vale 30 M y terminar último, 5 M), clasificar a playoffs (<strong>de 5 a 15 M GP</strong>, más cuanto más abajo está el club en valor) y no pasar el tope de nómina (<strong>5 M GP</strong>).</li>
      <li>Se evalúan al terminar el torneo. Cada objetivo cumplido da su premio en GP y sube el ánimo de la plantilla (+5); uno fallado baja el ánimo (−5), sin multa.</li>
    </ul>
  </section>
  <section className="rules-section">
    <h2>10. Estadios</h2>
    <ul>
      <li>La liga tiene un catálogo de estadios, reales y ficticios, ordenados en categorías <strong>S, A, B, C y D</strong> (de mayor a menor), cada uno con su capacidad y su precio en GP. Se ven todos en <strong>Equipos › Estadios</strong>, con su foto (la sube el club dueño o la administración).</li>
      <li>Cada estadio tiene un solo dueño y cada club puede tener uno. Comprarlo descuenta su precio del saldo; cambiar a otro reembolsa el actual a su precio de catálogo y se paga solo la diferencia; venderlo devuelve su precio de catálogo.</li>
      <li>El aforo es el techo de la taquilla: un club sin estadio del catálogo juega en su cancha propia, de <strong>12.000 personas</strong>. Un estadio más grande deja entrar a más gente en cada partido de local, recibe conciertos más grandes y es requisito para La Velada.</li>
    </ul>
  </section>
  <section className="rules-section">
    <h2>11. Ventanas del Mercado</h2>
    <ul>
      <li>Con el mercado <strong>abierto</strong>: contratos, renovaciones, negociaciones, contraofertas y primas.</li>
      <li>Con el mercado <strong>cerrado</strong>: roles y respuestas a las peticiones de los jugadores, para que nadie los use para manipular las transacciones.</li>
      <li>Rescindir un contrato se puede en cualquier momento. Los contratos vencidos pasan a la agencia libre al cierre del mercado, nunca mientras haya un torneo de liga en curso.</li>
    </ul>
  </section>
  <section className="rules-section">
    <h2>12. Visto Bueno del Jugador</h2>
    <ul>
      <li>En un traspaso o un trueque con contrato vigente deciden <strong>tres partes</strong>: el club que vende acepta el precio, el que compra paga y el <strong>jugador da (o no) su visto bueno</strong>. Su representante habla por él.</li>
      <li>El jugador compara el club al que lo mandan con el suyo: minutos, compañeros, DT, historia, proyecto y fama del Presidente, más su ánimo, el rol que tendría, si es leal, si lo mandan al <strong>clásico rival</strong> y si lo cambiaron hace poco (no quiere ser una ficha de cambio).</li>
      <li>Puede aceptar, <strong>pedir condiciones</strong> (una prima de fichaje y, a veces, un rol prometido) o negarse. La prima la paga el club que lo recibe, va directo al jugador y no puede pasar el <strong>15% de su valor</strong>. El rol prometido queda en su contrato: si no se cumple, se molesta.</li>
      <li>Si el jugador pidió salir, acepta casi cualquier destino. Con el contrato vencido se negocia el sueldo como siempre (sección 6).</li>
    </ul>
  </section>
  <section className="rules-section">
    <h2>13. Clásicos</h2>
    <ul>
      <li>Cada club tiene un clásico. El <strong>natural</strong> sale del historial: partidos, eliminatorias, finales, goleadas y traspasos entre ambos (vale más si la rivalidad es pareja). El Presidente puede <strong>elegir otro una vez por temporada</strong>.</li>
      <li>Si los dos clubes se eligen, es <strong>clásico oficial</strong>. En un clásico la demanda de entradas sube 60% (90% si es oficial) y ganar o perder mueve el doble de hinchas y ánimo.</li>
    </ul>
  </section>
  <section className="rules-section">
    <h2>14. Hinchada y Taquilla</h2>
    <ul>
      <li>Cada club tiene <strong>hinchas</strong>: personas en todo el mundo que se declaran hinchas del club (no seguidores de redes). Los clubes son gigantes, como los grandes de verdad: el más prestigioso de la liga parte con 500 millones y el resto hacia abajo, hasta 50 millones, según su prestigio (historial de títulos, finales y playoffs, y valor del plantel). Cada club tiene un país (Lalo Cura neerlandés, Real Potente inglés, PSF francés, Que Falso italiano, Bombo turco, PorLaCheetah y La Poruña alemanes, Forestyle chileno), que decide dónde viven sus hinchas: una parte en casa y el resto repartido por el mundo según población, gusto por el fútbol y lazos (idioma, migración). En la ficha del club hay un mapa con dónde viven. Desde ahí crecen o bajan con resultados, clásicos, títulos y eventos. También hay un <strong>ánimo de la hinchada</strong> que cambia partido a partido.</li>
      <li>Al terminar cada partido de clubes, el local cobra las entradas: la asistencia depende de sus hinchas que viven cerca (los de su país y unos pocos de afuera que viajan), el rival, si es clásico o playoffs, el ánimo de la gente y el precio que fijó el Presidente (popular 35 €, normal 60 €, premium 95 €). El aforo es el techo. La final a partido único se juega en el estadio más grande de los dos y la taquilla se reparte mitad y mitad.</li>
      <li>Un castigo (W.O.) se juega a puertas cerradas: no hay taquilla. Si un partido se reabre o se anula, la taquilla y los hinchas se devuelven.</li>
      <li><strong>El marcador no cambia</strong>: la hinchada y el estadio mueven plata, hinchas y ánimo, nunca el resultado del partido.</li>
    </ul>
  </section>
  <section className="rules-section">
    <h2>15. Conciertos, La Velada y derechos de TV</h2>
    <ul>
      <li><strong>Conciertos:</strong> el Presidente contrata a un artista de la cartelera, le paga por adelantado lo que cobra por tocar y el show se hace en su próxima fecha de local. Al club le quedan 60 € por persona. Cada artista pide un aforo mínimo. La convocatoria tiene azar: un estadio lleno deja ganancia e hinchas y un show flojo puede dar pérdida. Máximo dos por temporada; cancelar devuelve la mitad de lo pagado. La cartelera es solo de <strong>música cristiana</strong>: Marcos Witt, Phil Wickham, Tauren Wells, Marcos Barrientos, Redimi2, Marcos Vidal, Alex Zurdo, Juan Carlos Alvarado, Funky, Majo y Dan, Eli Soares y ResQ Band. La mayoría cabe en una cancha de 12.000 personas.</li>
      <li><strong>La Velada del Año:</strong> una vez por temporada Ibai busca estadio para su evento de boxeo (la búsqueda la abre la administración y a cada club le llega un aviso). Funciona como una subasta a sobre cerrado: cada club que quiere el evento le ofrece plata a Ibai, y nadie ve lo que ofrecen los demás. Solo pueden ofrecer los clubes con un estadio de 50.000 personas o más y 100 millones de hinchas. Al cierre, Ibai elige uno mirando la plata (50%), el tamaño del estadio (30%) y los hinchas (20%). El elegido paga lo que ofreció y cobra las entradas a estadio lleno (80 € cada una) más 3 M de transmisión; los demás no pagan nada.</li>
      <li><strong>Derechos de TV:</strong> cada temporada tres canales (TNT Sports, ESPN, DSports, DAZN, Prime Video y otros) ofrecen transmitir los partidos del club: fija, mixta o arriesgada. Cada canal paga según su tamaño y los hinchas del club en todo el mundo; los gigantes (Prime Video, DAZN, ESPN) pagan más pero solo llaman a clubes con mucha hinchada, y la TV abierta paga menos y le transmite a cualquiera. Se cobran al cerrar cada torneo de liga, con bonos por playoffs y por título según la oferta. No van en la camiseta, porque en el juego se usan camisetas reales con su propia marca.</li>
    </ul>
  </section>
</>;

export function RulesPage() {
  const rules = useApiQuery(signal => endpoints.leagueRules(signal), []);
  const squadValueLimit = Number(rules.data?.squadValueLimit) > 0 ? Number(rules.data.squadValueLimit) : null;
  const payrollCap = Number(rules.data?.payrollCap) > 0 ? Number(rules.data.payrollCap) : null;
  const contractsEnabled = Boolean(rules.data?.contractsEnabled);
  return <main className="newspaper"><article className="data-paper rules-paper">
    <header className="rules-header"><p>KOINONIA e-LEAGUE · DOCUMENTO OFICIAL</p><h1>Reglamento Oficial de la Liga eFootball</h1></header>
    <p className="rules-intro">Este documento establece la normativa oficial para el desarrollo de la liga, incluyendo reglas de jugabilidad, sanciones, sistema de divisiones, mercado de fichajes y sistema de premiación. Todos los presidentes y participantes están obligados a cumplir estas normativas.</p>
    <MatchRules/><Sanctions/><Divisions/><Transfers squadValueLimit={squadValueLimit} payrollCap={payrollCap} contractsEnabled={contractsEnabled}/><Prizes/><Contracts payrollCap={payrollCap}/>{contractsEnabled && <ClubSystems/>}
  </article></main>;
}
