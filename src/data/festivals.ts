/**
 * Seasonal Festivals — 4 festivals that occur every 12 weeks in rotation.
 *
 * Each festival lasts 1 week and provides unique effects to all players.
 * Festival cycle: Harvest Festival (wk 12) → Winter Solstice (wk 24) →
 * Spring Tournament (wk 36) → Midsummer Fair (wk 48) → repeat.
 *
 * Guarded by the `enableFestivals` game option.
 */

export type FestivalId = 'harvest-festival' | 'winter-solstice' | 'spring-tournament' | 'midsummer-fair';

export interface Festival {
  id: FestivalId;
  name: string;
  description: string;
  /** Emoji icon for UI display */
  icon: string;
  /** Happiness bonus applied to all living players */
  happinessBonus: number;
  /** Gold bonus/penalty applied to all living players */
  goldEffect: number;
  /** Price multiplier for the festival week (stacks with economy) */
  priceMultiplier: number;
  /** Bonus education progress sessions (0 = none) */
  educationBonus: number;
  /** Extra dependability gain (0 = none) */
  dependabilityBonus: number;
  /** Movement cost reduction (0 = none, positive = discount per step) */
  movementDiscount: number;
  /** Work wage bonus multiplier (1.0 = normal) */
  wageMultiplier: number;
  /** Dungeon gold bonus multiplier (1.0 = normal) */
  dungeonGoldMultiplier: number;
  /** Event message shown to players */
  eventMessage: string;
}

/** All 4 seasonal festivals in rotation order */
export const FESTIVALS: Festival[] = [
  {
    id: 'harvest-festival',
    name: 'Harvest Festival',
    description: 'The autumn harvest brings abundance to Guildholm. Food is cheap and spirits are high!',
    icon: '🌾',
    happinessBonus: 5,
    goldEffect: 0,
    priceMultiplier: 0.85, // 15% price discount (abundant goods)
    educationBonus: 0,
    dependabilityBonus: 0,
    movementDiscount: 0,
    wageMultiplier: 1.0,
    dungeonGoldMultiplier: 1.0,
    eventMessage: '🌾 Harvest Festival! The autumn bounty brings cheap goods and good cheer. All prices reduced by 15% this week!',
  },
  {
    id: 'winter-solstice',
    name: 'Winter Solstice',
    description: 'The longest night brings reflection and study. Scholars gather and wisdom flows freely.',
    icon: '❄️',
    happinessBonus: 3,
    goldEffect: 0,
    priceMultiplier: 1.0,
    educationBonus: 2, // +2 bonus study sessions
    dependabilityBonus: 3, // loyalty rewarded in winter
    movementDiscount: 0,
    wageMultiplier: 1.0,
    dungeonGoldMultiplier: 1.0,
    eventMessage: '❄️ Winter Solstice! Scholars gather and wisdom flows. +2 bonus study progress and +3 dependability for all!',
  },
  {
    id: 'spring-tournament',
    name: 'Spring Tournament',
    description: 'Warriors compete in the annual tournament. Dungeon runs are more rewarding and combat skills shine!',
    icon: '⚔️',
    happinessBonus: 3,
    goldEffect: 0,
    priceMultiplier: 1.0,
    educationBonus: 0,
    dependabilityBonus: 0,
    movementDiscount: 0,
    wageMultiplier: 1.0,
    dungeonGoldMultiplier: 1.5, // 50% more dungeon gold
    eventMessage: '⚔️ Spring Tournament! Warriors compete for glory. Dungeon gold rewards increased by 50% this week!',
  },
  {
    id: 'midsummer-fair',
    name: 'Midsummer Fair',
    description: 'The grand fair fills Guildholm with merchants and entertainers. Wages are higher and travel is festive!',
    icon: '🎪',
    happinessBonus: 5,
    goldEffect: 10, // small gold handout from festivities
    priceMultiplier: 1.0,
    educationBonus: 0,
    dependabilityBonus: 0,
    movementDiscount: 0,
    wageMultiplier: 1.15, // 15% wage bonus
    dungeonGoldMultiplier: 1.0,
    eventMessage: '🎪 Midsummer Fair! Merchants and entertainers fill the streets. +15% wages and +10g festival bonus for all!',
  },
];

/** Festival cycle: one festival every 12 weeks */
export const FESTIVAL_INTERVAL = 12;

/**
 * Get the active festival for a given week, or null if no festival.
 * Festivals occur on weeks 12, 24, 36, 48, 60, 72, etc.
 */
export function getActiveFestival(week: number): Festival | null {
  if (week < FESTIVAL_INTERVAL) return null;
  if (week % FESTIVAL_INTERVAL !== 0) return null;

  // Determine which festival in the cycle (0-3)
  const cycleIndex = ((week / FESTIVAL_INTERVAL) - 1) % FESTIVALS.length;
  return FESTIVALS[cycleIndex];
}

/**
 * Get the next upcoming festival for display purposes.
 */
export function getNextFestival(week: number): { festival: Festival; weeksUntil: number } {
  const weeksUntilNext = FESTIVAL_INTERVAL - (week % FESTIVAL_INTERVAL);
  const nextFestivalWeek = week + weeksUntilNext;
  const cycleIndex = ((nextFestivalWeek / FESTIVAL_INTERVAL) - 1) % FESTIVALS.length;
  return {
    festival: FESTIVALS[cycleIndex],
    weeksUntil: weeksUntilNext,
  };
}
