// Guild Life - Random Events System (Wild Willy -> Shadowfingers)

import type { LocationId, HousingTier } from '@/types/game.types';

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  /** Variant descriptions — a random one is chosen when the event triggers */
  descriptionVariants?: string[];
  probability: number; // 0-1 chance per trigger
  conditions?: {
    housing?: HousingTier[];
    location?: LocationId[];
    minGold?: number;
    maxGold?: number;
  };
  effect: {
    gold?: number;
    health?: number;
    happiness?: number;
    clothing?: number;
    message: string;
    /** Variant messages — a random one is chosen when the event triggers */
    messageVariants?: string[];
  };
}

/** Pick a random variant or fall back to the default */
export function pickEventDescription(event: GameEvent): string {
  if (event.descriptionVariants && event.descriptionVariants.length > 0) {
    return event.descriptionVariants[Math.floor(Math.random() * event.descriptionVariants.length)];
  }
  return event.description;
}

/** Pick a random message variant or fall back to the default */
export function pickEventMessage(event: GameEvent): string {
  if (event.effect.messageVariants && event.effect.messageVariants.length > 0) {
    return event.effect.messageVariants[Math.floor(Math.random() * event.effect.messageVariants.length)];
  }
  return event.effect.message;
}

export const RANDOM_EVENTS: GameEvent[] = [
  // Shadowfingers (Wild Willy equivalent) - theft events
  {
    id: 'shadowfingers-theft',
    name: 'Shadowfingers Strike!',
    description: 'The notorious Shadowfingers guild has targeted you.',
    descriptionVariants: [
      'The notorious Shadowfingers guild has targeted you.',
      'A shadow moved behind you. Your purse moved with it.',
      'The Shadowfingers send their regards. And take your gold.',
      'You felt a breeze. Then you felt your pocket. Then you felt regret.',
      'The Shadowfingers have struck again. You are the "again."',
    ],
    probability: 0.25,
    conditions: {
      housing: ['homeless', 'slums'],
      minGold: 20,
    },
    effect: {
      gold: -50,
      happiness: -3,
      message: 'Shadowfingers picked your pocket while you slept! Lost 50 gold. They left a thank-you note. How thoughtful.',
      messageVariants: [
        'Shadowfingers picked your pocket while you slept! Lost 50 gold. They left a thank-you note. How thoughtful.',
        'Lost 50 gold to the Shadowfingers. They were so quiet, even your dreams didn\'t notice.',
        'Shadowfingers relieved you of 50 gold. They left a calling card. Polite, for thieves.',
        'Your pocket is 50 gold lighter courtesy of the Shadowfingers. Their motto: "Your loss, our gain."',
        'The Shadowfingers took 50 gold while you slept. On the bright side, they didn\'t take everything. Professional courtesy.',
      ],
    },
  },
  {
    id: 'shadowfingers-major-theft',
    name: 'Shadowfingers Heist!',
    description: 'A major theft by the Shadowfingers guild.',
    descriptionVariants: [
      'A major theft by the Shadowfingers guild.',
      'The Shadowfingers pulled off an ambitious heist. You were the target.',
      'A coordinated Shadowfingers operation targeted your belongings.',
      'The Shadowfingers sent their best. You lost your worst. And also your gold.',
    ],
    probability: 0.10,
    conditions: {
      housing: ['homeless', 'slums'],
      minGold: 100,
    },
    effect: {
      gold: -100,
      happiness: -5,
      message: 'Shadowfingers broke into your room! Lost 100 gold. They even made the bed on the way out. Professionals.',
      messageVariants: [
        'Shadowfingers broke into your room! Lost 100 gold. They even made the bed on the way out. Professionals.',
        'A bold Shadowfingers heist cost you 100 gold. They left the room tidier than they found it. Insulting.',
        'Lost 100 gold in a Shadowfingers raid. They took the gold and left a receipt. Itemised. The audacity.',
        'The Shadowfingers hit you for 100 gold. They operated with surgical precision. And took your lunch.',
      ],
    },
  },
  
  // Robbery events at specific locations (high gold triggers)
  {
    id: 'bank-robbery',
    name: 'Bank Heist!',
    description: 'Shadowfingers targeted you leaving the bank.',
    descriptionVariants: [
      'Shadowfingers targeted you leaving the bank.',
      'Someone was watching the bank doors. Someone with quick hands.',
      'Leaving the bank with gold is an invitation. The Shadowfingers accepted.',
    ],
    probability: 0.20,
    conditions: {
      location: ['bank'],
      minGold: 200,
    },
    effect: {
      gold: -100,
      happiness: -5,
      message: 'You were robbed leaving the bank! Lost 100 gold. The irony is not lost on anyone except your wallet.',
      messageVariants: [
        'You were robbed leaving the bank! Lost 100 gold. The irony is not lost on anyone except your wallet.',
        'Thieves hit you outside the bank. Lost 100 gold. The bank suggested "keeping it in the vault next time." Thanks.',
        'Robbed right outside the bank! 100 gold gone. Björn was on break. Of course Björn was on break.',
        'Lost 100 gold to bandits near the bank. They waited until you were outside bank security. Strategic thieves.',
      ],
    },
  },
  {
    id: 'shadow-market-ambush',
    name: 'Shadow Market Ambush!',
    description: 'Thieves spotted you carrying gold.',
    descriptionVariants: [
      'Thieves spotted you carrying gold.',
      'The Shadow Market is called that for a reason. The shadows noticed you.',
      'A dark alley, a heavy purse, and someone with quick hands. Classic combination.',
    ],
    probability: 0.25,
    conditions: {
      location: ['shadow-market'],
      minGold: 150,
    },
    effect: {
      gold: -75,
      happiness: -4,
      message: 'You were ambushed in the Shadow Market! Lost 75 gold. In hindsight, the "Shadow" part was a clue.',
      messageVariants: [
        'You were ambushed in the Shadow Market! Lost 75 gold. In hindsight, the "Shadow" part was a clue.',
        'Shadow Market thugs relieved you of 75 gold. The vendor who saw it happen charged you 5 gold for "witnessing services."',
        'Lost 75 gold to an ambush in the Shadow Market. Nobody saw anything. Nobody ever sees anything. Very consistent.',
        'Ambushed for 75 gold in the Shadow Market. The thieves blended back into the crowd instantly. Good camouflage.',
      ],
    },
  },

  // Pickpocket events at shady locations
  {
    id: 'pickpocket-market',
    name: 'Pickpocket!',
    description: 'Someone lifted your coin purse.',
    descriptionVariants: [
      'Someone lifted your coin purse.',
      'Nimble fingers found your pocket in the crowd.',
      'A bump, an apology, and an empty pocket. Classic pickpocket.',
    ],
    probability: 0.15,
    conditions: {
      location: ['shadow-market', 'fence'],
      minGold: 10,
    },
    effect: {
      gold: -25,
      message: 'A pickpocket got you in the crowd! Lost 25 gold. Didn\'t even feel it. Impressive, really.',
      messageVariants: [
        'A pickpocket got you in the crowd! Lost 25 gold. Didn\'t even feel it. Impressive, really.',
        'Someone bumped into you and apologised. Your purse is 25 gold lighter. The apology was sincere, at least.',
        'Lost 25 gold to a pickpocket. They said "excuse me" first. Manners cost nothing. Your gold, however, costs 25.',
        'A skilled thief lifted 25 gold from your person. You have to admire the craftsmanship. Reluctantly.',
      ],
    },
  },
  
  // Positive events
  {
    id: 'lucky-find',
    name: 'Lucky Find!',
    description: 'You found something valuable.',
    descriptionVariants: [
      'You found something valuable.',
      'Something shiny caught your eye on the ground.',
      'Luck smiled upon you today. With gold teeth.',
      'The universe decided to be generous. Briefly.',
    ],
    probability: 0.05,
    effect: {
      gold: 30,
      happiness: 5,
      message: 'You found a pouch of coins on the ground! Gained 30 gold. Finders keepers is legally binding here.',
      messageVariants: [
        'You found a pouch of coins on the ground! Gained 30 gold. Finders keepers is legally binding here.',
        'A coin purse lay abandoned on the cobblestones. 30 gold richer! Someone\'s terrible day is your excellent day.',
        'Found 30 gold tucked behind a loose brick. Nobody saw. Nobody needs to know. It\'s yours now.',
        'Stumbled upon a hidden coin pouch worth 30 gold. The universe occasionally compensates for all the other things.',
        'Discovered 30 gold in a gutter. One person\'s gutter is another person\'s savings account.',
      ],
    },
  },
  {
    id: 'guild-bonus',
    name: 'Guild Bonus',
    description: 'The guild rewards your dedication.',
    descriptionVariants: [
      'The guild rewards your dedication.',
      'Your efforts have been noticed at the guild.',
      'The guild master is in a generous mood today.',
      'Hard work pays off. Literally, this time.',
    ],
    probability: 0.03,
    conditions: {
      location: ['guild-hall'],
    },
    effect: {
      gold: 50,
      happiness: 10,
      message: 'The guild master noticed your hard work! Bonus: 50 gold. A rare case of meritocracy actually working.',
      messageVariants: [
        'The guild master noticed your hard work! Bonus: 50 gold. A rare case of meritocracy actually working.',
        'The guild awarded you a 50 gold bonus for outstanding service! Enjoy it. This won\'t become a habit.',
        'Your dedication has earned a 50 gold guild bonus. The guild master smiled. That alone is worth celebrating.',
        'A guild bonus of 50 gold! Your reputation is growing. So is your bank balance, for once.',
      ],
    },
  },
  {
    id: 'generous-tip',
    name: 'Generous Tip',
    description: 'A satisfied customer tipped you.',
    descriptionVariants: [
      'A satisfied customer tipped you.',
      'Someone appreciated your work enough to pay extra.',
      'Good service was rewarded with gold. What a concept.',
      'A grateful customer reached into their pocket. For once, not to check if they\'d been robbed.',
    ],
    probability: 0.10,
    effect: {
      gold: 15,
      happiness: 3,
      message: 'A customer was so pleased they tipped you 15 gold! Mark it on the calendar — this never happens.',
      messageVariants: [
        'A customer was so pleased they tipped you 15 gold! Mark it on the calendar — this never happens.',
        'Earned a 15 gold tip! The customer said "keep up the good work." You plan to keep up the tip instead.',
        'A generous soul tipped you 15 gold. Faith in Guildholm: temporarily restored.',
        'Received a 15 gold tip! The customer winked and said "you earned it." Suspicious, but profitable.',
      ],
    },
  },

  // Economic events (weekly)
  {
    id: 'economic-boom',
    name: 'Economic Boom',
    description: 'The market is thriving!',
    descriptionVariants: [
      'The market is thriving!',
      'Trade winds blow favourably across Guildholm.',
      'The economy takes an unexpected turn for the better.',
      'Merchants are smiling. This is usually a sign of incoming prices, but not today.',
    ],
    probability: 0.10,
    effect: {
      happiness: 5,
      message: 'Economic boom! Prices are favorable this week. Nobody understands why. Economists blame the stars.',
      messageVariants: [
        'Economic boom! Prices are favorable this week. Nobody understands why. Economists blame the stars.',
        'Markets are thriving! Good news for buyers. Economists are trying to take credit. As usual.',
        'An economic upswing lifts spirits across Guildholm. Enjoy it while it lasts. It never lasts.',
        'The economy booms! Prices drop, wallets swell, and for one brief week, nobody complains about money.',
        'Market conditions are excellent. Economists have no idea why. They\'re writing papers about it.',
      ],
    },
  },
  {
    id: 'economic-crash',
    name: 'Market Crash',
    description: 'The economy takes a hit.',
    descriptionVariants: [
      'The economy takes a hit.',
      'Dark clouds gather over the market. Metaphorical ones. The real ones are optional.',
      'Economic turbulence rattles Guildholm\'s merchants.',
      'The invisible hand of the market has made a fist.',
    ],
    probability: 0.08,
    effect: {
      happiness: -5,
      message: 'Market crash! Prices have increased. Economists blame different stars.',
      messageVariants: [
        'Market crash! Prices have increased. Economists blame different stars.',
        'Markets plunge! Prices rise, spirits fall, and the bank looks smugger than usual.',
        'Economic downturn hits Guildholm. Prices climb. So does stress. Neither plans to come down soon.',
        'The market has crashed. Prices surge. Economists gathered to discuss it, then raised their consulting fees.',
        'A market crash ripples through Guildholm. The rich feel a mild inconvenience. Everyone else feels everything.',
      ],
    },
  },

  // Jones-style Market Crash events affecting jobs
  {
    id: 'market-crash-paycut',
    name: 'Market Crash - Pay Cut',
    description: 'Economic downturn forces employers to reduce wages.',
    descriptionVariants: [
      'Economic downturn forces employers to reduce wages.',
      'Your employer announces "temporary" wage adjustments.',
      'The market crash reaches your payslip. It was not invited.',
    ],
    probability: 0.05,
    effect: {
      happiness: -10,
      message: 'Due to market conditions, your employer has reduced your wages by 20%! They said "we\'re all in this together" while counting their gold.',
      messageVariants: [
        'Due to market conditions, your employer has reduced your wages by 20%! They said "we\'re all in this together" while counting their gold.',
        'Wages cut by 20%! Your employer called it "shared sacrifice." They didn\'t specify who was doing the sharing.',
        'Pay reduced by 20% due to "unprecedented market conditions." The conditions are not unprecedented. The excuse is.',
        'A 20% wage cut lands on your shoulders. Your employer expressed sympathy. Then docked 20% from the sympathy.',
      ],
    },
  },
  {
    id: 'market-crash-layoff',
    name: 'Market Crash - Layoffs',
    description: 'Severe economic downturn leads to job cuts.',
    descriptionVariants: [
      'Severe economic downturn leads to job cuts.',
      'The market crash claims jobs across Guildholm.',
      'Employers announce layoffs. The announcement was more prepared than the employees.',
    ],
    probability: 0.03,
    effect: {
      happiness: -20,
      message: 'The market crash has forced your employer to let you go. They called it "restructuring." You can call it "unemployment."',
      messageVariants: [
        'The market crash has forced your employer to let you go. They called it "restructuring." You can call it "unemployment."',
        'You\'ve been laid off. Your employer said it was "nothing personal." You said your unemployment is "very personal."',
        'Job lost to market turmoil. The exit interview lasted 30 seconds. The emotional processing will take longer.',
        'Fired due to economic downturn. Your desk was cleared before you were. Efficiency, they call it.',
      ],
    },
  },

  // Health events
  {
    id: 'illness',
    name: 'Caught a Cold',
    description: 'You have fallen ill.',
    descriptionVariants: [
      'You have fallen ill.',
      'A persistent cough and aching bones suggest you\'re unwell.',
      'Your body has filed a formal protest. In the form of illness.',
      'The Slums have shared their finest microbes with you.',
    ],
    probability: 0.05,
    conditions: {
      housing: ['homeless', 'slums'],
    },
    effect: {
      health: -15,
      happiness: -2,
      message: 'Living conditions gave you a cold. Your nose is running faster than you are. Health decreased.',
      messageVariants: [
        'Living conditions gave you a cold. Your nose is running faster than you are. Health decreased.',
        'The Slums have taken their toll. You\'re sick. The cure: better housing. The alternative: more tissues.',
        'Caught a cold from the damp conditions. Your immune system sent a strongly-worded letter to your landlord.',
        'Illness strikes! Your housing situation is partly to blame. Your body is entirely to suffer.',
        'You\'re sick. The cold, damp conditions are the cause. Noble Heights residents never catch colds. Just saying.',
      ],
    },
  },
  {
    id: 'food-poisoning',
    name: 'Food Poisoning',
    description: 'Bad food made you sick.',
    descriptionVariants: [
      'Bad food made you sick.',
      'Something you ate has declared war on your stomach.',
      'The mystery meat was hiding a secret. The secret was food poisoning.',
      'Your last meal has filed a complaint. From inside your stomach.',
    ],
    probability: 0.08,
    conditions: {
      location: ['shadow-market', 'rusty-tankard'],
    },
    effect: {
      health: -20,
      happiness: -3,
      message: 'Food poisoning! In retrospect, the mystery meat was more mysterious than anticipated.',
      messageVariants: [
        'Food poisoning! In retrospect, the mystery meat was more mysterious than anticipated.',
        'Something you ate is fighting back. Your stomach lost. Health decreased significantly.',
        'Food poisoning from questionable cuisine. The tavern says it\'s "character building." Your stomach disagrees.',
        'The meal was cheap. The food poisoning was free. You get what you pay for, and also what you don\'t.',
        'Your digestive system has staged a revolt. The food from the Shadow Market is the prime suspect.',
      ],
    },
  },

  // Clothing events
  {
    id: 'clothing-torn',
    name: 'Clothing Damaged',
    description: 'Your clothes got damaged.',
    descriptionVariants: [
      'Your clothes got damaged.',
      'An unfortunate incident has reduced your wardrobe quality.',
      'Your outfit has seen better days. Today was not one of them.',
      'A rip, a tear, and a sigh. Your clothing takes a hit.',
    ],
    probability: 0.05,
    effect: {
      clothing: -20,
      message: 'Your clothes got torn! Fashion was never your strong suit. It\'s even less so now.',
      messageVariants: [
        'Your clothes got torn! Fashion was never your strong suit. It\'s even less so now.',
        'Clothing damaged! You look like you lost a fight with a thorn bush. The bush won. Decisively.',
        'Your outfit is worse for wear. A visit to the Armory for new clothes is recommended. Urgently.',
        'Clothes torn in an unfortunate incident. Your appearance has gone from "adventurer" to "scarecrow."',
        'Your garments are damaged. The dress code for your job has opinions about this. None of them good.',
      ],
    },
  },
];

