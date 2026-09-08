// Guild Life - The Guildholm Herald (Newspaper System)

import type { GameState, PlayerNewsEventData } from '@/types/game.types';
import { ALL_JOBS } from './jobs';
import { QUESTS } from './quests';
import { FESTIVALS } from './festivals';

export interface NewsArticle {
  headline: string;
  content: string;
  category: 'economy' | 'jobs' | 'quests' | 'gossip' | 'events';
  evidence?: 'recorded' | 'notice' | 'satire';
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

export type NewspaperContext = Pick<GameState, 'players' | 'weather' | 'activeFestival'>;

/** Reading the same edition is deterministic and never consumes gameplay RNG. */
export function generateNewspaper(week: number, priceModifier: number, economyTrend = 0, newsEvents: PlayerNewsEventData[] = [], context?: NewspaperContext): Newspaper {
  let seed = week * 2654435761;
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  const pick = <T,>(values:T[]):T => values[Math.floor(random()*values.length)];
  const articles:NewsArticle[] = generatePersonalizedArticles(newsEvents as PlayerNewsEvent[],random).map(article=>({...article,evidence:'recorded'}));
  for (const player of context?.players ?? []) {
    const summary = player.lastTurnSummary;
    if (summary?.week === week-1 && summary.entries.length) articles.push({
      headline:`${player.name}: a week in Guildholm`,
      content:`Recorded in week ${summary.week}: ${summary.entries.join('. ')}.`,
      category:'events',evidence:'recorded',
    });
    const snapshot=player.weeklySnapshots?.at(-1);
    if (snapshot?.week===week && (snapshot.dividendsPaid??0)>0) articles.push({
      headline:`The Broker pays ${player.name} ${snapshot.dividendsPaid}g`,
      content:`The week ${week} settlement credited ${snapshot.dividendsPaid}g to ${player.name}'s cash. Other weekend income and expenses are listed separately in the Broker receipt.`,category:'economy',evidence:'recorded',
    });
  }
  const weather=context?.weather;
  if(weather && weather.type!=='clear') articles.push({headline:weather.name,content:`${weather.description} Travel: +${weather.movementCostExtra}h per step.`,category:'events',evidence:'recorded'});
  const festival=FESTIVALS.find(f=>f.id===context?.activeFestival);
  if(festival) articles.push({headline:`Guildholm celebrates ${festival.name}`,content:festival.description,category:'events',evidence:'recorded'});
  const percent=Math.round((priceModifier-1)*100);
  articles.push({headline:percent===0?'Market prices hold at the base rate':`Market prices ${Math.abs(percent)}% ${percent>0?'above':'below'} the base rate`,content:`Current shop prices: ${Math.abs(percent)}% ${percent>=0?'above':'below'} the base price. The economy is ${economyTrend>0?'growing':economyTrend<0?'contracting':'steady'}. These are the current conditions; future prices may change.`,category:'economy',evidence:'recorded'});
  const jobs=context ? ALL_JOBS.filter(j=>j.careerLevel<=2 || !context.players.some(p=>!p.isGameOver&&p.currentJob===j.id)).slice((week%3)*2,(week%3)*2+3) : [];
  articles.push({headline:'Guild Hall employment desk',content:jobs.length?`Unfilled or shared positions: ${jobs.map(j=>j.name).join(', ')}. Check career paths, qualifications and current wage offers at the Guild Hall.`:'Career paths, qualifications and job applications are available at the Guild Hall.',category:'jobs',evidence:'notice'});
  const quests=[QUESTS[week%QUESTS.length],QUESTS[(week+1)%QUESTS.length]];
  articles.push({headline:'From the Guild quest catalogue',content:`Featured: ${quests.map(q=>q.name).join(' and ')}. Your rank, progress and current quest determine eligibility. Ask at the Guild Hall before setting out.`,category:'quests',evidence:'notice'});
  if((week+1)%4===0) articles.push({headline:'Tomas opens the housing office',content:'The scheduled rent office is open this week. Prepay 1 or 4 weeks or change your home. These transactions take no hours; travelling to the Landlord still does.',category:'events',evidence:'notice'});
  articles.push({headline:pick(GOSSIP_HEADLINES),content:`A tall tale from the tavern, printed for amusement. ${pick(GOSSIP_CONTENT)}`,category:'gossip',evidence:'satire'});
  return {week,articles,priceModifier,featuredJobs:jobs.map(j=>j.id),questRumors:quests.map(q=>q.id)};
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
  (name: string) => `Pickpockets Target ${name} in Guildholm`,
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
export function generatePersonalizedArticles(events: PlayerNewsEvent[], random: () => number = Math.random): NewsArticle[] {
  const articles: NewsArticle[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'robbery': {
        const headlineFn = ROBBERY_HEADLINES[Math.floor(random() * ROBBERY_HEADLINES.length)];
        const contentFn = ROBBERY_CONTENT_VARIANTS[Math.floor(random() * ROBBERY_CONTENT_VARIANTS.length)];
        articles.push({
          headline: headlineFn(event.playerName),
          content: contentFn(event.playerName, event.goldLost),
          category: 'events',
        });
        break;
      }
      case 'apartment-robbery': {
        const headlineFn = APARTMENT_ROBBERY_HEADLINES[Math.floor(random() * APARTMENT_ROBBERY_HEADLINES.length)];
        const contentFn = APARTMENT_ROBBERY_CONTENT_VARIANTS[Math.floor(random() * APARTMENT_ROBBERY_CONTENT_VARIANTS.length)];
        articles.push({
          headline: headlineFn(event.playerName),
          content: contentFn(event.playerName, event.itemsStolen),
          category: 'events',
        });
        break;
      }
      case 'loan-default': {
        const headlineFn = LOAN_DEFAULT_HEADLINES[Math.floor(random() * LOAN_DEFAULT_HEADLINES.length)];
        const contentFn = LOAN_DEFAULT_CONTENT_VARIANTS[Math.floor(random() * LOAN_DEFAULT_CONTENT_VARIANTS.length)];
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
          headline: repaidHeadlines[Math.floor(random() * repaidHeadlines.length)],
          content: repaidContent[Math.floor(random() * repaidContent.length)],
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
          headline: firedHeadlines[Math.floor(random() * firedHeadlines.length)],
          content: firedContent[Math.floor(random() * firedContent.length)],
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
          headline: paycutHeadlines[Math.floor(random() * paycutHeadlines.length)],
          content: paycutContent[Math.floor(random() * paycutContent.length)],
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
          headline: headlines[Math.floor(random() * headlines.length)],
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
          headline: starvationHeadlines[Math.floor(random() * starvationHeadlines.length)],
          content: starvationContent[Math.floor(random() * starvationContent.length)],
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
          headline: sicknessHeadlines[Math.floor(random() * sicknessHeadlines.length)],
          content: sicknessContent[Math.floor(random() * sicknessContent.length)],
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
          headline: evictionHeadlines[Math.floor(random() * evictionHeadlines.length)],
          content: evictionContent[Math.floor(random() * evictionContent.length)],
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
          headline: degreeHeadlines[Math.floor(random() * degreeHeadlines.length)],
          content: degreeContent[Math.floor(random() * degreeContent.length)],
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
          headline: questHeadlines[Math.floor(random() * questHeadlines.length)],
          content: questContent[Math.floor(random() * questContent.length)],
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
            headline: resHeadlines[Math.floor(random() * resHeadlines.length)],
            content: resContent[Math.floor(random() * resContent.length)],
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
            headline: deathHeadlines[Math.floor(random() * deathHeadlines.length)],
            content: deathContent[Math.floor(random() * deathContent.length)],
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
