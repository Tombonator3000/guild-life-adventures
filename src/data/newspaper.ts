// Guild Life - The Guildholm Herald (Newspaper System)

import type { Job } from '@/types/game.types';
import { JOBS } from './jobs';
import { QUESTS } from './quests';

export interface NewsArticle {
  headline: string;
  content: string;
  category: 'economy' | 'jobs' | 'quests' | 'gossip' | 'events';
}

export interface Newspaper {
  week: number;
  articles: NewsArticle[];
  priceModifier: number;
  featuredJobs: string[];
  questRumors: string[];
}

// Random headlines for flavor
const GOSSIP_HEADLINES = [
  "Shadowfingers Spotted Near Noble Heights",
  "Guild Master Denies Corruption Rumors",
  "Mysterious Lights Seen Over The Academy",
  "Local Hero Saves Child From Runaway Cart",
  "Enchanter's Workshop Explosion Injures Three",
  "Tavern Brawl Leads to Forge Closure",
  "Noble Family Announces Grand Ball",
  "Strange Creature Sighted in Sewers",
  "Bank Vault Break-In Thwarted by Guards",
  "Academy Graduate Sets New Record",
];

const GOSSIP_CONTENT = [
  "Citizens are advised to keep their coin purses close and their doors locked.",
  "The Guild Council released a statement dismissing all allegations.",
  "Scholars believe it may be related to ongoing magical experiments.",
  "The adventurer refused to give their name, preferring to remain anonymous.",
  "The cause is still under investigation. No fatalities reported.",
  "Guards restored order after several hours. Damages estimated at 50 gold.",
  "Invitations are said to be highly sought after this season.",
  "Adventurers are being offered bounties for more information.",
  "The would-be thieves were apprehended and await trial.",
  "The young mage completed their studies in record time.",
];

const ECONOMY_HEADLINES_HIGH = [
  "Market Prices Surge Amid Supply Shortages",
  "Merchant Caravan Delayed - Prices Rise",
  "Economic Uncertainty Grips Guildholm",
  "Inflation Worries Local Business Owners",
];

const ECONOMY_HEADLINES_LOW = [
  "Abundant Harvest Drives Prices Down",
  "Trade Agreement Brings Cheaper Goods",
  "Market Oversupply Benefits Consumers",
  "Economic Boom Reaches All Districts",
];

const ECONOMY_HEADLINES_NORMAL = [
  "Markets Remain Stable This Week",
  "Trade Continues at Expected Rates",
  "Merchants Report Normal Activity",
  "Economy Holds Steady Amid Uncertainty",
];

export function generateNewspaper(week: number, priceModifier: number): Newspaper {
  const articles: NewsArticle[] = [];

  // Economy article based on price modifier
  let economyHeadline: string;
  let economyContent: string;
  
  if (priceModifier > 1.1) {
    economyHeadline = ECONOMY_HEADLINES_HIGH[Math.floor(Math.random() * ECONOMY_HEADLINES_HIGH.length)];
    economyContent = `Prices are currently ${Math.round((priceModifier - 1) * 100)}% higher than usual. Consider postponing major purchases if possible.`;
  } else if (priceModifier < 0.9) {
    economyHeadline = ECONOMY_HEADLINES_LOW[Math.floor(Math.random() * ECONOMY_HEADLINES_LOW.length)];
    economyContent = `Prices are currently ${Math.round((1 - priceModifier) * 100)}% lower than usual. Great time to stock up on supplies!`;
  } else {
    economyHeadline = ECONOMY_HEADLINES_NORMAL[Math.floor(Math.random() * ECONOMY_HEADLINES_NORMAL.length)];
    economyContent = `Market prices are within normal ranges this week. No significant changes expected.`;
  }

  articles.push({
    headline: economyHeadline,
    content: economyContent,
    category: 'economy',
  });

  // Jobs article
  const randomJobs = [...JOBS].sort(() => Math.random() - 0.5).slice(0, 3);
  articles.push({
    headline: "Employment Opportunities This Week",
    content: `The following positions are in high demand: ${randomJobs.map(j => j.name).join(', ')}. Visit the Guild Hall or local establishments to apply.`,
    category: 'jobs',
  });

  // Quest rumors
  const randomQuests = [...QUESTS].sort(() => Math.random() - 0.5).slice(0, 2);
  articles.push({
    headline: "Adventurer's Corner: Quest Rumors",
    content: `The Guild Hall reports increased interest in the following quests: ${randomQuests.map(q => q.name).join(' and ')}. Rewards are said to be substantial.`,
    category: 'quests',
  });

  // Random gossip
  const gossipIndex = Math.floor(Math.random() * GOSSIP_HEADLINES.length);
  articles.push({
    headline: GOSSIP_HEADLINES[gossipIndex],
    content: GOSSIP_CONTENT[gossipIndex],
    category: 'gossip',
  });

  // Week-specific events
  if (week % 4 === 0) {
    articles.push({
      headline: "Rent Due This Week!",
      content: "The Landlord's Office reminds all tenants that rent payments are due. Failure to pay may result in eviction.",
      category: 'events',
    });
  }

  if (week % 8 === 0) {
    articles.push({
      headline: "Clothing Inspection Scheduled",
      content: "Employers across Guildholm are conducting clothing inspections. Make sure your attire is in good condition!",
      category: 'events',
    });
  }

  return {
    week,
    articles,
    priceModifier,
    featuredJobs: randomJobs.map(j => j.id),
    questRumors: randomQuests.map(q => q.id),
  };
}

export const NEWSPAPER_COST = 5;
export const NEWSPAPER_TIME = 1;
