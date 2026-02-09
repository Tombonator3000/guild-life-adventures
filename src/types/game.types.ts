// Guild Life - Game Types (based on Jones in the Fast Lane)

import type { WeatherState } from '@/data/weather';

export type LocationId =
  | 'noble-heights'
  | 'landlord'
  | 'slums'
  | 'fence'
  | 'shadow-market'
  | 'rusty-tankard'
  | 'armory'
  | 'enchanter'
  | 'academy'
  | 'guild-hall'
  | 'forge'
  | 'bank'
  | 'general-store'
  | 'cave'
  | 'graveyard';

// Zone configuration for the game board
// Coordinates are percentages relative to the board container
export interface ZoneConfig {
  id: LocationId;
  // Bounding box (percentage of board)
  x: number;      // left position (%)
  y: number;      // top position (%)
  width: number;  // zone width (%)
  height: number; // zone height (%)
  // Optional polygon for more precise hit detection (array of [x,y] points as percentages)
  polygon?: [number, number][];
}

export interface Location {
  id: LocationId;
  name: string;
  description: string;
  position: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  actions: string[];
}

export type GuildRank = 
  | 'novice'
  | 'apprentice'
  | 'journeyman'
  | 'adept'
  | 'veteran'
  | 'elite'
  | 'guild-master';

export type QuestRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export type HousingTier = 'homeless' | 'slums' | 'modest' | 'noble';

export type EducationPath = 'fighter' | 'mage' | 'priest' | 'business';

// New degree system (Jones-style)
export type DegreeId =
  | 'trade-guild'
  | 'junior-academy'
  | 'arcane-studies'
  | 'combat-training'
  | 'master-combat'
  | 'scholar'
  | 'advanced-scholar'
  | 'sage-studies'
  | 'loremaster'
  | 'commerce'
  | 'alchemy';

export interface DegreeProgress {
  degreeId: DegreeId;
  sessionsCompleted: number;
}

export interface EducationProgress {
  path: EducationPath;
  level: number;
  sessionsCompleted: number;
}

// Appliance source affects break chance
export type ApplianceSource = 'enchanter' | 'market' | 'pawn';

// Break chances by source (Jones-style)
export const APPLIANCE_BREAK_CHANCE: Record<ApplianceSource, number> = {
  enchanter: 1 / 51, // Socket City equivalent - lower break chance
  market: 1 / 36,    // Z-Mart equivalent - higher break chance
  pawn: 1 / 36,      // Pawn Shop - same as market
};

// Owned appliance with metadata
export interface OwnedAppliance {
  itemId: string;
  originalPrice: number;
  source: ApplianceSource;
  isBroken: boolean;
  purchasedFirstTime: boolean; // True if this was first purchase of this type (for happiness)
}

// Durable items that can be owned and potentially stolen
export interface DurableItems {
  [itemType: string]: number; // item type -> quantity owned
}

// New appliances inventory with detailed tracking
export interface AppliancesInventory {
  [itemId: string]: OwnedAppliance;
}

// Equipment slot types for combat system
export type EquipmentSlot = 'weapon' | 'armor' | 'shield';

// Equipment stats for weapons, armor, shields
export interface EquipmentStats {
  attack?: number;       // Bonus attack power (weapons)
  defense?: number;      // Bonus defense power (armor, shields)
  blockChance?: number;  // % chance to block (shields only, 0-1)
}

