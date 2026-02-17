/**
 * Grimwald AI - General Strategic Actions
 *
 * Generates actions for general strategy: job seeking, job upgrades,
 * working, housing upgrades/downgrades, and banking withdrawals.
 *
 * Refactored: Each concern extracted into a focused sub-generator.
 * Main function combines results via dispatch.
 */

import type { HousingTier } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { getJob, ALL_JOBS } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import type { AIAction } from '../types';
import {
  getBestAvailableJob,
  shouldUpgradeHousing,
  getJobLocation,
} from '../strategy';
import type { ActionContext } from './actionContext';

// ============================================
// Sub-generators (one per strategic concern)
// ============================================

/** Get a job if unemployed */
function generateJobSeekingActions(ctx: ActionContext): AIAction[] {
  const { player, currentLocation, moveCost } = ctx;
  if (player.currentJob || player.timeRemaining <= 8) return [];

  const bestJob = getBestAvailableJob(player, ctx.rivals);
  if (!bestJob) return [];

  if (currentLocation === 'guild-hall') {
    return [{
      type: 'apply-job',
      priority: 70,
      description: `Apply for ${bestJob.name}`,
      details: { jobId: bestJob.id },
    }];
  }
  return [{
    type: 'move',
    location: 'guild-hall',
    priority: 65,
    description: 'Travel to guild hall for employment',
  }];
}

/** Upgrade to a better-paying job */
function generateJobUpgradeActions(ctx: ActionContext): AIAction[] {
  const { player, currentLocation, moveCost, rivals } = ctx;
  if (!player.currentJob) return [];

  const currentJob = getJob(player.currentJob);
  const bestJob = getBestAvailableJob(player, rivals);
  if (!currentJob || !bestJob || bestJob.baseWage <= currentJob.baseWage * 1.2) return [];

  if (currentLocation === 'guild-hall') {
    return [{
      type: 'apply-job',
      priority: 60,
      description: `Upgrade to ${bestJob.name}`,
      details: { jobId: bestJob.id },
    }];
  }
  if (player.timeRemaining > moveCost('guild-hall') + 2) {
    return [{
      type: 'move',
      location: 'guild-hall',
      priority: 55,
      description: 'Travel to guild hall for job upgrade',
    }];
  }
  return [];
}

/** Work a shift if we have a job and time */
function generateWorkActions(ctx: ActionContext): AIAction[] {
  const { player, settings, currentLocation, moveCost, progress } = ctx;
  if (!player.currentJob) return [];

  const job = getJob(player.currentJob);
  if (!job || player.timeRemaining < job.hoursPerShift) return [];

  const jobLocation = getJobLocation(job);
  if (currentLocation === jobLocation) {
    // HARD AI: Calculate value-per-hour to determine work priority more accurately
    const valuePerHour = player.currentWage / job.hoursPerShift;
    const wealthNeedBoost = progress.wealth.progress < 0.5 ? 20 : (progress.wealth.progress < 0.8 ? 10 : 0);
    const wageBoost = settings.planningDepth >= 3 ? Math.min(15, Math.round(valuePerHour * 2)) : 0;

    return [{
      type: 'work',
      priority: 50 + wealthNeedBoost + wageBoost,
      description: `Work shift as ${job.name}`,
      details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
    }];
  }

  if (player.timeRemaining > moveCost(jobLocation) + job.hoursPerShift) {
    const travelTime = moveCost(jobLocation);
    const hoursAtWork = player.timeRemaining - travelTime;
    const shiftsAvailable = Math.floor(hoursAtWork / job.hoursPerShift);

    if (shiftsAvailable >= 1) {
      const shiftBonus = settings.planningDepth >= 3 ? Math.min(10, shiftsAvailable * 3) : 0;
      return [{
        type: 'move',
        location: jobLocation,
        priority: 45 + shiftBonus,
        description: 'Travel to work',
      }];
    }
  }
  return [];
}

