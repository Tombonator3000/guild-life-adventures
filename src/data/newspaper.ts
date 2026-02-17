// Guild Life - The Guildholm Herald (Newspaper System)

import type { PlayerNewsEventData } from '@/types/game.types';
import { ALL_JOBS } from './jobs';
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
  "Mysterious Fog Rolls In; Enchanter Denies Involvement, Looks Guilty",
  "City Watch Launches Investigation Into Itself; Finds Nothing Wrong",
  "Stray Cat Elected Honorary Guild Member; Attendance Better Than Most",
  "Tavern Introduces New Menu Item; Nobody Can Identify It",
  "Academy Library Book Returns Itself; Librarian 'Deeply Unsettled'",
  "Forge Apprentice Creates Sword That Won't Stop Glowing; Enchanter Unavailable for Comment",
  "Noble Heights Resident Complains About Birdsong; Files Formal Grievance",
  "Graveyard Caretaker Reports Declining Occupancy; 'Resurrections Ruining the Market'",
  "Street Bard Banned From Three Districts; Appeal Expected to Be Musical",
  "Shadow Market Vendor Wins 'Most Honest Merchant' Award Ironically",
  "Dragon Spotted Over Mountains; City Watch Says 'Not Our Jurisdiction'",
  "Landlord Tomas Named 'Most Feared Man in Guildholm' for Third Year Running",
  "Bank Introduces New Savings Product; Nobody Understands It, Including the Bank",
  "Goblin Delegation Requests Trade Agreement; Guild Master 'Considering It'",
  "Enchanted Broom Escapes Workshop; Last Seen Sweeping Through Market District",
  "Annual Rat Census Reveals Population Growth; Extermination Quests Expected to Surge",
  "Local Wizard Accidentally Creates New Colour; Nobody Can Agree What It Looks Like",
  "Fence Operator Denies Being a Fence; Claims Title Is 'Redistribution Specialist'",
  "Tavern Ghost Demands Better Ale; Threatens to Haunt Competitor Instead",
  "Academy Dean Publishes Paper on 'Why Everything Explodes'; Peer Review Explodes",
  "Guard Captain Falls Asleep on Duty; Crime Rate Unchanged",
  "Mysterious Hole Appears in Town Square; Committee Formed to Study It",
  "Renowned Adventurer Retires; Opens Bakery; Bakery More Dangerous Than Expected",
  "Forge Workers Demand Better Ventilation; Smith Says 'Breathing Is Optional'",
  "Noble Heights Garden Party Disrupted by 'Extremely Large Hedgehog'",
  "Academy Student Discovers Perpetual Motion Machine; Machine Disagrees",
  "Shadow Market Prices Drop; Legitimate Merchants Concerned and Confused",
  "City Fountain Turned Into Soup By Unknown Prankster; Soup Was Decent",
  "Guild Hall Notice Board Collapses Under Weight of Unpaid Quests",
  "Enchanter's Cat Found Speaking Common; Denies Everything",
  "Local Farm Reports Crop Circles; Farmers Blame 'Drunk Wizards, Again'",
  "Bank Error in Customer's Favour; Bank Denies Error; Customer Flees City",
  "Tavern Singing Contest Won By Person Who Cannot Sing; Judges 'Also Cannot Judge'",
  "Blacksmith and Enchanter in Heated Rivalry; Literally Heated, Forge Involved",
  "Slums Resident Finds Gold Under Floorboards; Landlord Claims It; Everyone Argues",
  "Academy Mascot (A Sentient Book) Goes Missing; 'Probably Studying,' Says Dean",
  "City Watch Introduces New Uniforms; Guards Complain They're 'Not Flattering'",
  "Merchant Caravan Arrives With Exotic Goods; Nobody Can Pronounce Any of Them",
  "Graveyard Ghost Starts Support Group for Recently Deceased; Attendance Strong",
  "Festival Committee Announces Next Theme: 'We Survived Another Quarter'",
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
  "The enchanter insists the explosion was 'within acceptable parameters.' The parameters were not consulted.",
  "Witnesses described the event as 'unprecedented.' This is the fourth time they've used that word this month.",
  "The City Watch has opened an investigation. They've also opened a betting pool on its outcome. Professionalism.",
  "Sources close to the situation describe it as 'manageable.' Sources further away describe it as 'a disaster.'",
  "The Guild issued a formal apology. The apology was two sentences long. The incident report was forty pages.",
  "Local experts were consulted. They disagreed with each other. This is why they're called experts.",
  "The perpetrator remains at large. Also at lunch. The City Watch checked the tavern. He waved.",
  "Residents are advised to remain calm. This advice has never once resulted in calm. Tradition is important.",
  "The economic impact is estimated at 200 gold. The emotional impact is estimated at 'considerable.'",
  "An emergency meeting was called. It was poorly attended. The minutes read: 'Nobody showed up. Meeting adjourned.'",
  "The festival was described as 'a roaring success' by the organiser and 'a rolling disaster' by everyone else.",
  "Authorities assure the public that everything is under control. The public remains unconvinced. Rightly.",
  "A petition has been started. It has three signatures. Two are from the same person. The third is a cat.",
  "The investigation concluded that nobody was at fault. Everyone was at fault. The report contradicts itself. Officially.",
  "Damage assessment is ongoing. Early estimates suggest 'a lot.' Technical estimates suggest 'even more than a lot.'",
  "The committee has recommended 'further study.' This is the committee's recommendation for all things, including lunch.",
  "Eyewitnesses confirm the story. Other eyewitnesses deny it. A third group of eyewitnesses saw something else entirely.",
  "The situation has been described as 'fluid.' In that nobody knows what's happening and everything is moving.",
  "Community leaders expressed concern. Then they expressed hunger. Then they went to the tavern. Leadership in action.",
  "An anonymous tip led to the discovery. The tip was anonymously wrong. The discovery was accidentally right.",
  "The affected parties have been compensated. With apologies. The apologies are non-transferable and worth nothing.",
  "The Guard Captain described the incident as 'routine.' His guards described it as 'terrifying.' Perspective varies with rank.",
  "A memorial service will be held next week. Attendance is optional. Bringing flowers is encouraged. Bringing weapons is not.",
  "The Academy has offered to study the phenomenon. The last thing they studied exploded. Offer declined.",
  "Follow-up reporting has been challenging. Mostly because nobody wants to talk about it. Also nobody remembers it clearly.",
  "The incident has prompted calls for reform. The calls were ignored. This is also traditional.",
  "Property values in the area have fluctuated. Upward for those who enjoy excitement. Downward for everyone else.",
  "Neighboring towns have expressed sympathy. And relief that it didn't happen to them. Mostly relief.",
  "The official response was swift, decisive, and completely ineffective. A textbook performance.",
  "Sources indicate more developments are expected. Sources also indicate this is what sources always say.",
];