export interface Player {
  id: string;
  name: string;
  color: string;
  age: number;             // Player age in years (starts at 18, ages 1 year per 4 weeks)
  gold: number;
  health: number;
  maxHealth: number;
  happiness: number;
  timeRemaining: number;
  currentLocation: LocationId;
  previousLocation: LocationId | null; // Track where player came from (for street robbery)
  guildRank: GuildRank;
  housing: HousingTier;
  education: Record<EducationPath, number>;
  educationProgress: Record<EducationPath, number>; // Sessions completed for current level
  // New Jones-style degree system
  completedDegrees: DegreeId[]; // Array of completed degrees
  degreeProgress: Record<DegreeId, number>; // Sessions completed per degree (0-10)
  maxDependability: number; // Max dependability (increases with graduation)
  maxExperience: number; // Max experience (increases with graduation)
  completedQuests: number;
  clothingCondition: number;
  weeksSinceRent: number;
  foodLevel: number; // 0-100, depletes each week
  savings: number; // Money in bank
  investments: number; // Invested amount
  currentJob: string | null;
  currentWage: number; // Current job hourly wage (can increase with raises)
  shiftsWorkedSinceHire: number; // Shifts worked at current job (resets on new hire)
  dependability: number; // 0-100, affects job performance and raise chance
  experience: number; // Work experience points
  relaxation: number; // 10-50, affects apartment robbery chance (higher = safer)
  durables: DurableItems; // Durable items owned (stored at apartment)
  appliances: AppliancesInventory; // Appliances with detailed tracking
  applianceHistory: string[]; // List of appliance types ever owned (for happiness bonus tracking)
  inventory: string[];
  isAI: boolean;
  aiDifficulty?: AIDifficulty; // Per-AI difficulty (only set for AI players)
  activeQuest: string | null; // Current quest ID
  hasGuildPass: boolean; // Has purchased Guild Pass (required for quests)
  hasNewspaper: boolean; // Has purchased newspaper this week
  isSick: boolean; // Has sickness debuff
  rentDebt: number; // Accumulated rent debt for garnishment
  // Housing prepayment system (Jones-style)
  rentPrepaidWeeks: number; // Number of weeks rent paid in advance
  lockedRent: number; // Locked-in rent price (0 = not locked, uses current rate)
  // Death/Game Over state
  isGameOver: boolean; // True if player has died and is out of the game
  wasResurrectedThisWeek: boolean; // Prevents double resurrection exploit
  // Combat & Equipment system
  equippedWeapon: string | null;   // Item ID of equipped weapon
  equippedArmor: string | null;    // Item ID of equipped armor
  equippedShield: string | null;   // Item ID of equipped shield
  dungeonFloorsCleared: number[];  // Floors cleared at least once (e.g. [1, 2, 3])
  dungeonAttemptsThisTurn: number; // Floor attempts this turn (capped by MAX_FLOOR_ATTEMPTS_PER_TURN)
  permanentGoldBonus: number;      // Permanent % bonus to gold from work (from rare drops)
  // Dungeon leaderboard records (best gold, runs per floor)
  dungeonRecords: Record<number, { bestGold: number; bestEncounters: number; runs: number; totalGold: number }>;
  // Stock Market (Jones-style)
  stocks: Record<string, number>;  // stockId -> shares owned
  // Loan System (Jones-style)
  loanAmount: number;              // Outstanding loan balance
  loanWeeksRemaining: number;      // Weeks until forced repayment (0 = no loan)
  // Weekend System (Jones-style)
  tickets: string[];               // Ticket types owned (jousting, theatre, bard-concert)
  // Fresh Food Storage (Jones-style Refrigerator/Freezer)
  freshFood: number;               // Units of fresh food in storage (max 6, or 12 with frost chest)
  // Lottery
  lotteryTickets: number;          // Number of lottery tickets for this week's drawing
  // Forge tempering
  temperedItems: string[];         // Item IDs that have been tempered at the Forge (once per item)
}

export interface GoalSettings {
  wealth: number;      // Target gold + savings + investments
  happiness: number;   // Target happiness %
  education: number;   // Target education levels
  career: number;      // Target guild rank (1-7)
}

export interface GameState {
  phase: 'title' | 'setup' | 'playing' | 'victory' | 'event' | 'online-lobby';
  currentPlayerIndex: number;
  players: Player[];
  week: number;
  priceModifier: number;
  economyTrend: number;          // -1 (recession), 0 (stable), 1 (boom)
  economyCycleWeeksLeft: number;  // Weeks until next trend change
  goalSettings: GoalSettings;
  winner: string | null;
  eventMessage: string | null;
  rentDueWeek: number; // Week when rent is next due
  aiDifficulty: AIDifficulty; // Grimwald AI difficulty level
  // Stock Market prices (updated each week)
  stockPrices: Record<string, number>;
  // Weekend event result for display
  weekendEvent: WeekendEventResult | null;
  // Weather system (rare weather events with particle effects)
  weather: WeatherState;
  // AI speed control
  aiSpeedMultiplier: number;
  skipAITurn: boolean;
  // Tutorial state
  showTutorial: boolean;
  tutorialStep: number;
  // Online multiplayer state
  networkMode: 'local' | 'host' | 'guest';
  localPlayerId: string | null;   // This client's player ID in online mode
  roomCode: string | null;        // Room code for display
}

// Weekend event result for display between turns
export interface WeekendEventResult {
  playerName: string;
  activity: string;
  cost: number;
  happinessGain: number;
}

export interface Job {
  id: string;
  name: string;
  location: LocationId;
  hourlyWage: number;
  hoursPerShift: number;
  requiredEducation?: {
    path: EducationPath;
    level: number;
  };
  requiredGuildRank?: GuildRank;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  rank: QuestRank;
  goldReward: number;
  timeRequired: number;
  healthRisk: number;
  happinessReward: number;
}

// Age system constants
export const STARTING_AGE = 18;        // Players start at age 18
export const AGE_INTERVAL = 4;         // Age 1 year every 4 weeks (same as rent cycle)
export const WORK_HAPPINESS_AGE = 45;  // Age when work starts causing extra happiness drain
export const HEALTH_CRISIS_AGE = 50;   // Age when random health crises can occur
export const HEALTH_CRISIS_CHANCE = 0.03; // 3% weekly chance of age-related health crisis
export const HEALTH_CRISIS_DAMAGE = 15;   // HP lost from age-related health crisis

