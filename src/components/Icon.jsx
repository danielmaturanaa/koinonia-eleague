export function Icon({ type }) {
  const shapes = {
    ball: <><circle cx="24" cy="24" r="19" fill="#f6f4e8" stroke="#0b101a" strokeWidth="3"/><path d="m24 14 10 7-4 12H18l-4-12 10-7ZM8 14l8 1-2 6-9 3m19 19-6-10m19-19-3 7 9 3M24 5v9m6 19 9 5M9 38l9-5" fill="#080d15" stroke="#080d15" strokeWidth="2"/></>,
    cup: <><path d="M13 5h22v14c0 10-4 15-11 15s-11-5-11-15Zm0 3H5v8c0 9 5 12 12 12M35 8h8v8c0 9-5 12-12 12" fill="#ffd71b" stroke="#e49b0a" strokeWidth="2"/><path d="M21 31h6v10h9v4H12v-4h9Z" fill="#ffda21"/></>,
    pitch: <><path d="M3 8h42v33H3Z M24 8v33M3 16h8v17H3m42-17h-8v17h8" fill="none" stroke="#f4f0db" strokeWidth="2"/><circle cx="24" cy="24" r="7" fill="none" stroke="#f4f0db" strokeWidth="2"/></>,
    chart: <><path d="M6 29h7v15H6Zm14-10h7v25h-7ZM34 6h7v38h-7Z" fill="#ffd925"/></>,
    shirt: <path d="m15 6-5 2-8 9 8 8 6-5v25h22V20l6 5 6-8-8-9-8-2c-1 7-17 7-19 0Z" transform="translate(-2 0)" fill="#f5f2e5" stroke="#9baabb"/>,
    arrows: <><path d="M4 13h30V5l12 12-12 12v-8H4Zm40 20H14v-8L2 37l12 11v-8h30Z" fill="#ffdc23"/></>,
    card: <path d="m17 5 22 3-6 35-23-3Z" fill="#ff1523" stroke="#100e19" strokeWidth="3"/>,
    news: <><path d="M10 5h30v36H10Zm-6 5v35h30" stroke="#f4f0db" strokeWidth="3" fill="none"/><path d="M16 12h18v4H16Zm0 9h18m-18 6h18m-18 6h18" stroke="#f4f0db" strokeWidth="2"/></>,
  };
  return <svg className="menu-icon" viewBox="0 0 48 48" aria-hidden="true">{shapes[type]}</svg>;
}
