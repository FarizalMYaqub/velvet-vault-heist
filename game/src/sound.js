// Velvet Vault — all sound is synthesised with WebAudio: no audio files,
// no network, just oscillators and noise. Created on the first user gesture.
let ctx = null;
let muted = false;

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null) {
  if (muted) return;
  try {
    const ac = audio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  } catch {
    // Audio is decoration; a failure here must never stop the game.
  }
}

function noiseBurst(dur, vol = 0.1) {
  if (muted) return;
  try {
    const ac = audio();
    const len = Math.floor(ac.sampleRate * dur);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    src.connect(gain).connect(ac.destination);
    src.start();
  } catch {
    // As above: never fatal.
  }
}

export const sound = {
  step() { tone(180, 0.05, 'triangle', 0.03); },
  click() { tone(660, 0.06, 'square', 0.06); },
  pickup() { tone(523, 0.1, 'sine', 0.12); setTimeout(() => tone(784, 0.16, 'sine', 0.12), 90); },
  suspicious() { tone(440, 0.18, 'sine', 0.09, 520); },
  spotted() { tone(220, 0.4, 'sawtooth', 0.1, 440); },
  cameraBeep() { tone(880, 0.08, 'square', 0.05); },
  laser() { tone(1200, 0.25, 'sawtooth', 0.08, 300); },
  smoke() { noiseBurst(0.5, 0.12); },
  emp() { tone(1200, 0.5, 'sine', 0.1, 80); },
  door() { tone(160, 0.3, 'triangle', 0.1, 90); noiseBurst(0.2, 0.05); },
  caught() {
    tone(330, 0.5, 'sawtooth', 0.12, 110);
    setTimeout(() => tone(220, 0.6, 'sawtooth', 0.12, 70), 200);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.12), i * 110));
  },
};
