import { useEffect, useMemo, useState } from 'react';
import { getDominantColors } from '../utils/dominantColors.js';
import { resolveNewsParticipants } from '../features/news/newsParticipants.js';
import { RecolorableNewsScene } from './RecolorableNewsScene.jsx';
import { TeamMark } from './TeamMark.jsx';

const fallbackPalettes = {
  victory: ['#07502A', '#FFD42A', '#031D58'], defeat: ['#8E0019', '#161B2D', '#E9DFC7'],
  draw: ['#A86F00', '#E9DFC7', '#063172'], sanction: ['#A90020', '#FFD42A', '#1A1020'],
  transfer: ['#07502A', '#72B4E3', '#031D58'], upcoming: ['#063172', '#72B4E3', '#FFD42A'],
};

const contextOf = item => {
  if (item.type === 'victory' || item.type === 'defeat' || item.type === 'draw') return item.type;
  if (item.sourceType === 'transfer') return 'transfer';
  if (item.sourceType === 'sanction') return 'sanction';
  if (item.type === 'draw' || item.type === 'crazyDraw') return 'draw';
  if (item.type === 'defeat' || item.type === 'bigDefeat') return 'defeat';
  if (item.type === 'upcoming') return 'upcoming';
  return 'victory';
};

const contextLabels = { victory: 'VICTORIA', defeat: 'DERROTA', draw: 'EMPATE', sanction: 'SANCIÓN', transfer: 'FICHAJE', upcoming: 'PRÓXIMO' };
export function NewsArtwork({ item, teams = [] }) {
  const context = contextOf(item);
  const homeScore = Number(item.original?.homeScore);
  const awayScore = Number(item.original?.awayScore);
  const { team: primary, opponent: secondary, primaryIsAway } = useMemo(
    () => resolveNewsParticipants(item, teams),
    [item, teams],
  );
  const fallback = fallbackPalettes[context];
  const [colors, setColors] = useState(fallback);

  useEffect(() => {
    let active = true;
    setColors(fallback);
    if (primary?.imageUrl) getDominantColors(primary.imageUrl, 3)
      .then(result => { if (active && result.length) setColors([...result, ...fallback].slice(0, 3)); })
      .catch(() => {});
    return () => { active = false; };
  }, [primary?.imageUrl, context]);

  const score = item.sourceType === 'match' && item.type !== 'upcoming'
    ? primaryIsAway ? `${awayScore} : ${homeScore}` : `${homeScore} : ${awayScore}`
    : null;
  const style = { '--news-primary': colors[0], '--news-secondary': colors[1], '--news-accent': colors[2] };
  return <div className={`news-artwork news-artwork-${context}`} style={style} aria-label={`Gráfica ${contextLabels[context]} de ${primary?.name ?? 'Koinonia e-League'}`}>
    <RecolorableNewsScene scene={item.image} team={primary} opponent={secondary} alt="" className="news-artwork-scene"/>
    <span className="news-artwork-grid"/>
    <span className="news-artwork-context">{contextLabels[context]}</span>
    <TeamMark team={primary ?? {}} className="news-artwork-primary"/>
    {secondary && <TeamMark team={secondary} className="news-artwork-secondary"/>}
    {score && <strong>{score}</strong>}
    <small>{primary?.name ?? 'KOINONIA e-LEAGUE'}</small>
  </div>;
}
