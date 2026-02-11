/**
 * Random Travel Events (C7) — 10% chance of encountering events during travel.
 *
 * Travel events trigger when a player moves 3+ steps. Each event has
 * positive, negative, or mixed effects. Some events offer choices,
 * but the simple implementation applies effects immediately.
 */

export interface TravelEvent {
  id: string;
  name: string;
  description: string;
  /** Gold change (positive = gain, negative = loss) */
  goldEffect: number;
  /** Happiness change */
  happinessEffect: number;
  /** Time cost (additional hours lost) */
  timeCost: number;
  /** Health effect */
  healthEffect: number;
  /** Weight for random selection (higher = more common) */
  weight: number;
}

export const TRAVEL_EVENTS: TravelEvent[] = [
  // === Positive Events ===
  {
    id: 'found-coin-purse',
    name: 'Found Coin Purse',
    description: 'You found a coin purse dropped on the road! Someone\'s bad day is your good day. The circle of life.',
    goldEffect: 15 + Math.floor(Math.random() * 20),
    happinessEffect: 2,
    timeCost: 0,
    healthEffect: 0,
    weight: 3,
  },
  {
    id: 'wandering-merchant',
    name: 'Wandering Merchant',
    description: 'A friendly merchant offers you a sample of exotic herbs. You feel revitalized! Probably not drugs. Probably.',
    goldEffect: 0,
    happinessEffect: 3,
    timeCost: 0,
    healthEffect: 5,
    weight: 2,
  },
  {
    id: 'shortcut-found',
    name: 'Hidden Shortcut',
    description: 'You discover a hidden shortcut through the alleyways. It smells terrible but saves time. Life is full of trade-offs.',
    goldEffect: 0,
    happinessEffect: 1,
    timeCost: -2, // negative = gain time
    healthEffect: 0,
    weight: 2,
  },
  {
    id: 'bard-performance',
    name: 'Street Bard',
    description: 'A talented bard performs a beautiful song as you pass. He\'s actually good, which is suspicious for a street bard.',
    goldEffect: 0,
    happinessEffect: 5,
    timeCost: 1,
    healthEffect: 0,
    weight: 3,
  },

  // === Negative Events ===
  {
    id: 'pickpocket',
    name: 'Pickpocket!',
    description: 'A nimble thief bumps into you, says "excuse me" politely, and steals your gold. Manners maketh the pickpocket.',
    goldEffect: -20,
    happinessEffect: -3,
    timeCost: 0,
    healthEffect: 0,
    weight: 2,
  },
  {
    id: 'muddy-road',
    name: 'Muddy Road',
    description: 'The road is flooded with mud. You slip spectacularly. A child gives you a score of 3 out of 10.',
    goldEffect: 0,
    happinessEffect: -2,
    timeCost: 1,
    healthEffect: -5,
    weight: 2,
  },
  {
    id: 'lost-way',
    name: 'Took a Wrong Turn',
    description: 'You got confused by the winding streets. In your defense, whoever planned this city was either drunk or a minotaur.',
    goldEffect: 0,
    happinessEffect: -1,
    timeCost: 2,
    healthEffect: 0,
    weight: 2,
  },
  {
    id: 'stray-dog',
    name: 'Aggressive Stray Dog',
    description: 'A stray dog chases you through the streets! It wasn\'t even a big dog. You will never speak of this.',
    goldEffect: 0,
    happinessEffect: -2,
    timeCost: 1,
    healthEffect: -3,
    weight: 1,
  },

  // === Mixed Events ===
  {
    id: 'injured-traveler',
    name: 'Injured Traveler',
    description: 'You help an injured traveler. They thank you with a small reward and a life story you didn\'t ask for.',
    goldEffect: 10,
    happinessEffect: 4,
    timeCost: 2,
    healthEffect: 0,
    weight: 2,
  },
  {
    id: 'old-map',
    name: 'Old Map Fragment',
    description: 'You find a torn map fragment leading to hidden coins! X marks the spot. For once, X was telling the truth.',
    goldEffect: 25,
    happinessEffect: 3,
    timeCost: 3,
    healthEffect: 0,
    weight: 1,
  },
];

/** Chance of a travel event occurring (per trip of 3+ steps) */
export const TRAVEL_EVENT_CHANCE = 0.10;

/** Minimum steps traveled to trigger an event */
export const MIN_STEPS_FOR_EVENT = 3;

/**
 * Roll for a travel event. Returns the event or null if no event.
 * Only triggers on trips of 3+ steps with 10% chance.
 */
export function rollTravelEvent(stepsTraveled: number): TravelEvent | null {
  if (stepsTraveled < MIN_STEPS_FOR_EVENT) return null;
  if (Math.random() > TRAVEL_EVENT_CHANCE) return null;

  // Weighted random selection
  const totalWeight = TRAVEL_EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const event of TRAVEL_EVENTS) {
    roll -= event.weight;
    if (roll <= 0) {
      // Randomize gold effects at roll time (not at definition time)
      return {
        ...event,
        goldEffect: event.id === 'found-coin-purse'
          ? 15 + Math.floor(Math.random() * 20)
          : event.id === 'pickpocket'
            ? -(10 + Math.floor(Math.random() * 20))
            : event.goldEffect,
      };
    }
  }

  return TRAVEL_EVENTS[0]; // Fallback
}

/**
 * Build an event message string from a travel event.
 */
export function formatTravelEvent(event: TravelEvent): string {
  const parts: string[] = [event.description];

  const effects: string[] = [];
  if (event.goldEffect > 0) effects.push(`+${event.goldEffect}g`);
  if (event.goldEffect < 0) effects.push(`${event.goldEffect}g`);
  if (event.happinessEffect > 0) effects.push(`+${event.happinessEffect} happiness`);
  if (event.happinessEffect < 0) effects.push(`${event.happinessEffect} happiness`);
  if (event.timeCost > 0) effects.push(`-${event.timeCost} hours`);
  if (event.timeCost < 0) effects.push(`+${Math.abs(event.timeCost)} hours`);
  if (event.healthEffect > 0) effects.push(`+${event.healthEffect} HP`);
  if (event.healthEffect < 0) effects.push(`${event.healthEffect} HP`);

  if (effects.length > 0) {
    parts.push(`(${effects.join(', ')})`);
  }

  return parts.join(' ');
}
