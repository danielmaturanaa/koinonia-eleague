import { useEffect, useId, useRef, useState } from 'react';

export function MusicPlayer({ tracks = [] }) {
  const audioRef = useRef(null);
  const rootRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const volumeId = useId();
  const panelId = useId();
  const track = tracks[trackIndex];

  const move = direction => {
    if (!tracks.length) return;
    setTrackIndex(index => (index + direction + tracks.length) % tracks.length);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.load();
    audio.play()
      .then(() => setAutoplayBlocked(false))
      .catch(() => setAutoplayBlocked(true));
  }, [track]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) audio.play().then(() => setAutoplayBlocked(false)).catch(() => setAutoplayBlocked(true));
    else audio.pause();
  };

  return <section className="radio" ref={rootRef} aria-label="Radio Koinonia League">
    <audio ref={audioRef} src={track?.src} autoPlay preload="metadata" onEnded={() => move(1)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>
    <button className={`radio-play ${playing ? 'playing' : ''}`} type="button" onClick={toggle} disabled={!tracks.length} aria-label={playing ? 'Pausar radio' : 'Reproducir radio'}>{playing ? '❚❚' : '▶'}</button>
    <button className="radio-info" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      <small>{autoplayBlocked && !playing ? 'RADIO · TOCA PLAY' : 'RADIO KOINONIA'}</small>
      <b>{track?.title ?? 'PLAYLIST PENDIENTE'}</b>
    </button>
    {open && <div className="radio-panel" id={panelId}>
      <div className="radio-controls">
        <button type="button" onClick={() => move(-1)} disabled={!tracks.length} aria-label="Canción anterior">◀◀</button>
        <button className="radio-panel-play" type="button" onClick={toggle} disabled={!tracks.length}>{playing ? 'PAUSA' : 'PLAY'}</button>
        <button type="button" onClick={() => move(1)} disabled={!tracks.length} aria-label="Siguiente canción">▶▶</button>
      </div>
      <label className="radio-volume" htmlFor={volumeId}>VOLUMEN <output>{Math.round(volume * 100)}%</output>
        <input id={volumeId} type="range" min="0" max="1" step="0.05" value={volume} onChange={event => setVolume(Number(event.target.value))}/>
      </label>
      <div className="radio-playlist" role="listbox" aria-label="Seleccionar canción">
        {tracks.length ? tracks.map((item, index) => <button type="button" role="option" aria-selected={trackIndex === index} className={trackIndex === index ? 'active' : ''} key={`${item.src}-${index}`} onClick={() => setTrackIndex(index)}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.title}</b><small>{item.artist}</small></button>) : <p>PLAYLIST PENDIENTE.</p>}
      </div>
    </div>}
  </section>;
}
