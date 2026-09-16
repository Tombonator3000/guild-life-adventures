import type { WeatherType } from '@/data/weather';

export const CLOUD_NOISE_SIZE = 64;
export const CLOUD_MASK_LONG_EDGE = 640;
export const CLOUD_MASK_COMPACT_LONG_EDGE = 480;
export const CLOUD_FALLBACK_LONG_EDGE = 128;
export const CLOUD_MIN_MULTIPLIER = 0.65;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => value * value * (3 - 2 * value);
const fract = (value: number) => value - Math.floor(value);

function hash(x: number, y: number, seed: number) {
  let value = Math.imul(x + 101, 374761393) ^ Math.imul(y + 307, 668265263) ^ Math.imul(seed + 17, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function createCloudNoise(size = CLOUD_NOISE_SIZE) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const offset = (y * size + x) * 4;
    data[offset] = Math.round(hash(x, y, 19) * 255);
    data[offset + 1] = Math.round(hash(x, y, 73) * 255);
    data[offset + 2] = 0;
    data[offset + 3] = 255;
  }
  return data;
}

function lattice(channel: 0 | 1, x: number, y: number) {
  return hash(x, y, channel === 0 ? 19 : 73);
}

function valueNoise(channel: 0 | 1, x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(fract(x)), fy = smooth(fract(y));
  const a = lattice(channel, ix, iy), b = lattice(channel, ix + 1, iy);
  const c = lattice(channel, ix, iy + 1), d = lattice(channel, ix + 1, iy + 1);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
}

function field(channel: 0 | 1, x: number, y: number) {
  return valueNoise(channel, x, y) * 0.58
    + valueNoise(channel, x * 2.03, y * 2.03) * 0.29
    + valueNoise(channel, x * 4.11, y * 4.11) * 0.13;
}

export function cloudCoverage(u: number, v: number, aspect: number, seconds: number) {
  const px = u * aspect * 3.1, py = v * 3.1;
  const a = field(0, px + 13.7 - seconds * 0.012, py + 7.3 - seconds * 0.0048);
  const angle = Math.PI / 6, cos = Math.cos(angle), sin = Math.sin(angle);
  const rx = px * cos - py * sin, ry = px * sin + py * cos;
  const b = field(1, rx - 9.2 - seconds * 0.0067, ry + 21.4 + seconds * 0.0031);
  const combined = a * 0.64 + b * 0.36;
  return smooth(clamp01((combined - 0.35) / 0.3));
}

export function cloudStrength(weather?: WeatherType) {
  if (weather === 'drought') return 0.15;
  if (weather === 'thunderstorm') return 0.33;
  if (weather === 'harvest-rain') return 0.29;
  if (weather === 'snowstorm') return 0.22;
  if (weather === 'enchanted-fog') return 0.18;
  return 0.27;
}

export function cloudMultiplier(coverage: number, weather?: WeatherType) {
  const shadow = 1 - clamp01(coverage) * cloudStrength(weather);
  return {
    r: Math.max(CLOUD_MIN_MULTIPLIER, shadow * (1 - coverage * 0.025)),
    g: Math.max(CLOUD_MIN_MULTIPLIER, shadow * (1 - coverage * 0.012)),
    b: Math.max(CLOUD_MIN_MULTIPLIER, shadow),
  };
}

export function cloudBufferSize(width: number, height: number, compact: boolean) {
  const longest = compact ? CLOUD_MASK_COMPACT_LONG_EDGE : CLOUD_MASK_LONG_EDGE;
  const scale = Math.min(1, longest / Math.max(1, width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}