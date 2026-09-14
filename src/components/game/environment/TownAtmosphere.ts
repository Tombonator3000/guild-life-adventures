import type { Player } from '@/types/game.types';
import type { WeatherType } from '@/data/weather';

/** Reference pixels/second at a 1000px-wide board; one field shared by every layer. */
export function townWind(seconds: number, weather?: WeatherType) {
  const strength = weather === 'thunderstorm' ? 2.2 : weather === 'snowstorm' ? 1.5 : 1;
  const gust = Math.pow(.5 + .5 * Math.sin(seconds * .37), 4);
  return {
    x: (10 + 5 * Math.sin(seconds * .16) + 4 * gust) * strength,
    y: (-2 + 3 * Math.sin(seconds * .11)) * strength,
    gust,
  };
}

/** Inspect confirmed state changes, never button presses. Rejections/replayed snapshots emit nothing. */
export function completedForgeShifts(before: readonly Player[], after: readonly Player[]) {
  return after.filter(player => {
    const previous = before.find(candidate => candidate.id === player.id);
    return previous && previous.currentLocation === 'forge' && player.currentLocation === 'forge'
      && !!player.currentJob && player.currentJob === previous.currentJob
      && player.totalShiftsWorked === previous.totalShiftsWorked + 1
      && player.timeRemaining < previous.timeRemaining;
  }).length;
}

export class TownAtmosphere {
  private last: number | null = null;
  snow = 0;
  wind = townWind(0);
  drift = { x: 0, y: 0 };
  bursts: Array<{ start: number; id: number }> = [];
  burstSequence = 0;

  update(seconds: number, weather: WeatherType | undefined, animated: boolean) {
    const dt = this.last === null ? 0 : Math.max(0, Math.min(.1, seconds - this.last));
    this.last = seconds;
    this.wind = townWind(seconds, weather);
    if (animated) {
      this.drift.x += this.wind.x * dt;
      this.drift.y += this.wind.y * dt;
      const rate = weather === 'snowstorm' ? 1 / 42 : weather === 'drought' ? -1 / 18 : -1 / 55;
      this.snow = Math.max(0, Math.min(1, this.snow + rate * dt));
    }
    this.bursts = this.bursts.filter(burst => seconds - burst.start < 2.8);
  }

  forgeBurst(seconds: number) {
    this.bursts.push({ start: seconds, id: ++this.burstSequence });
    this.bursts = this.bursts.slice(-3);
  }
}

/** One brief flock per 54s, alternating direction; no crossings in dangerous weather. */
export function birdFlight(seconds: number, weather?: WeatherType) {
  const cycle = Math.floor(seconds / 54);
  const elapsed = seconds % 54 - 5;
  return {
    visible: elapsed >= 0 && elapsed < 13 && weather !== 'thunderstorm' && weather !== 'snowstorm',
    progress: Math.max(0, Math.min(1, elapsed / 13)),
    direction: cycle % 2 === 0 ? 1 : -1,
    band: cycle % 3 === 1 ? .87 : .12,
  };
}
