/**
 * Reputation System — Fame & Infamy
 *
 * Two independent axes (0–100 each):
 * - Fame: earned from heroic/productive actions (quests, dungeon, education, work)
 * - Infamy: earned from shady actions (sabotage, hexes, dark rituals, theft)
 *
 * Effects:
 * - Price modifiers at shops (fame = discount at legit shops, infamy = discount at shady shops)
 * - NPC reaction greetings change at thresholds
 * - Exclusive items/services unlock at reputation tiers
 */

// ─── Reputation Tiers ─────────────────────────────────────────

export type ReputationTier = 'unknown' | 'known' | 'notable' | 'renowned' | 'legendary';

export function getReputationTier(value: number): ReputationTier {
  if (value >= 80) return 'legendary';
  if (value >= 60) return 'renowned';
  if (value >= 40) return 'notable';
  if (value >= 20) return 'known';
  return 'unknown';
}

export function getTierLabel(tier: ReputationTier): string {
  switch (tier) {
    case 'legendary': return 'Legendary';
    case 'renowned': return 'Renowned';
    case 'notable': return 'Notable';
    case 'known': return 'Known';
    case 'unknown': return 'Unknown';
  }
}

// ─── Fame/Infamy Triggers ──────────────────────────────────────

export type ReputationTrigger =
  | 'complete-quest'
  | 'complete-bounty'
  | 'clear-dungeon-floor'
  | 'earn-degree'
  | 'work-shift'
  | 'donate-to-poor'       // future
  | 'sabotage-rival'
  | 'cast-hex'
  | 'dark-ritual'
  | 'buy-stolen-goods'     // Shadow Market purchases
  | 'pawn-item'
  | 'gamble';

export interface ReputationChange {
  fame: number;
  infamy: number;
}

/** How much fame/infamy each action gives */
export const REPUTATION_TRIGGERS: Record<ReputationTrigger, ReputationChange> = {
  'complete-quest':       { fame: 5, infamy: 0 },
  'complete-bounty':      { fame: 3, infamy: 0 },
  'clear-dungeon-floor':  { fame: 4, infamy: 0 },
  'earn-degree':          { fame: 3, infamy: 0 },
  'work-shift':           { fame: 0.5, infamy: 0 },
  'donate-to-poor':       { fame: 8, infamy: 0 },
  'sabotage-rival':       { fame: 0, infamy: 5 },
  'cast-hex':             { fame: 0, infamy: 4 },
  'dark-ritual':          { fame: 0, infamy: 6 },
  'buy-stolen-goods':     { fame: 0, infamy: 2 },
  'pawn-item':            { fame: 0, infamy: 1 },
  'gamble':               { fame: 0, infamy: 1 },
};

// ─── Price Effects ─────────────────────────────────────────────

/** Locations considered "legitimate" — fame gives discounts here */
const LEGIT_LOCATIONS = new Set([
  'general-store', 'armory', 'academy', 'enchanter', 'forge', 'bank', 'landlord',
]);

/** Locations considered "shady" — infamy gives discounts here */
const SHADY_LOCATIONS = new Set([
  'shadow-market', 'fence', 'graveyard',
]);

/**
 * Get the reputation-based price multiplier for a location.
 * Returns a multiplier (e.g., 0.92 = 8% discount, 1.05 = 5% surcharge).
 *
 * Legit shops: fame discount (max -10%), infamy surcharge (max +8%)
 * Shady shops: infamy discount (max -12%), fame surcharge (max +5%)
 * Neutral: no effect
 */
export function getReputationPriceMultiplier(
  fame: number,
  infamy: number,
  locationId: string
): number {
  if (LEGIT_LOCATIONS.has(locationId)) {
    // Fame: up to 10% discount. Infamy: up to 8% surcharge
    const fameDiscount = Math.min(fame, 100) * 0.001;  // 0–0.10
    const infamySurcharge = Math.min(infamy, 100) * 0.0008; // 0–0.08
    return 1 - fameDiscount + infamySurcharge;
  }
  if (SHADY_LOCATIONS.has(locationId)) {
    // Infamy: up to 12% discount. Fame: up to 5% surcharge
    const infamyDiscount = Math.min(infamy, 100) * 0.0012; // 0–0.12
    const fameSurcharge = Math.min(fame, 100) * 0.0005;    // 0–0.05
    return 1 - infamyDiscount + fameSurcharge;
  }
  return 1.0; // Neutral locations (tavern, cave, guild-hall)
}

