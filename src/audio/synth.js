import { effectsOff, getAudioSettings } from './settings.js';

// Efectos de sonido chiptune generados con WebAudio (sin archivos). El navegador solo deja sonar después de un gesto del usuario:
// se destraba con el primer toque o tecla y, mientras tanto, simplemente no suena.
let context = null;
let unlockInstalled = false;

function audioContext() {
  if (typeof window === 'undefined') return null;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  context ??= new Context();
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

/** Instala (una vez) el destrabe del audio en el primer gesto del usuario. */
export function installAudioUnlock() {
  if (unlockInstalled || typeof window === 'undefined') return;
  unlockInstalled = true;
  const unlock = () => { audioContext(); };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

/** Toca una secuencia de notas. `scale` multiplica el volumen (el volumen de efectos del usuario). */
export function playTones(notes, { type = 'triangle', gap = 0.12, last = 0.6, volume = 0.12, scale = 1 } = {}) {
  try {
    const audio = audioContext();
    // Sin gesto previo el navegador lo tiene congelado: mejor no sonar que acumular notas y soltarlas juntas.
    if (!audio || audio.state !== 'running') return;
    const peak = Math.max(0.0002, volume * scale);
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      const at = audio.currentTime + index * gap;
      const end = at + (index === notes.length - 1 ? last : Math.max(0.05, gap * 1.3));
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(end + 0.05);
    });
  } catch { /* el navegador no dejó sonar */ }
}

// Silbato: un tono agudo que sube y vibra.
function whistle(scale) {
  try {
    const audio = audioContext();
    if (!audio || audio.state !== 'running') return;
    const at = audio.currentTime;
    const oscillator = audio.createOscillator();
    const vibrato = audio.createOscillator();
    const vibratoGain = audio.createGain();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(2400, at);
    oscillator.frequency.linearRampToValueAtTime(2900, at + 0.35);
    vibrato.frequency.value = 38;
    vibratoGain.gain.value = 90;
    vibrato.connect(vibratoGain).connect(oscillator.frequency);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.07 * scale), at + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(at); vibrato.start(at);
    oscillator.stop(at + 0.55); vibrato.stop(at + 0.55);
  } catch { /* sin audio */ }
}

// Grabaciones reales de estadio (public/sounds; fuentes y licencias en el Reglamento). Se cargan la primera vez que suenan.
const samples = new Map();
function playSample(name, scale, { volume = 1, loop = false } = {}) {
  try {
    if (typeof Audio === 'undefined') return null;
    let base = samples.get(name);
    if (!base) { base = new Audio(`/sounds/${name}.mp3`); base.preload = 'auto'; samples.set(name, base); }
    // Un clon por vez que suena: dos goles seguidos se superponen en vez de cortarse.
    const audio = base.paused && !loop ? base : base.cloneNode();
    audio.loop = loop;
    audio.volume = Math.min(1, Math.max(0, volume * scale));
    audio.currentTime = 0;
    audio.play()?.catch?.(() => {});
    return audio;
  } catch { return null; }
}

/** El juego de sonidos del sitio: cada uno dice qué pasó sin necesidad de mirar la pantalla. */
export const SOUNDS = {
  click: { label: 'CLIC', notes: [1318], options: { type: 'square', last: 0.04, volume: 0.025 } },
  confirm: { label: 'CONFIRMAR', notes: [659, 988], options: { type: 'square', gap: 0.07, last: 0.14, volume: 0.05 } },
  error: { label: 'ERROR', notes: [220, 165], options: { type: 'sawtooth', gap: 0.1, last: 0.22, volume: 0.05 } },
  notify: { label: 'AVISO', notes: [880, 1109, 1319], options: { type: 'triangle', gap: 0.08, last: 0.28, volume: 0.09 } },
  offer: { label: 'OFERTA', notes: [784, 988, 784, 988], options: { type: 'square', gap: 0.1, last: 0.22, volume: 0.05 } },
  signed: { label: 'FICHAJE', notes: [523, 659, 784, 1047, 1319], options: { type: 'triangle', gap: 0.1, last: 0.6, volume: 0.1 } },
  cash: { label: 'CAJA', notes: [988, 1319], options: { type: 'square', gap: 0.06, last: 0.3, volume: 0.045 } },
  goal: { label: 'GOL', notes: [392, 523, 659, 784, 1047, 1319], options: { type: 'square', gap: 0.07, last: 0.5, volume: 0.06 } },
  chat: { label: 'MENSAJE', notes: [880, 1175], options: { type: 'sine', gap: 0.09, last: 0.18, volume: 0.07 } },
  whistle: { label: 'SILBATO', whistle: true },
  referee: { label: 'SILBATO REAL', sample: 'silbato', volume: 0.7 },
  celebration: { label: 'GOL (BRENTFORD)', sample: 'gol-brentford' },
  celebration2: { label: 'GOL (GRITO)', sample: 'gol-grito' },
  awayCheer: { label: 'FESTEJO VISITA', sample: 'festejo-visita', volume: 0.35 },
  boo: { label: 'PIFIAS', sample: 'pifias', volume: 0.7 },
  chant: { label: 'CANTO', sample: 'canto', volume: 0.55 },
  applause: { label: 'APLAUSOS', sample: 'aplausos', volume: 0.8 },
};

function playNow(name, scale) {
  const sound = SOUNDS[name];
  if (!sound) return;
  if (sound.whistle) whistle(scale);
  else if (sound.sample) playSample(sound.sample, scale, { volume: sound.volume });
  else playTones(sound.notes, { ...sound.options, scale });
}

/** Toca un efecto si los efectos están encendidos (y el silencio total apagado), al volumen que eligió el usuario. */
export function playSound(name) {
  const settings = getAudioSettings();
  if (effectsOff(settings)) return;
  playNow(name, settings.effectsVolume);
}

/** Para el botón "probar": suena aunque los efectos estén apagados. */
export const previewSound = name => playNow(name, getAudioSettings().effectsVolume);

/** Ambiente de estadio en loop (bajito) mientras se mira un partido en modo estadio. Devuelve cómo apagarlo. */
export function startStadiumAmbience() {
  const settings = getAudioSettings();
  if (effectsOff(settings)) return () => {};
  const audio = playSample('ambiente', settings.effectsVolume, { volume: 0.35, loop: true });
  // Si el navegador no dejó sonar todavía (sin gesto previo), arranca con el primer toque en la página.
  const retry = () => { if (audio?.paused) audio.play()?.catch?.(() => {}); };
  window.addEventListener('pointerdown', retry, { once: true });
  return () => { window.removeEventListener('pointerdown', retry); if (audio) { audio.pause(); audio.currentTime = 0; } };
}
