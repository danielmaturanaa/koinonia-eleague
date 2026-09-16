import { deterministicItem, hashString } from './deterministic.js';

const value = (...candidates) => candidates.find(candidate => candidate !== undefined && candidate !== null && candidate !== '');
const teamId = team => team?.id ?? team?.teamId ?? team?.team_id ?? '';
const teamName = team => value(team?.name, team?.teamName, 'Equipo no informado');
const playerName = item => value(item?.player?.name, item?.playerName, item?.name, 'Jugador no informado');
const goalTeamName = goal => value(goal?.scoringTeam?.name, goal?.team?.name, goal?.teamName, 'Equipo no informado');
const cardTeamName = card => value(card?.team?.name, card?.teamName, 'Equipo no informado');
const dateOf = match => Date.parse(value(match?.finishedAt, match?.startedAt, match?.scheduledAt, match?.createdAt)) || 0;

const storyAngleTemplates = {
  drawClosed: [
    'El partido avanzó con pocas concesiones y terminó reflejando un equilibrio que ninguno de los dos equipos consiguió romper.',
    'Fue uno de esos encuentros donde cada espacio costó caro y donde las defensas terminaron imponiéndose sobre los ataques.',
    'Ninguno logró despegarse del otro y el desarrollo terminó confirmando lo parejo que estuvo el cruce de principio a fin.',
    'El margen fue mínimo durante todo el encuentro y el empate terminó siendo un reflejo bastante fiel de lo ocurrido en la cancha.',
    'Hubo más tensión que claridad, y el partido terminó atrapado en un equilibrio que ninguno supo quebrar.',
    'Cada intento encontró una respuesta del otro lado y el encuentro terminó convertido en una batalla de paciencia y pocos espacios.',
    'El duelo tuvo mucho orden, bastante cautela y muy poco margen para el error, ingredientes que terminaron manteniendo todo en equilibrio.',
    'Ninguno consiguió imponer condiciones con claridad y el partido fue entrando poco a poco en un terreno donde arriesgar demasiado podía costar caro.',
    'Las defensas hicieron su trabajo y los ataques tuvieron que pelear cada metro, dejando un encuentro más disputado que vistoso.',
    'Fue uno de esos partidos donde abrir espacios parecía misión imposible y donde cada avance encontraba una puerta cerrada del otro lado.',
  ],
  drawHighScoring: [
    'Cuando uno parecía sacar ventaja, el otro encontraba respuesta. El resultado terminó coronando un partido abierto, cambiante y lleno de goles.',
    'Ataques inspirados, defensas exigidas y poco tiempo para respirar: el empate terminó siendo el cierre lógico de un duelo cargado de acción.',
    'El marcador se movió una y otra vez y ninguno consiguió quedarse definitivamente con el control de un partido que tuvo de todo.',
    'Fue un intercambio constante de golpes futboleros, con ambos equipos encontrando respuestas cada vez que el partido parecía inclinarse.',
    'Nadie quiso quedarse atrás y el encuentro terminó convertido en uno de esos empates donde el espectáculo pesa tanto como el resultado.',
    'Hubo goles, respuestas y más de un giro inesperado en un partido que nunca dio la sensación de estar completamente controlado por nadie.',
    'Cada ataque parecía tener respuesta inmediata y el encuentro terminó transformándose en una montaña rusa que no dejó espacio para aburrirse.',
    'El partido se jugó con el arco rival siempre en la mira y terminó premiando el atrevimiento de dos equipos que nunca dejaron de buscar.',
    'Fue una jornada de esas en que las defensas pidieron la hora y los ataques se encargaron de ponerle espectáculo al marcador.',
    'Si alguien buscaba tranquilidad, eligió el partido equivocado: ambos equipos fueron al frente y terminaron construyendo un empate lleno de acción.',
  ],
  drawUnbeaten: [
    'El empate permite que {equipo} mantenga su condición de invicto y prolongue una seguidilla que sigue dando estabilidad a su campaña.',
    '{equipo} no consiguió quedarse con todo, pero conserva una racha sin derrotas que continúa sumando confianza jornada tras jornada.',
    'La seguidilla invicta de {equipo} sigue en pie, confirmando una regularidad que empieza a convertirse en uno de sus principales argumentos.',
    'El resultado no fue una victoria, pero sí alcanza para que {equipo} mantenga viva una racha que sigue hablando de consistencia.',
    '{equipo} vuelve a sumar sin conocer la derrota y mantiene una dinámica que le permite sostener un presente competitivo.',
    'La racha sin caídas continúa para {equipo}, que sigue encontrando la forma de mantenerse en pie incluso cuando el partido no termina a su favor.',
    '{equipo} conserva su invicto y demuestra que, aun cuando no logra quedarse con todo, sigue siendo un rival difícil de derribar.',
    'El camino invicto de {equipo} suma una fecha más y refuerza la sensación de un equipo que ha aprendido a competir incluso en jornadas complicadas.',
    '{equipo} sigue sin conocer la derrota y mantiene una regularidad que empieza a darle peso a su campaña dentro de la competición.',
    'La derrota sigue sin aparecer en el calendario de {equipo}, que estira su buen momento y continúa sumando argumentos para sostener su presente.',
  ],
  streak: [
    'La seguidilla de {ganador} ya alcanza las {victoriasConsecutivas} fechas consecutivas y empieza a convertir su buen momento en una tendencia difícil de ignorar.',
    'El presente de {ganador} sigue creciendo y la confianza comienza a notarse en un equipo que atraviesa uno de sus mejores pasajes del torneo.',
    'Con {victoriasConsecutivas} triunfos consecutivos, {ganador} empieza a instalarse entre los equipos que llegan con mejor ritmo a esta parte de la competición.',
    'El buen momento de {ganador} ya dejó de parecer casualidad y comienza a transformarse en una de las rachas más interesantes de su campaña.',
    'La confianza está del lado de {ganador}, que atraviesa una seguidilla positiva y empieza a jugar con el impulso que entregan los buenos resultados.',
    '{ganador} continúa alimentando una dinámica positiva que crece jornada a jornada y comienza a hacerse notar dentro de la competición.',
    'El momento de {ganador} invita a mirar con atención lo que viene: la racha sigue creciendo y el equipo parece cada vez más cómodo con su presente.',
    'La seguidilla de {ganador} empieza a convertirse en una advertencia para sus próximos rivales, que ya saben que enfrentarán a un equipo con confianza.',
    'El buen presente de {ganador} se sostiene fecha tras fecha y empieza a confirmar que el equipo encontró una regularidad que antes le costaba alcanzar.',
    'La confianza crece alrededor de {ganador} y, con {victoriasConsecutivas} victorias consecutivas, la racha ya empieza a meter ruido entre sus próximos rivales.',
  ],
  reaction: [
    'Después de {derrotasPrevias} caídas consecutivas, {ganador} consigue cambiar el ánimo y encuentra el respiro que necesitaba para dejar atrás una etapa complicada.',
    'La mala racha empieza a quedar atrás y {ganador} recupera una dosis de confianza que puede resultar importante para afrontar las próximas jornadas.',
    '{ganador} necesitaba una respuesta y finalmente la encontró, dejando atrás varias fechas difíciles y recuperando sensaciones que parecían haberse perdido.',
    'El ambiente cambia para {ganador}, que logra sacudirse una dinámica negativa y vuelve a mirar el torneo con un panorama bastante más amable.',
    'Después de varias jornadas cuesta arriba, {ganador} encuentra un punto de inflexión y recupera parte de la confianza perdida en el camino.',
    'La presión empezaba a crecer alrededor de {ganador}, pero el equipo consigue frenar la caída y darse un necesario cambio de ánimo.',
    '{ganador} logra dejar atrás una etapa incómoda y encuentra una señal positiva justo cuando los malos resultados comenzaban a pesar demasiado.',
    'El vestuario de {ganador} necesitaba una alegría y esta jornada entrega justamente eso: alivio, confianza y una oportunidad para cambiar la dinámica.',
    'La mochila empezaba a pesar para {ganador}, que consigue sacarse parte de la presión y mirar las próximas jornadas con otra cara.',
    '{ganador} logra salir de una etapa complicada y, al menos por ahora, puede guardar la calculadora de las derrotas en un cajón.',
  ],
  figure: [
    '{jugador} se robó los focos con una actuación decisiva y terminó convirtiéndose en el nombre propio de la jornada.',
    'Cada vez que el partido pidió una respuesta, {jugador} apareció para inclinar la balanza y asumir el protagonismo.',
    '{jugador} firmó una actuación de alto nivel, participando activamente en los momentos que terminaron definiendo el encuentro.',
    'Cuando el partido necesitaba una figura, apareció {jugador}, respondiendo en los momentos de mayor exigencia.',
    'La jornada encontró a {jugador} inspirado, protagonista y con una influencia que se hizo sentir durante buena parte del encuentro.',
    '{jugador} terminó marcando diferencias con una actuación que lo instaló como uno de los grandes protagonistas del partido.',
    'Hubo varios nombres sobre la cancha, pero {jugador} terminó llevándose buena parte de los focos con una actuación para recordar.',
    '{jugador} asumió responsabilidades cuando el encuentro estaba abierto y terminó dejando su sello en los momentos más importantes.',
    'El partido tuvo en {jugador} a uno de sus grandes protagonistas, con una actuación que fue creciendo a medida que avanzaban los minutos.',
    '{jugador} apareció cuando había que aparecer y terminó firmando una de esas actuaciones que explican buena parte de lo ocurrido en la cancha.',
  ],
  scorer: [
    '{jugador} sigue encontrando caminos al gol y confirma que atraviesa un momento especialmente fino cada vez que pisa el área rival.',
    'El olfato goleador de {jugador} vuelve a hacerse presente, consolidándolo como una de las principales referencias ofensivas de su equipo.',
    '{jugador} mantiene su buena relación con el arco rival y continúa respondiendo cada vez que el equipo necesita peso en ataque.',
    'La presencia de {jugador} vuelve a sentirse en ofensiva, donde sigue demostrando que necesita muy poco para convertirse en amenaza.',
    '{jugador} atraviesa un momento dulce frente al arco y sigue dejando su firma en jornadas donde aparece cuando más se lo necesita.',
    'El ataque vuelve a encontrar respuestas en {jugador}, que mantiene intacta su capacidad para aparecer en zonas decisivas.',
    '{jugador} continúa sumando protagonismo en ofensiva y confirma que su nombre ya empieza a ser una preocupación habitual para las defensas rivales.',
    'Cada vez que {jugador} encuentra espacio cerca del área, algo puede pasar. Su presencia ofensiva vuelve a marcar diferencias en una nueva jornada.',
    '{jugador} sigue mostrando una regularidad goleadora que lo convierte en una pieza cada vez más importante dentro del funcionamiento ofensivo.',
    'El arco rival empieza a conocer demasiado bien a {jugador}, que vuelve a dejar señales de que atraviesa un momento especialmente inspirado.',
  ],
  result: [
    '{ganador} supo administrar mejor los momentos importantes del partido y terminó imponiendo su experiencia cuando el encuentro exigía mayor precisión.',
    'El desarrollo fue parejo durante varios pasajes, pero {ganador} encontró las respuestas necesarias para inclinar el partido a su favor.',
    '{ganador} hizo valer su eficacia en los momentos decisivos y terminó sacando provecho de un encuentro que exigió paciencia hasta el final.',
    'El partido obligó a trabajar cada detalle, y {ganador} respondió con oficio para sostener su ventaja cuando el rival intentó reaccionar.',
    '{ganador} logró imponer condiciones en los tramos clave del encuentro y encontró la manera de transformar su propuesta en un resultado favorable.',
    'No sobró demasiado, pero {ganador} hizo lo suficiente para manejar mejor los momentos de presión y salir fortalecido de un partido exigente.',
    '{ganador} tuvo la virtud de golpear en los momentos justos y luego supo administrar el encuentro sin regalarle demasiado espacio a su rival.',
    'El margen pudo ser estrecho, pero {ganador} mostró la calma necesaria para jugar con la ventaja y llevar el partido hacia el terreno que más le convenía.',
    '{ganador} encontró soluciones cuando el encuentro parecía trabarse y terminó resolviendo una jornada que pedía paciencia, concentración y algo de oficio.',
    'No fue una tarde para lujos, pero {ganador} entendió mejor el partido y terminó sacando adelante uno de esos encuentros donde también hay que saber arremangarse.',
  ],
};

