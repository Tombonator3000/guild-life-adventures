/**
 * Grimwald AI - Multi-Step Commitment Planner
 *
 * Generates "commitment plans" that span 2-4 turns and give the AI a
 * sense of purpose and direction. Without commitment, the AI re-evaluates
 * from scratch every action, causing thrashing (work → study → work → never
 * finish degree). With commitment, the AI picks a focus and sticks to it.
 *
 * Design:
 * - Plans are generated at turn start when no valid plan exists
 * - Aligned actions get a priority bonus (+20 to +40)
 * - Plans are abandoned if: expired, crisis overrides, or milestone achieved
 * - Easy AI: no commitment (too simple)
 * - Medium AI: 2-turn plans
 * - Hard AI: 4-turn plans with smarter plan selection
 */

import type { Player } from '@/types/game.types';
import type { GoalProgress, DifficultySettings, CommitmentPlan, AIActionType } from './types';
import { getStuckGoals } from './goalVelocityTracker';
import { getRankedDegreesROI, getDegreeUnlockChain } from './strategy';
import { RENT_COSTS } from '@/types/game.types';

// ─── Plan generation helpers ──────────────────────────────────

/** Are we in a crisis situation that should override any plan? */
function isInCrisis(player: Player): boolean {
  return (
    player.foodLevel < 20 ||
    player.health < 25 ||
    player.clothingCondition <= 0 ||
    (player.weeksSinceRent >= 3 && player.housing !== 'homeless') ||
    (player.loanAmount > 0 && player.loanWeeksRemaining <= 0 && player.gold < 50)
  );
}

/** Try to generate an earn-degree plan */
function tryEarnDegreePlan(
  player: Player,
  progress: GoalProgress,
  settings: DifficultySettings,
  week: number,
): CommitmentPlan | null {
  // Only when education is not the most progressed goal
  if (progress.education.progress > 0.8) return null;

  const ranked = getRankedDegreesROI(player, settings);
  if (ranked.length === 0) return null;

  const best = ranked[0];
  // Only commit if affordable within 2 turns
  const estimatedIncome = (player.currentWage ?? 0) * 8 * 3; // rough 3-shift estimate
  const canAffordSoon = player.gold >= best.remainingTuition ||
                        player.gold + estimatedIncome >= best.remainingTuition;
  if (!canAffordSoon) return null;

  // Hard AI: plan the full unlock chain
  if (settings.planningDepth >= 3 && best.unlocksJobId) {
    const chain = getDegreeUnlockChain(best.unlocksJobId, player);
    if (chain.length > 1) {
      // Multi-degree chain — commit to first degree in chain
      const firstDegree = chain[0];
      return {
        type: 'earn-degree',
        playerId: player.id,
        targetId: firstDegree.id,
        description: `Earn ${firstDegree.name} → unlock ${best.unlocksJobId} chain`,
        startTurn: week,
        maxDuration: 6,
        alignedActions: ['study', 'graduate', 'move'] as AIActionType[],
        priorityBonus: 30,
      };
    }
  }

  // Single degree commitment
  return {
    type: 'earn-degree',
    playerId: player.id,
    targetId: best.degreeId,
    description: `Earn ${best.degreeName} (ROI score: ${Math.round(best.roiScore)})`,
    startTurn: week,
    maxDuration: settings.planningDepth >= 3 ? 6 : 4,
    alignedActions: ['study', 'graduate', 'move'] as AIActionType[],
    priorityBonus: 25,
  };
}

/** Try to generate a save-housing (upgrade to Noble) plan */
function trySaveHousingPlan(
  player: Player,
  progress: GoalProgress,
  settings: DifficultySettings,
  week: number,
): CommitmentPlan | null {
  if (player.housing === 'noble') return null;
  if (progress.wealth.progress < 0.3) return null; // Not wealthy enough to consider

  const nobleFirstMonth = RENT_COSTS.noble + 100; // First rent + move deposit buffer
  const goldNeeded = nobleFirstMonth - player.gold;
  if (goldNeeded <= 0) {
    // Can afford now — commit to actually doing it (work + move)
    return {
      type: 'save-housing',
      playerId: player.id,
      description: 'Move to Noble Heights (can afford now)',
      startTurn: week,
      maxDuration: 1,
      alignedActions: ['move-housing', 'deposit-bank', 'work', 'move'] as AIActionType[],
      priorityBonus: 35,
    };
  }

  // Save up for it
  if (goldNeeded < 200 && player.savings + player.gold > nobleFirstMonth) {
    return {
      type: 'save-housing',
      playerId: player.id,
      description: `Save ${goldNeeded}g more for Noble Heights`,
      startTurn: week,
      maxDuration: 2,
      alignedActions: ['work', 'withdraw-bank', 'move-housing', 'move'] as AIActionType[],
      priorityBonus: 20,
    };
  }

  return null;
}

