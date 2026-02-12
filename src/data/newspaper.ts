// Guild Life - The Guildholm Herald (Newspaper System)

import type { Job, PlayerNewsEventData } from '@/types/game.types';
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

export function generateNewspaper(week: number, priceModifier: number, economyTrend?: number, newsEvents?: PlayerNewsEventData[]): Newspaper {
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

  // Personalized articles from player events (Jones-style: robbery, loan, crash headlines)
  if (newsEvents && newsEvents.length > 0) {
    const personalizedArticles = generatePersonalizedArticles(newsEvents as PlayerNewsEvent[]);
    // Insert personalized articles near the top (after economy, before jobs)
    articles.splice(1, 0, ...personalizedArticles);
  }

  return {
    week,
    articles,
    priceModifier,
    featuredJobs: randomJobs.map(j => j.id),
    questRumors: randomQuests.map(q => q.id),
  };
}

// ============================================================
// Personalized newspaper articles (Jones-style: player-specific headlines)
// ============================================================

export type PlayerNewsEvent =
  | { type: 'robbery'; playerName: string; goldLost: number }
  | { type: 'apartment-robbery'; playerName: string; itemsStolen: number }
  | { type: 'loan-default'; playerName: string; amountOwed: number }
  | { type: 'loan-repaid'; playerName: string }
  | { type: 'fired'; playerName: string; jobName?: string }
  | { type: 'paycut'; playerName: string; percentage: number }
  | { type: 'crash-minor' }
  | { type: 'crash-moderate' }
  | { type: 'crash-major' }
  | { type: 'starvation'; playerName: string }
  | { type: 'sickness'; playerName: string }
  | { type: 'eviction'; playerName: string }
  | { type: 'degree-earned'; playerName: string; degreeName: string }
  | { type: 'quest-completed'; playerName: string; questName: string }
  | { type: 'death'; playerName: string; wasResurrected: boolean };

const ROBBERY_HEADLINES = [
  (name: string) => `Shadowfingers Strike Again; ${name} Loses Fortune`,
  (name: string) => `${name} Robbed in Broad Daylight; Guards "Investigating"`,
  (name: string) => `Notorious Theft Ring Targets ${name}; City Watch Baffled`,
];

const APARTMENT_ROBBERY_HEADLINES = [
  (name: string) => `Break-In at ${name}'s Residence; Valuables Stolen`,
  (name: string) => `${name}'s Home Burgled While Away; Neighbors Heard Nothing`,
];

const LOAN_DEFAULT_HEADLINES = [
  (name: string) => `Bank Seizes Assets: ${name} Defaults on Loan`,
  (name: string) => `${name} in Financial Ruin; Bank Collectors Dispatched`,
];

const CRASH_HEADLINES: Record<string, string[]> = {
  minor: ['Minor Market Dip Concerns Merchants', 'Prices Slip Slightly; Traders Nervous'],
  moderate: ['Market Downturn Forces Wage Cuts Across Guildholm', 'Economic Slump Hits Workers\' Pockets'],
  major: ['MARKET CRASH: Mass Layoffs Rock Guildholm!', 'Economic Catastrophe: Businesses Close, Workers Fired'],
};