const render = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
const pickTemplate = (key, values, seed, offset) => {
  const text = deterministicItem(storyAngleTemplates[key], seed, offset);
  return text ? render(text, values) : null;
};

function groupScorers(goals) {
  const groups = new Map();
  for (const goal of goals) {
    const team = goalTeamName(goal);
    const player = playerName(goal);
    const key = `${team}::${player}`;
    const current = groups.get(key);
    groups.set(key, { team, player, count: (current?.count ?? 0) + 1 });
  }
  return [...groups.values()];
}

export function getMatchStoryFacts(match) {
  const goals = Array.isArray(match?.goals) ? match.goals : [];
  const redCards = Array.isArray(match?.redCards) ? match.redCards : [];
  const scorers = groupScorers(goals);
  const scorerSummary = [...new Set(scorers.map(item => item.team))].map(team => {
    const players = scorers.filter(item => item.team === team)
      .map(item => item.count > 1 ? `${item.player} (${item.count})` : item.player);
    return `${team}: ${players.join(', ')}`;
  }).join('; ');
  const redCardSummary = redCards.map(card => `${playerName(card)} (${cardTeamName(card)})`).join(', ');
  const leadingScorer = [...scorers].sort((a, b) => b.count - a.count)[0] ?? null;
  return { scorerSummary, redCardSummary, leadingScorer, scorerCount: goals.length, redCardCount: redCards.length };
}

