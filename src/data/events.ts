// Guild Life - Random Events System (Wild Willy -> Shadowfingers)

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-1 chance per trigger
  conditions?: {
    housing?: string[];
    location?: string[];
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
      happiness: -10,
      message: 'Shadowfingers picked your pocket while you slept! Lost 50 gold.',
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
      happiness: -15,
      message: 'Shadowfingers broke into your room! Lost 100 gold and valuables.',
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
      happiness: -20,
      message: 'You were robbed leaving the bank! Lost 100 gold.',
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
      happiness: -15,
      message: 'You were ambushed in the Shadow Market! Lost 75 gold.',
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
      message: 'A pickpocket got you in the crowd! Lost 25 gold.',
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
      message: 'You found a pouch of coins on the ground! Gained 30 gold.',
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
      message: 'The guild master noticed your hard work! Bonus: 50 gold.',
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
      message: 'A customer was so pleased they tipped you 15 gold!',
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
      message: 'Economic boom! Prices are favorable this week.',
    },
  },
  {
    id: 'economic-crash',
    name: 'Market Crash',
    description: 'The economy takes a hit.',
    probability: 0.08,
    effect: {
      happiness: -5,
      message: 'Market crash! Prices have increased.',
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
      message: 'Due to market conditions, your employer has reduced your wages by 20%!',
    },
  },
  {
    id: 'market-crash-layoff',
    name: 'Market Crash - Layoffs',
    description: 'Severe economic downturn leads to job cuts.',
    probability: 0.03, // 3% chance per week
    effect: {
      happiness: -20,
      message: 'The market crash has forced your employer to let you go. You have lost your job!',
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
      happiness: -5,
      message: 'Living conditions gave you a cold. Health decreased.',
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
      happiness: -10,
      message: 'Food poisoning! You should be more careful what you eat.',
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
      message: 'Your clothes got torn! Clothing condition decreased.',
    },
  },
];

export const checkForEvent = (
  housing: string,
  location: string,
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

export const checkWeeklyTheft = (housing: string, gold: number): GameEvent | null => {
  const theftEvents = RANDOM_EVENTS.filter(event =>
    event.id.includes('shadowfingers') &&
    event.conditions?.housing?.includes(housing) &&
    (!event.conditions?.minGold || gold >= event.conditions.minGold)
  );

  // Homeless players are much more vulnerable to theft (2x probability)
  const homelessMultiplier = housing === 'homeless' ? 2 : 1;

  for (const event of theftEvents) {
    if (Math.random() < event.probability * homelessMultiplier) {
      return event;
    }
  }

  return null;
};

// Jones-style market crash result
export interface MarketCrashResult {
  type: 'paycut' | 'layoff' | 'none';
  wageMultiplier?: number; // 0.8 for pay cut (20% reduction)
  message?: string;
}

// Check for market crash events affecting jobs (Jones-style)
// Only affects players who have jobs
export const checkMarketCrash = (hasJob: boolean): MarketCrashResult => {
  if (!hasJob) {
    return { type: 'none' };
  }

  // Check for layoff first (more severe, less likely)
  if (Math.random() < 0.03) { // 3% chance
    return {
      type: 'layoff',
      message: 'The market crash has forced your employer to let you go. You have lost your job!',
    };
  }

  // Check for pay cut (less severe, more likely)
  if (Math.random() < 0.05) { // 5% chance
    return {
      type: 'paycut',
      wageMultiplier: 0.8, // 20% reduction like Jones
      message: 'Due to market conditions, your employer has reduced your wages by 20%!',
    };
  }

  return { type: 'none' };
};
