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
