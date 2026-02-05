// Guild Life - Game Types (based on Jones in the Fast Lane)

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
  | 'cave';

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

export interface Player {
  id: string;
  name: string;
  color: string;
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
  dependability: number; // 0-100, affects job performance and raise chance
  experience: number; // Work experience points
  relaxation: number; // 10-50, affects apartment robbery chance (higher = safer)
  durables: DurableItems; // Durable items owned (stored at apartment)
  appliances: AppliancesInventory; // Appliances with detailed tracking
  applianceHistory: string[]; // List of appliance types ever owned (for happiness bonus tracking)
  inventory: string[];
  isAI: boolean;
  activeQuest: string | null; // Current quest ID
  hasNewspaper: boolean; // Has purchased newspaper this week
  isSick: boolean; // Has sickness debuff
  rentDebt: number; // Accumulated rent debt for garnishment
  // Housing prepayment system (Jones-style)
  rentPrepaidWeeks: number; // Number of weeks rent paid in advance
  lockedRent: number; // Locked-in rent price (0 = not locked, uses current rate)
  // Death/Game Over state
  isGameOver: boolean; // True if player has died and is out of the game
}

export interface GoalSettings {
  wealth: number;      // Target gold + savings + investments
  happiness: number;   // Target happiness %
  education: number;   // Target education levels
  career: number;      // Target guild rank (1-7)
}

export interface GameState {
  phase: 'title' | 'setup' | 'playing' | 'victory' | 'event';
  currentPlayerIndex: number;
  players: Player[];
  week: number;
  priceModifier: number;
  goalSettings: GoalSettings;
  winner: string | null;
  eventMessage: string | null;
  rentDueWeek: number; // Week when rent is next due
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

// Jones-style: Each turn has 60 Hours (time points)
export const HOURS_PER_TURN = 60;
// Legacy constant for backward compatibility
export const HOURS_PER_WEEK = HOURS_PER_TURN;
export const RENT_INTERVAL = 4; // Rent due every 4 weeks
export const CLOTHING_INTERVAL = 8; // Clothing degrades every 8 weeks
export const FOOD_DEPLETION_PER_WEEK = 25; // Lose 25 food per week
export const STARVATION_HEALTH_PENALTY = 10; // Lose 10 health when starving
export const STARVATION_HAPPINESS_PENALTY = 15; // Lose 15 happiness when starving

export const RENT_COSTS: Record<HousingTier, number> = {
  homeless: 0,
  slums: 50,
  modest: 150,
  noble: 400,
};

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

// Education path display names
export const EDUCATION_PATH_NAMES: Record<EducationPath, string> = {
  fighter: 'Fighter',
  mage: 'Mage',
  priest: 'Priest',
  business: 'Business',
};
