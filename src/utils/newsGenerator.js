export function hashString(value) {
  const text = String(value ?? '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function deterministicItem(items, id, offset = 0) {
  if (!items.length) return '';
  return items[hashString(`${id}-${offset}`) % items.length];
}

export function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

const matchTemplates = {
  upcoming: {
    labels: ['PRÓXIMO PARTIDO', 'SE VIENE EL PARTIDO', 'TODO LISTO', 'EN AGENDA', 'PRÓXIMO DESAFÍO', 'FECHA CONFIRMADA', 'NUEVO CRUCE', 'A LA CANCHA', 'PARTIDO PROGRAMADO', 'SE ACERCA EL DUELO'],
    headlines: ['{equipo} YA TIENE RIVAL', '{equipo} SE PREPARA PARA ENFRENTAR A {rival}', '{equipo} Y {rival} ANIMARÁN UN NUEVO CRUCE', 'PRÓXIMO DESAFÍO PARA {equipo}', '{equipo} VA POR SU PRÓXIMO PARTIDO', '{rival} APARECE EN EL CAMINO DE {equipo}', 'TODO DISPUESTO PARA {equipo} ANTE {rival}', '{equipo} TIENE CITA CON {rival}', 'NUEVO COMPROMISO PARA {equipo}', '{equipo} Y {rival} SE MIDEN EN {competicion}'],
    bodies: ['{equipo} enfrentará a {rival} en {jornada} de {competicion}. El encuentro todavía no tiene resultado.', '{equipo} y {rival} tienen un partido pendiente por {jornada} de {competicion}.', 'El calendario de {competicion} presenta el cruce entre {equipo} y {rival} en {jornada}.', '{equipo} tendrá como rival a {rival} en {jornada}. El partido corresponde a {competicion}.', 'Se aproxima el duelo entre {equipo} y {rival}, programado por {jornada} de {competicion}.', '{competicion} tiene pendiente el enfrentamiento de {equipo} frente a {rival} en {jornada}.', '{equipo} volverá a la competencia ante {rival} en un partido correspondiente a {jornada}.', 'El próximo compromiso de {equipo} será frente a {rival} por {competicion}, en {jornada}.', '{equipo} y {rival} figuran en el calendario de {competicion} para {jornada}.', 'La agenda de {jornada} incluye el partido entre {equipo} y {rival} por {competicion}.'],
  },
  narrowVictory: {
    labels: ['¡VICTORIA AJUSTADA!', 'POR LA MÍNIMA', 'TRIUNFO CERRADO', 'TRES PUNTOS SUFRIDOS', 'MARGEN ESTRECHO', 'GANÓ POR UNO', 'FINAL APRETADO', 'VICTORIA CORTA', 'LO SACÓ ADELANTE', 'DIFERENCIA MÍNIMA'],
    headlines: ['{equipo} SUPERA POR POCO A {rival}', '{equipo} SE IMPONE EN UN MARCADOR AJUSTADO', '{equipo} GANA POR LA MÍNIMA', '{equipo} RESUELVE UN DUELO CERRADO', 'UN GOL SEPARÓ A {equipo} DE {rival}', '{equipo} FESTEJA ANTE {rival}', '{equipo} SE QUEDA CON UN PARTIDO APRETADO', 'TRIUNFO ESTRECHO DE {equipo}', '{equipo} MARCA LA DIFERENCIA JUSTA', '{equipo} VENCE A {rival} POR UN GOL'],
    bodies: ['{equipo} derrotó {resultado} a {rival} en {jornada} de {competicion}. La diferencia final fue de un gol.', 'Un solo gol decidió el triunfo de {equipo} por {resultado} frente a {rival} en {competicion}.', '{equipo} se impuso a {rival} con marcador {resultado} en el encuentro de {jornada}.', 'El duelo entre {equipo} y {rival} terminó {resultado}, con victoria ajustada para {equipo}.', '{equipo} consiguió una victoria por la mínima ante {rival}: {resultado} en {jornada}.', 'La cuenta favoreció {resultado} a {equipo} sobre {rival} en {competicion}.', '{equipo} cerró su partido ante {rival} con un triunfo estrecho por {resultado}.', 'El marcador de {jornada} registró victoria de {equipo} por {resultado} frente a {rival}.', '{equipo} sacó una diferencia de un gol y venció {resultado} a {rival} en {competicion}.', '{equipo} sumó un triunfo ajustado ante {rival} luego del {resultado} de {jornada}.'],
  },
  victory: {
    labels: ['¡VICTORIA!', 'TRIUNFO CONFIRMADO', 'TAREA CUMPLIDA', 'RESULTADO POSITIVO', 'SUMA UNA VICTORIA', 'BUENA JORNADA', 'GANÓ CON AUTORIDAD', 'TRIUNFO CLARO', 'CELEBRA EL EQUIPO', 'PARTIDO GANADO'],
    headlines: ['{equipo} SE LLEVA EL TRIUNFO', '{equipo} SUPERA A {rival}', '{equipo} FIRMA UNA NUEVA VICTORIA', '{equipo} RESUELVE SU PARTIDO ANTE {rival}', '{equipo} CELEBRA EN {competicion}', '{equipo} MARCA DIFERENCIAS FRENTE A {rival}', '{equipo} CIERRA LA JORNADA CON TRIUNFO', 'VICTORIA DE {equipo} ANTE {rival}', '{equipo} SE QUEDA CON EL PARTIDO', '{equipo} IMPONE SU MARCADOR'],
    bodies: ['{equipo} venció {resultado} a {rival} en {jornada} de {competicion}.', 'El partido terminó {resultado} a favor de {equipo} frente a {rival}.', '{equipo} consiguió la victoria ante {rival} con un marcador de {resultado} en {competicion}.', '{equipo} superó por dos goles a {rival} tras el {resultado} registrado en {jornada}.', 'La jornada dejó un triunfo de {equipo} por {resultado} sobre {rival}.', '{equipo} se impuso a {rival} en {competicion}; el resultado final fue {resultado}.', 'El marcador favoreció a {equipo}, que derrotó {resultado} a {rival} en {jornada}.', '{equipo} completó su compromiso ante {rival} con victoria por {resultado}.', 'Con un {resultado}, {equipo} terminó por delante de {rival} en {competicion}.', '{equipo} añadió una victoria a su campaña al superar {resultado} a {rival}.'],
  },
  bigVictory: {
    labels: ['¡GOLEADA!', 'VICTORIA CONTUNDENTE', 'FESTIVAL DE GOLES', 'MARCADOR AMPLIO', 'TRIUNFO CATEGÓRICO', 'NOCHE DE GOLES', 'DIFERENCIA CLARA', 'GANÓ CON HOLGURA', 'RESULTADO ABULTADO', 'MUCHOS GOLES'],
    headlines: ['{equipo} GOLEA A {rival}', '{equipo} FIRMA UN TRIUNFO CONTUNDENTE', '{equipo} SE IMPONE POR AMPLIO MARGEN', '{equipo} MARCA UNA GRAN DIFERENCIA', 'GOLEADA DE {equipo} EN {competicion}', '{equipo} SUPERA CON CLARIDAD A {rival}', '{equipo} CIERRA UN MARCADOR ABULTADO', '{equipo} ANOTA Y FESTEJA ANTE {rival}', '{equipo} CONSIGUE SU VICTORIA MÁS AMPLIA DEL DUELO', '{equipo} RESUELVE CON GOLES'],
    bodies: ['{equipo} derrotó {resultado} a {rival} en {jornada} de {competicion}, con una diferencia de tres o más goles.', 'El marcador {resultado} confirmó una victoria amplia de {equipo} frente a {rival}.', '{equipo} se impuso con claridad a {rival}: {resultado} en {competicion}.', 'La jornada registró un triunfo contundente de {equipo} por {resultado} ante {rival}.', '{equipo} consiguió una goleada frente a {rival} al cerrar el partido {resultado}.', 'El encuentro de {jornada} terminó {resultado} para {equipo} sobre {rival}.', '{equipo} marcó una diferencia amplia y venció {resultado} a {rival} en {competicion}.', 'Con varios goles de distancia, {equipo} superó {resultado} a {rival}.', '{equipo} dejó un resultado categórico ante {rival}: {resultado} por {competicion}.', 'El compromiso entre {equipo} y {rival} concluyó {resultado}, con goleada para {equipo}.'],
  },
  draw: {
    labels: ['¡EMPATE!', 'PUNTOS REPARTIDOS', 'TABLAS', 'SIN DIFERENCIAS', 'MARCADOR IGUALADO', 'TODO PAREJO', 'EMPATE CONFIRMADO', 'MISMA CUENTA', 'NO HUBO GANADOR', 'IGUALDAD FINAL'],
    headlines: ['{equipo} Y {rival} REPARTEN EL RESULTADO', '{equipo} EMPATA CON {rival}', 'NO HUBO DIFERENCIAS ENTRE {equipo} Y {rival}', '{equipo} Y {rival} TERMINAN IGUALADOS', 'EMPATE EN EL CRUCE DE {competicion}', '{equipo} FIRMA TABLAS ANTE {rival}', 'MARCADOR PAREJO PARA {equipo} Y {rival}', '{equipo} Y {rival} CIERRAN SIN GANADOR', 'IGUALDAD ENTRE {equipo} Y {rival}', 'EL DUELO TERMINA EN EMPATE'],
    bodies: ['{equipo} y {rival} empataron {resultado} en {jornada} de {competicion}.', 'El encuentro entre {equipo} y {rival} terminó igualado {resultado}.', '{equipo} repartió el resultado con {rival} tras el {resultado} de {jornada}.', 'No hubo ganador en el partido de {competicion}: {equipo} {resultado} {rival}.', 'El marcador final fue {resultado} entre {equipo} y {rival} en {jornada}.', '{equipo} y {rival} cerraron su compromiso con igualdad {resultado}.', 'La jornada dejó un empate {resultado} para {equipo} frente a {rival}.', '{competicion} registró un empate entre {equipo} y {rival}, con resultado {resultado}.', '{equipo} no logró separarse de {rival} y el partido terminó {resultado}.', 'La cuenta quedó igualada {resultado} en el cruce entre {equipo} y {rival}.'],
  },
  crazyDraw: {
    labels: ['¡EMPATE DE LOCURA!', 'LLUVIA DE GOLES', 'TABLAS CON GOLES', 'MARCADOR DE INFARTO', 'FESTIVAL EMPATADO', 'GOLES PARA TODOS', 'EMPATE ABULTADO', 'NADIE AFLOJÓ', 'IGUALDAD CON SEIS O MÁS', 'PARTIDO DE MUCHOS GOLES'],
    headlines: ['{equipo} Y {rival} EMPATAN CON MUCHOS GOLES', 'FESTIVAL SIN GANADOR ENTRE {equipo} Y {rival}', '{equipo} Y {rival} FIRMAN UN EMPATE ABULTADO', 'GOLES Y TABLAS EN {competicion}', 'UN EMPATE CARGADO DE GOLES', '{equipo} Y {rival} NO SE SACAN VENTAJA', 'MARCADOR ALTO E IGUALADO', 'EMPATE CON SEIS O MÁS GOLES', '{equipo} Y {rival} DEJAN UNA CUENTA LLENA DE GOLES', 'LA RED SE MOVIÓ, PERO NO HUBO GANADOR'],
    bodies: ['{equipo} y {rival} igualaron {resultado} en {jornada} de {competicion}, con seis o más goles en total.', 'El partido terminó {resultado}: muchos goles y ninguna diferencia entre {equipo} y {rival}.', '{equipo} y {rival} protagonizaron un empate de marcador alto en {competicion}: {resultado}.', 'La cuenta final de {jornada} fue {resultado} entre {equipo} y {rival}.', 'Hubo goles para ambos lados en el empate {resultado} de {equipo} frente a {rival}.', '{competicion} registró una igualdad con muchos goles: {equipo} {resultado} {rival}.', 'El cruce entre {equipo} y {rival} superó los cinco goles y terminó empatado {resultado}.', '{equipo} y {rival} cerraron un partido de alta anotación con resultado {resultado}.', 'Ninguno consiguió despegarse en el empate {resultado} entre {equipo} y {rival}.', 'La jornada presentó una igualdad llena de goles entre {equipo} y {rival}: {resultado}.'],
  },
  defeat: {
    labels: ['DERROTA', 'CAÍDA AJUSTADA', 'RESULTADO ADVERSO', 'NO ALCANZÓ', 'TROPIEZO', 'JORNADA DIFÍCIL', 'MARGEN EN CONTRA', 'PARTIDO PERDIDO', 'FINAL ADVERSO', 'TOCÓ PERDER'],
    headlines: ['{equipo} CAE ANTE {rival}', '{equipo} NO PUDO CON {rival}', 'DERROTA DE {equipo} FRENTE A {rival}', '{equipo} TERMINA ABAJO EN EL MARCADOR', '{rival} SUPERA A {equipo}', '{equipo} CIERRA CON RESULTADO ADVERSO', 'TROPIEZO DE {equipo} EN {competicion}', '{equipo} CEDE EL PARTIDO ANTE {rival}', '{equipo} QUEDA A CORTA DISTANCIA', '{equipo} PIERDE SU CRUCE CON {rival}'],
    bodies: ['{equipo} perdió {resultado} frente a {rival} en {jornada} de {competicion}.', 'El marcador terminó {resultado} en contra de {equipo} ante {rival}.', '{equipo} cayó por uno o dos goles frente a {rival} en {competicion}: {resultado}.', 'La jornada dejó una derrota de {equipo} ante {rival}, con resultado {resultado}.', '{rival} se impuso {resultado} a {equipo} en el compromiso de {jornada}.', '{equipo} no consiguió superar a {rival} y terminó con marcador {resultado}.', 'El partido de {competicion} concluyó {resultado}, adverso para {equipo} frente a {rival}.', '{equipo} cedió ante {rival} por una diferencia corta; el resultado fue {resultado}.', 'La cuenta de {jornada} favoreció a {rival} sobre {equipo}: {resultado}.', '{equipo} registró una derrota frente a {rival} luego del marcador {resultado}.'],
  },
  bigDefeat: {
    labels: ['DERROTA AMPLIA', 'DURO RESULTADO', 'CAÍDA CONTUNDENTE', 'MARCADOR EN CONTRA', 'NOCHE DIFÍCIL', 'GOLPE EN EL MARCADOR', 'DIFERENCIA ABULTADA', 'TROPIEZO SEVERO', 'JORNADA PARA OLVIDAR', 'RESULTADO CATEGÓRICO'],
    headlines: ['{equipo} SUFRE UNA DERROTA AMPLIA', '{equipo} CAE CON DIFERENCIA ANTE {rival}', '{rival} GOLEA A {equipo}', 'MARCADOR DURO PARA {equipo}', '{equipo} NO PUDO FRENAR A {rival}', 'CAÍDA CONTUNDENTE DE {equipo}', '{equipo} TERMINA LEJOS EN LA CUENTA', '{rival} MARCA UNA AMPLIA DIFERENCIA', '{equipo} RECIBE UN RESULTADO ABULTADO', 'DUELO ADVERSO PARA {equipo}'],
    bodies: ['{equipo} cayó {resultado} ante {rival} en {jornada} de {competicion}, por una diferencia de tres o más goles.', 'El resultado {resultado} dejó una derrota amplia de {equipo} frente a {rival}.', '{rival} superó con claridad a {equipo} en {competicion}; la cuenta terminó {resultado}.', 'La jornada registró un marcador abultado en contra de {equipo}: {resultado} ante {rival}.', '{equipo} no pudo evitar una diferencia amplia frente a {rival} y perdió {resultado}.', 'El partido de {jornada} concluyó {resultado}, con derrota contundente para {equipo}.', '{equipo} terminó a tres o más goles de {rival} en el resultado {resultado}.', 'La cuenta favoreció ampliamente a {rival} sobre {equipo} en {competicion}: {resultado}.', '{equipo} sufrió un resultado categórico ante {rival} tras el {resultado} final.', 'El cruce entre {equipo} y {rival} acabó {resultado}, adverso por amplio margen para {equipo}.'],
  },
};

const transferTemplates = {
  labels: ['¡FICHAJE!', 'NUEVO REFUERZO', 'MERCADO DE PASES', 'TRASPASO CONFIRMADO', 'NUEVA INCORPORACIÓN', 'CAMBIO DE CAMISETA', 'MOVIMIENTO DE MERCADO', 'NUEVO DESTINO', 'ACUERDO CERRADO', 'HAY NUEVO CLUB'],
  headlines: ['{jugador} ES NUEVO JUGADOR DE {equipoDestino}', '{jugador} CAMBIA {equipoOrigen} POR {equipoDestino}', '{equipoDestino} INCORPORA A {jugador}', 'NUEVO DESTINO PARA {jugador}', '{jugador} LLEGA A {equipoDestino}', '{equipoOrigen} Y {equipoDestino} MUEVEN EL MERCADO', '{jugador} YA TIENE NUEVA CAMISETA', '{equipoDestino} SUMA A {jugador}', 'TRASPASO DE {jugador} A {equipoDestino}', '{jugador} DEJA {equipoOrigen} Y SE UNE A {equipoDestino}'],
  bodies: ['{jugador} pasó de {equipoOrigen} a {equipoDestino} en un movimiento registrado por {competicion}.', '{equipoDestino} incorporó a {jugador}, procedente de {equipoOrigen}.', 'El mercado confirmó el cambio de club de {jugador}: deja {equipoOrigen} y llega a {equipoDestino}.', '{jugador} tiene nuevo destino tras concretarse su paso desde {equipoOrigen} hacia {equipoDestino}.', '{competicion} registró el traspaso de {jugador} entre {equipoOrigen} y {equipoDestino}.', 'Se confirmó la incorporación de {jugador} a {equipoDestino} luego de su salida de {equipoOrigen}.', '{equipoOrigen} transfirió a {jugador}, que continuará en {equipoDestino}.', '{jugador} cambia de camiseta y pasa de {equipoOrigen} a {equipoDestino}.', 'El movimiento de {jugador} hacia {equipoDestino} quedó registrado con {equipoOrigen} como club de origen.', '{equipoDestino} suma a {jugador} a través de un traspaso desde {equipoOrigen}.'],
};

const sanctionTemplates = {
  labels: ['¡SANCIONADO!', 'DURO CASTIGO', 'BAJA CONFIRMADA', 'SANCIÓN OFICIAL', 'FUERA DE JUEGO', 'NO PODRÁ ESTAR', 'CASTIGO CONFIRMADO', 'MALA NOTICIA', 'A MIRAR DESDE AFUERA', 'DECISIÓN DISCIPLINARIA'],
  headlines: ['{jugador} RECIBE UNA SANCIÓN', '{equipo} TENDRÁ UNA BAJA POR SANCIÓN', '{jugador} QUEDA FUERA POR {partidos} PARTIDO(S)', 'SANCIÓN CONFIRMADA PARA {jugador}', '{jugador} NO ESTARÁ DISPONIBLE PARA {equipo}', 'CASTIGO DE {partidos} PARTIDO(S) PARA {jugador}', '{equipo} PIERDE TEMPORALMENTE A {jugador}', '{jugador} DEBERÁ CUMPLIR UNA SANCIÓN', 'BAJA DISCIPLINARIA EN {equipo}', 'DECISIÓN OFICIAL SOBRE {jugador}'],
  bodies: ['{jugador}, de {equipo}, recibió una sanción de {partidos} partido(s).', 'La información oficial registra {partidos} partido(s) de sanción para {jugador} en {equipo}.', '{equipo} no podrá contar con {jugador} durante {partidos} partido(s) por sanción.', '{jugador} deberá cumplir un castigo de {partidos} partido(s) como integrante de {equipo}.', 'Quedó confirmada la sanción de {partidos} partido(s) para {jugador}, jugador de {equipo}.', 'La actividad disciplinaria informa que {jugador} estará suspendido por {partidos} partido(s) en {equipo}.', '{jugador} figura como baja de {equipo} durante {partidos} partido(s) por una decisión disciplinaria.', 'Se registró una sanción oficial de {partidos} partido(s) para {jugador} de {equipo}.', '{equipo} tendrá la ausencia de {jugador} por los próximos {partidos} partido(s) de sanción.', 'La sanción aplicada a {jugador} contempla {partidos} partido(s) fuera con {equipo}.'],
};

const imageByMatchType = {
  upcoming: 'upcoming', narrowVictory: 'narrow-victory', victory: 'victory', bigVictory: 'big-victory',
  draw: 'draw', crazyDraw: 'crazy-draw', defeat: 'defeat', bigDefeat: 'big-defeat',
};

export function classifyMatch(match) {
  const homeScore = Number(match?.homeScore);
  const awayScore = Number(match?.awayScore);
  const hasScore = Number.isFinite(homeScore) && Number.isFinite(awayScore) && match?.homeScore !== null && match?.awayScore !== null;
  if (!hasScore || ['pending', 'scheduled'].includes(String(match?.status).toLowerCase())) return 'upcoming';
  const difference = homeScore - awayScore;
  if (difference === 0) return homeScore + awayScore >= 6 ? 'crazyDraw' : 'draw';
  if (difference === 1) return 'narrowVictory';
  if (difference === 2) return 'victory';
  if (difference >= 3) return 'bigVictory';
  if (difference <= -3) return 'bigDefeat';
  return 'defeat';
}

function createNews({ seed, id, sourceType, type, templates, values, image, date, original }) {
  return {
    id: `${sourceType}-${id}`,
    sourceType,
    type,
    label: fillTemplate(deterministicItem(templates.labels, seed, 11), values),
    headline: fillTemplate(deterministicItem(templates.headlines, seed, 23), values),
    body: fillTemplate(deterministicItem(templates.bodies, seed, 37), values),
    image,
    date: date ?? null,
    original,
  };
}

export function generateMatchNews(match) {
  if (!match?.id || !match.homeTeam?.name || !match.awayTeam?.name) return null;
  const type = classifyMatch(match);
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const values = {
    equipo: match.homeTeam.name,
    rival: match.awayTeam.name,
    resultado: hasScore ? `${match.homeScore}-${match.awayScore}` : 'sin resultado',
    jornada: match.roundNumber ? `la Jornada ${match.roundNumber}` : 'la jornada programada',
    competicion: match.tournament?.name ?? match.competition?.name ?? 'la competición',
  };
  return createNews({ seed: `match-${match.id}`, id: match.id, sourceType: 'match', type, templates: matchTemplates[type], values, image: imageByMatchType[type], date: match.finishedAt ?? match.startedAt ?? match.scheduledAt ?? match.createdAt, original: match });
}

export function generateTransferNews(transfer) {
  const jugador = transfer?.player?.name ?? transfer?.playerName;
  const equipoOrigen = transfer?.fromTeam?.name ?? transfer?.originTeam?.name ?? transfer?.fromTeamName;
  const equipoDestino = transfer?.toTeam?.name ?? transfer?.destinationTeam?.name ?? transfer?.toTeamName;
  if (!transfer?.id || !jugador || !equipoOrigen || !equipoDestino) return null;
  const values = { jugador, equipoOrigen, equipoDestino, competicion: transfer.tournament?.name ?? transfer.competition?.name ?? 'la liga' };
  return createNews({ seed: `transfer-${transfer.id}`, id: transfer.id, sourceType: 'transfer', type: 'transfer', templates: transferTemplates, values, image: 'transfer', date: transfer.createdAt ?? transfer.approvedAt ?? transfer.updatedAt, original: transfer });
}

export function generateSanctionNews(sanction) {
  const jugador = sanction?.player?.name ?? sanction?.playerName ?? sanction?.subject?.name ?? sanction?.redCard?.player?.name;
  const equipo = sanction?.team?.name ?? sanction?.player?.team?.name ?? sanction?.teamName ?? sanction?.redCard?.team?.name;
  const partidos = sanction?.suspensionMatches ?? sanction?.matchCount ?? sanction?.matches ?? sanction?.games ?? sanction?.redCard?.suspensionMatches;
  if (!sanction?.id || !jugador || !equipo || !Number.isFinite(Number(partidos))) return null;
  const values = { jugador, equipo, partidos: Number(partidos) };
  return createNews({ seed: `sanction-${sanction.id}`, id: sanction.id, sourceType: 'sanction', type: 'sanction', templates: sanctionTemplates, values, image: 'sanction', date: sanction.occurredAt ?? sanction.createdAt ?? sanction.updatedAt, original: sanction });
}
