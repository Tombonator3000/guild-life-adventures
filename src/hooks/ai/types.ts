/**
 * Grimwald AI - Types and Constants
 *
 * All AI-related types, interfaces, and configuration constants.
 */

import type { LocationId } from '@/types/game.types';

// AI Difficulty Settings
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface DifficultySettings {
  // How aggressive the AI is in pursuing goals (0-1)
  aggressiveness: number;
  // How well the AI plans ahead (1 = reactive, 3 = strategic)
  planningDepth: number;
  // Chance the AI makes a "mistake" (0-1)
  mistakeChance: number;
  // How much the AI values efficiency (0-1)
  efficiencyWeight: number;
  // Decision delay multiplier (affects speed)
  decisionDelay: number;
}

export const DIFFICULTY_SETTINGS: Record<AIDifficulty, DifficultySettings> = {
  easy: {
    aggressiveness: 0.3,
    planningDepth: 1,
    mistakeChance: 0.2,
    efficiencyWeight: 0.3,
    decisionDelay: 800,
  },
  medium: {
    aggressiveness: 0.6,
    planningDepth: 2,
    mistakeChance: 0.08,
    efficiencyWeight: 0.6,
    decisionDelay: 500,
  },
  hard: {
    aggressiveness: 0.9,
    planningDepth: 3,
    mistakeChance: 0.02,
    efficiencyWeight: 0.9,
    decisionDelay: 300,
  },
};

// Action types the AI can take
export type AIActionType =
  | 'move'
  | 'work'
  | 'buy-food'
  | 'buy-clothing'
  | 'study'
  | 'graduate'
  | 'apply-job'
  | 'pay-rent'
  | 'deposit-bank'
  | 'withdraw-bank'
  | 'buy-appliance'
  | 'move-housing'
  | 'downgrade-housing'
  | 'rest'
  | 'heal'
  | 'buy-equipment'
  | 'temper-equipment'
  | 'repair-equipment'
  | 'explore-dungeon'
  | 'buy-guild-pass'
  | 'take-quest'
  | 'take-chain-quest'
  | 'take-bounty'
  | 'complete-quest'
  | 'cure-sickness'
  | 'take-loan'
  | 'repay-loan'
  | 'buy-stock'
  | 'sell-stock'
  | 'buy-fresh-food'
  | 'buy-ticket'
  | 'sell-item'
  | 'pawn-appliance'
  | 'buy-lottery-ticket'
  | 'cast-curse'
  | 'cast-location-hex'
  | 'buy-amulet'
  | 'buy-hex-scroll'
  | 'repair-appliance'
  | 'request-raise'
  | 'dispel-hex'
  | 'dark-ritual'
  | 'end-turn';

export interface AIAction {
  type: AIActionType;
  location?: LocationId;
  priority: number;
  details?: Record<string, unknown>;
  description: string;
}

// Goal progress tracking
export interface GoalProgress {
  wealth: { current: number; target: number; progress: number };
  happiness: { current: number; target: number; progress: number };
  education: { current: number; target: number; progress: number };
  career: { current: number; target: number; progress: number };
  adventure: { current: number; target: number; progress: number }; // 0 target = disabled
  overall: number; // Average progress toward all goals
}

export interface ResourceUrgency {
  food: number;
  rent: number;
  clothing: number;
  health: number;
  housing: number; // Urgency to upgrade housing (for robbery protection)
}

// ============================================
// AI PERSONALITY SYSTEM
// ============================================

/**
 * Personality profiles that differentiate AI opponents beyond just difficulty.
 * Each AI opponent has a unique personality that modifies their priority weights.
 */
export type AIPersonalityId = 'grimwald' | 'seraphina' | 'thornwick' | 'morgath';

export interface AIPersonality {
  id: AIPersonalityId;
  name: string;
  description: string;
  // Priority weight multipliers (1.0 = normal, >1 = favored, <1 = deprioritized)
  weights: {
    education: number;    // Study/graduation priority multiplier
    wealth: number;       // Work/banking priority multiplier
    combat: number;       // Dungeon/equipment priority multiplier
    social: number;       // Happiness/rest/appliance priority multiplier
    caution: number;      // Health/healing/insurance priority multiplier (higher = more cautious)
    rivalry: number;      // Competitive actions multiplier
    gambling: number;     // Lottery/stocks risk tolerance
  };
  // Goal preference: which goal this personality naturally gravitates toward
  // Used as tiebreaker when goals are equally weighted
  preferredGoal: 'wealth' | 'happiness' | 'education' | 'career' | 'adventure';
  // Banking behavior: fraction of gold to keep on hand (vs depositing)
  goldBuffer: number; // 0-1, higher = keeps more gold on hand
  // How early to start buying food (threshold multiplier for food urgency)
  foodCaution: number; // 1.0 = normal, 1.5 = buys food earlier
  // Risk threshold for dungeon exploration (multiplier on health check)
  dungeonRiskTolerance: number; // 1.0 = normal, 0.7 = braver, 1.3 = more cautious
}

