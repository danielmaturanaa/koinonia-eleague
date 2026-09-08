import { useEffect, useId, useRef, useState } from 'react';

export function MusicPlayer({ tracks = [] }) {
  const audioRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const volumeId = useId();
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

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) audio.play().then(() => setAutoplayBlocked(false)).catch(() => setAutoplayBlocked(true));
    else audio.pause();
  };

  return <section className="score-panel music-player" aria-label="Radio Koinonia League">
    <h2>RADIO KOINONIA LEAGUE <small>{tracks.length ? `${trackIndex + 1}/${tracks.length}` : 'PLAYLIST'}</small></h2>
    <audio ref={audioRef} src={track?.src} autoPlay preload="metadata" onEnded={() => move(1)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>
    <div className="music-display">
      <span className="music-note" aria-hidden="true">♫</span>
      <p><b>{track?.title ?? 'PLAYLIST PENDIENTE'}</b><small>{track?.artist ?? 'ENVÍAME LAS CANCIONES O ENLACES'}</small></p>
    </div>
    <div className="music-controls">
      <button type="button" onClick={() => move(-1)} disabled={!tracks.length} aria-label="Canción anterior">◀◀</button>
      <button className="music-play" type="button" onClick={toggle} disabled={!tracks.length}>{playing ? 'PAUSA' : autoplayBlocked ? 'REPRODUCIR' : 'PLAY'}</button>
      <button type="button" onClick={() => move(1)} disabled={!tracks.length} aria-label="Siguiente canción">▶▶</button>
    </div>
    <div className="volume-control">
      <label htmlFor={volumeId}>VOLUMEN <output>{Math.round(volume * 100)}%</output></label>
      <input id={volumeId} type="range" min="0" max="1" step="0.05" value={volume} onChange={event => setVolume(Number(event.target.value))}/>
    </div>
    {autoplayBlocked && <small className="autoplay-note">EL NAVEGADOR REQUIERE UN CLIC PARA INICIAR EL AUDIO.</small>}
  </section>;
}
