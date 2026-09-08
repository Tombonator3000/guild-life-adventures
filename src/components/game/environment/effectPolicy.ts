import type { EnvironmentDetail } from '@/data/gameOptions';
import type { WeatherType } from '@/data/weather';

export function effectPolicy(detail: EnvironmentDetail, reducedMotion: boolean, visible: boolean, mobile: boolean) {
  const quality = detail === 'off' ? 'off' : detail === 'reduced' || reducedMotion ? 'reduced' : 'full';
  return { quality, enabled: quality !== 'off', animated: quality === 'full', running: quality === 'full' && visible,
    mobile, dpr: mobile ? 1.25 : 1.5, budget: mobile ? 180 : 480 } as const;
}
export type EffectPolicy = ReturnType<typeof effectPolicy>;
export function precipitationBudget(weather: WeatherType | undefined, mobile: boolean) {
  return weather === 'thunderstorm' ? (mobile ? 120 : 300) : weather === 'harvest-rain' ? (mobile ? 45 : 95) : weather === 'snowstorm' ? (mobile ? 45 : 100) : 0;
}

/** Private visual sampling. Never consumes the gameplay RNG or changes game state. */
export function sample(index: number, salt = 0) {
  let x = Math.imul(index + 1, 374761393) ^ Math.imul(salt + 17, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
