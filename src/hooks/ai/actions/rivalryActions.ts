/**
 * Grimwald AI - Rivalry Actions (C4)
 *
 * Competitive behaviors: AI steals jobs, quests, and education
 * that rival players are pursuing. Only active on medium/hard difficulty.
 */

import { getJob, getAvailableJobs, canWorkJob, type Job } from '@/data/jobs';
import { getAvailableQuests, canTakeQuest } from '@/data/quests';
import { calculateGoalProgress, getWeakestGoal } from '../strategy';
import type { AIAction, GoalProgress } from '../types';
import type { ActionContext } from './actionContext';
import type { Player } from '@/types/game.types';

/**
 * Calculate a rival's goal progress to understand their strategy
 */
function getRivalFocus(rival: Player, goals: ActionContext['goals']): 'wealth' | 'happiness' | 'education' | 'career' {
  const progress = calculateGoalProgress(rival, goals);
  const weakest = getWeakestGoal(progress);
  // Filter out 'adventure' since AI rivalry only tracks the 4 core goals
  if (weakest === 'adventure') return 'wealth';
  return weakest;
}

/**
 * Check if a rival is close to winning (any goal >= 85%)
 */
function isRivalThreatening(rival: Player, goals: ActionContext['goals']): boolean {
  const progress = calculateGoalProgress(rival, goals);
  return progress.overall >= 0.70 ||
    progress.wealth.progress >= 0.85 ||
    progress.happiness.progress >= 0.85 ||
    progress.education.progress >= 0.85 ||
    progress.career.progress >= 0.85;
}

/**
 * Generate rivalry-driven actions (C4)
 * Only strategic AI (medium/hard) engages in rivalry.
 */
export function generateRivalryActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, goals, settings, rivals, currentLocation, moveCost } = ctx;

  // Only medium/hard AI engages in rivalry
  if (settings.planningDepth < 2 || rivals.length === 0) return actions;

  // Find the most threatening rival (closest to winning)
  let biggestThreat: Player | null = null;
  let biggestThreatProgress = 0;
  for (const rival of rivals) {
    const rProgress = calculateGoalProgress(rival, goals);
    if (rProgress.overall > biggestThreatProgress) {
      biggestThreatProgress = rProgress.overall;
      biggestThreat = rival;
    }
  }

  if (!biggestThreat) return actions;
  const threatIsClose = isRivalThreatening(biggestThreat, goals);
  const rivalFocus = getRivalFocus(biggestThreat, goals);

  // === RIVALRY: Steal rival's job if it's better than ours ===
  // If a rival has a high-paying job the AI qualifies for, steal it
  if (biggestThreat.currentJob && settings.aggressiveness > 0.5) {
    const rivalJob = getJob(biggestThreat.currentJob);
    if (rivalJob) {
      const canTake = canWorkJob(
        rivalJob,
        player.completedDegrees,
        player.clothingCondition,
        player.experience,
        player.dependability
      );
      const ourWage = player.currentWage || 0;
      // Steal job if it pays more than our current job (or if rival is threatening)
      if (canTake && (rivalJob.baseWage > ourWage * 1.1 || threatIsClose)) {
        const rivalPriority = threatIsClose ? 72 : 58;
        if (currentLocation === 'guild-hall') {
          actions.push({
            type: 'apply-job',
            priority: rivalPriority,
            description: `Steal ${biggestThreat.name}'s job: ${rivalJob.name}`,
            details: { jobId: rivalJob.id },
          });
        } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
          actions.push({
            type: 'move',
            location: 'guild-hall',
            priority: rivalPriority - 5,
            description: `Travel to steal ${biggestThreat.name}'s job`,
          });
        }
      }
    }
  }

  // === RIVALRY: Compete for quests ===
  // If a rival is quest-focused, try to grab available quests first
  if (player.hasGuildPass && !player.activeQuest && player.questCooldownWeeksLeft === 0) {
    const rivalHasActiveQuest = biggestThreat.activeQuest !== null;
    // If rival is NOT on a quest, we should grab one before they do
    if (!rivalHasActiveQuest && (rivalFocus === 'wealth' || rivalFocus === 'career') && threatIsClose) {
      const available = getAvailableQuests(player.guildRank);
      const takeable = available.filter(q => {
        const check = canTakeQuest(q, player.guildRank, player.education, player.inventory, player.dungeonFloorsCleared);
        return check.canTake && q.timeRequired <= player.timeRemaining && q.healthRisk <= player.health - 20;
      });

      if (takeable.length > 0) {
        // Pick highest gold quest to deny rival
        takeable.sort((a, b) => b.goldReward - a.goldReward);
        if (currentLocation === 'guild-hall') {
          actions.push({
            type: 'take-quest',
            priority: 68,
            description: `Grab quest before ${biggestThreat.name}`,
            details: { questId: takeable[0].id },
          });
        } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
          actions.push({
            type: 'move',
            location: 'guild-hall',
            priority: 63,
            description: `Race to guild hall to take quest`,
          });
        }
      }
    }
  }

  // === RIVALRY: Block education path ===
  // If rival is focused on education and we share the same available degrees,
  // boost our own education priority to stay competitive
  if (rivalFocus === 'education' && threatIsClose) {
    // Boost priority of our own education actions (already generated by goalActions)
    // We add a "study race" action with higher priority
    if (currentLocation === 'academy' && player.gold >= 5 && player.timeRemaining >= 6) {
      // Check if we have any in-progress degrees
      for (const [degreeId, progress] of Object.entries(player.degreeProgress)) {
        if (progress > 0) {
          actions.push({
            type: 'study',
            priority: 73, // higher than normal education priority
            description: `Study faster to outpace ${biggestThreat.name}`,
            details: { degreeId, cost: 5, hours: 6 },
          });
          break; // Only add one rivalry study action
        }
      }
    }
  }

  // === RIVALRY: Aggressive banking when rival is wealthy ===
  // If rival has more gold, deposit to bank more aggressively to protect savings
  if (threatIsClose && rivalFocus === 'wealth' && player.gold > 150) {
    if (currentLocation === 'bank') {
      const depositAmount = Math.floor(player.gold * 0.6);
      if (depositAmount > 50) {
        actions.push({
          type: 'deposit-bank',
          priority: 62,
          description: `Protect gold from ${biggestThreat.name}`,
          details: { amount: depositAmount },
        });
      }
    }
  }

  return actions;
}