const ECONOMY_HEADLINES_HIGH = [
  "Market Prices Surge; Everyone Blames Everyone Else",
  "Merchant Caravan Delayed by 'Unexpected Dragon'; Prices Rise",
  "Economic Uncertainty Grips Guildholm; Certainty Spotted Fleeing South",
  "Inflation Worries Local Business Owners; Gold Worth Less, Costs More, Nobody Understands",
  "Supply Chain Disruption Hits Guildholm; Disruption Blamed on 'Everything'",
  "Price Hikes Force Adventurers to Consider Budgeting; Concept Proves Challenging",
  "Cost of Living Rises Again; Cost of Not Living Remains Free",
  "Market Speculation Drives Prices Up; Speculation Also Drives Merchants Mad",
  "Trade Route Bandits Cause Price Spike; Bandits Unaware of Economic Impact",
  "Shopkeepers Raise Prices, Lower Standards; Customers Notice Both",
  "Gold Coins Worth Less Than Last Month; Still Worth More Than Iron Coins, Somehow",
  "General Store Reports Record Prices; Record Complaints Also Filed",
  "Merchant Guild Blames Weather for High Prices; Weather Blames Merchants",
  "Food Prices Climb Steeply; Adventurers Consider Growing Their Own; Fail",
  "Economic Advisors Recommend 'Spending Less'; Public Recommends 'Advising Less'",
  "Market Bubble Forms; Economists Debate Whether to Pop It or Decorate It",
  "Prices Peak for Third Consecutive Week; Wallets Empty for Same Duration",
];

const ECONOMY_HEADLINES_LOW = [
  "Abundant Harvest Drives Prices Down; Farmers Unsure Whether to Celebrate or Panic",
  "Trade Agreement Brings Cheaper Goods; Merchants Grumble Photogenically",
  "Market Oversupply Benefits Consumers; Merchants Discover Concept of 'Too Much Cheese'",
  "Economic Boom Reaches All Districts; Economists Baffled, Take Credit Anyway",
  "Bargain Prices Across Guildholm; General Store Practically Giving Things Away (Not Actually)",
  "Surplus Goods Flood Market; Shadow Market Announces 'Everything on Sale' (It Already Was)",
  "Price Wars Erupt Between Merchants; Consumers Win for Once",
  "Food Prices Drop to Historic Lows; Quality Described as 'Corresponding'",
  "New Trade Route Opens; Prices Fall; Merchants Complain About Falling Prices",
  "Market Competition Benefits All; Economists Shocked That Their Models Worked",
  "Cheap Goods Attract Visitors From Neighboring Towns; Also Attract Their Opinions",
  "Inventory Clearance Sale at General Store; Owner Seen Weeping Into Ledger",
  "Record Low Prices Mean Record High Savings; Bank Celebrates Quietly",
  "Merchant Caravans Arrive in Force; Market Stalls Overflow; Pickpockets Rejoice",
  "Prices So Low Even the Fence Is Buying Retail; Trust in Economics Shaken",
  "Budget-Friendly Week Expected; Financial Advisors Recommend 'Buying Everything'",
  "Deflation Concerns Rise as Prices Fall; Irony Noted by Exactly One Person",
];

