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
  | 'general-store';

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

export interface EducationProgress {
  path: EducationPath;
  level: number;
  sessionsCompleted: number;
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
  guildRank: GuildRank;
  housing: HousingTier;
  education: Record<EducationPath, number>;
  educationProgress: Record<EducationPath, number>; // Sessions completed for current level
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
  inventory: string[];
  isAI: boolean;
  activeQuest: string | null; // Current quest ID
  hasNewspaper: boolean; // Has purchased newspaper this week
  isSick: boolean; // Has sickness debuff
  rentDebt: number; // Accumulated rent debt for garnishment
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

export const HOURS_PER_WEEK = 168;
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
