export function Icon({ type }) {
  const symbols = {
    ball: '⚽',
    pitch: '🥅',
    chart: '📊',
    shirt: '👕',
    arrows: '🔄',
    cup: '🏆',
    news: '📰',
    card: '🟥',
  };
  return <svg className="menu-icon" viewBox="0 0 48 48" aria-hidden="true"><text x="24" y="39" textAnchor="middle" fontFamily="'Segoe UI Emoji', 'Apple Color Emoji', sans-serif" fontSize="40">{symbols[type] ?? '⚽'}</text></svg>;
}