const ECONOMY_HEADLINES_NORMAL = [
  "Markets Remain Stable This Week; Journalists Struggle for Headlines",
  "Trade Continues at Expected Rates; Nothing to Report, Report Filed Anyway",
  "Merchants Report Normal Activity; Normalcy Itself Considered Newsworthy",
  "Economy Holds Steady; Economists Disappointed by Lack of Drama",
  "Prices Unchanged from Last Week; Merchant Admits 'We're as Surprised as You'",
  "Market Index Flat; Financial Page Unusually Short This Week",
  "No Major Economic Events This Week; Headline Writers on Holiday",
  "Trade Routes Operating Normally; Bandits Also Operating Normally",
  "General Store Reports 'Average Week'; Owner Unsure Whether to Celebrate",
  "Economic Indicators Indicate Nothing of Interest; Indicators Working as Intended",
  "Market Steady As Goes; Economists Publish Paper on 'Why Stability Is Boring'",
  "Prices Stable Across All Districts; Citizens Enjoy Brief Period of Not Complaining",
  "Commerce Proceeds Without Incident; Incident Department Stands Down",
  "Supply Meets Demand; Both Seem Pleased With the Arrangement",
  "Financial Quarter Ends Unremarkably; Accountants Rejoice in Their Own Quiet Way",
  "No News Is Good News; Bank Releases Statement Confirming It Has No Statement",
  "Economic Calm Continues; Forecasters Predict It Won't Last; It Usually Doesn't",
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
  const randomJobs = [...ALL_JOBS].sort(() => Math.random() - 0.5).slice(0, 3);
  const jobHeadlines = [
    "Employment Opportunities This Week",
    "Guild Hall Posts New Job Listings",
    "Help Wanted: Positions Open Across Guildholm",
    "Career Corner: This Week's Openings",
    "Looking for Work? These Positions Need Filling",
    "Employers Seeking Workers; Workers Seeking Dignity; Both in Short Supply",
    "Job Market Update: Who's Hiring This Week",
    "New Vacancies Posted at Guild Hall",
  ];
  const jobContents = [
    `The following positions are in high demand: ${randomJobs.map(j => j.name).join(', ')}. Visit the Guild Hall or local establishments to apply.`,
    `Employers across Guildholm are looking for: ${randomJobs.map(j => j.name).join(', ')}. Experience preferred but not required. Breathing is required.`,
    `This week's featured openings include: ${randomJobs.map(j => j.name).join(', ')}. Apply in person at the Guild Hall. Bring your CV. And your dignity. You'll need both.`,
    `Positions available: ${randomJobs.map(j => j.name).join(', ')}. Competitive wages offered. 'Competitive' meaning 'slightly better than starvation.'`,
  ];
  articles.push({
    headline: jobHeadlines[Math.floor(Math.random() * jobHeadlines.length)],
    content: jobContents[Math.floor(Math.random() * jobContents.length)],
    category: 'jobs',
  });

  // Quest rumors
  const randomQuests = [...QUESTS].sort(() => Math.random() - 0.5).slice(0, 2);
  const questHeadlines = [
    "Adventurer's Corner: Quest Rumors",
    "Guild Board: New Quests Available",
    "Quest Watch: This Week's Adventures",
    "Glory and Gold: Quests Seeking Heroes",
    "The Notice Board: Fresh Quests Posted",
    "Quest Opportunities for the Brave (and Reckless)",
    "Adventure Awaits: Guild Hall Posts New Quests",
    "Questing Season: Opportunities for All Ranks",
  ];
  const questContents = [
    `The Guild Hall reports increased interest in the following quests: ${randomQuests.map(q => q.name).join(' and ')}. Rewards are said to be substantial.`,
    `New quests posted this week include ${randomQuests.map(q => q.name).join(' and ')}. The Guild Master recommends 'adequate preparation.' We recommend 'not dying.'`,
    `${randomQuests.map(q => q.name).join(' and ')} are among the week's available quests. Gold rewards await those who succeed. Tombstones await those who don't.`,
    `This week's quest board features ${randomQuests.map(q => q.name).join(' and ')}. Aspiring heroes should apply at the Guild Hall with appropriate equipment and optimism.`,
  ];
  articles.push({
    headline: questHeadlines[Math.floor(Math.random() * questHeadlines.length)],
    content: questContents[Math.floor(Math.random() * questContents.length)],
    category: 'quests',
  });

  // Random gossip
  const gossipIndex = Math.floor(Math.random() * GOSSIP_HEADLINES.length);
  const contentIndex = Math.floor(Math.random() * GOSSIP_CONTENT.length);
  articles.push({
    headline: GOSSIP_HEADLINES[gossipIndex],
    content: GOSSIP_CONTENT[contentIndex],
    category: 'gossip',
  });

  // Week-specific events
  if (week % 4 === 0) {
    const rentHeadlines = [
      "Rent Due This Week!",
      "Landlord Tomas Sharpens Quill; Rent Day Approaches",
      "Quarterly Rent Notice: Pay or Face the Dwarf",
      "Rent Week: Tomas Reminds Tenants He 'Doesn't Do Extensions'",
      "Housing Payments Due; Eviction Dwarf Stretches Preparedly",
    ];
    const rentContent = [
      "The Landlord's Office reminds all tenants that rent payments are due. Tomas has been sharpening his eviction notices with alarming enthusiasm.",
      "Rent day is upon us. Landlord Tomas has been seen polishing the eviction paperwork. His smile suggests he hopes some of you have forgotten.",
      "All tenants are reminded that rent must be paid on time. Late fees apply. Very late fees apply more. The eviction dwarf applies most of all.",
      "Tomas's quarterly rent notice has been posted. It reads simply: 'Pay.' Brevity is the soul of intimidation.",
    ];
    articles.push({
      headline: rentHeadlines[Math.floor(Math.random() * rentHeadlines.length)],
      content: rentContent[Math.floor(Math.random() * rentContent.length)],
      category: 'events',
    });
  }

  if (week % 8 === 0) {
    const clothingHeadlines = [
      "Clothing Inspection Scheduled",
      "Dress Code Reminder Issued by Employers' Guild",
      "Clothing Standards Check: Are You Properly Dressed?",
      "Weekly Fashion Police: Employers Check Attire",
      "Wardrobe Warning: Clothing Quality Inspections This Week",
    ];
    const clothingContent = [
      "Employers across Guildholm are conducting clothing inspections. If you can see daylight through your trousers, it's time to visit the Armory.",
      "Clothing standards must be maintained for employment. Peasant rags won't get you far. Noble attire opens doors. Being naked closes them.",
      "This week's clothing inspection is a reminder that appearance matters. The Armory stocks all tiers. Your dignity is sold separately.",
      "Employers are checking dress codes this week. Pro tip: if your clothes have more patches than fabric, you may need an upgrade.",
    ];
    articles.push({
      headline: clothingHeadlines[Math.floor(Math.random() * clothingHeadlines.length)],
      content: clothingContent[Math.floor(Math.random() * clothingContent.length)],
      category: 'events',
    });
  }

  // Additional periodic flavor articles
  if (week % 6 === 0) {
    const flavorHeadlines = [
      "Dungeon Activity Report: Monsters 'Thriving'",
      "Cave Expedition Warnings Reissued by Guild",
      "Dungeon Safety Advisory: 'Please Stop Going In Unprepared'",
    ];
    const flavorContent = [
      "The Guild's quarterly dungeon survey reports increased monster activity across all floors. Adventurers are advised to prepare thoroughly. Or write a will. Ideally both.",
      "The Cave Authority reminds all adventurers that proper equipment is essential. Last month, three groups entered without healing potions. The statistics speak for themselves.",
      "Dungeon activity has increased this quarter. The monsters are well-fed, well-rested, and 'enthusiastic about visitors.' In a bad way.",
    ];
    articles.push({
      headline: flavorHeadlines[Math.floor(Math.random() * flavorHeadlines.length)],
      content: flavorContent[Math.floor(Math.random() * flavorContent.length)],
      category: 'events',
    });
  }

  if (week % 10 === 0) {
    const lifeHeadlines = [
      "Life in Guildholm: A Weekly Reflection",
      "Citizens' Corner: What Guildholm Is Saying",
      "Town Crier's Column: Overheard in Guildholm",
    ];
    const lifeContent = [
      "Life continues in Guildholm as it always has: with gold, quests, and the occasional explosion. The city endures. As do its residents. Mostly.",
      "Overheard at the tavern: 'I came to Guildholm for adventure. I stayed because the tavern's stew is addictive. Also I'm broke.' A common story.",
      "Guildholm remains a city of opportunity, danger, and unreasonably priced cheese. Come for the quests. Stay because you can't afford to leave.",
    ];
    articles.push({
      headline: lifeHeadlines[Math.floor(Math.random() * lifeHeadlines.length)],
      content: lifeContent[Math.floor(Math.random() * lifeContent.length)],
      category: 'gossip',
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
  (name: string) => `${name} Reports Theft; Shadowfingers Leave Polite Thank-You Note`,
  (name: string) => `Another Robbery in Guildholm; ${name} Latest Victim`,
  (name: string) => `${name} Stripped of Gold; Insurance Company Denies Claim`,
  (name: string) => `Pickpockets Target ${name} Near ${['the Bank', 'Shadow Market', 'the Slums', 'Guild Hall'][Math.floor(Math.random() * 4)]}`,
  (name: string) => `${name} Mugged; Assailants Described as 'Efficient and Courteous'`,
];

const ROBBERY_CONTENT_VARIANTS = [
  (name: string, gold: number) => `${name} was relieved of ${gold}g by persons unknown. The City Watch has opened a case file, which they intend to lose promptly.`,
  (name: string, gold: number) => `${name} lost ${gold}g to Shadowfingers operatives. The thieves left a receipt. It was itemised. Professionalism has reached new lows.`,
  (name: string, gold: number) => `The robbery of ${name} netted the thieves ${gold}g. Witnesses saw nothing, heard nothing, and know nothing. Typical Tuesday.`,
  (name: string, gold: number) => `${name} reports the loss of ${gold}g in what guards are calling 'a very well-executed theft.' High praise from law enforcement.`,
  (name: string, gold: number) => `Sources confirm ${name} was robbed of ${gold}g. The victim is said to be 'annoyed but alive.' Guildholm's motto, really.`,
];

const APARTMENT_ROBBERY_HEADLINES = [
  (name: string) => `Break-In at ${name}'s Residence; Valuables Stolen`,
  (name: string) => `${name}'s Home Burgled While Away; Neighbors Heard Nothing`,
  (name: string) => `Thieves Ransack ${name}'s Dwelling; Leave Furniture Rearranged`,
  (name: string) => `${name} Returns Home to Find Possessions Missing; Door Still Locked`,
  (name: string) => `Home Invasion Targets ${name}; Landlord Offers 'Thoughts and Prayers'`,
];

const APARTMENT_ROBBERY_CONTENT_VARIANTS = [
  (name: string, items: number) => `${items} item(s) were taken from ${name}'s residence. Investigators recommend "better locks, or perhaps a better neighborhood."`,
  (name: string, items: number) => `Thieves made off with ${items} item(s) from ${name}'s home. The locks were picked with what experts describe as 'casual disdain.'`,
  (name: string, items: number) => `${name} lost ${items} item(s) in the break-in. The thieves left a note: 'Nice place.' Adding insult to injury. Literally.`,
  (name: string, items: number) => `${items} item(s) vanished from ${name}'s dwelling overnight. Neighbours reported hearing 'absolutely nothing.' Which is suspicious in itself.`,
];

const LOAN_DEFAULT_HEADLINES = [
  (name: string) => `Bank Seizes Assets: ${name} Defaults on Loan`,
  (name: string) => `${name} in Financial Ruin; Bank Collectors Dispatched`,
  (name: string) => `Guildholm Bank vs. ${name}: Asset Seizure Commences`,
  (name: string) => `${name}'s Debt Spiral Reaches Breaking Point; Bank Unmoved`,
  (name: string) => `Loan Default: ${name}'s Possessions Auctioned by Bank`,
];

const LOAN_DEFAULT_CONTENT_VARIANTS = [
  (name: string, amount: number) => `Guildholm Bank has begun asset seizure proceedings against ${name}, who still owes ${amount}g. The bank expressed "deep sympathy" while counting their recovered gold.`,
  (name: string, amount: number) => `${name} has defaulted on a ${amount}g loan. The bank's collections department has been 'mobilised.' This is not a euphemism. They have an actual cart.`,
  (name: string, amount: number) => `With ${amount}g still outstanding, the bank has exercised its right to seize ${name}'s assets. The right was exercised enthusiastically.`,
  (name: string, amount: number) => `${name}'s ${amount}g debt has triggered the bank's asset recovery protocol. The protocol involves a dwarf, a clipboard, and an unreasonable amount of determination.`,
];

const CRASH_HEADLINES: Record<string, string[]> = {
  minor: [
    'Minor Market Dip Concerns Merchants',
    'Prices Slip Slightly; Traders Nervous',
    'Small Market Correction; Economists Argue Whether to Worry',
    'Slight Economic Wobble; Markets Expected to Recover Eventually',
    'Prices Dip Briefly; Merchants Panic Immediately',
  ],
  moderate: [
    'Market Downturn Forces Wage Cuts Across Guildholm',
    'Economic Slump Hits Workers\' Pockets',
    'Moderate Recession Grips City; Employers Cut Wages',
    'Economic Storm Hits Guildholm; Wage Reductions Announced',
    'Market Contracts; Workers Told to "Tighten Belts and Lower Expectations"',
  ],
  major: [
    'MARKET CRASH: Mass Layoffs Rock Guildholm!',
    'Economic Catastrophe: Businesses Close, Workers Fired',
    'CRISIS: Market Collapse Devastates Guildholm Economy',
    'BLACK WEEK: Worst Market Crash in a Generation Hits Guildholm',
    'ECONOMIC DISASTER: Mass Unemployment as Markets Implode',
  ],
};

/** Generate personalized articles based on player events from the previous week */
export function generatePersonalizedArticles(events: PlayerNewsEvent[]): NewsArticle[] {
  const articles: NewsArticle[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'robbery': {
        const headlineFn = ROBBERY_HEADLINES[Math.floor(Math.random() * ROBBERY_HEADLINES.length)];
        const contentFn = ROBBERY_CONTENT_VARIANTS[Math.floor(Math.random() * ROBBERY_CONTENT_VARIANTS.length)];
        articles.push({
          headline: headlineFn(event.playerName),
          content: contentFn(event.playerName, event.goldLost),
          category: 'events',
        });
        break;
      }
      case 'apartment-robbery': {
        const headlineFn = APARTMENT_ROBBERY_HEADLINES[Math.floor(Math.random() * APARTMENT_ROBBERY_HEADLINES.length)];
        const contentFn = APARTMENT_ROBBERY_CONTENT_VARIANTS[Math.floor(Math.random() * APARTMENT_ROBBERY_CONTENT_VARIANTS.length)];
        articles.push({
          headline: headlineFn(event.playerName),
          content: contentFn(event.playerName, event.itemsStolen),
          category: 'events',
        });
        break;
      }
      case 'loan-default': {
        const headlineFn = LOAN_DEFAULT_HEADLINES[Math.floor(Math.random() * LOAN_DEFAULT_HEADLINES.length)];
        const contentFn = LOAN_DEFAULT_CONTENT_VARIANTS[Math.floor(Math.random() * LOAN_DEFAULT_CONTENT_VARIANTS.length)];
        articles.push({
          headline: headlineFn(event.playerName),
          content: contentFn(event.playerName, event.amountOwed),
          category: 'economy',
        });
        break;
      }
      case 'loan-repaid': {
        const repaidHeadlines = [
          `${event.playerName} Settles Debt with Guildholm Bank`,
          `${event.playerName} Finally Pays Off Loan; Bank Staff Applaud`,
          `Debt-Free at Last: ${event.playerName} Clears Outstanding Loan`,
          `${event.playerName} Repays Bank Loan; Celebrates With Deep Sigh`,
          `Bank Confirms ${event.playerName}'s Loan Fully Repaid; Suggests New Loan Immediately`,
        ];
        const repaidContent = [
          `After a prolonged period of financial obligation, ${event.playerName} has cleared their loan. The bank has sent a congratulatory note and a pamphlet for their next loan product.`,
          `${event.playerName} has repaid their debt in full. The bank described the occasion as 'bittersweet' — sweet for the gold received, bitter because the interest has stopped.`,
          `With the final payment deposited, ${event.playerName} is officially debt-free. Financial advisors recommend 'enjoying the feeling while it lasts.'`,
          `The bank confirmed ${event.playerName}'s loan is settled. In an unprecedented move, Björn the vault guard was seen smiling. Briefly.`,
        ];
        articles.push({
          headline: repaidHeadlines[Math.floor(Math.random() * repaidHeadlines.length)],
          content: repaidContent[Math.floor(Math.random() * repaidContent.length)],
          category: 'economy',
        });
        break;
      }
      case 'fired': {
        const firedHeadlines = [
          `${event.playerName} Let Go Amid Market Turmoil`,
          `${event.playerName} Dismissed from Position; Employer Cites 'Restructuring'`,
          `Layoff Notice: ${event.playerName} Loses Job in Economic Downturn`,
          `${event.playerName} Joins Ranks of Unemployed; Guild Hall Awaits`,
          `${event.playerName} Terminated; Exit Interview Described as 'Brief'`,
        ];
        const firedContent = [
          `${event.playerName} has been dismissed from their position${event.jobName ? ` as ${event.jobName}` : ''}. The employer cited "economic restructuring," a phrase that means exactly what it sounds like.`,
          `${event.playerName} was let go${event.jobName ? ` from their role as ${event.jobName}` : ''} today. The severance package consisted of a handshake and directions to the Guild Hall.`,
          `${event.playerName}'s employer announced the termination${event.jobName ? ` of their ${event.jobName} position` : ''} effective immediately. "Nothing personal," they said. It felt personal.`,
          `${event.playerName} is now seeking employment${event.jobName ? ` after being released from their ${event.jobName} position` : ''}. The job market is described as 'challenging.' Also as 'terrible.'`,
        ];
        articles.push({
          headline: firedHeadlines[Math.floor(Math.random() * firedHeadlines.length)],
          content: firedContent[Math.floor(Math.random() * firedContent.length)],
          category: 'jobs',
        });
        break;
      }
      case 'paycut': {
        const paycutHeadlines = [
          `Workers Face ${event.percentage}% Pay Cuts; ${event.playerName} Among Those Affected`,
          `Wage Reductions Hit ${event.playerName}; Employers Offer 'Thoughts'`,
          `${event.playerName}'s Income Slashed by ${event.percentage}%; Economy Blamed`,
          `Pay Cut Alert: ${event.playerName} Earning ${event.percentage}% Less This Week`,
          `Economic Downturn Costs ${event.playerName} ${event.percentage}% of Wages`,
        ];
        const paycutContent = [
          `Economic pressures have forced employers to slash wages. ${event.playerName}'s income has been reduced. Employers promise the cuts are "temporary." Historians note this promise has a 0% track record.`,
          `${event.playerName} joins a growing list of workers facing reduced wages. The employer expressed regret, then went back to counting gold. Regret doesn't last long in business.`,
          `A ${event.percentage}% wage reduction has been applied to ${event.playerName}'s earnings. Financial analysts recommend 'spending less,' a suggestion that is technically true and utterly unhelpful.`,
          `${event.playerName}'s pay has been cut amid economic turbulence. The employer's official statement: 'We're all in this together.' The employer's unofficial salary: unchanged.`,
        ];
        articles.push({
          headline: paycutHeadlines[Math.floor(Math.random() * paycutHeadlines.length)],
          content: paycutContent[Math.floor(Math.random() * paycutContent.length)],
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
        const starvationHeadlines = [
          `${event.playerName} Found Weakened from Hunger`,
          `${event.playerName} Collapses from Starvation; Food Recommended`,
          `Hunger Crisis: ${event.playerName} Goes Without Eating`,
          `${event.playerName} Spotted Eyeing Other People's Lunches`,
          `Starvation Alert: ${event.playerName} Forgot to Eat; Body Objects`,
        ];
        const starvationContent = [
          `Witnesses report seeing ${event.playerName} stumbling through the streets. Local healers recommend "eating food," a solution that remains shockingly underutilized.`,
          `${event.playerName} was found in a weakened state due to lack of food. The General Store is open daily. This has been a public service announcement.`,
          `${event.playerName} has not eaten in days. Neighbours describe the situation as 'entirely preventable.' The General Store concurs.`,
          `${event.playerName}'s stomach has filed a formal complaint. It seeks immediate resolution in the form of food. Any food. Please.`,
        ];
        articles.push({
          headline: starvationHeadlines[Math.floor(Math.random() * starvationHeadlines.length)],
          content: starvationContent[Math.floor(Math.random() * starvationContent.length)],
          category: 'events',
        });
        break;
      }
      case 'sickness': {
        const sicknessHeadlines = [
          `${event.playerName} Falls Ill; Enchanter Recommends Rest`,
          `Sickness Strikes ${event.playerName}; Activities Suspended`,
          `${event.playerName} Under the Weather; Doctor Bills Expected`,
          `Health Alert: ${event.playerName} Contracts Mysterious Ailment`,
          `${event.playerName} Sick as a Dog; Dog Offended by Comparison`,
        ];
        const sicknessContent = [
          `${event.playerName} has been taken ill and is advised to seek medical attention. The Enchanter offers healing at 'very reasonable rates.' Rates are not, in fact, reasonable.`,
          `${event.playerName} is suffering from an unspecified illness. The Academy suggests it may be 'dungeon fever.' The Academy suggests everything is 'dungeon fever.'`,
          `Local healers report that ${event.playerName} is unwell. Treatment options include rest, potions, and 'not doing whatever caused this.' Helpful.`,
          `${event.playerName} has fallen ill. Symptoms include general misery and an inability to adventure. The cure: gold and patience. Mostly gold.`,
        ];
        articles.push({
          headline: sicknessHeadlines[Math.floor(Math.random() * sicknessHeadlines.length)],
          content: sicknessContent[Math.floor(Math.random() * sicknessContent.length)],
          category: 'events',
        });
        break;
      }
      case 'eviction': {
        const evictionHeadlines = [
          `${event.playerName} Evicted; Landlord Tomas Unmoved`,
          `Tomas Evicts ${event.playerName}; Dwarf Enforcement Confirmed`,
          `${event.playerName} Now Homeless After Rent Default`,
          `Eviction Notice Served: ${event.playerName} Has Until Sundown`,
          `${event.playerName} Loses Housing; Landlord's Patience 'Exceeded'`,
        ];
        const evictionContent = [
          `Landlord Tomas has evicted ${event.playerName} for nonpayment. "Rules are rules," he said, polishing an eviction notice with visible satisfaction.`,
          `${event.playerName} has been removed from their lodgings by Tomas's enforcement team (one dwarf, very determined). Possessions were placed on the street. With care. Allegedly.`,
          `Landlord Tomas confirmed the eviction of ${event.playerName}. "I gave them every chance," he said. Records show he gave them one chance. And a bill.`,
          `${event.playerName} is now without housing following an eviction by Landlord Tomas. Tomas was seen whistling afterwards. The eviction dwarf was seen cracking his knuckles.`,
        ];
        articles.push({
          headline: evictionHeadlines[Math.floor(Math.random() * evictionHeadlines.length)],
          content: evictionContent[Math.floor(Math.random() * evictionContent.length)],
          category: 'events',
        });
        break;
      }
      case 'degree-earned': {
        const degreeHeadlines = [
          `${event.playerName} Earns ${event.degreeName}; Academy Celebrates`,
          `Academic Achievement: ${event.playerName} Completes ${event.degreeName}`,
          `${event.playerName} Graduates with ${event.degreeName}; Career Prospects Improve`,
          `Congratulations to ${event.playerName}: ${event.degreeName} Awarded`,
          `${event.playerName} Adds ${event.degreeName} to Growing List of Qualifications`,
        ];
        const degreeContent = [
          `The Academy has awarded ${event.playerName} a ${event.degreeName}. Faculty described the achievement as "impressive" and "about time."`,
          `${event.playerName} has completed their studies and earned a ${event.degreeName}. The graduation ceremony was 'emotional.' The tuition bill was more so.`,
          `After considerable effort, ${event.playerName} now holds a ${event.degreeName}. New employment opportunities are expected to follow. Also new debt, probably.`,
          `${event.playerName}'s ${event.degreeName} opens doors across Guildholm. Specifically, the doors of employers who now consider them qualified. A radical concept.`,
          `The Academy proudly announces ${event.playerName}'s completion of ${event.degreeName}. The Dean described it as 'a triumph of persistence over common sense.' A compliment.`,
        ];
        articles.push({
          headline: degreeHeadlines[Math.floor(Math.random() * degreeHeadlines.length)],
          content: degreeContent[Math.floor(Math.random() * degreeContent.length)],
          category: 'events',
        });
        break;
      }
      case 'quest-completed': {
        const questHeadlines = [
          `Adventurer ${event.playerName} Completes ${event.questName}`,
          `${event.playerName} Triumphs: ${event.questName} Quest Finished`,
          `Quest Complete! ${event.playerName} Returns Victorious`,
          `Guild Hall Celebrates as ${event.playerName} Finishes ${event.questName}`,
          `${event.playerName} Conquers ${event.questName}; Rewards Collected`,
        ];
        const questContent = [
          `The Guild Hall reports that ${event.playerName} has successfully completed the "${event.questName}" quest. Rewards were distributed and drinks were had.`,
          `${event.playerName} returned to the Guild Hall having completed "${event.questName}." The Guild Master expressed approval. This is rare. Frame the moment.`,
          `"${event.questName}" has been marked as complete in the guild records. ${event.playerName} collected their reward and immediately checked the board for more. Adventurers never change.`,
          `${event.playerName}'s completion of "${event.questName}" adds to their growing reputation. Fellow adventurers described the achievement as 'motivating.' Also 'annoying.'`,
          `The quest "${event.questName}" is done, thanks to ${event.playerName}. The client has been notified. Gold has changed hands. Everyone is satisfied. This never happens.`,
        ];
        articles.push({
          headline: questHeadlines[Math.floor(Math.random() * questHeadlines.length)],
          content: questContent[Math.floor(Math.random() * questContent.length)],
          category: 'quests',
        });
        break;
      }
      case 'death': {
        if (event.wasResurrected) {
          const resHeadlines = [
            `${event.playerName} Returns from Beyond; Healers Baffled`,
            `Back from the Dead: ${event.playerName} Resurrected at Graveyard`,
            `${event.playerName} Cheats Death; Death Files Complaint`,
            `Miracle at the Graveyard: ${event.playerName} Lives Again`,
            `${event.playerName} Resurrected; Describes Afterlife as 'Overrated'`,
          ];
          const resContent = [
            `In an extraordinary turn of events, ${event.playerName} has been resurrected after a fatal incident. The Graveyard priests claim it was "routine." The public disagrees.`,
            `${event.playerName} has returned from the dead. The resurrection was described as 'successful' by the priests and 'disorienting' by the patient.`,
            `After a brief visit to the afterlife, ${event.playerName} is back among the living. They described the experience as 'educational' and declined to elaborate.`,
            `${event.playerName} walked out of the Graveyard alive today, which is not how graveyards typically work. The priests charged a 'standard resurrection fee.' Standard for whom is unclear.`,
          ];
          articles.push({
            headline: resHeadlines[Math.floor(Math.random() * resHeadlines.length)],
            content: resContent[Math.floor(Math.random() * resContent.length)],
            category: 'events',
          });
        } else {
          const deathHeadlines = [
            `Tragic Loss: ${event.playerName} Falls in Guildholm`,
            `${event.playerName} Has Died; City Mourns`,
            `Memorial Planned for ${event.playerName}; Graveyard Prepares`,
            `Rest in Peace: ${event.playerName} Meets Their End`,
            `${event.playerName}'s Journey Ends; Tombstone Being Carved`,
          ];
          const deathContent = [
            `The city mourns the loss of ${event.playerName}. Memorial services will be held at the Graveyard. Flowers and gold donations are welcome. Especially the gold.`,
            `${event.playerName} has fallen. The Guild Hall has lowered its flags to half-mast. The tavern has raised its prices for the wake. Commerce continues.`,
            `We remember ${event.playerName} as a dedicated adventurer who gave everything. Literally, in the end. Memorial donations can be made to the Graveyard restoration fund.`,
            `${event.playerName} is gone. The tombstone will read something respectful. The adventurers at the tavern will say something less so. Both are valid forms of remembrance.`,
          ];
          articles.push({
            headline: deathHeadlines[Math.floor(Math.random() * deathHeadlines.length)],
            content: deathContent[Math.floor(Math.random() * deathContent.length)],
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
