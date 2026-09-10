import { classifyMatchResult, deterministicItem, fillTemplate, generateNews, hashString } from '../features/news/newsEngine.js';

export { classifyMatchResult, deterministicItem, fillTemplate, generateNews, hashString };

const value = (...candidates) => candidates.find(candidate => candidate !== undefined && candidate !== null && candidate !== '');
const teamName = team => team?.name ?? team?.teamName;

function decorate(news, { sourceType, date, original }) {
  if (!news) return null;
  return {
    ...news,
    id: `${sourceType}-${news.id}`,
    eventId: news.id,
    sourceType,
    date: date ?? null,
    original,
  };
}

export function normalizeMatchEvent(match) {
  if (!match?.id || !teamName(match.homeTeam) || !teamName(match.awayTeam)) return null;
  const hasHomeScore = match.homeScore !== null && match.homeScore !== undefined && match.homeScore !== '';
  const hasAwayScore = match.awayScore !== null && match.awayScore !== undefined && match.awayScore !== '';
  if (!hasHomeScore || !hasAwayScore) return null;
  const goalsFor = Number(match.homeScore);
  const goalsAgainst = Number(match.awayScore);
  if (!Number.isFinite(goalsFor) || !Number.isFinite(goalsAgainst)) return null;
  return {
    id: match.id,
    kind: 'match',
    equipo: teamName(match.homeTeam),
    rival: teamName(match.awayTeam),
    resultado: `${goalsFor}-${goalsAgainst}`,
    golesEquipo: goalsFor,
    golesRival: goalsAgainst,
    jornada: match.roundNumber ? `la Jornada ${match.roundNumber}` : undefined,
    competicion: value(match.tournament?.name, match.competition?.name),
  };
}

export function classifyMatch(match) {
  const normalized = normalizeMatchEvent(match);
  return normalized ? classifyMatchResult(normalized) : null;
}

export function generateMatchNews(match) {
  const event = normalizeMatchEvent(match);
  const news = event ? generateNews(event) : null;
  return decorate(news, {
    sourceType: 'match',
    date: value(match?.finishedAt, match?.startedAt, match?.scheduledAt, match?.createdAt),
    original: match,
  });
}

export function normalizeTransferEvent(transfer, subtype = 'move') {
  const player = value(transfer?.player?.name, transfer?.playerName);
  const origin = value(teamName(transfer?.fromTeam), teamName(transfer?.originTeam), transfer?.fromTeamName);
  const destination = value(teamName(transfer?.toTeam), teamName(transfer?.destinationTeam), transfer?.toTeamName);
  if (!transfer?.id || !player || !origin || !destination) return null;
  return {
    id: transfer.id,
    type: 'transfer',
    subtype: ['arrival', 'departure', 'move'].includes(subtype) ? subtype : 'move',
    jugador: player,
    equipoOrigen: origin,
    equipoDestino: destination,
    competicion: value(transfer.tournament?.name, transfer.competition?.name),
  };
}

export function generateTransferNews(transfer, subtype = value(transfer?.newsSubtype, transfer?.perspective, 'move')) {
  const event = normalizeTransferEvent(transfer, subtype);
  const news = event ? generateNews(event) : null;
  return decorate(news, {
    sourceType: 'transfer',
    date: value(transfer?.createdAt, transfer?.approvedAt, transfer?.updatedAt),
    original: transfer,
  });
}

export function normalizeSanctionEvent(sanction, requestedSubtype) {
  const player = value(sanction?.player?.name, sanction?.playerName, sanction?.subject?.name, sanction?.redCard?.player?.name);
  const team = value(teamName(sanction?.team), teamName(sanction?.player?.team), sanction?.teamName, teamName(sanction?.redCard?.team));
  const subtype = requestedSubtype ?? (player ? 'player' : 'club');
  if (!sanction?.id || !['player', 'club'].includes(subtype) || (subtype === 'player' ? !player : !team)) return null;
  const suspensionMatches = value(sanction.suspensionMatches, sanction.matchCount, sanction.matches, sanction.games, sanction.redCard?.suspensionMatches);
  return {
    id: sanction.id,
    type: 'sanction',
    subtype,
    jugador: player,
    equipo: team,
    tipoSancion: value(sanction.sanctionType, sanction.type, sanction.action),
    partidosSancion: Number.isFinite(Number(suspensionMatches)) ? Number(suspensionMatches) : undefined,
    competicion: value(sanction.tournament?.name, sanction.competition?.name),
  };
}

export function generateSanctionNews(sanction, subtype) {
  const event = normalizeSanctionEvent(sanction, subtype);
  const news = event ? generateNews(event) : null;
  return decorate(news, {
    sourceType: 'sanction',
    date: value(sanction?.occurredAt, sanction?.createdAt, sanction?.updatedAt),
    original: sanction,
  });
}
