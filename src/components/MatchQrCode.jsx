import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function matchShareUrl(matchId) {
  return `${window.location.origin}${window.location.pathname}#/partidos/${encodeURIComponent(matchId)}`;
}

export function MatchQrCode({ matchId }) {
  const [dataUrl, setDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const url = matchShareUrl(matchId);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#062764', light: '#f5ecd7' } })
      .then(value => { if (!cancelled) setDataUrl(value); })
      .catch(() => { if (!cancelled) setDataUrl(''); });
    return () => { cancelled = true; };
  }, [url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return <div className="match-qr-panel">
    <p>ESCANEA PARA GESTIONAR ESTE PARTIDO DESDE EL CELULAR</p>
    {dataUrl ? <img className="match-qr-image" src={dataUrl} alt="Código QR para gestionar este partido"/> : <div className="match-qr-image match-qr-loading">GENERANDO...</div>}
    <div className="match-qr-link"><code>{url}</code><button type="button" onClick={copyLink}>{copied ? 'COPIADO ✓' : 'COPIAR ENLACE'}</button></div>
  </div>;
}
