// Guild Life - Game Types

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
  education: {
    [key in EducationPath]?: number;
  };
  completedQuests: number;
  clothingCondition: number;
  weeksSinceRent: number;
  isAI: boolean;
}

export interface GoalSettings {
  wealth: number;
  happiness: number;
  education: number;
  career: number;
}

export interface GameState {
  phase: 'title' | 'setup' | 'playing' | 'victory';
  currentPlayerIndex: number;
  players: Player[];
  week: number;
  priceModifier: number;
  goalSettings: GoalSettings;
  winner: string | null;
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
export const RENT_INTERVAL = 4;
export const CLOTHING_INTERVAL = 8;

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

export const GUILD_RANK_NAMES: Record<GuildRank, string> = {
  'novice': 'Novice',
  'apprentice': 'Apprentice',
  'journeyman': 'Journeyman',
  'adept': 'Adept',
  'veteran': 'Veteran',
  'elite': 'Elite',
  'guild-master': 'Guild Master',
};

export const PLAYER_COLORS = [
  { name: 'Crimson', value: '#DC2626' },
  { name: 'Azure', value: '#2563EB' },
  { name: 'Emerald', value: '#16A34A' },
  { name: 'Amber', value: '#D97706' },
];

export const AI_COLOR = { name: 'Pearl', value: '#E5E5E5' };
