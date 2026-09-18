export function matchRoundLabel(match, { leagueRound = 'FECHA' } = {}) {
  if (match.stage === 'playoffs') {
    const slot = match.bracketSlot ?? match.bracket_slot ?? '';
    if (slot.startsWith('SF')) return `PLAYOFFS · SEMIFINAL ${slot.slice(2)}`;
    if (slot.startsWith('F')) return 'PLAYOFFS · FINAL';
    return 'PLAYOFFS';
  }
  const group = match.groupLabel ?? match.group_label;
  if (group) return `GRUPO ${group}`;
  return `${leagueRound} ${match.roundNumber ?? match.round_number ?? '—'}`;
}