/**
 * Four unique AI personalities matching the four AI opponents.
 *
 * Grimwald: Balanced generalist — good at everything, master of nothing
 * Seraphina: The Scholar — prioritizes education, cautious, long-term planning
 * Thornwick: The Merchant — prioritizes wealth, aggressive banking, stock savvy
 * Morgath: The Warrior — prioritizes combat/adventure, risk-taker, dungeon focus
 */
export const AI_PERSONALITIES: Record<AIPersonalityId, AIPersonality> = {
  grimwald: {
    id: 'grimwald',
    name: 'Grimwald',
    description: 'Balanced generalist — adapts to whatever the game demands',
    weights: {
      education: 1.0,
      wealth: 1.0,
      combat: 1.0,
      social: 1.0,
      caution: 1.0,
      rivalry: 1.0,
      gambling: 1.0,
    },
    preferredGoal: 'career',
    goldBuffer: 0.3,
    foodCaution: 1.0,
    dungeonRiskTolerance: 1.0,
  },
  seraphina: {
    id: 'seraphina',
    name: 'Seraphina',
    description: 'The Scholar — invests heavily in education and plays it safe',
    weights: {
      education: 1.5,    // +50% education priority
      wealth: 0.8,       // Less focused on pure wealth
      combat: 0.7,       // Avoids dungeon until well-prepared
      social: 1.2,       // Values happiness and rest
      caution: 1.4,      // Very cautious about health
      rivalry: 0.7,      // Less competitive, more cooperative
      gambling: 0.5,     // Low risk tolerance
    },
    preferredGoal: 'education',
    goldBuffer: 0.4,          // Keeps more gold for tuition
    foodCaution: 1.3,         // Buys food earlier
    dungeonRiskTolerance: 1.4, // Needs more health before dungeon
  },
  thornwick: {
    id: 'thornwick',
    name: 'Thornwick',
    description: 'The Merchant — maximizes gold, aggressive banking and stocks',
    weights: {
      education: 0.8,    // Education mainly for job unlocks
      wealth: 1.5,       // +50% wealth priority
      combat: 0.9,       // Dungeons mainly for gold
      social: 0.7,       // Less focus on happiness activities
      caution: 0.9,      // Slightly less cautious
      rivalry: 1.3,      // Very competitive
      gambling: 1.5,     // High risk tolerance, loves stocks
    },
    preferredGoal: 'wealth',
    goldBuffer: 0.2,          // Deposits aggressively, keeps less on hand
    foodCaution: 0.9,         // Slightly later food buying
    dungeonRiskTolerance: 0.9, // Takes slightly more risk for gold
  },
  morgath: {
    id: 'morgath',
    name: 'Morgath',
    description: 'The Warrior — seeks combat, equipment, and adventure',
    weights: {
      education: 0.7,    // Minimum education (combat training focus)
      wealth: 0.9,       // Money is for equipment
      combat: 1.6,       // +60% dungeon/equipment priority
      social: 0.6,       // Least interested in social activities
      caution: 0.7,      // Low caution, high risk
      rivalry: 1.2,      // Competitive but focused on own path
      gambling: 1.2,     // Moderate risk tolerance
    },
    preferredGoal: 'adventure',
    goldBuffer: 0.25,          // Spends gold on equipment
    foodCaution: 0.8,          // Tough, buys food later
    dungeonRiskTolerance: 0.6, // Very brave, enters dungeon at lower health
  },
};

/**
 * Map AI opponent IDs to personality IDs.
 */
export const AI_ID_TO_PERSONALITY: Record<string, AIPersonalityId> = {
  'ai-grimwald': 'grimwald',
  'ai-seraphina': 'seraphina',
  'ai-thornwick': 'thornwick',
  'ai-morgath': 'morgath',
};

/**
 * Get personality for an AI player by their player ID.
 * Falls back to grimwald (balanced) if no match.
 */
export function getAIPersonality(playerId: string): AIPersonality {
  const personalityId = AI_ID_TO_PERSONALITY[playerId] || 'grimwald';
  return AI_PERSONALITIES[personalityId];
}
