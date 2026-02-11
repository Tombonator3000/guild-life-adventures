/**
 * Grimwald AI - Dynamic Difficulty Adjustment
 *
 * Monitors the gap between human and AI performance and adjusts AI
 * difficulty parameters in real-time to keep the game competitive.
 *
 * This creates "rubber-banding" — if the human is dominating, the AI
 * plays tighter (fewer mistakes, more aggressive); if the human is
 * struggling, the AI eases off (more mistakes, less efficient).
 *
 * Adjustments are subtle (±20% range) to avoid obvious difficulty swings.
 * The system only activates after week 5 to let the game establish naturally.
 */

import type { Player } from '@/types/game.types';
import type { DifficultySettings, GoalProgress } from './types';
import { calculateGoalProgress } from './strategy';

// ─── Types ───────────────────────────────────────────────────────────────

/** Adjustments applied on top of base difficulty settings */
export interface DifficultyAdjustment {
  /** Multiplier on mistake chance (0.5 = half mistakes, 2.0 = double) */
  mistakeMultiplier: number;
  /** Additive boost to aggressiveness (-0.15 to +0.15) */
  aggressivenessBoost: number;
  /** Additive boost to efficiency weight (-0.15 to +0.15) */
  efficiencyBoost: number;
  /** The performance gap that triggered this adjustment (-1 to +1) */
  performanceGap: number;
  /** Whether adjustment is active (false if too early or no humans) */
  active: boolean;
}

/** Performance snapshot for trend tracking */
interface PerformanceRecord {
  week: number;
  humanProgress: number;  // Average overall progress across human players
  aiProgress: number;     // This AI's overall progress
  gap: number;            // human - ai (positive = human leading)
}

// ─── Module State ────────────────────────────────────────────────────────

/** Performance history per AI player ID */
const performanceHistory = new Map<string, PerformanceRecord[]>();

/** Maximum records to keep */
const MAX_HISTORY = 20;

/** Minimum week before adjustment activates */
const ACTIVATION_WEEK = 5;

/** No-adjustment baseline */
const NEUTRAL: DifficultyAdjustment = {
  mistakeMultiplier: 1.0,
  aggressivenessBoost: 0,
  efficiencyBoost: 0,
  performanceGap: 0,
  active: false,
};

// ─── Core Functions ──────────────────────────────────────────────────────

/**
 * Record current performance data for an AI player.
 * Call this once per AI turn.
 */
export function recordPerformance(
  aiPlayer: Player,
  humanPlayers: Player[],
  goals: { wealth: number; happiness: number; education: number; career: number; adventure?: number },
  week: number,
): void {
  if (humanPlayers.length === 0 || week < ACTIVATION_WEEK) return;

  const aiProgress = calculateGoalProgress(aiPlayer, goals);

  // Average human progress
  let totalHumanProgress = 0;
  for (const human of humanPlayers) {
    const hp = calculateGoalProgress(human, goals);
    totalHumanProgress += hp.overall;
  }
  const avgHumanProgress = totalHumanProgress / humanPlayers.length;

  const record: PerformanceRecord = {
    week,
    humanProgress: avgHumanProgress,
    aiProgress: aiProgress.overall,
    gap: avgHumanProgress - aiProgress.overall,
  };

  let history = performanceHistory.get(aiPlayer.id);
  if (!history) {
    history = [];
    performanceHistory.set(aiPlayer.id, history);
  }

  // Avoid duplicate records for the same week
  if (history.length > 0 && history[history.length - 1].week === week) {
    history[history.length - 1] = record;
  } else {
    history.push(record);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
  }
}

/**
 * Calculate difficulty adjustment based on performance history.
 *
 * The adjustment uses an exponentially-weighted moving average of the
 * performance gap, giving more weight to recent turns while still
 * considering the overall trend.
 *
 * Positive gap = human ahead → AI gets stronger
 * Negative gap = AI ahead → AI gets weaker
 */
