// Sonido discreto de "mensaje nuevo" generado con WebAudio (sin archivos). El navegador solo deja sonar tras una
// interacción del usuario, así que si no puede, simplemente no suena. Se puede silenciar y se recuerda.
const KEY = 'koinonia:chat-sonido-silenciado';
let context = null;

export function isMuted() {
  try { return window.localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setMuted(value) {
  try { window.localStorage.setItem(KEY, value ? '1' : '0'); } catch { /* sin almacenamiento: no se recuerda */ }
}

export function playIncoming() {
  if (isMuted()) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    if (context.state === 'suspended') context.resume().catch(() => {});
    const now = context.currentTime;
    // Dos notas cortas y suaves (tipo "pop" de mensajería).
    [[880, 0], [1175, 0.09]].forEach(([frequency, offset]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.06, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.18);
    });
  } catch { /* el navegador no permitió sonar */ }
}
