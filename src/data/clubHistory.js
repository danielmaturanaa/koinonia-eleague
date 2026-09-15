const CLUB_HISTORY = {
  '8c283282-5a27-477f-80fb-e6dd0544365e': {
    review: `Fundado en 1991, el Deportivo La Poruña nació con una idea sencilla: jugar al fútbol, representar con orgullo a los suyos y, si era posible, ganar algún partido de vez en cuando. Lo primero se ha cumplido con creces. Lo segundo también. Lo tercero continúa siendo objeto de evaluación por parte de la dirigencia.

Desde sus primeros años, La Poruña construyó una identidad difícil de explicar mediante estadísticas. Es un club capaz de jugar noventa minutos como candidato al título y, a la fecha siguiente, hacer que sus propios hinchas se pregunten si los jugadores se conocieron en el estacionamiento antes de entrar a la cancha. Esa irregularidad, lejos de ser un defecto, terminó convirtiéndose en una de las tradiciones más respetadas de la institución.

A lo largo de su historia, el equipo ha desarrollado una especial habilidad para ilusionar temprano. Cada temporada suele comenzar de manera parecida: buenos resultados, fútbol convincente, calculadora en mano y algún optimista revisando cuándo se entrega la copa. Durante algunas jornadas, La Poruña aparece en los primeros puestos y el ambiente cambia. Se habla de campeonato. Se hacen proyecciones. Se mira la tabla más veces de lo recomendable. Incluso aparece ese inevitable: “Este año sí”.

Después ocurre el fenómeno conocido extraoficialmente como “la poruñización del campeonato”.

Nadie sabe exactamente cuándo comienza. Puede ser una derrota inesperada, un empate imposible de explicar o uno de esos partidos en que el equipo juega tan bien que domina durante ochenta minutos… pero encuentra alguna forma creativa de no ganar. Poco a poco, aquella gloriosa posición en la parte alta de la tabla empieza a transformarse en una ubicación mucho más familiar: la mitad de tabla, territorio histórico de La Poruña y lugar donde las matemáticas permiten seguir soñando mientras todavía quede alguna combinación estadísticamente absurda.

Por eso, hablar de grandes partidos en la historia del club es sencillo. La Poruña ha tenido jornadas en las que parece imparable: fútbol fluido, carácter, goles y actuaciones que hacen pensar que el equipo finalmente encontró la fórmula. El problema es que esa fórmula suele extraviarse antes del partido siguiente. El mismo plantel capaz de dar una exhibición puede regresar días después ofreciendo noventa minutos que la institución prefiere conservar únicamente por obligación reglamentaria.

Y quizás ahí se encuentra el verdadero espíritu poruño.

Porque La Poruña nunca prometió ganar siempre. Su propio himno lo reconoce con una sinceridad poco habitual en el fútbol: “Unas veces das alegrías, otras veces… mejor ni hablar”. Pocas instituciones han logrado convertir su irregularidad deportiva en patrimonio cultural con semejante elegancia.

La filosofía del club podría resumirse en otra frase de su canción: “Poruña a Poruña va”. No está del todo claro qué significa, pero después de tantos años tampoco parece necesario averiguarlo. Los Poruños la entienden perfectamente. Significa avanzar como se pueda, celebrar cuando corresponde y, cuando no corresponde… probablemente celebrar igual.

En las vitrinas del Deportivo La Poruña todavía sobra espacio. Mucho espacio. Una cantidad de espacio que el encargado de utilería agradece profundamente. De ahí nació uno de los lemas más representativos de la institución: “Más cucharas que títulos”, una declaración que combina realidad deportiva, orgullo y una saludable capacidad de reírse de uno mismo. Porque mientras otros clubes cuentan campeonatos, La Poruña cuenta historias. Y cucharas.

Pero sería injusto medir al club solamente por sus trofeos; principalmente porque esa metodología no nos favorecería demasiado. La verdadera historia de La Poruña está en sus temporadas impredecibles, sus remontadas inesperadas, sus derrotas inexplicables, las semanas en que parece campeón y aquellas en que conviene no revisar la tabla. Está en una hinchada que ha aprendido que apoyar al equipo requiere optimismo, paciencia y una extraordinaria tolerancia a los cambios de ánimo.

Han pasado los años y algunas cosas han cambiado. Otras permanecen intactas. Cada nueva temporada comienza con esperanza. Cada buena racha vuelve a despertar la ilusión. Y aunque la experiencia recomienda prudencia, inevitablemente alguien termina diciendo otra vez:

“Este año sí.”

Quizás algún día tenga razón.

Hasta entonces, Deportivo La Poruña seguirá haciendo lo que mejor sabe hacer: competir, entusiasmar, complicarse innecesariamente, volver a entusiasmar y aparecer en la mitad de tabla justo cuando todos empezaban a hacer planes para la celebración del campeonato.

Porque aquí nadie garantiza títulos.

Pero historias, esas nunca faltan.

Deportivo La Poruña. Desde 1991. Más cucharas que títulos… y todavía con espacio en la vitrina.`,
    anthemUrl: '/audio/himnos/deportivo-la-poruna.mp3',
    anthemLyrics: `Cuando cae la tarde en el barrio,
Y la cancha comienza a despertar,
Con la vieja camiseta puesta,
La Poruña sale a jugar.

No prometemos tantas victorias,
Ni que todo vaya a resultar,
Pero cuando empieza el partido,
¡Nadie nos viene a asustar!

Deportivo La Poruña,
Qué manera de hacerme soñar,
Unas veces das alegrías,
Otras veces… mejor ni hablar.

Deportivo La Poruña,
Poruña a Poruña va,
Con un poco de esperanza,
¡Si no ganamos jugando,
Igual vamos a celebrar!

Y si el partido se pone difícil,
Sí parece que no va a alcanzar,
Que se prepare el que venga enfrente,
¡La Poruña lo va a intentar!

Deportivo La Poruña,
Que se escuche nuestra canción,
Con la camiseta en alto,
¡Con orgullo y corazón!

Deportivo La Poruña,
Poruña a Poruña va,
Con un poco de esperanza,
¡Si no ganamos jugando,
Igual vamos a celebrar!

¡Deportivo La Poruña!
¡La Poruña!
¡La Poruña!
¡La Poruña!`,
  },
};

const EMPTY_HISTORY = {
  review: 'RESEÑA HISTÓRICA PENDIENTE DE PUBLICACIÓN.',
  anthemUrl: '',
  anthemLyrics: 'LETRA DEL HIMNO PENDIENTE DE PUBLICACIÓN.',
};

export const clubHistoryFor = teamId => CLUB_HISTORY[teamId] ?? EMPTY_HISTORY;
