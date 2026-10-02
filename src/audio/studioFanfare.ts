// studioFanfare: drum roll, cymbal and calliope fanfare for the studio splash
// (Tom's Happy Happy Funtimes Emporium). Ported from Loincloth Legends so both
// games open with the same sound. Synthesized on the shared AudioContext and
// routed through the SFX volume and mute settings.

import { getSharedAudioContext } from './webAudioBridge';
import { sfxManager } from './sfxManager';

// Audio variation must not advance the random stream used by game events.
let seed = 0x2f6b4c1d;
function audioRandom() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
const rand = (a: number, b: number) => a + audioRandom() * (b - a);
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

let busCtx: AudioContext | null = null;
let bus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let lastSparkle = -1;

/** The SFX bus for the splash, or null when sound effects are muted or unavailable. */
function prepare(): { c: AudioContext; out: GainNode } | null {
  const { sfxVolume, sfxMuted } = sfxManager.getSettings();
  if (sfxMuted || sfxVolume <= 0) return null;
  const c = getSharedAudioContext();
  if (!c) return null;
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (busCtx !== c || !bus) {
    busCtx = c;
    bus = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    bus.connect(comp).connect(c.destination);
    const len = Math.floor(c.sampleRate * 1.5);
    noise = c.createBuffer(1, len, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = audioRandom() * 2 - 1;
  }
  // Same loudness as Loincloth Legends at the default SFX volume
  bus.gain.value = 1.25 * sfxVolume;
  return { c, out: bus };
}

function env(g: GainNode, t: number, a: number, peak: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function noiseSrc(c: AudioContext, t: number, dur: number) {
  const s = c.createBufferSource();
  s.buffer = noise;
  // The buffer is 1.5 seconds: long layers loop so they are not cut short
  if (dur > 0.9) s.loop = true;
  s.start(t, rand(0, 0.5), dur + 0.05);
  return s;
}

/** Drum roll, kick, cymbal, a brass chord and a little calliope ta-da. */
export function playStudioFanfare() {
  try {
    const p = prepare();
    if (!p) return;
    const { c, out } = p;
    const t0 = c.currentTime + 0.05;
    // Drum roll
    for (let i = 0; i < 20; i++) {
      const tt = t0 + i * 0.034;
      const n = noiseSrc(c, tt, 0.05);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1900;
      f.Q.value = 1.2;
      const g = c.createGain();
      env(g, tt, 0.002, 0.08 + i * 0.012, 0.05);
      n.connect(f).connect(g).connect(out);
    }
    const hit = t0 + 0.7;
    // Kick drum and cymbal
    const kick = c.createOscillator();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(120, hit);
    kick.frequency.exponentialRampToValueAtTime(40, hit + 0.3);
    const kg = c.createGain();
    env(kg, hit, 0.003, 1.0, 0.4);
    kick.connect(kg).connect(out);
    kick.start(hit);
    kick.stop(hit + 0.5);
    const cy = noiseSrc(c, hit, 1.6);
    const cf = c.createBiquadFilter();
    cf.type = 'highpass';
    cf.frequency.value = 5200;
    const cg = c.createGain();
    env(cg, hit, 0.004, 0.42, 1.6);
    cy.connect(cf).connect(cg).connect(out);
    // Brass chord (C major) with an opening filter
    const brass = (midi: number, st: number, dur: number, vol: number) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(midi);
      o.detune.value = rand(-8, 8);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(700, st);
      f.frequency.exponentialRampToValueAtTime(2800, st + 0.12);
      f.frequency.exponentialRampToValueAtTime(1300, st + dur);
      f.Q.value = 2;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(vol, st + 0.03);
      g.gain.setValueAtTime(vol * 0.85, st + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      o.connect(f).connect(g).connect(out);
      o.start(st);
      o.stop(st + dur + 0.05);
    };
    for (const m of [48, 60, 64, 67]) brass(m, hit, 0.55, 0.09);
    // Ta-da-da-DAAA (calliope)
    const notes: [number, number, number][] = [[72, 0.62, 0.14], [76, 0.8, 0.14], [79, 0.98, 0.14], [84, 1.16, 0.9]];
    for (const [m, st, d] of notes) {
      const start = hit + st - 0.62;
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = mtof(m);
      const vib = c.createOscillator();
      vib.frequency.value = 6;
      const vg = c.createGain();
      vg.gain.value = mtof(m) * 0.012;
      vib.connect(vg).connect(o.frequency);
      const g = c.createGain();
      env(g, start, 0.01, 0.11, d);
      o.connect(g).connect(out);
      o.start(start);
      vib.start(start);
      o.stop(start + d + 0.05);
      vib.stop(start + d + 0.05);
    }
    for (const m of [60, 64, 67, 72]) brass(m, hit + 0.54, 1.1, 0.07);
  } catch {
    // The splash works silently without sound
  }
}

/** A small glittering ping. */
export function playStudioSparkle() {
  try {
    const p = prepare();
    if (!p) return;
    const { c, out } = p;
    const t = c.currentTime;
    if (t - lastSparkle < 0.06) return;
    lastSparkle = t;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = mtof(96 + Math.floor(rand(0, 5)));
    const g = c.createGain();
    env(g, t, 0.005, 0.06, 0.08);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.13);
  } catch {
    // Silent fallback
  }
}