function resultForTeam(match, id) {
  const homeId = teamId(match?.homeTeam);
  const awayId = teamId(match?.awayTeam);
  const homeScore = Number(match?.homeScore);
  const awayScore = Number(match?.awayScore);
  if (!id || !Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;
  const ownScore = id === homeId ? homeScore : awayScore;
  const rivalScore = id === homeId ? awayScore : homeScore;
  return ownScore > rivalScore ? 'win' : ownScore < rivalScore ? 'loss' : 'draw';
}

function previousTeamResults(match, matches = [], id) {
  return matches.filter(candidate => candidate?.id !== match?.id)
    .filter(candidate => teamId(candidate?.homeTeam) === id || teamId(candidate?.awayTeam) === id)
    .filter(candidate => dateOf(candidate) < dateOf(match))
    .sort((a, b) => dateOf(b) - dateOf(a))
    .map(candidate => resultForTeam(candidate, id)).filter(Boolean);
}

function winnerData(match) {
  const homeScore = Number(match?.homeScore);
  const awayScore = Number(match?.awayScore);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) return null;
  const winnerIsHome = homeScore > awayScore;
  return {
    winner: winnerIsHome ? match.homeTeam : match.awayTeam,
    rival: winnerIsHome ? match.awayTeam : match.homeTeam,
    winnerScore: winnerIsHome ? homeScore : awayScore,
    rivalScore: winnerIsHome ? awayScore : homeScore,
  };
}

