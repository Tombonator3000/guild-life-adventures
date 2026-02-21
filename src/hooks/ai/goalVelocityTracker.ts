/**
 * Grimwald AI - Goal Velocity Tracker
 *
 * Tracks per-goal progress velocity for each AI player across turns.
 * Detects when goals are "stuck" (no progress for 3+ turns) and
 * generates priority adjustments to help the AI break out of ruts.
 *
 * Design: Module-level state (like playerObserver.ts) using a Map
 * keyed by player ID. Record progress snapshots at turn start and
 * compute exponential moving average (EMA) of deltas.
 */

import type { GoalProgress } from './types';
import { STUCK_VELOCITY_THRESHOLD } from './types';

// ─── Types ───────────────────────────────────────────────────

interface GoalVelocityEntry {
  progressHistory: number[];     // Last 5 turn progress values (0-1)
  velocity: number;              // EMA of recent deltas (α=0.4)
  stuckTurns: number;            // Consecutive low-velocity turns
  lastUnstickTurn: number;       // Turn we last attempted a pivot
}

type GoalName = 'wealth' | 'happiness' | 'education' | 'career';

const GOAL_NAMES: GoalName[] = ['wealth', 'happiness', 'education', 'career'];

// ─── Module State ─────────────────────────────────────────────

/** velocity data per AI player: Map<playerId, Map<goalName, entry>> */
const velocityMap = new Map<string, Map<GoalName, GoalVelocityEntry>>();

const MAX_HISTORY = 5;
const EMA_ALPHA = 0.4;
const STUCK_TURNS_THRESHOLD = 3;
/** Minimum turns between unstick pivots (avoid thrashing) */
const UNSTICK_COOLDOWN = 2;

// ─── Core helpers ─────────────────────────────────────────────

function getOrCreateEntry(playerId: string, goal: GoalName): GoalVelocityEntry {
  if (!velocityMap.has(playerId)) {
    velocityMap.set(playerId, new Map());
  }
  const playerMap = velocityMap.get(playerId)!;
  if (!playerMap.has(goal)) {
    playerMap.set(goal, {
      progressHistory: [],
      velocity: 0,
      stuckTurns: 0,
      lastUnstickTurn: -99,
    });
  }
  return playerMap.get(goal)!;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Record AI goal progress at the start of each turn.
 * Call this once per AI turn before generating actions.
 *
 * @param playerId  AI player ID
 * @param progress  Current goal progress snapshot
 * @param week      Current game week (for cooldown tracking)
 */
export function recordAIGoalProgress(
  playerId: string,
  progress: GoalProgress,
  week: number,
): void {
  for (const goal of GOAL_NAMES) {
    const currentProgress = progress[goal].progress;
    const entry = getOrCreateEntry(playerId, goal);

    if (entry.progressHistory.length > 0) {
      const prev = entry.progressHistory[entry.progressHistory.length - 1];
      const delta = currentProgress - prev;

      // Update EMA velocity
      entry.velocity = entry.velocity * (1 - EMA_ALPHA) + delta * EMA_ALPHA;

      // Track stuck turns
      if (Math.abs(entry.velocity) < STUCK_VELOCITY_THRESHOLD) {
        entry.stuckTurns++;
      } else {
        entry.stuckTurns = 0;
      }
    }

    // Keep rolling history
    entry.progressHistory.push(currentProgress);
    if (entry.progressHistory.length > MAX_HISTORY) {
      entry.progressHistory.shift();
    }
  }
}

/**
 * Returns a map of goal → priority adjustment multiplier based on velocity.
 *
 * Stuck goals get their alternatives boosted; high-velocity goals get
 * a small momentum bonus. Adjustments are relative to 1.0 (no change).
 *
 * Only activates after 3+ turns of data per goal.
 *
 * @param playerId    AI player ID
 * @param week        Current week (for cooldown check)
 * @param planningDepth  Only medium/hard AI (>= 2) uses this
 */
export function getVelocityAdjustments(
  playerId: string,
  week: number,
  planningDepth: number,
): Record<string, number> {
  // Default: no adjustment
  const adjustments: Record<string, number> = {
    study: 1.0,
    graduate: 1.0,
    work: 1.0,
    'deposit-bank': 1.0,
    'apply-job': 1.0,
    'buy-appliance': 1.0,
    rest: 1.0,
    'take-quest': 1.0,
    'explore-dungeon': 1.0,
  };

  // Only strategic AI uses velocity adjustments
  if (planningDepth < 2) return adjustments;

  const playerMap = velocityMap.get(playerId);
  if (!playerMap) return adjustments;

  for (const goal of GOAL_NAMES) {
    const entry = playerMap.get(goal);
    if (!entry || entry.progressHistory.length < 3) continue;

    const isStuck = entry.stuckTurns >= STUCK_TURNS_THRESHOLD;
    const onCooldown = week - entry.lastUnstickTurn < UNSTICK_COOLDOWN;

    if (isStuck && !onCooldown) {
      // Boost alternative actions for the stuck goal
      // Mark cooldown so we don't thrash
      entry.lastUnstickTurn = week;

      switch (goal) {
        case 'education':
          // Stuck on education → boost wealth-building to save for tuition
          adjustments.work = Math.min(1.5, (adjustments.work || 1.0) * 1.3);
          adjustments['apply-job'] = Math.min(1.5, (adjustments['apply-job'] || 1.0) * 1.3);
          // Reduce study slightly (it's stuck anyway)
          adjustments.study = Math.max(0.6, (adjustments.study || 1.0) * 0.8);
          break;

        case 'wealth':
          // Stuck on wealth → boost quests, dungeons, and job-seeking
          adjustments['take-quest'] = Math.min(1.6, (adjustments['take-quest'] || 1.0) * 1.4);
          adjustments['explore-dungeon'] = Math.min(1.5, (adjustments['explore-dungeon'] || 1.0) * 1.3);
          adjustments['apply-job'] = Math.min(1.6, (adjustments['apply-job'] || 1.0) * 1.4);
          break;

        case 'career':
          // Stuck on career → boost education (unlock better jobs) and raise requests
          adjustments.study = Math.min(1.5, (adjustments.study || 1.0) * 1.3);
          adjustments.work = Math.min(1.4, (adjustments.work || 1.0) * 1.2);
          break;

        case 'happiness':
          // Stuck on happiness → boost appliances, rest, and social activities
          adjustments['buy-appliance'] = Math.min(1.6, (adjustments['buy-appliance'] || 1.0) * 1.4);
          adjustments.rest = Math.min(1.5, (adjustments.rest || 1.0) * 1.3);
          break;
      }
    } else if (!isStuck && entry.velocity > STUCK_VELOCITY_THRESHOLD * 3) {
      // High-velocity (momentum) goal: small bonus to keep it going
      switch (goal) {
        case 'education':
          adjustments.study = Math.min(1.2, (adjustments.study || 1.0) * 1.1);
          break;
        case 'wealth':
          adjustments.work = Math.min(1.2, (adjustments.work || 1.0) * 1.1);
          break;
      }
    }
  }

  return adjustments;
}

/**
 * Get names of goals currently stuck (for commitment planner to avoid them).
 */
export function getStuckGoals(playerId: string): GoalName[] {
  const playerMap = velocityMap.get(playerId);
  if (!playerMap) return [];

  return GOAL_NAMES.filter(goal => {
    const entry = playerMap.get(goal);
    return entry && entry.stuckTurns >= STUCK_TURNS_THRESHOLD;
  });
}

/**
 * Reset all velocity data. Call when starting a new game.
 */
export function resetVelocityData(): void {
  velocityMap.clear();
}