/** Generate personalized articles based on player events from the previous week */
export function generatePersonalizedArticles(events: PlayerNewsEvent[]): NewsArticle[] {
  const articles: NewsArticle[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'robbery': {
        const headlineFn = ROBBERY_HEADLINES[Math.floor(Math.random() * ROBBERY_HEADLINES.length)];
        articles.push({
          headline: headlineFn(event.playerName),
          content: `${event.playerName} was relieved of ${event.goldLost}g by persons unknown. The City Watch has opened a case file, which they intend to lose promptly.`,
          category: 'events',
        });
        break;
      }
      case 'apartment-robbery': {
        const headlineFn = APARTMENT_ROBBERY_HEADLINES[Math.floor(Math.random() * APARTMENT_ROBBERY_HEADLINES.length)];
        articles.push({
          headline: headlineFn(event.playerName),
          content: `${event.itemsStolen} item(s) were taken from ${event.playerName}'s residence. Investigators recommend "better locks, or perhaps a better neighborhood."`,
          category: 'events',
        });
        break;
      }
      case 'loan-default': {
        const headlineFn = LOAN_DEFAULT_HEADLINES[Math.floor(Math.random() * LOAN_DEFAULT_HEADLINES.length)];
        articles.push({
          headline: headlineFn(event.playerName),
          content: `Guildholm Bank has begun asset seizure proceedings against ${event.playerName}, who still owes ${event.amountOwed}g. The bank expressed "deep sympathy" while counting their recovered gold.`,
          category: 'economy',
        });
        break;
      }
      case 'loan-repaid': {
        articles.push({
          headline: `${event.playerName} Settles Debt with Guildholm Bank`,
          content: `After a prolonged period of financial obligation, ${event.playerName} has cleared their loan. The bank has sent a congratulatory note and a pamphlet for their next loan product.`,
          category: 'economy',
        });
        break;
      }
      case 'fired': {
        articles.push({
          headline: `${event.playerName} Let Go Amid Market Turmoil`,
          content: `${event.playerName} has been dismissed from their position${event.jobName ? ` as ${event.jobName}` : ''}. The employer cited "economic restructuring," a phrase that means exactly what it sounds like.`,
          category: 'jobs',
        });
        break;
      }
      case 'paycut': {
        articles.push({
          headline: `Workers Face ${event.percentage}% Pay Cuts; ${event.playerName} Among Those Affected`,
          content: `Economic pressures have forced employers to slash wages. ${event.playerName}'s income has been reduced. Employers promise the cuts are "temporary." Historians note this promise has a 0% track record.`,
          category: 'economy',
        });
        break;
      }
      case 'crash-minor':
      case 'crash-moderate':
      case 'crash-major': {
        const severity = event.type.replace('crash-', '');
        const headlines = CRASH_HEADLINES[severity] || CRASH_HEADLINES['minor'];
        articles.push({
          headline: headlines[Math.floor(Math.random() * headlines.length)],
          content: severity === 'major'
            ? 'A catastrophic market collapse has devastated Guildholm\'s economy. Businesses are closing and workers are being laid off across all sectors.'
            : severity === 'moderate'
              ? 'A significant economic downturn has forced employers across Guildholm to cut wages. Workers are advised to tighten their belts.'
              : 'A minor dip in market prices has been observed. Economists disagree on whether this is a trend or a hiccup. They always disagree.',
          category: 'economy',
        });
        break;
      }
      case 'starvation': {
        articles.push({
          headline: `${event.playerName} Found Weakened from Hunger`,
          content: `Witnesses report seeing ${event.playerName} stumbling through the streets. Local healers recommend "eating food," a solution that remains shockingly underutilized.`,
          category: 'events',
        });
        break;
      }
      case 'eviction': {
        articles.push({
          headline: `${event.playerName} Evicted; Landlord Tomas Unmoved`,
          content: `Landlord Tomas has evicted ${event.playerName} for nonpayment. "Rules are rules," he said, polishing an eviction notice with visible satisfaction.`,
          category: 'events',
        });
        break;
      }
      case 'degree-earned': {
        articles.push({
          headline: `${event.playerName} Earns ${event.degreeName}; Academy Celebrates`,
          content: `The Academy has awarded ${event.playerName} a ${event.degreeName}. Faculty described the achievement as "impressive" and "about time."`,
          category: 'events',
        });
        break;
      }
      case 'quest-completed': {
        articles.push({
          headline: `Adventurer ${event.playerName} Completes ${event.questName}`,
          content: `The Guild Hall reports that ${event.playerName} has successfully completed the "${event.questName}" quest. Rewards were distributed and drinks were had.`,
          category: 'quests',
        });
        break;
      }
      case 'death': {
        if (event.wasResurrected) {
          articles.push({
            headline: `${event.playerName} Returns from Beyond; Healers Baffled`,
            content: `In an extraordinary turn of events, ${event.playerName} has been resurrected after a fatal incident. The Graveyard priests claim it was "routine." The public disagrees.`,
            category: 'events',
          });
        } else {
          articles.push({
            headline: `Tragic Loss: ${event.playerName} Falls in Guildholm`,
            content: `The city mourns the loss of ${event.playerName}. Memorial services will be held at the Graveyard. Flowers and gold donations are welcome. Especially the gold.`,
            category: 'events',
          });
        }
        break;
      }
    }
  }

  // Limit to 3 personalized articles max (don't flood the paper)
  return articles.slice(0, 3);
}

export const NEWSPAPER_COST = 5;
export const NEWSPAPER_TIME = 1;
