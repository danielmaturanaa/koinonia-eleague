// El sonido del chat usa el audio unificado del sitio: un solo interruptor de efectos y un solo volumen.
import { effectsOff, getAudioSettings, setAudioSettings } from '../../../audio/settings.js';
import { playSound } from '../../../audio/synth.js';

export const isMuted = () => effectsOff(getAudioSettings());
export const setMuted = value => setAudioSettings({ effects: !value });
export const playIncoming = () => playSound('chat');
