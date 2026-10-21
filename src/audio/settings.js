import { useSyncExternalStore } from 'react';

// Ajustes de audio de este navegador (música, efectos y silencio total). Se recuerdan sin necesidad de cuenta.
const KEY = 'koinonia:audio';
const LEGACY_CHAT_MUTE = 'koinonia:chat-sonido-silenciado';
const DEFAULTS = { muted: false, effects: true, effectsVolume: 0.6, musicVolume: 0.35 };

const clamp = value => Math.min(1, Math.max(0, Number(value)));

function load() {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
    // Quien había silenciado el sonido del chat conserva ese silencio en los efectos.
    if (window.localStorage.getItem(LEGACY_CHAT_MUTE) === '1') return { ...DEFAULTS, effects: false };
  } catch { /* sin almacenamiento o dato dañado: valores por defecto */ }
  return { ...DEFAULTS };
}

let state = load();
const listeners = new Set();

export const getAudioSettings = () => state;

export function setAudioSettings(patch) {
  const next = { ...state };
  if ('muted' in patch) next.muted = Boolean(patch.muted);
  if ('effects' in patch) next.effects = Boolean(patch.effects);
  if ('effectsVolume' in patch && Number.isFinite(Number(patch.effectsVolume))) next.effectsVolume = clamp(patch.effectsVolume);
  if ('musicVolume' in patch && Number.isFinite(Number(patch.musicVolume))) next.musicVolume = clamp(patch.musicVolume);
  state = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* no se recuerda */ }
  listeners.forEach(listener => listener());
}

const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const useAudioSettings = () => useSyncExternalStore(subscribe, getAudioSettings, getAudioSettings);

/** ¿Los efectos de sonido están apagados (por silencio total o por el interruptor de efectos)? */
export const effectsOff = settings => settings.muted || !settings.effects;
