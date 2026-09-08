import { useEffect, useMemo, useState } from 'react';
import { getDominantColors } from '../utils/dominantColors.js';
import { TeamMark } from './TeamMark.jsx';

const fallbackPalettes = {
  victory: ['#07502A', '#FFD42A', '#031D58'], defeat: ['#8E0019', '#161B2D', '#E9DFC7'],
  draw: ['#A86F00', '#E9DFC7', '#063172'], sanction: ['#A90020', '#FFD42A', '#1A1020'],
  transfer: ['#07502A', '#72B4E3', '#031D58'], upcoming: ['#063172', '#72B4E3', '#FFD42A'],
};

const contextOf = item => {
  if (item.sourceType === 'transfer') return 'transfer';
  if (item.sourceType === 'sanction') return 'sanction';
  if (item.type === 'draw' || item.type === 'crazyDraw') return 'draw';
  if (item.type === 'defeat' || item.type === 'bigDefeat') return 'defeat';
  if (item.type === 'upcoming') return 'upcoming';
  return 'victory';
};

const contextLabels = { victory: 'VICTORIA', defeat: 'DERROTA', draw: 'EMPATE', sanction: 'SANCIÓN', transfer: 'FICHAJE', upcoming: 'PRÓXIMO' };
const teamId = team => team?.id ?? team?.teamId ?? team?.team_id;

export function NewsArtwork({ item, teams = [] }) {
  const context = contextOf(item);
  const index = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const rawPrimary = item.sourceType === 'match' ? item.original?.homeTeam
    : item.sourceType === 'transfer' ? item.original?.toTeam ?? item.original?.destinationTeam
      : item.original?.team ?? item.original?.player?.team ?? item.original?.redCard?.team;
  const rawSecondary = item.sourceType === 'match' ? item.original?.awayTeam
    : item.sourceType === 'transfer' ? item.original?.fromTeam ?? item.original?.originTeam : null;
  const primary = { ...rawPrimary, ...(index.get(teamId(rawPrimary)) ?? {}) };
  const secondary = rawSecondary ? { ...rawSecondary, ...(index.get(teamId(rawSecondary)) ?? {}) } : null;
  const fallback = fallbackPalettes[context];
  const [colors, setColors] = useState(fallback);

  useEffect(() => {
    let active = true;
    setColors(fallback);
    if (primary.imageUrl) getDominantColors(primary.imageUrl, 3)
      .then(result => { if (active && result.length) setColors([...result, ...fallback].slice(0, 3)); })
      .catch(() => {});
    return () => { active = false; };
  }, [primary.imageUrl, context]);

  const score = item.sourceType === 'match' && item.type !== 'upcoming'
    ? `${item.original?.homeScore ?? '–'} : ${item.original?.awayScore ?? '–'}` : null;
  const style = { '--news-primary': colors[0], '--news-secondary': colors[1], '--news-accent': colors[2] };
  return <div className={`news-artwork news-artwork-${context}`} style={style} aria-label={`Gráfica ${contextLabels[context]} de ${primary.name ?? 'Koinonia e-League'}`}>
    <span className="news-artwork-grid"/>
    <span className="news-artwork-context">{contextLabels[context]}</span>
    <TeamMark team={primary} className="news-artwork-primary"/>
    {secondary && <TeamMark team={secondary} className="news-artwork-secondary"/>}
    {score && <strong>{score}</strong>}
    <small>{primary.name ?? 'KOINONIA e-LEAGUE'}</small>
  </div>;
}
