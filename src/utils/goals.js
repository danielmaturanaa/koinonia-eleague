export const goalPlayerName = goal => goal?.player?.name ?? goal?.playerName ?? goal?.player_name ?? 'Gol sin jugador';
export const goalTeamId = goal => goal?.scoringTeam?.id ?? goal?.team?.id ?? goal?.teamId ?? goal?.team_id ?? '';

export function groupGoals(goals) {
  const groups = [];
  for (const goal of goals) {
    const key = `${goal.playerId ?? goalPlayerName(goal)}::${goal.isOwnGoal ? 1 : 0}`;
    const existing = groups.find(entry => entry.key === key);
    if (existing) existing.count += 1;
    else groups.push({ key, count: 1, name: goalPlayerName(goal), ownGoal: Boolean(goal.isOwnGoal) });
  }
  return groups.sort((a, b) => b.count - a.count);
}