/** HARD AI: Education-Career Pipeline — finish a degree to unlock a better job */
function generateEducationPipelineActions(ctx: ActionContext): AIAction[] {
  const { player, settings, currentLocation, moveCost } = ctx;
  if (settings.planningDepth < 3 || !player.currentJob) return [];

  const currentJob = getJob(player.currentJob);
  if (!currentJob) return [];

  // Find jobs where we need exactly 1 more degree (high-priority targets)
  const bestPotentialJob = ALL_JOBS
    .filter(j => j.baseWage > currentJob.baseWage * 1.3)
    .filter(j => {
      const reqDegrees = j.requiredDegrees || [];
      const missingDegrees = reqDegrees.filter(d => !player.completedDegrees.includes(d as any));
      return missingDegrees.length === 1;
    })
    .sort((a, b) => b.baseWage - a.baseWage)[0];

  if (!bestPotentialJob) return [];

  const reqDegrees = bestPotentialJob.requiredDegrees || [];
  const missingDegree = reqDegrees.find(d => !player.completedDegrees.includes(d as any));
  if (!missingDegree) return [];

  const progressOnMissing = player.degreeProgress[missingDegree as keyof typeof player.degreeProgress] || 0;
  if (progressOnMissing <= 0) return [];

  // We've already started — high priority to finish
  const degree = DEGREES[missingDegree as keyof typeof DEGREES];
  if (currentLocation === 'academy') {
    return [{
      type: 'study',
      priority: 72,
      description: `Finish ${missingDegree} to unlock ${bestPotentialJob.name}`,
      details: { degreeId: missingDegree, cost: degree?.costPerSession ?? 5, hours: degree?.hoursPerSession ?? 6 },
    }];
  }
  if (player.timeRemaining > moveCost('academy') + (degree?.hoursPerSession ?? 6)) {
    return [{
      type: 'move',
      location: 'academy',
      priority: 65,
      description: `Rush to academy to finish degree for ${bestPotentialJob.name}`,
    }];
  }
  return [];
}

/** Housing upgrade when affordable and landlord is accessible */
function generateHousingUpgradeActions(ctx: ActionContext): AIAction[] {
  const { player, settings, currentLocation, moveCost, week } = ctx;

  const isRentWeek = (week + 1) % 4 === 0;
  const hasUrgentRent = player.weeksSinceRent >= 3;
  if (!isRentWeek && !hasUrgentRent) return [];
  if (!shouldUpgradeHousing(player, settings)) return [];

  if (currentLocation === 'landlord') {
    return [{
      type: 'move-housing',
      priority: 55,
      description: 'Upgrade to Noble Heights',
      details: { tier: 'noble' as HousingTier, cost: Math.round(RENT_COSTS.noble * ctx.priceModifier) * 2, rent: Math.round(RENT_COSTS.noble * ctx.priceModifier) },
    }];
  }
  if (player.timeRemaining > moveCost('landlord') + 2) {
    return [{
      type: 'move',
      location: 'landlord',
      priority: 50,
      description: 'Travel to upgrade housing',
    }];
  }
  return [];
}

/** Downgrade housing when can't afford rent */
function generateHousingDowngradeActions(ctx: ActionContext): AIAction[] {
  const { player, currentLocation, moveCost } = ctx;

  const effectiveRent = player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing];
  if (player.housing === 'homeless' || player.gold >= effectiveRent || player.weeksSinceRent < 3) return [];
  if (player.housing !== 'noble') return [];

  if (currentLocation === 'landlord') {
    return [{
      type: 'downgrade-housing',
      priority: 80,
      description: 'Downgrade housing to save money',
      details: { tier: 'slums' as HousingTier },
    }];
  }
  if (player.timeRemaining > moveCost('landlord') + 2) {
    return [{
      type: 'move',
      location: 'landlord',
      priority: 75,
      description: 'Travel to landlord to downgrade housing',
    }];
  }
  return [];
}

/** Salary negotiation — request a raise after enough shifts */
function generateSalaryNegotiationActions(ctx: ActionContext): AIAction[] {
  const { player, currentLocation } = ctx;
  if (!player.currentJob || player.timeRemaining < 2) return [];

  const job = getJob(player.currentJob);
  if (!job) return [];

  const jobLocation = getJobLocation(job);
  const shiftsAtJob = player.totalShiftsWorked || 0;
  if (shiftsAtJob < 3 || player.dependability < 30 || player.currentWage >= job.baseWage * 2.5) return [];

  if (currentLocation === jobLocation) {
    return [{
      type: 'request-raise',
      priority: 48,
      description: `Request raise at ${job.name}`,
      details: { jobId: job.id },
    }];
  }
  return [];
}

