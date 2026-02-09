// synthSFX — Web Audio API synthesized sound effects.
// Generates procedural sounds as fallback when MP3 files are not available.
// Each sound is a function that creates audio nodes and plays them.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Helper: play a tone with envelope
function playTone(
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  detune = 0,
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

// Helper: noise burst
function playNoise(duration: number, volume: number, filterFreq?: number) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  if (filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    source.connect(filter);
    filter.connect(gain);
  } else {
    source.connect(gain);
  }
  gain.connect(ctx.destination);
  source.start();
}

// Helper: play a sequence of tones
function playSequence(notes: Array<{ freq: number; duration: number; delay: number }>, volume: number, type: OscillatorType = 'sine') {
  const ctx = getCtx();
  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = note.freq;
    const startTime = ctx.currentTime + note.delay;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + note.duration);
  }
}

// --- Synthesized Sound Effects ---

export const SYNTH_SOUNDS: Record<string, (volume: number) => void> = {
  // UI Sounds
  'button-click': (vol) => {
    playTone(800, 0.08, vol * 0.5, 'square');
    playNoise(0.05, vol * 0.15, 2000);
  },

  'button-hover': (vol) => {
    playTone(1200, 0.04, vol * 0.2, 'sine');
  },

  'gold-button-click': (vol) => {
    playTone(1047, 0.1, vol * 0.4, 'sine');
    setTimeout(() => playTone(1319, 0.12, vol * 0.35, 'sine'), 50);
  },

  'menu-open': (vol) => {
    playSequence([
      { freq: 400, duration: 0.1, delay: 0 },
      { freq: 600, duration: 0.1, delay: 0.05 },
      { freq: 800, duration: 0.15, delay: 0.1 },
    ], vol * 0.3, 'triangle');
  },

  'menu-close': (vol) => {
    playSequence([
      { freq: 800, duration: 0.1, delay: 0 },
      { freq: 500, duration: 0.12, delay: 0.05 },
    ], vol * 0.25, 'triangle');
  },

  // Game Actions
  'coin-gain': (vol) => {
    playSequence([
      { freq: 1500, duration: 0.08, delay: 0 },
      { freq: 2000, duration: 0.08, delay: 0.06 },
      { freq: 2500, duration: 0.12, delay: 0.12 },
    ], vol * 0.3, 'sine');
  },

  'coin-spend': (vol) => {
    playSequence([
      { freq: 1200, duration: 0.1, delay: 0 },
      { freq: 800, duration: 0.12, delay: 0.08 },
    ], vol * 0.25, 'sine');
  },

  'item-buy': (vol) => {
    playTone(600, 0.1, vol * 0.3, 'triangle');
    setTimeout(() => {
      playTone(900, 0.15, vol * 0.3, 'triangle');
    }, 80);
    playNoise(0.1, vol * 0.1, 1500);
  },

  'item-equip': (vol) => {
    playNoise(0.08, vol * 0.2, 3000);
    playTone(500, 0.12, vol * 0.3, 'sawtooth');
    setTimeout(() => playTone(700, 0.1, vol * 0.25, 'triangle'), 100);
  },

  'success': (vol) => {
    playSequence([
      { freq: 523, duration: 0.15, delay: 0 },
      { freq: 659, duration: 0.15, delay: 0.12 },
      { freq: 784, duration: 0.2, delay: 0.24 },
      { freq: 1047, duration: 0.3, delay: 0.36 },
    ], vol * 0.35, 'triangle');
  },

  'error': (vol) => {
    playSequence([
      { freq: 300, duration: 0.15, delay: 0 },
      { freq: 250, duration: 0.2, delay: 0.12 },
    ], vol * 0.3, 'square');
  },

  // Movement & Locations
  'footstep': (vol) => {
    playNoise(0.12, vol * 0.2, 800);
  },

  'door-open': (vol) => {
    playNoise(0.3, vol * 0.15, 600);
    playTone(200, 0.3, vol * 0.1, 'sine');
  },

  // Work & Education
  'work-complete': (vol) => {
    playNoise(0.06, vol * 0.15, 2000);
    playSequence([
      { freq: 440, duration: 0.12, delay: 0.05 },
      { freq: 660, duration: 0.15, delay: 0.15 },
    ], vol * 0.3, 'triangle');
  },

  'study': (vol) => {
    playNoise(0.15, vol * 0.08, 1000);
    playTone(350, 0.2, vol * 0.15, 'sine');
  },

  'graduation': (vol) => {
    playSequence([
      { freq: 523, duration: 0.2, delay: 0 },
      { freq: 659, duration: 0.2, delay: 0.18 },
      { freq: 784, duration: 0.2, delay: 0.36 },
      { freq: 1047, duration: 0.4, delay: 0.54 },
    ], vol * 0.4, 'triangle');
    setTimeout(() => playTone(1047, 0.5, vol * 0.2, 'sine'), 600);
  },

  // Combat & Dungeon
  'sword-hit': (vol) => {
    playNoise(0.08, vol * 0.3, 4000);
    playTone(200, 0.1, vol * 0.2, 'sawtooth');
  },

  'damage-taken': (vol) => {
    playNoise(0.1, vol * 0.25, 1500);
    playTone(150, 0.15, vol * 0.2, 'square');
  },

  'victory-fanfare': (vol) => {
    playSequence([
      { freq: 523, duration: 0.2, delay: 0 },
      { freq: 523, duration: 0.1, delay: 0.2 },
      { freq: 523, duration: 0.1, delay: 0.3 },
      { freq: 784, duration: 0.4, delay: 0.45 },
      { freq: 659, duration: 0.15, delay: 0.85 },
      { freq: 784, duration: 0.5, delay: 1.0 },
    ], vol * 0.35, 'triangle');
  },

  'defeat': (vol) => {
    playSequence([
      { freq: 400, duration: 0.3, delay: 0 },
      { freq: 350, duration: 0.3, delay: 0.25 },
      { freq: 300, duration: 0.3, delay: 0.5 },
      { freq: 200, duration: 0.5, delay: 0.75 },
    ], vol * 0.3, 'sine');
  },

  // Events
  'notification': (vol) => {
    playTone(880, 0.12, vol * 0.3, 'sine');
    setTimeout(() => playTone(1100, 0.15, vol * 0.25, 'sine'), 100);
  },

  'turn-start': (vol) => {
    playSequence([
      { freq: 500, duration: 0.1, delay: 0 },
      { freq: 700, duration: 0.12, delay: 0.08 },
      { freq: 900, duration: 0.15, delay: 0.16 },
    ], vol * 0.25, 'triangle');
  },

  'week-end': (vol) => {
    playSequence([
      { freq: 600, duration: 0.15, delay: 0 },
      { freq: 500, duration: 0.15, delay: 0.12 },
      { freq: 400, duration: 0.2, delay: 0.24 },
    ], vol * 0.25, 'triangle');
  },

  // --- NEW SOUNDS ---

  'robbery': (vol) => {
    playNoise(0.15, vol * 0.3, 2000);
    playSequence([
      { freq: 300, duration: 0.15, delay: 0.05 },
      { freq: 200, duration: 0.2, delay: 0.15 },
      { freq: 150, duration: 0.25, delay: 0.3 },
    ], vol * 0.35, 'square');
  },

  'heal': (vol) => {
    playSequence([
      { freq: 400, duration: 0.15, delay: 0 },
      { freq: 500, duration: 0.15, delay: 0.1 },
      { freq: 600, duration: 0.15, delay: 0.2 },
      { freq: 800, duration: 0.25, delay: 0.3 },
    ], vol * 0.3, 'sine');
  },

  'quest-accept': (vol) => {
    playNoise(0.06, vol * 0.1, 1500);
    playSequence([
      { freq: 440, duration: 0.1, delay: 0 },
      { freq: 550, duration: 0.1, delay: 0.08 },
      { freq: 660, duration: 0.15, delay: 0.16 },
    ], vol * 0.3, 'triangle');
  },

  'quest-complete': (vol) => {
    playSequence([
      { freq: 523, duration: 0.15, delay: 0 },
      { freq: 659, duration: 0.15, delay: 0.12 },
      { freq: 784, duration: 0.15, delay: 0.24 },
      { freq: 1047, duration: 0.25, delay: 0.36 },
    ], vol * 0.4, 'triangle');
  },

  'level-up': (vol) => {
    playSequence([
      { freq: 523, duration: 0.12, delay: 0 },
      { freq: 659, duration: 0.12, delay: 0.1 },
      { freq: 784, duration: 0.12, delay: 0.2 },
      { freq: 1047, duration: 0.15, delay: 0.3 },
      { freq: 1319, duration: 0.25, delay: 0.42 },
    ], vol * 0.35, 'triangle');
    setTimeout(() => playTone(1319, 0.3, vol * 0.15, 'sine'), 450);
  },

  'appliance-break': (vol) => {
    playNoise(0.2, vol * 0.3, 3000);
    playTone(200, 0.2, vol * 0.2, 'sawtooth');
    setTimeout(() => playTone(120, 0.3, vol * 0.15, 'square'), 150);
  },

  'dice-roll': (vol) => {
    // Rapid clicking sounds
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        playNoise(0.03, vol * 0.2, 3000 + Math.random() * 2000);
      }, i * 40);
    }
    setTimeout(() => playTone(800 + Math.random() * 400, 0.1, vol * 0.25, 'triangle'), 280);
  },

  'death': (vol) => {
    playSequence([
      { freq: 300, duration: 0.3, delay: 0 },
      { freq: 250, duration: 0.3, delay: 0.3 },
      { freq: 200, duration: 0.4, delay: 0.6 },
      { freq: 130, duration: 0.6, delay: 1.0 },
    ], vol * 0.35, 'sine');
  },

  'resurrection': (vol) => {
    playSequence([
      { freq: 200, duration: 0.2, delay: 0 },
      { freq: 300, duration: 0.2, delay: 0.15 },
      { freq: 400, duration: 0.2, delay: 0.3 },
      { freq: 600, duration: 0.2, delay: 0.45 },
      { freq: 800, duration: 0.3, delay: 0.6 },
      { freq: 1047, duration: 0.4, delay: 0.8 },
    ], vol * 0.3, 'sine');
  },

  'rent-paid': (vol) => {
    playSequence([
      { freq: 800, duration: 0.08, delay: 0 },
      { freq: 600, duration: 0.08, delay: 0.06 },
      { freq: 500, duration: 0.1, delay: 0.12 },
    ], vol * 0.25, 'triangle');
    playNoise(0.08, vol * 0.1, 1500);
  },

  'weather-thunder': (vol) => {
    playNoise(0.6, vol * 0.4, 400);
    setTimeout(() => playNoise(0.4, vol * 0.3, 300), 200);
    playTone(60, 0.5, vol * 0.15, 'sine');
  },

  'festival': (vol) => {
    playSequence([
      { freq: 523, duration: 0.1, delay: 0 },
      { freq: 659, duration: 0.1, delay: 0.1 },
      { freq: 784, duration: 0.1, delay: 0.2 },
      { freq: 1047, duration: 0.15, delay: 0.3 },
      { freq: 784, duration: 0.1, delay: 0.45 },
      { freq: 1047, duration: 0.2, delay: 0.55 },
    ], vol * 0.3, 'triangle');
  },

  'travel-event': (vol) => {
    playTone(600, 0.12, vol * 0.3, 'triangle');
    setTimeout(() => {
      playTone(800, 0.15, vol * 0.25, 'triangle');
      playNoise(0.08, vol * 0.1, 2000);
    }, 100);
  },
};

/** Play a synthesized sound effect. Returns true if sound exists. */
export function playSynthSFX(sfxId: string, volume: number): boolean {
  const fn = SYNTH_SOUNDS[sfxId];
  if (!fn) return false;
  try {
    fn(volume);
    return true;
  } catch {
    return false;
  }
}