// Birthday milestone effects
export const AGE_MILESTONES: Record<number, { happiness?: number; maxHealth?: number; dependability?: number; message: string }> = {
  21: { happiness: 5, message: 'Coming of age! The world feels full of possibility.' },
  25: { maxHealth: 2, message: 'In the prime of youth — stronger than ever.' },
  30: { happiness: 5, dependability: 5, message: 'A seasoned adventurer — wisdom comes with experience.' },
  40: { maxHealth: -2, happiness: 3, message: 'Middle age arrives — wiser, but the body begins to slow.' },
  50: { maxHealth: -5, happiness: 5, message: 'A half-century lived — aches and wisdom in equal measure.' },
};
// Ages 60+ lose -3 maxHealth every birthday (handled in code, not in table)
export const ELDER_AGE = 60;
export const ELDER_HEALTH_DECAY = 3;

// Jones-style: Each turn has 60 Hours (time points)
export const HOURS_PER_TURN = 60;
// Legacy constant for backward compatibility
export const HOURS_PER_WEEK = HOURS_PER_TURN;
export const RENT_INTERVAL = 4; // Rent due every 4 weeks
export const CLOTHING_INTERVAL = 8; // Clothing degrades every 8 weeks
export const FOOD_DEPLETION_PER_WEEK = 25; // Lose 25 food per week
export const STARVATION_HEALTH_PENALTY = 10; // Lose 10 health when starving
export const STARVATION_HAPPINESS_PENALTY = 8; // Lose 8 happiness when starving (reduced from 15)

// Rent costs per week - increased to be a meaningful recurring expense
export const RENT_COSTS: Record<HousingTier, number> = {
  homeless: 0,
  slums: 75,
  modest: 95,
  noble: 120,
};

// Guild Pass cost - required before taking quests
export const GUILD_PASS_COST = 500;

export const GUILD_RANK_ORDER: GuildRank[] = [
  'novice',
  'apprentice',
  'journeyman',
  'adept',
  'veteran',
  'elite',
  'guild-master',
];

export const GUILD_RANK_REQUIREMENTS: Record<GuildRank, number> = {
  'novice': 0,
  'apprentice': 3,
  'journeyman': 10,
  'adept': 25,
  'veteran': 50,
  'elite': 100,
  'guild-master': 200,
};

export const GUILD_RANK_NAMES: Record<GuildRank, string> = {
  'novice': 'Novice',
  'apprentice': 'Apprentice',
  'journeyman': 'Journeyman',
  'adept': 'Adept',
  'veteran': 'Veteran',
  'elite': 'Elite',
  'guild-master': 'Guild Master',
};

export const GUILD_RANK_INDEX: Record<GuildRank, number> = {
  'novice': 1,
  'apprentice': 2,
  'journeyman': 3,
  'adept': 4,
  'veteran': 5,
  'elite': 6,
  'guild-master': 7,
};

export const PLAYER_COLORS = [
  { name: 'Crimson', value: '#DC2626' },
  { name: 'Azure', value: '#2563EB' },
  { name: 'Emerald', value: '#16A34A' },
  { name: 'Amber', value: '#D97706' },
];

export const AI_COLOR = { name: 'Pearl', value: '#E5E5E5' };

// Multiple AI opponent definitions (up to 4 AI players)
export const AI_OPPONENTS = [
  { id: 'ai-grimwald', name: 'Grimwald', color: '#E5E5E5' },   // Pearl
  { id: 'ai-seraphina', name: 'Seraphina', color: '#A78BFA' },  // Violet
  { id: 'ai-thornwick', name: 'Thornwick', color: '#14B8A6' },   // Teal
  { id: 'ai-morgath', name: 'Morgath', color: '#F43F5E' },       // Rose
] as const;

export interface AIConfig {
  name: string;
  difficulty: AIDifficulty;
}

// AI Difficulty levels (Jones-style)
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export const AI_DIFFICULTY_NAMES: Record<AIDifficulty, string> = {
  easy: 'Novice',
  medium: 'Cunning',
  hard: 'Master',
};

export const AI_DIFFICULTY_DESCRIPTIONS: Record<AIDifficulty, string> = {
  easy: 'Makes occasional mistakes, slower reactions',
  medium: 'Balanced gameplay, strategic decisions',
  hard: 'Highly efficient, plans multiple turns ahead',
};

// Education path display names
export const EDUCATION_PATH_NAMES: Record<EducationPath, string> = {
  fighter: 'Fighter',
  mage: 'Mage',
  priest: 'Priest',
  business: 'Business',
};