/** Try to generate a dungeon-run plan */
function tryDungeonRunPlan(
  player: Player,
  progress: GoalProgress,
  settings: DifficultySettings,
  week: number,
): CommitmentPlan | null {
  // Morgath personality or adventure-focused
  if (player.dungeonFloorsCleared.length === 0 && !player.equippedWeapon) return null;
  if (player.health < 50) return null;
  if (progress.adventure && progress.adventure.target > 0 && progress.adventure.progress < 0.7) {
    return {
      type: 'dungeon-run',
      playerId: player.id,
      description: 'Dungeon run for adventure progress',
      startTurn: week,
      maxDuration: settings.planningDepth >= 3 ? 3 : 2,
      alignedActions: [
        'explore-dungeon', 'buy-equipment', 'temper-equipment',
        'buy-guild-pass', 'take-quest', 'complete-quest', 'move'
      ] as AIActionType[],
      priorityBonus: 25,
    };
  }
  return null;
}

/** Try to generate a career-push plan */
function tryCareerPushPlan(
  player: Player,
  progress: GoalProgress,
  settings: DifficultySettings,
  week: number,
): CommitmentPlan | null {
  if (progress.career.progress >= 0.75) return null;

  return {
    type: 'career-push',
    playerId: player.id,
    description: 'Career push: work + quests for dependability',
    startTurn: week,
    maxDuration: settings.planningDepth >= 3 ? 3 : 2,
    alignedActions: [
      'work', 'apply-job', 'take-quest', 'take-chain-quest',
      'complete-quest', 'request-raise', 'move'
    ] as AIActionType[],
    priorityBonus: 20,
  };
}

/** Try to generate a wealth-sprint plan */
function tryWealthSprintPlan(
  player: Player,
  progress: GoalProgress,
  settings: DifficultySettings,
  week: number,
): CommitmentPlan | null {
  if (progress.wealth.progress < 0.65) return null; // Only sprint when close

  return {
    type: 'wealth-sprint',
    playerId: player.id,
    description: `Wealth sprint (${Math.round(progress.wealth.progress * 100)}% complete)`,
    startTurn: week,
    maxDuration: 2,
    alignedActions: [
      'work', 'deposit-bank', 'sell-stock', 'complete-quest',
      'take-quest', 'move'
    ] as AIActionType[],
    priorityBonus: 30,
  };
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Generate a commitment plan for this AI player at turn start.
 * Returns null if in crisis, easy AI, or no viable plan found.
 *
 * Selection priority:
 * 1. Wealth sprint (if close to wealth goal)
 * 2. Save-housing (if can almost afford Noble)
 * 3. Earn-degree (if education is weak and affordable)
 * 4. Dungeon run (for adventure-focused AI)
 * 5. Career push (fallback for career goal)
 */
export function generateCommitmentPlan(
  player: Player,
  progress: GoalProgress,
  settings: DifficultySettings,
  week: number,
): CommitmentPlan | null {
  // Easy AI has no commitment
  if (settings.planningDepth < 2) return null;

  // No commitment during crisis
  if (isInCrisis(player)) return null;

  // Avoid committing to a stuck goal (velocity tracker integration)
  const stuckGoals = getStuckGoals(player.id);

  // Try plans in priority order, skipping if they target a stuck goal
  const wealthPlan = stuckGoals.includes('wealth') ? null : tryWealthSprintPlan(player, progress, settings, week);
  if (wealthPlan) return wealthPlan;

  const housingPlan = trySaveHousingPlan(player, progress, settings, week);
  if (housingPlan) return housingPlan;

  const degreePlan = stuckGoals.includes('education') ? null : tryEarnDegreePlan(player, progress, settings, week);
  if (degreePlan) return degreePlan;

  const dungeonPlan = tryDungeonRunPlan(player, progress, settings, week);
  if (dungeonPlan) return dungeonPlan;

  const careerPlan = stuckGoals.includes('career') ? null : tryCareerPushPlan(player, progress, settings, week);
  if (careerPlan) return careerPlan;

  return null;
}

/**
 * Check if a commitment plan is still valid (not expired, goal not complete).
 * Returns false if the plan should be abandoned.
 */
export function isCommitmentValid(
  plan: CommitmentPlan,
  player: Player,
  progress: GoalProgress,
  week: number,
): boolean {
  // Wrong player — discard plan when a different AI's turn starts
  if (plan.playerId !== player.id) return false;

  // Expired
  if (week - plan.startTurn >= plan.maxDuration) return false;

  // Crisis overrides
  if (isInCrisis(player)) return false;

  // Goal-specific completion checks
  switch (plan.type) {
    case 'earn-degree':
      if (!plan.targetId) return false;
      // Complete if degree is now done
      if (player.completedDegrees.includes(plan.targetId as any)) return false;
      return true;

    case 'save-housing':
      // Complete if now in Noble Heights
      if (player.housing === 'noble') return false;
      return true;

    case 'wealth-sprint':
      // Abandon if wealth goal is now complete
      if (progress.wealth.progress >= 1.0) return false;
      return true;

    case 'career-push':
      if (progress.career.progress >= 1.0) return false;
      return true;

    case 'dungeon-run':
      return true;

    default:
      return true;
  }
}

/**
 * Get the priority bonus to add to an action if it's aligned with the current plan.
 * Returns 0 if no plan or action not aligned.
 */
export function getCommitmentBonus(
  plan: CommitmentPlan | null,
  actionType: AIActionType,
): number {
  if (!plan) return 0;
  if (plan.alignedActions.includes(actionType)) return plan.priorityBonus;
  return 0;
}