// ─── NPC Reputation Greetings ──────────────────────────────────

export interface ReputationGreeting {
  threshold: number; // minimum fame or infamy
  type: 'fame' | 'infamy';
  greeting: string;
}

/**
 * Per-location NPC greetings that override the default based on reputation.
 * Checked in order — first matching threshold wins.
 * Sorted highest threshold first.
 */
export const NPC_REPUTATION_GREETINGS: Partial<Record<string, ReputationGreeting[]>> = {
  'guild-hall': [
    { threshold: 80, type: 'fame', greeting: 'The legendary hero returns! Aldric personally polishes a chair for you.' },
    { threshold: 60, type: 'fame', greeting: 'Ah, a renowned adventurer! The guild is honored by your presence.' },
    { threshold: 40, type: 'fame', greeting: 'Your reputation precedes you. Well done, adventurer.' },
    { threshold: 60, type: 'infamy', greeting: 'Aldric eyes you warily. "Try not to... cause trouble."' },
    { threshold: 80, type: 'infamy', greeting: 'Guards tighten their grip as you enter. Your notoriety is... impressive.' },
  ],
  'general-store': [
    { threshold: 60, type: 'fame', greeting: 'Brynn beams! "My best customer! I saved the freshest goods for you."' },
    { threshold: 40, type: 'fame', greeting: 'Welcome back! Brynn gives you a knowing nod of respect.' },
    { threshold: 60, type: 'infamy', greeting: 'Brynn watches your hands carefully. "You break it, you buy it. Twice."' },
  ],
  'shadow-market': [
    { threshold: 60, type: 'infamy', greeting: 'Shade grins. "Ah, a kindred spirit. I have special goods for someone of your... caliber."' },
    { threshold: 80, type: 'infamy', greeting: 'Shade bows deeply. "The underworld speaks your name with reverence. Welcome, friend."' },
    { threshold: 60, type: 'fame', greeting: 'Shade narrows his eyes. "A do-gooder, eh? Prices just went up."' },
  ],
  'academy': [
    { threshold: 60, type: 'fame', greeting: 'Elara smiles warmly. "A scholar of great renown! The library is at your disposal."' },
    { threshold: 60, type: 'infamy', greeting: 'Elara frowns. "We do not encourage... that sort of behavior here."' },
  ],
  'bank': [
    { threshold: 60, type: 'fame', greeting: 'Mathilda offers you a seat. "For a client of your standing, our best rates."' },
    { threshold: 60, type: 'infamy', greeting: 'Mathilda counts the silverware after you sit down.' },
  ],
  'fence': [
    { threshold: 60, type: 'infamy', greeting: 'Whiskers practically purrs. "My favorite customer! I have... exclusive items today."' },
    { threshold: 40, type: 'infamy', greeting: 'Whiskers winks. "I like the cut of your jib. Let\'s do business."' },
    { threshold: 60, type: 'fame', greeting: 'Whiskers looks nervous. "You\'re not here to turn me in, are you?"' },
  ],
  'armory': [
    { threshold: 60, type: 'fame', greeting: 'Gunther salutes. "A warrior of renown! I have my finest stock for you."' },
  ],
  'enchanter': [
    { threshold: 60, type: 'fame', greeting: 'Lyra\'s crystals glow brighter. "Your aura is magnificent! I have rare enchantments for you."' },
    { threshold: 80, type: 'infamy', greeting: 'Lyra\'s wards flicker nervously. "Your... dark energy is strong. I have something you might want."' },
  ],
  'rusty-tankard': [
    { threshold: 60, type: 'fame', greeting: 'Magnus pours a free round. "Drinks for the hero! On the house... just this once."' },
    { threshold: 60, type: 'infamy', greeting: 'Magnus slides you a drink. "You look like you\'ve earned this. No questions."' },
  ],
  'graveyard': [
    { threshold: 60, type: 'infamy', greeting: 'Morthos nods approvingly. "The dark arts recognize their own. I can help."' },
    { threshold: 80, type: 'fame', greeting: 'Morthos squints. "So bright... so alive. It\'s almost offensive."' },
  ],
};