export const checkForEvent = (
  housing: HousingTier,
  location: LocationId,
  gold: number
): GameEvent | null => {
  // Gate check: only 20% chance of any event triggering at all per move.
  // This makes events feel rare and special rather than constant.
  if (Math.random() > 0.20) return null;

  // Filter events by conditions only (no probability roll yet)
  const eligibleEvents = RANDOM_EVENTS.filter(event => {
    if (event.conditions) {
      if (event.conditions.housing && !event.conditions.housing.includes(housing)) {
        return false;
      }
      if (event.conditions.location && !event.conditions.location.includes(location)) {
        return false;
      }
      if (event.conditions.minGold && gold < event.conditions.minGold) {
        return false;
      }
      if (event.conditions.maxGold && gold > event.conditions.maxGold) {
        return false;
      }
    }
    return true;
  });

  if (eligibleEvents.length === 0) return null;

  // Pick one random eligible event, then roll its probability
  const chosen = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
  if (Math.random() > chosen.probability) return null;

  return chosen;
};

export const checkWeeklyTheft = (housing: HousingTier, gold: number): GameEvent | null => {
  // Gate check: only 30% chance of even checking for theft each week.
  // Combined with individual event probability, makes theft occasional rather than constant.
  if (Math.random() > 0.30) return null;

  const theftEvents = RANDOM_EVENTS.filter(event =>
    event.id.includes('shadowfingers') &&
    event.conditions?.housing?.includes(housing) &&
    (!event.conditions?.minGold || gold >= event.conditions.minGold)
  );

  // Homeless players are more vulnerable to theft (1.5x probability)
  const homelessMultiplier = housing === 'homeless' ? 1.5 : 1;

  for (const event of theftEvents) {
    if (Math.random() < event.probability * homelessMultiplier) {
      return event;
    }
  }

  return null;
};

