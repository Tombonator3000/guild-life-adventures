// Guild Life - Random Events System (Wild Willy -> Shadowfingers)

import type { LocationId, HousingTier } from '@/types/game.types';

export interface GameEvent {
  id: string;
  name: string;
  description: string;
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
  };
}

export const RANDOM_EVENTS: GameEvent[] = [
  // Shadowfingers (Wild Willy equivalent) - theft events
  {
    id: 'shadowfingers-theft',
    name: 'Shadowfingers Strike!',
    description: 'The notorious Shadowfingers guild has targeted you.',
    probability: 0.25,
    conditions: {
      housing: ['homeless', 'slums'],
      minGold: 20,
    },
    effect: {
      gold: -50,
      happiness: -3,
      message: 'Shadowfingers picked your pocket while you slept! Lost 50 gold. They left a thank-you note. How thoughtful.',
    },
  },
  {
    id: 'shadowfingers-major-theft',
    name: 'Shadowfingers Heist!',
    description: 'A major theft by the Shadowfingers guild.',
    probability: 0.10,
    conditions: {
      housing: ['homeless', 'slums'],
      minGold: 100,
    },
    effect: {
      gold: -100,
      happiness: -5,
      message: 'Shadowfingers broke into your room! Lost 100 gold. They even made the bed on the way out. Professionals.',
    },
  },
  
  // Robbery events at specific locations (high gold triggers)
  {
    id: 'bank-robbery',
    name: 'Bank Heist!',
    description: 'Shadowfingers targeted you leaving the bank.',
    probability: 0.20,
    conditions: {
      location: ['bank'],
      minGold: 200,
    },
    effect: {
      gold: -100,
      happiness: -5,
      message: 'You were robbed leaving the bank! Lost 100 gold. The irony is not lost on anyone except your wallet.',
    },
  },
  {
    id: 'shadow-market-ambush',
    name: 'Shadow Market Ambush!',
    description: 'Thieves spotted you carrying gold.',
    probability: 0.25,
    conditions: {
      location: ['shadow-market'],
      minGold: 150,
    },
    effect: {
      gold: -75,
      happiness: -4,
      message: 'You were ambushed in the Shadow Market! Lost 75 gold. In hindsight, the "Shadow" part was a clue.',
    },
  },
  
  // Pickpocket events at shady locations
  {
    id: 'pickpocket-market',
    name: 'Pickpocket!',
    description: 'Someone lifted your coin purse.',
    probability: 0.15,
    conditions: {
      location: ['shadow-market', 'fence'],
      minGold: 10,
    },
    effect: {
      gold: -25,
      message: 'A pickpocket got you in the crowd! Lost 25 gold. Didn\'t even feel it. Impressive, really.',
    },
  },
  
  // Positive events
  {
    id: 'lucky-find',
    name: 'Lucky Find!',
    description: 'You found something valuable.',
    probability: 0.05,
    effect: {
      gold: 30,
      happiness: 5,
      message: 'You found a pouch of coins on the ground! Gained 30 gold. Finders keepers is legally binding here.',
    },
  },
  {
    id: 'guild-bonus',
    name: 'Guild Bonus',
    description: 'The guild rewards your dedication.',
    probability: 0.03,
    conditions: {
      location: ['guild-hall'],
    },
    effect: {
      gold: 50,
      happiness: 10,
      message: 'The guild master noticed your hard work! Bonus: 50 gold. A rare case of meritocracy actually working.',
    },
  },
  {
    id: 'generous-tip',
    name: 'Generous Tip',
    description: 'A satisfied customer tipped you.',
    probability: 0.10,
    effect: {
      gold: 15,
      happiness: 3,
      message: 'A customer was so pleased they tipped you 15 gold! Mark it on the calendar — this never happens.',
    },
  },
  
  // Economic events (weekly)
  {
    id: 'economic-boom',
    name: 'Economic Boom',
    description: 'The market is thriving!',
    probability: 0.10,
    effect: {
      happiness: 5,
      message: 'Economic boom! Prices are favorable this week. Nobody understands why. Economists blame the stars.',
    },
  },
  {
    id: 'economic-crash',
    name: 'Market Crash',
    description: 'The economy takes a hit.',
    probability: 0.08,
    effect: {
      happiness: -5,
      message: 'Market crash! Prices have increased. Economists blame different stars.',
    },
  },

  // Jones-style Market Crash events affecting jobs
  {
    id: 'market-crash-paycut',
    name: 'Market Crash - Pay Cut',
    description: 'Economic downturn forces employers to reduce wages.',
    probability: 0.05, // 5% chance per week
    effect: {
      happiness: -10,
      message: 'Due to market conditions, your employer has reduced your wages by 20%! They said "we\'re all in this together" while counting their gold.',
    },
  },
  {
    id: 'market-crash-layoff',
    name: 'Market Crash - Layoffs',
    description: 'Severe economic downturn leads to job cuts.',
    probability: 0.03, // 3% chance per week
    effect: {
      happiness: -20,
      message: 'The market crash has forced your employer to let you go. They called it "restructuring." You can call it "unemployment."',
    },
  },

  // Health events
  {
    id: 'illness',
    name: 'Caught a Cold',
    description: 'You have fallen ill.',
    probability: 0.05,
    conditions: {
      housing: ['homeless', 'slums'],
    },
    effect: {
      health: -15,
      happiness: -2,
      message: 'Living conditions gave you a cold. Your nose is running faster than you are. Health decreased.',
    },
  },
  {
    id: 'food-poisoning',
    name: 'Food Poisoning',
    description: 'Bad food made you sick.',
    probability: 0.08,
    conditions: {
      location: ['shadow-market', 'rusty-tankard'],
    },
    effect: {
      health: -20,
      happiness: -3,
      message: 'Food poisoning! In retrospect, the mystery meat was more mysterious than anticipated.',
    },
  },
  
  // Clothing events
  {
    id: 'clothing-torn',
    name: 'Clothing Damaged',
    description: 'Your clothes got damaged.',
    probability: 0.05,
    effect: {
      clothing: -20,
      message: 'Your clothes got torn! Fashion was never your strong suit. It\'s even less so now.',
    },
  },
];

