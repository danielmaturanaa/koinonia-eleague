import { matchRoundLabel } from '../../utils/matchPresentation.js';

const upper = value => String(value ?? '').toUpperCase();

/** En qué competición y fecha ocurrió la noticia ("GIRA · PRETEMPORADA · GRUPO A"), para no confundir liga con giras. */
export function newsContext(item) {
  const match = item?.original;
  const tournament = match?.tournament?.name ?? item?.tournament?.name ?? item?.competition?.name;
  if (!match?.stage && !tournament) return null;
  const tour = match?.stage === 'preseason';
  const round = match?.stage ? matchRoundLabel(match, { leagueRound: tour ? 'RONDA' : 'FECHA' }) : '';
  // Una gira sin grupo ni ronda numerada (la final, el 3.er lugar) no tiene nada más que decir.
  const detail = /—$/.test(round) ? '' : round;
  return { tour, text: [tour && 'GIRA', tournament && upper(tournament), detail].filter(Boolean).join(' · ') };
}