/** Voluntary downgrade to homeless when completely broke and about to be evicted */
function generateVoluntaryHomelessActions(ctx: ActionContext): AIAction[] {
  const { player, currentLocation, moveCost } = ctx;
  if (player.housing === 'homeless') return [];
  if (player.gold >= 30 || player.savings >= 20 || player.weeksSinceRent < 3) return [];

  if (currentLocation === 'landlord') {
    return [{
      type: 'downgrade-housing',
      priority: 65,
      description: 'Go homeless to avoid eviction penalties',
      details: { tier: 'homeless' as HousingTier },
    }];
  }
  if (player.timeRemaining > moveCost('landlord') + 2) {
    return [{
      type: 'move',
      location: 'landlord',
      priority: 60,
      description: 'Travel to landlord to downgrade to homeless',
    }];
  }
  return [];
}

/** Withdraw money from bank when running low on gold */
function generateWithdrawalActions(ctx: ActionContext): AIAction[] {
  const { player, currentLocation, moveCost } = ctx;
  if (player.gold >= 30 || player.savings <= 50) return [];

  if (currentLocation === 'bank') {
    return [{
      type: 'withdraw-bank',
      priority: 65,
      description: 'Withdraw gold from bank',
      details: { amount: Math.min(100, player.savings) },
    }];
  }
  if (player.timeRemaining > moveCost('bank') + 2) {
    return [{
      type: 'move',
      location: 'bank',
      priority: 60,
      description: 'Travel to bank to withdraw',
    }];
  }
  return [];
}

/** HARD AI: Proactive banking — deposit excess gold to protect from robbery */
function generateProactiveBankingActions(ctx: ActionContext): AIAction[] {
  const { player, settings, currentLocation, moveCost } = ctx;
  if (settings.planningDepth < 3 || player.gold <= 150) return [];

  const robberyRisk = player.housing === 'slums';
  const depositThreshold = robberyRisk ? 100 : 250;
  if (player.gold <= depositThreshold) return [];

  const keepOnHand = robberyRisk ? 80 : 120;
  const depositAmount = Math.floor(player.gold - keepOnHand);
  if (depositAmount <= 30) return [];

  const actions: AIAction[] = [];
  if (currentLocation === 'bank') {
    actions.push({
      type: 'deposit-bank',
      priority: robberyRisk ? 58 : 45,
      description: robberyRisk ? 'Deposit gold to protect from robbery' : 'Deposit excess gold for interest',
      details: { amount: depositAmount },
    });
  } else if (player.timeRemaining > moveCost('bank') + 2 && robberyRisk) {
    // Only travel specifically for banking if robbery risk is high
    actions.push({
      type: 'move',
      location: 'bank',
      priority: 48,
      description: 'Travel to bank to protect gold from robbery',
    });
  }
  return actions;
}

/** HARD AI: Smarter withdrawal — calculate how much we actually need */
function generateSmartWithdrawalActions(ctx: ActionContext): AIAction[] {
  const { player, settings, currentLocation } = ctx;
  if (settings.planningDepth < 3 || player.gold >= 50 || player.savings <= 100) return [];

  const rentCost = player.housing !== 'homeless' ? (player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing]) : 0;
  const foodCost = player.foodLevel < 30 ? 15 : 0;
  const neededGold = Math.max(80, rentCost + foodCost + 50);
  const withdrawAmount = Math.min(neededGold, player.savings);

  if (withdrawAmount <= 30 || currentLocation !== 'bank') return [];

  return [{
    type: 'withdraw-bank',
    priority: 68,
    description: `Withdraw ${withdrawAmount}g for upcoming expenses`,
    details: { amount: withdrawAmount },
  }];
}

// ============================================
// Sub-generator registry
// ============================================

const STRATEGY_GENERATORS: Array<(ctx: ActionContext) => AIAction[]> = [
  generateJobSeekingActions,
  generateJobUpgradeActions,
  generateWorkActions,
  generateEducationPipelineActions,
  generateHousingUpgradeActions,
  generateHousingDowngradeActions,
  generateSalaryNegotiationActions,
  generateVoluntaryHomelessActions,
  generateWithdrawalActions,
  generateProactiveBankingActions,
  generateSmartWithdrawalActions,
];

// ============================================
// Main entry point
// ============================================

/**
 * Generate general strategic actions (always considered).
 * Combines results from 11 focused sub-generators.
 */
export function generateStrategicActions(ctx: ActionContext): AIAction[] {
  return STRATEGY_GENERATORS.flatMap(gen => gen(ctx));
}