// Jones-style 3-tier market crash severity
export type CrashSeverity = 'none' | 'minor' | 'moderate' | 'major';

// Jones-style market crash result
export interface MarketCrashResult {
  type: 'paycut' | 'layoff' | 'none';
  severity: CrashSeverity;
  wageMultiplier?: number; // 0.8 for moderate pay cut (20% reduction)
  priceDropBonus?: number; // Additional price drop for minor+ crashes
  message?: string;
}

// Jones-style 3-tier crash system — probability thresholds are cumulative
// Minor: prices drop further (no job effects)
// Moderate: 80% wage cut + price drop
// Major: fired + price drop
const CRASH_TIERS: { threshold: number; result: MarketCrashResult }[] = [
  {
    threshold: 0.02, // 2% chance
    result: {
      type: 'layoff', severity: 'major', priceDropBonus: -0.08,
      message: 'MAJOR MARKET CRASH! Mass layoffs across Guildholm. Your employer has let you go. They called it "restructuring." You can call it "unemployment."',
    },
  },
  {
    threshold: 0.07, // 5% chance (cumulative 7%)
    result: {
      type: 'paycut', severity: 'moderate', wageMultiplier: 0.8, priceDropBonus: -0.05,
      message: 'Moderate market downturn! Your employer has reduced wages by 20%. "We\'re all in this together," they said, while counting their gold.',
    },
  },
  {
    threshold: 0.15, // 8% chance (cumulative 15%)
    result: {
      type: 'none', severity: 'minor', priceDropBonus: -0.03,
      message: 'Minor market dip — prices have dropped slightly across Guildholm.',
    },
  },
];

// Called once per week — severity applies globally to all players
export const checkMarketCrash = (_hasJob: boolean): MarketCrashResult => {
  const roll = Math.random();
  return CRASH_TIERS.find(tier => roll < tier.threshold)?.result ?? { type: 'none', severity: 'none' };
};
