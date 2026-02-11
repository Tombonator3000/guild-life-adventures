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
  "Shadowfingers Spotted Near Noble Heights; Claims He Was 'Just Browsing'",
  "Guild Master Denies Corruption Rumors, Deposits Large Sum in Bank",
  "Mysterious Lights Over Academy Blamed on 'Unsupervised Students'",
  "Local Hero Saves Child From Runaway Cart; Demands Medal, Gets Sandwich",
  "Enchanter's Workshop Explodes Again; Neighbors 'No Longer Surprised'",
  "Tavern Brawl Leads to Forge Closure; Smith Blames 'Philosophical Disagreement'",
  "Noble Family Announces Grand Ball; Commoners Announce Grand Eye-Roll",
  "Strange Creature in Sewers Turns Out to Be Lost Accounting Student",
  "Bank Vault Break-In Thwarted by Guards and One Very Angry Dwarf",
  "Academy Graduate Sets New Record for Most Explosions in Final Exam",
];

const GOSSIP_CONTENT = [
  "Citizens are advised to keep their coin purses close, their doors locked, and their expectations low.",
  "The Guild Council released a statement dismissing all allegations. The statement was suspiciously well-funded.",
  "Scholars believe it may be related to ongoing magical experiments. They always say that. It's always true.",
  "The adventurer refused to give their name, preferring to remain anonymous. And humble. Mostly anonymous.",
  "The cause is still under investigation. As is the cause of the investigation. It's investigations all the way down.",
  "Guards restored order after several hours and one very large net. Damages estimated at 50 gold and two egos.",
  "Invitations are said to be highly sought after. Alternative invitations to 'not attend' are freely available.",
  "Adventurers are being offered bounties for more information. So far, all information received has been wrong.",
  "The would-be thieves were apprehended and await trial. Their defense: 'The vault door was open.' It was not.",
  "The young mage completed their studies in record time. Also set a record for property damage. Unrelated, allegedly.",
];

const ECONOMY_HEADLINES_HIGH = [
  "Market Prices Surge; Everyone Blames Everyone Else",
  "Merchant Caravan Delayed by 'Unexpected Dragon'; Prices Rise",
  "Economic Uncertainty Grips Guildholm; Certainty Spotted Fleeing South",
  "Inflation Worries Local Business Owners; Gold Worth Less, Costs More, Nobody Understands",
];

const ECONOMY_HEADLINES_LOW = [
  "Abundant Harvest Drives Prices Down; Farmers Unsure Whether to Celebrate or Panic",
  "Trade Agreement Brings Cheaper Goods; Merchants Grumble Photogenically",
  "Market Oversupply Benefits Consumers; Merchants Discover Concept of 'Too Much Cheese'",
  "Economic Boom Reaches All Districts; Economists Baffled, Take Credit Anyway",
];

const ECONOMY_HEADLINES_NORMAL = [
  "Markets Remain Stable This Week; Journalists Struggle for Headlines",
  "Trade Continues at Expected Rates; Nothing to Report, Report Filed Anyway",
  "Merchants Report Normal Activity; Normalcy Itself Considered Newsworthy",
  "Economy Holds Steady; Economists Disappointed by Lack of Drama",
];

export function generateNewspaper(week: number, priceModifier: number, economyTrend?: number): Newspaper {
  const articles: NewsArticle[] = [];

  // Economy article based on price modifier and trend
  let economyHeadline: string;
  let economyContent: string;
  const trend = economyTrend ?? 0;
  const trendText = trend === 1 ? ' Economists expect continued growth.' : trend === -1 ? ' Experts warn of further decline.' : '';

  if (priceModifier > 1.1) {
    economyHeadline = ECONOMY_HEADLINES_HIGH[Math.floor(Math.random() * ECONOMY_HEADLINES_HIGH.length)];
    economyContent = `Prices are currently ${Math.round((priceModifier - 1) * 100)}% higher than usual. Consider postponing major purchases if possible.${trendText}`;
  } else if (priceModifier < 0.9) {
    economyHeadline = ECONOMY_HEADLINES_LOW[Math.floor(Math.random() * ECONOMY_HEADLINES_LOW.length)];
    economyContent = `Prices are currently ${Math.round((1 - priceModifier) * 100)}% lower than usual. Great time to stock up on supplies!${trendText}`;
  } else {
    economyHeadline = ECONOMY_HEADLINES_NORMAL[Math.floor(Math.random() * ECONOMY_HEADLINES_NORMAL.length)];
    economyContent = `Market prices are within normal ranges this week.${trendText || ' No significant changes expected.'}`;
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
      content: "The Landlord's Office reminds all tenants that rent payments are due. Tomas has been sharpening his eviction notices with alarming enthusiasm.",
      category: 'events',
    });
  }

  if (week % 8 === 0) {
    articles.push({
      headline: "Clothing Inspection Scheduled",
      content: "Employers across Guildholm are conducting clothing inspections. If you can see daylight through your trousers, it's time to visit the Armory.",
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