/**
 * Get a reputation-based NPC greeting, or null to use default.
 */
export function getReputationGreeting(
  locationId: string,
  fame: number,
  infamy: number
): string | null {
  const greetings = NPC_REPUTATION_GREETINGS[locationId];
  if (!greetings) return null;

  for (const g of greetings) {
    const value = g.type === 'fame' ? fame : infamy;
    if (value >= g.threshold) return g.greeting;
  }
  return null;
}

// ─── Exclusive Items/Services ──────────────────────────────────

export interface ReputationUnlock {
  id: string;
  name: string;
  description: string;
  requirement: { type: 'fame' | 'infamy'; minimum: number };
  location: string;
  /** Effect applied when purchased */
  effect: {
    type: 'happiness' | 'health' | 'gold' | 'clothing' | 'food' | 'time';
    value: number;
  };
  cost: number;
  timeCost: number;
}

export const REPUTATION_UNLOCKS: ReputationUnlock[] = [
  // Fame unlocks
  {
    id: 'hero-feast',
    name: 'Hero\'s Feast',
    description: 'The guild throws a feast in your honor. +25 happiness, +50 food.',
    requirement: { type: 'fame', minimum: 40 },
    location: 'rusty-tankard',
    effect: { type: 'happiness', value: 25 },
    cost: 30,
    timeCost: 2,
  },
  {
    id: 'noble-endorsement',
    name: 'Noble Endorsement',
    description: 'A noble vouches for you. +20 clothing condition.',
    requirement: { type: 'fame', minimum: 60 },
    location: 'guild-hall',
    effect: { type: 'clothing', value: 20 },
    cost: 50,
    timeCost: 1,
  },
  {
    id: 'scholars-blessing',
    name: 'Scholar\'s Blessing',
    description: 'The academy dean blesses your studies. +15 happiness.',
    requirement: { type: 'fame', minimum: 40 },
    location: 'academy',
    effect: { type: 'happiness', value: 15 },
    cost: 25,
    timeCost: 1,
  },
  {
    id: 'legendary-discount-card',
    name: 'Legendary Patron Card',
    description: 'A permanent +5% discount at all legitimate shops. +10 happiness.',
    requirement: { type: 'fame', minimum: 80 },
    location: 'general-store',
    effect: { type: 'happiness', value: 10 },
    cost: 200,
    timeCost: 1,
  },
  // Infamy unlocks
  {
    id: 'shadow-contacts',
    name: 'Shadow Contacts',
    description: 'Underworld contacts slip you 50g in "tips".',
    requirement: { type: 'infamy', minimum: 40 },
    location: 'shadow-market',
    effect: { type: 'gold', value: 50 },
    cost: 20,
    timeCost: 1,
  },
  {
    id: 'black-market-intel',
    name: 'Black Market Intel',
    description: 'Insider info gives you an edge. +20 happiness from the thrill.',
    requirement: { type: 'infamy', minimum: 40 },
    location: 'fence',
    effect: { type: 'happiness', value: 20 },
    cost: 35,
    timeCost: 1,
  },
  {
    id: 'dark-patron',
    name: 'Dark Patron\'s Gift',
    description: 'A mysterious benefactor heals your wounds. +30 health.',
    requirement: { type: 'infamy', minimum: 60 },
    location: 'graveyard',
    effect: { type: 'health', value: 30 },
    cost: 40,
    timeCost: 2,
  },
  {
    id: 'thieves-guild-membership',
    name: 'Thieves\' Guild Card',
    description: 'A permanent +5% discount at all shady establishments. +10 happiness.',
    requirement: { type: 'infamy', minimum: 80 },
    location: 'shadow-market',
    effect: { type: 'happiness', value: 10 },
    cost: 150,
    timeCost: 1,
  },
];

/**
 * Get available reputation-locked services for a location.
 */
export function getReputationUnlocks(
  locationId: string,
  fame: number,
  infamy: number,
  purchasedUnlocks: string[] = []
): ReputationUnlock[] {
  return REPUTATION_UNLOCKS.filter(unlock => {
    if (unlock.location !== locationId) return false;
    if (purchasedUnlocks.includes(unlock.id)) return false;
    const value = unlock.requirement.type === 'fame' ? fame : infamy;
    return value >= unlock.requirement.minimum;
  });
}
