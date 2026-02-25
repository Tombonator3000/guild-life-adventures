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
  /** Variant descriptions — a random one is chosen when the event triggers */
  descriptionVariants?: string[];
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

/** Pick a random travel event description variant or fall back to the default */
export function pickTravelDescription(event: TravelEvent): string {
  if (event.descriptionVariants && event.descriptionVariants.length > 0) {
    return event.descriptionVariants[Math.floor(Math.random() * event.descriptionVariants.length)];
  }
  return event.description;
}

export const TRAVEL_EVENTS: TravelEvent[] = [
  // === Positive Events ===
  {
    id: 'found-coin-purse',
    name: 'Found Coin Purse',
    description: 'You found a coin purse dropped on the road! Someone\'s bad day is your good day. The circle of life.',
    descriptionVariants: [
      'You found a coin purse dropped on the road! Someone\'s bad day is your good day. The circle of life.',
      'A glint of gold in the gutter catches your eye. A coin purse! Finders keepers, losers weepers.',
      'Someone\'s lost purse is your found fortune. The guilt will pass. The gold won\'t.',
      'A leather pouch lies abandoned on the cobblestones. Inside: gold. Outside: your growing smile.',
      'You nearly stepped on a coin purse. Your foot\'s loss is your wallet\'s gain.',
    ],
    // M11 FIX: Use base value only — actual randomization happens in rollTravelEvent()
    goldEffect: 15,
    happinessEffect: 2,
    timeCost: 0,
    healthEffect: 0,
    weight: 3,
  },
  {
    id: 'wandering-merchant',
    name: 'Wandering Merchant',
    description: 'A friendly merchant offers you a sample of exotic herbs. You feel revitalized! Probably not drugs. Probably.',
    descriptionVariants: [
      'A friendly merchant offers you a sample of exotic herbs. You feel revitalized! Probably not drugs. Probably.',
      'A travelling herbalist gives you a free sample. You feel better immediately. Side effects may include optimism.',
      'A wandering merchant shares a healing tonic. It tastes terrible. You feel wonderful. Medicine works like that.',
      'An exotic merchant offers you a strange fruit. You eat it cautiously. Energy surges through you. Best not to ask what it was.',
    ],
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
    descriptionVariants: [
      'You discover a hidden shortcut through the alleyways. It smells terrible but saves time. Life is full of trade-offs.',
      'A narrow passage between buildings cuts your journey short. You emerge smelling questionable but hours ahead of schedule.',
      'An old woman points you to a shortcut. "Go through the laundry," she says. You arrive faster and slightly damp.',
      'You find a gap in the city walls that shaves hours off your trip. Someone should probably report that. Not you, though.',
    ],
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
    descriptionVariants: [
      'A talented bard performs a beautiful song as you pass. He\'s actually good, which is suspicious for a street bard.',
      'A street musician plays a melody so beautiful it stops you in your tracks. You toss a coin and feel genuinely happy.',
      'A bard on the corner sings a ballad about heroes. It might be about you. It\'s probably not. But it might be.',
      'The most talented street performer in Guildholm serenades you mid-walk. Your spirits soar. Your schedule suffers.',
      'A wandering minstrel plays a lute so skilfully that flowers bloom. Actually, no, but you feel like they should.',
    ],
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
    descriptionVariants: [
      'A nimble thief bumps into you, says "excuse me" politely, and steals your gold. Manners maketh the pickpocket.',
      'A child runs into you, apologises sweetly, and vanishes. So does your gold. Adorable little criminal.',
      'Someone shakes your hand enthusiastically. When they let go, so does your coin purse. Smooth operator.',
      'A "clumsy" stranger trips into you. Your gold trips out of your pocket. Choreographed, you suspect.',
      'You feel a gentle tug at your belt. By the time you look down, your purse is gone and so is the thief.',
    ],
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
    descriptionVariants: [
      'The road is flooded with mud. You slip spectacularly. A child gives you a score of 3 out of 10.',
      'A patch of mud claims your dignity and your balance. The landing was graceless. The mud was warm. Not helpful.',
      'You attempt to cross a muddy stretch of road. The mud attempts to eat your boots. The mud wins.',
      'Mud. Everywhere. Your boots are ruined, your pride is wounded, and a goat watched the whole thing. Judgmentally.',
    ],
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
    descriptionVariants: [
      'You got confused by the winding streets. In your defense, whoever planned this city was either drunk or a minotaur.',
      'A series of identical alleys leads you in circles. You\'ve seen that cat three times. It judges you more each time.',
      'You confidently took the wrong road. Confidence did not make it the right road. Confidence is not a map.',
      'Lost in the winding streets of Guildholm. Asked for directions. Received three different answers. All wrong.',
    ],
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
    descriptionVariants: [
      'A stray dog chases you through the streets! It wasn\'t even a big dog. You will never speak of this.',
      'An angry stray dog takes exception to your existence. You ran. It chased. The onlookers cheered. For the dog.',
      'A mangy hound decides you\'re today\'s entertainment. Three streets, two fences, and one bitten ankle later, you escape.',
      'Chased by a stray dog through half of Guildholm. You\'re an adventurer who fights goblins. This is embarrassing.',
    ],
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
    descriptionVariants: [
      'You help an injured traveler. They thank you with a small reward and a life story you didn\'t ask for.',
      'A hurt stranger sits by the road. You help. They pay you gold and gratitude. The gold is more useful.',
      'An injured traveler needs assistance. You provide it. They insist on thanking you. Loudly. For a long time.',
      'You bandage a stranger\'s wound. They reward you with coins and an unsolicited opinion about your life choices.',
      'A traveler with a twisted ankle asks for help. You oblige. They pay you with gold and tell you about their childhood. Thorough.',
    ],
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
    descriptionVariants: [
      'You find a torn map fragment leading to hidden coins! X marks the spot. For once, X was telling the truth.',
      'A crumpled map blows against your leg. It leads to buried coins! Not a fortune, but more than you had.',
      'An old map fragment falls from a crack in the wall. You follow it. Gold! Small treasure, big excitement.',
      'You discover a faded treasure map tucked behind a loose stone. It leads to actual treasure. Miracles happen.',
    ],
    goldEffect: 25,
    happinessEffect: 3,
    timeCost: 3,
    healthEffect: 0,
    weight: 1,
  },
];

/** Chance of a travel event occurring (per trip of 3+ steps) */
export const TRAVEL_EVENT_CHANCE = 0.05;

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
  const parts: string[] = [pickTravelDescription(event)];

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
