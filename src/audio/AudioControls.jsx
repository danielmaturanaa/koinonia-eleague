import { useId } from 'react';
import { useAudioSettings, setAudioSettings } from './settings.js';
import { SOUNDS, previewSound } from './synth.js';

/** Panel de audio único: silencio total, efectos con su volumen y música; con `compact` solo lo esencial (dentro de la radio). */
export function AudioControls({ compact = false }) {
  const settings = useAudioSettings();
  const id = useId();
  return <div className={`audio-controls ${compact ? 'compact' : ''}`}>
    <label className="audio-check"><input type="checkbox" checked={settings.muted} onChange={event => setAudioSettings({ muted: event.target.checked })}/> SILENCIAR TODO</label>
    <label className="audio-check"><input type="checkbox" checked={settings.effects} disabled={settings.muted} onChange={event => setAudioSettings({ effects: event.target.checked })}/> EFECTOS DE SONIDO</label>
    <label className="audio-slider" htmlFor={`${id}-effects`}>VOLUMEN DE EFECTOS <output>{Math.round(settings.effectsVolume * 100)}%</output>
      <input id={`${id}-effects`} type="range" min="0" max="1" step="0.05" value={settings.effectsVolume} disabled={settings.muted || !settings.effects}
        onChange={event => setAudioSettings({ effectsVolume: Number(event.target.value) })}/>
    </label>
    {!compact && <>
      <label className="audio-slider" htmlFor={`${id}-music`}>VOLUMEN DE LA RADIO <output>{Math.round(settings.musicVolume * 100)}%</output>
        <input id={`${id}-music`} type="range" min="0" max="1" step="0.05" value={settings.musicVolume} disabled={settings.muted}
          onChange={event => setAudioSettings({ musicVolume: Number(event.target.value) })}/>
      </label>
      <div className="audio-preview" role="group" aria-label="Probar sonidos">
        <span>PROBAR</span>
        {Object.entries(SOUNDS).map(([name, sound]) => <button type="button" key={name} onClick={() => previewSound(name)}>{sound.label}</button>)}
      </div>
    </>}
  </div>;
}
