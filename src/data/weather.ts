/**
 * Weather Events System — rare weather that affects gameplay visually and mechanically.
 *
 * Weather changes are checked once per week during processWeekEnd.
 * When active, weather persists for 1-3 weeks and applies global modifiers.
 * Guarded by the `enableWeatherEvents` game option.
 */

export type WeatherType =
  | 'clear'
  | 'snowstorm'
  | 'thunderstorm'
  | 'drought'
  | 'enchanted-fog'
  | 'harvest-rain';

/** Particle visual style rendered by WeatherOverlay */
export type WeatherParticle = 'snow' | 'rain' | 'heatwave' | 'fog' | 'light-rain';

export interface WeatherState {
  type: WeatherType;
  name: string;
  description: string;
  weeksRemaining: number;
  particle: WeatherParticle | null;
  /** Extra movement hours per location step (0 = normal) */
  movementCostExtra: number;
  /** Multiplier applied to priceModifier (1.0 = no change) */
  priceMultiplier: number;
  /** Happiness delta applied to each player per week */
  happinessPerWeek: number;
  /** Multiplier on robbery probability (1.0 = normal) */
  robberyMultiplier: number;
  /** Chance fresh food spoils this week (0 = never, 0-1) */
  foodSpoilageChance: number;
}

/** Default clear weather (no effects) */
export const CLEAR_WEATHER: WeatherState = {
  type: 'clear',
  name: 'Clear Skies',
  description: 'The weather is fair across Guildholm. Suspiciously fair. Nature is planning something.',
  weeksRemaining: 0,
  particle: null,
  movementCostExtra: 0,
  priceMultiplier: 1.0,
  happinessPerWeek: 0,
  robberyMultiplier: 1.0,
  foodSpoilageChance: 0,
};

/** All possible weather events (excluding clear) */
const WEATHER_EVENTS: Omit<WeatherState, 'weeksRemaining'>[] = [
  {
    type: 'snowstorm',
    name: 'Snowstorm',
    description: 'A fierce snowstorm blankets Guildholm. Travel is slow, spirits are low, and someone is definitely going to suggest building a snowman.',
    particle: 'snow',
    movementCostExtra: 1,
    priceMultiplier: 1.10,
    happinessPerWeek: -2,
    robberyMultiplier: 0.5, // Thieves stay indoors too
    foodSpoilageChance: 0,
  },
  {
    type: 'thunderstorm',
    name: 'Thunderstorm',
    description: 'Dark clouds gather over Guildholm. Lightning crackles and rain pours. Perfect weather for brooding dramatically on a rooftop.',
    particle: 'rain',
    movementCostExtra: 1,
    priceMultiplier: 1.05,
    happinessPerWeek: -1,
    robberyMultiplier: 1.5, // Darkness favors thieves
    foodSpoilageChance: 0,
  },
  {
    type: 'drought',
    name: 'Drought',
    description: 'A scorching drought dries the land. Food prices soar, wells run dry, and everyone suddenly has strong opinions about water.',
    particle: 'heatwave',
    movementCostExtra: 0,
    priceMultiplier: 1.15,
    happinessPerWeek: -2,
    robberyMultiplier: 1.0,
    foodSpoilageChance: 0.25, // 25% chance stored fresh food spoils
  },
  {
    type: 'enchanted-fog',
    name: 'Enchanted Fog',
    description: 'A mystical fog rolls through Guildholm. It feels strangely invigorating, smells faintly of lavender, and nobody can find their shoes.',
    particle: 'fog',
    movementCostExtra: 1,
    priceMultiplier: 0.95,
    happinessPerWeek: 3,
    robberyMultiplier: 1.2, // Hard to see in fog
    foodSpoilageChance: 0,
  },
  {
    type: 'harvest-rain',
    name: 'Harvest Rain',
    description: 'A gentle rain blesses the farmlands. Food is plentiful, prices drop, and farmers finally stop complaining. Briefly.',
    particle: 'light-rain',
    movementCostExtra: 0,
    priceMultiplier: 0.90,
    happinessPerWeek: 2,
    robberyMultiplier: 1.0,
    foodSpoilageChance: 0,
  },
];

/**
 * Roll for a new weather event. Called once per week in processWeekEnd.
 * ~8% chance total of any weather event starting.
 * Returns null if weather stays clear.
 */
export function rollWeatherEvent(): WeatherState | null {
  // 92% chance: nothing happens (weather stays clear)
  if (Math.random() > 0.08) return null;

  // Pick a random weather event
  const event = WEATHER_EVENTS[Math.floor(Math.random() * WEATHER_EVENTS.length)];

  // Duration: 1-3 weeks
  const weeksRemaining = 1 + Math.floor(Math.random() * 3);

  return {
    ...event,
    weeksRemaining,
  };
}

// ============================================================
// Weather ↔ Festival Conflict Resolution
// ============================================================
// Some weather types are thematically/mechanically contradictory with festivals.
// When both would be active, the festival (deterministic) takes priority and
// conflicting weather is cleared.

import type { FestivalId } from '@/data/festivals';

/** Map of weather types to the festivals they conflict with */
const WEATHER_FESTIVAL_CONFLICTS: Partial<Record<WeatherType, FestivalId[]>> = {
  // Drought = scorching land, food prices soar — contradicts Harvest Festival's abundance & cheap goods
  'drought': ['harvest-festival'],
  // Snowstorm in midsummer or during harvest makes no thematic sense
  'snowstorm': ['midsummer-fair', 'harvest-festival'],
};

/**
 * Check if a weather type conflicts with a festival.
 * When they conflict, the festival takes priority (festivals are deterministic schedule events).
 */
export function isWeatherFestivalConflict(weatherType: WeatherType, festivalId: FestivalId): boolean {
  const conflicts = WEATHER_FESTIVAL_CONFLICTS[weatherType];
  return conflicts ? conflicts.includes(festivalId) : false;
}

/**
 * Advance weather by one week. Decrements duration and clears if expired.
 * If weather expired and enableWeatherEvents is on, rolls for new weather.
 */
export function advanceWeather(current: WeatherState): WeatherState {
  if (current.type === 'clear') {
    // Roll for new weather
    return rollWeatherEvent() || { ...CLEAR_WEATHER };
  }

  // Decrement duration
  const remaining = current.weeksRemaining - 1;
  if (remaining <= 0) {
    // Weather ended — return to clear (next week may roll new weather)
    return { ...CLEAR_WEATHER };
  }

  return { ...current, weeksRemaining: remaining };
}