function drawAngleCandidates(match, context = {}) {
  const homeScore = Number(match?.homeScore);
  const awayScore = Number(match?.awayScore);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore !== awayScore) return [];

  const homeTeam = teamName(match.homeTeam);
  const awayTeam = teamName(match.awayTeam);
  const totalGoals = homeScore + awayScore;
  const candidates = [];

  if (totalGoals <= 2) candidates.push({ key: 'draw-closed', text: pickTemplate('drawClosed', {}, `${match?.id ?? 'match'}-draw-closed`, 1) });
  if (totalGoals >= 4) candidates.push({ key: 'draw-high-scoring', text: pickTemplate('drawHighScoring', {}, `${match?.id ?? 'match'}-draw-high`, 2) });

  const unbeatenTeam = [match.homeTeam, match.awayTeam].find(team => {
    const history = previousTeamResults(match, context.matches, teamId(team));
    return history.length > 0 && history.every(result => result !== 'loss');
  });
  if (unbeatenTeam) {
    candidates.push({
      key: 'draw-unbeaten',
      text: pickTemplate('drawUnbeaten', { equipo: teamName(unbeatenTeam) }, `${match?.id ?? 'match'}-draw-unbeaten`, 3),
    });
  }

  return candidates;
}

function angleCandidates(match, context = {}) {
  if (Number(match?.homeScore) === Number(match?.awayScore)) return drawAngleCandidates(match, context);
  const winner = winnerData(match);
  if (!winner) return [];
  const facts = getMatchStoryFacts(match);
  const history = previousTeamResults(match, context.matches, teamId(winner.winner));
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  for (const result of history) { if (result === 'win') consecutiveWins += 1; else break; }
  if (!consecutiveWins) for (const result of history) { if (result === 'loss') consecutiveLosses += 1; else break; }
  const candidates = [];
  const ganador = teamName(winner.winner);
  const rival = teamName(winner.rival);
  const values = {
    ganador,
    rival,
    resultadoGanador: `${winner.winnerScore}-${winner.rivalScore}`,
    victoriasConsecutivas: consecutiveWins + 1,
    derrotasPrevias: consecutiveLosses,
    jugador: facts.leadingScorer?.player,
    goles: facts.leadingScorer?.count,
  };
  const seed = `${match?.id ?? 'match'}-angle`;
  if (consecutiveWins >= 2) candidates.push({ key: 'streak', text: pickTemplate('streak', values, seed, 1) });
  if (consecutiveLosses >= 2) candidates.push({ key: 'reaction', text: pickTemplate('reaction', values, seed, 2) });
  if (facts.leadingScorer?.count >= 2) candidates.push({ key: 'figure', text: pickTemplate('figure', values, seed, 3) });
  if (facts.leadingScorer) candidates.push({ key: 'scorer', text: pickTemplate('scorer', values, seed, 4) });
  if (match?.tournament?.name ?? match?.competition?.name) candidates.push({ key: 'tournament', text: `${ganador} toma fuerza en ${match.tournament?.name ?? match.competition?.name} con este resultado.` });
  if (match?.roundNumber) candidates.push({ key: 'moment', text: `${ganador} consigue un triunfo clave en la Jornada ${match.roundNumber}.` });
  candidates.push({ key: 'rivalry', text: `${ganador} se queda con el duelo ante ${rival}.` });
  candidates.push({ key: 'result', text: pickTemplate('result', values, seed, 5) });
  return candidates;
}

export function buildMatchStoryAngle(match, context = {}) {
  const candidates = angleCandidates(match, context);
  return deterministicItem(candidates, `${match?.id ?? 'match'}-angle`, hashString(match?.id ?? 'match') % 7) ?? null;
}

export function buildMatchStorySuffix(match) {
  const facts = getMatchStoryFacts(match);
  return [facts.scorerSummary ? `Goleadores: ${facts.scorerSummary}.` : null, facts.redCardSummary ? `Expulsados: ${facts.redCardSummary}.` : null].filter(Boolean).join(' ');
}