export const checkForEvent = (
  housing: HousingTier,
  location: LocationId,
  gold: number
): GameEvent | null => {
  const eligibleEvents = RANDOM_EVENTS.filter(event => {
    // Check probability
    if (Math.random() > event.probability) return false;
    
    // Check conditions
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
  
  // Return a random eligible event
  return eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
};

export const checkWeeklyTheft = (housing: HousingTier, gold: number): GameEvent | null => {
  const theftEvents = RANDOM_EVENTS.filter(event =>
    event.id.includes('shadowfingers') &&
    event.conditions?.housing?.includes(housing) &&
    (!event.conditions?.minGold || gold >= event.conditions.minGold)
  );

  // Homeless players are more vulnerable to theft (1.5x probability, was 2x — too harsh)
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

// Determine crash severity (Jones-style 3-tier system)
// Called once per week — severity applies globally to all players
// Minor: prices drop further (no job effects)
// Moderate: 80% wage cut + price drop
// Major: fired + price drop
export const checkMarketCrash = (_hasJob: boolean): MarketCrashResult => {
  const roll = Math.random();

  // Major crash: 2% chance — layoffs (Jones: fired)
  if (roll < 0.02) {
    return {
      type: 'layoff',
      severity: 'major',
      priceDropBonus: -0.08,
      message: 'MAJOR MARKET CRASH! Mass layoffs across Guildholm. Your employer has let you go. They called it "restructuring." You can call it "unemployment."',
    };
  }

  // Moderate crash: 5% chance — pay cut to 80% (Jones: 80% wage)
  if (roll < 0.07) {
    return {
      type: 'paycut',
      severity: 'moderate',
      wageMultiplier: 0.8,
      priceDropBonus: -0.05,
      message: 'Moderate market downturn! Your employer has reduced wages by 20%. "We\'re all in this together," they said, while counting their gold.',
    };
  }

  // Minor crash: 8% chance — prices drop, no job effects
  if (roll < 0.15) {
    return {
      type: 'none',
      severity: 'minor',
      priceDropBonus: -0.03,
      message: 'Minor market dip — prices have dropped slightly across Guildholm.',
    };
  }

  return { type: 'none', severity: 'none' };
};
