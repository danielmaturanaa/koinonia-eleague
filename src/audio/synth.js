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

// Ruido blanco (la base de la hinchada): un búfer que se reutiliza.
let noiseBuffer = null;
function noise(audio) {
  if (noiseBuffer) return noiseBuffer;
  noiseBuffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function noiseBurst(audio, { at, duration, filter = 'bandpass', frequency = 900, q = 0.7, peak, attack = 0.25 }) {
  const source = audio.createBufferSource();
  source.buffer = noise(audio);
  source.loop = true;
  const band = audio.createBiquadFilter();
  band.type = filter;
  band.frequency.value = frequency;
  band.Q.value = q;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.setValueAtTime(peak, at + duration * 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(band).connect(gain).connect(audio.destination);
  source.start(at);
  source.stop(at + duration + 0.05);
}

// La hinchada: rugido de gol (ruido que crece con un "oooh" encima), pifias (voces graves que caen) y vasos que llueven.
function crowd(kind, scale) {
  try {
    const audio = audioContext();
    if (!audio || audio.state !== 'running') return;
    const at = audio.currentTime;
    if (kind === 'roar') {
      noiseBurst(audio, { at, duration: 3.2, frequency: 1100, q: 0.6, peak: Math.max(0.0002, 0.16 * scale), attack: 0.35 });
      noiseBurst(audio, { at: at + 0.1, duration: 2.6, filter: 'lowpass', frequency: 420, q: 0.5, peak: Math.max(0.0002, 0.12 * scale), attack: 0.4 });
    }
    if (kind === 'boo') {
      noiseBurst(audio, { at, duration: 1.9, filter: 'lowpass', frequency: 380, q: 0.8, peak: Math.max(0.0002, 0.1 * scale), attack: 0.3 });
      [118, 131, 147, 165, 104].forEach((frequency, index) => {
        const voice = audio.createOscillator();
        const low = audio.createBiquadFilter();
        const gain = audio.createGain();
        voice.type = 'sawtooth';
        voice.frequency.setValueAtTime(frequency * 1.12, at);
        voice.frequency.linearRampToValueAtTime(frequency * 0.86, at + 1.8);
        voice.detune.value = (index - 2) * 14;
        low.type = 'lowpass';
        low.frequency.value = 520;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.022 * scale), at + 0.25 + index * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.9);
        voice.connect(low).connect(gain).connect(audio.destination);
        voice.start(at);
        voice.stop(at + 2);
      });
    }
    if (kind === 'cups') {
      for (let index = 0; index < 7; index += 1) {
        noiseBurst(audio, { at: at + 0.15 + index * 0.17 + (index % 3) * 0.05, duration: 0.09, filter: 'highpass', frequency: 2600 + (index % 4) * 500, q: 1, peak: Math.max(0.0002, 0.09 * scale), attack: 0.005 });
      }
    }
  } catch { /* sin audio */ }
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
  roar: { label: 'HINCHADA', crowd: 'roar' },
  boo: { label: 'PIFIAS', crowd: 'boo' },
  cups: { label: 'VASOS', crowd: 'cups' },
};

function playNow(name, scale) {
  const sound = SOUNDS[name];
  if (!sound) return;
  if (sound.whistle) whistle(scale);
  else if (sound.crowd) crowd(sound.crowd, scale);
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