export function calculateAdjustment(aiPlayerId: string): DifficultyAdjustment {
  const history = performanceHistory.get(aiPlayerId);
  if (!history || history.length < 3) return NEUTRAL;

  // Calculate exponentially-weighted average gap
  // Recent turns matter more (weight doubles every 3 turns)
  let weightedGapSum = 0;
  let weightSum = 0;
  for (let i = 0; i < history.length; i++) {
    const recency = i / history.length; // 0 = oldest, ~1 = newest
    const weight = Math.pow(2, recency * 2); // Exponential: recent has ~4x weight
    weightedGapSum += history[i].gap * weight;
    weightSum += weight;
  }
  const avgGap = weightedGapSum / weightSum;

  // Also consider the trend (is the gap growing or shrinking?)
  const recentGaps = history.slice(-3).map(r => r.gap);
  const trend = recentGaps.length >= 2
    ? recentGaps[recentGaps.length - 1] - recentGaps[0]
    : 0;

  // Combined signal: current gap + trend
  // Trend amplifies or dampens the adjustment
  const signal = avgGap + trend * 0.3;

  // Clamp signal to ±0.5 range
  const clampedSignal = Math.max(-0.5, Math.min(0.5, signal));

  // Convert signal to adjustments
  // Positive signal (human ahead) → reduce mistakes, boost aggression
  // Negative signal (AI ahead) → increase mistakes, reduce aggression
  const adjustment: DifficultyAdjustment = {
    // Mistake multiplier: human ahead → 0.5x (half mistakes), AI ahead → 1.5x (50% more mistakes)
    // Linear map from signal [-0.5, 0.5] to multiplier [1.5, 0.5]
    mistakeMultiplier: 1.0 - clampedSignal,

    // Aggressiveness: human ahead → +0.15, AI ahead → -0.15
    aggressivenessBoost: clampedSignal * 0.3,

    // Efficiency: human ahead → +0.15, AI ahead → -0.15
    efficiencyBoost: clampedSignal * 0.3,

    performanceGap: avgGap,
    active: true,
  };

  return adjustment;
}

/**
 * Apply difficulty adjustment to base settings, returning modified settings.
 * The original settings are not mutated.
 */
export function applyAdjustment(
  base: DifficultySettings,
  adjustment: DifficultyAdjustment,
): DifficultySettings {
  if (!adjustment.active) return base;

  return {
    ...base,
    mistakeChance: Math.max(0.005, Math.min(0.35, base.mistakeChance * adjustment.mistakeMultiplier)),
    aggressiveness: Math.max(0.1, Math.min(1.0, base.aggressiveness + adjustment.aggressivenessBoost)),
    efficiencyWeight: Math.max(0.1, Math.min(1.0, base.efficiencyWeight + adjustment.efficiencyBoost)),
    // planningDepth and decisionDelay are NOT adjusted — they change AI capabilities too drastically
  };
}

/**
 * Reset all performance history. Call when starting a new game.
 */
export function resetPerformanceHistory(): void {
  performanceHistory.clear();
}

/**
 * Get the current performance gap for an AI (for debugging/UI).
 * Returns 0 if no data available.
 */
export function getCurrentGap(aiPlayerId: string): number {
  const history = performanceHistory.get(aiPlayerId);
  if (!history || history.length === 0) return 0;
  return history[history.length - 1].gap;
}

/**
 * Get full adjustment details for debugging/UI.
 */
export function getAdjustmentDetails(aiPlayerId: string): {
  adjustment: DifficultyAdjustment;
  historyLength: number;
  recentGaps: number[];
} {
  const adjustment = calculateAdjustment(aiPlayerId);
  const history = performanceHistory.get(aiPlayerId) || [];
  return {
    adjustment,
    historyLength: history.length,
    recentGaps: history.slice(-5).map(r => r.gap),
  };
}
