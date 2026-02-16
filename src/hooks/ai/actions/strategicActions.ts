/**
 * Grimwald AI - General Strategic Actions
 *
 * Generates actions for general strategy: job seeking, job upgrades,
 * working, housing upgrades/downgrades, and banking withdrawals.
 */

import type { HousingTier } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { getJob, ALL_JOBS } from '@/data/jobs';
import type { AIAction } from '../types';
import {
  getBestAvailableJob,
  shouldUpgradeHousing,
  getJobLocation,
} from '../strategy';
import type { ActionContext } from './actionContext';
// Note: GAP-3 (salary negotiation) and GAP-8 (voluntary homeless) added below

/**
 * Generate general strategic actions (always considered)
 */
export function generateStrategicActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, settings, currentLocation, moveCost, progress, rivals } = ctx;

  // ============================================
  // GENERAL STRATEGIC ACTIONS (Always consider)
  // ============================================

  // Get a job if we don't have one
  if (!player.currentJob && player.timeRemaining > 8) {
    const bestJob = getBestAvailableJob(player, rivals);
    if (bestJob) {
      if (currentLocation === 'guild-hall') {
        actions.push({
          type: 'apply-job',
          priority: 70,
          description: `Apply for ${bestJob.name}`,
          details: { jobId: bestJob.id },
        });
      } else {
        actions.push({
          type: 'move',
          location: 'guild-hall',
          priority: 65,
          description: 'Travel to guild hall for employment',
        });
      }
    }
  }

  // Consider upgrading job if better one available
  // H10 FIX: Add move-to-guild-hall action if not already there
  if (player.currentJob) {
    const currentJob = getJob(player.currentJob);
    const bestJob = getBestAvailableJob(player, rivals);
    if (currentJob && bestJob && bestJob.baseWage > currentJob.baseWage * 1.2) {
      if (currentLocation === 'guild-hall') {
        actions.push({
          type: 'apply-job',
          priority: 60,
          description: `Upgrade to ${bestJob.name}`,
          details: { jobId: bestJob.id },
        });
      } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
        actions.push({
          type: 'move',
          location: 'guild-hall',
          priority: 55,
          description: 'Travel to guild hall for job upgrade',
        });
      }
    }
  }

  // Work if we have time and a job (check actual hoursPerShift, not hardcoded 6)
  if (player.currentJob) {
    const job = getJob(player.currentJob);
    if (job && player.timeRemaining >= job.hoursPerShift) {
      const jobLocation = getJobLocation(job);
      if (currentLocation === jobLocation) {
        // HARD AI: Calculate value-per-hour to determine work priority more accurately
        const valuePerHour = player.currentWage / job.hoursPerShift;
        // Base priority scales with how much wealth we need
        const wealthNeedBoost = progress.wealth.progress < 0.5 ? 20 : (progress.wealth.progress < 0.8 ? 10 : 0);
        // Hard AI recognizes high-wage jobs are more valuable per hour
        const wageBoost = settings.planningDepth >= 3 ? Math.min(15, Math.round(valuePerHour * 2)) : 0;

        actions.push({
          type: 'work',
          priority: 50 + wealthNeedBoost + wageBoost,
          description: `Work shift as ${job.name}`,
          details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
        });
      } else if (player.timeRemaining > moveCost(jobLocation) + job.hoursPerShift) {
        // HARD AI: Only travel to work if we can fit at least 1 shift
        // and the hourly value justifies the travel time
        const travelTime = moveCost(jobLocation);
        const hoursAtWork = player.timeRemaining - travelTime;
        const shiftsAvailable = Math.floor(hoursAtWork / job.hoursPerShift);

        if (shiftsAvailable >= 1) {
          // Hard AI: priority scales with number of shifts we can do there
          const shiftBonus = settings.planningDepth >= 3 ? Math.min(10, shiftsAvailable * 3) : 0;
          actions.push({
            type: 'move',
            location: jobLocation,
            priority: 45 + shiftBonus,
            description: 'Travel to work',
          });
        }
      }
    }
  }

  // HARD AI: Education-Career Pipeline Planning
  // Recognize that getting a degree -> unlocking better job -> more wealth is the optimal play
  if (settings.planningDepth >= 3 && player.currentJob) {
    const currentJob = getJob(player.currentJob);
    if (currentJob) {
      // Check if there are better jobs we ALMOST qualify for
      const bestPotentialJob = ALL_JOBS
        .filter(j => j.baseWage > currentJob.baseWage * 1.3)
        .filter(j => {
          // Check what degree we're missing
          const reqDegrees = j.requiredDegrees || [];
          const missingDegrees = reqDegrees.filter(d => !player.completedDegrees.includes(d as any));
          // Jobs where we need exactly 1 more degree are high-priority targets
          return missingDegrees.length === 1;
        })
        .sort((a, b) => b.baseWage - a.baseWage)[0];

      if (bestPotentialJob) {
        const reqDegrees = bestPotentialJob.requiredDegrees || [];
        const missingDegree = reqDegrees.find(d => !player.completedDegrees.includes(d as any));
        if (missingDegree) {
          // Boost studying this specific degree
          const progressOnMissing = player.degreeProgress[missingDegree as keyof typeof player.degreeProgress] || 0;
          if (progressOnMissing > 0) {
            // We've already started — high priority to finish
            if (currentLocation === 'academy') {
              actions.push({
                type: 'study',
                priority: 72, // Higher than normal study
                description: `Finish ${missingDegree} to unlock ${bestPotentialJob.name}`,
                details: { degreeId: missingDegree },
              });
            } else if (player.timeRemaining > moveCost('academy') + 6) {
              actions.push({
                type: 'move',
                location: 'academy',
                priority: 65,
                description: `Rush to academy to finish degree for ${bestPotentialJob.name}`,
              });
            }
          }
        }
      }
    }
  }

  // Housing upgrade/downgrade only when landlord is open (rent week or urgent)
  const isRentWeek = (ctx.week + 1) % 4 === 0;
  const hasUrgentRent = player.weeksSinceRent >= 3;
  const isLandlordOpen = isRentWeek || hasUrgentRent;

  // Housing upgrade consideration
  if (shouldUpgradeHousing(player, settings) && isLandlordOpen) {
    if (currentLocation === 'landlord') {
      actions.push({
        type: 'move-housing',
        priority: 55,
        description: 'Upgrade to Noble Heights',
        // BUG FIX: Match human cost (first month + deposit = 2x), use price-adjusted rent
        details: { tier: 'noble' as HousingTier, cost: Math.round(RENT_COSTS.noble * ctx.priceModifier) * 2, rent: Math.round(RENT_COSTS.noble * ctx.priceModifier) },
      });
    } else if (player.timeRemaining > moveCost('landlord') + 2) {
      actions.push({
        type: 'move',
        location: 'landlord',
        priority: 50,
        description: 'Travel to upgrade housing',
      });
    }
  }

  // Downgrade housing if can't afford rent
  const effectiveRent = player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing];
  if (player.housing !== 'homeless' && player.gold < effectiveRent && player.weeksSinceRent >= 3) {
    if (player.housing === 'noble') {
      if (currentLocation === 'landlord') {
        actions.push({
          type: 'downgrade-housing',
          priority: 80,
          description: 'Downgrade housing to save money',
          details: { tier: 'slums' as HousingTier },
        });
      } else if (player.timeRemaining > moveCost('landlord') + 2) {
        actions.push({
          type: 'move',
          location: 'landlord',
          priority: 75,
          description: 'Travel to landlord to downgrade housing',
        });
      }
    }
  }

  // GAP-3: Salary negotiation — request a raise when worked enough shifts
  if (player.currentJob && player.timeRemaining >= 2) {
    const job = getJob(player.currentJob);
    if (job) {
      const jobLocation = getJobLocation(job);
      // requestRaise requires 3+ shifts at current job, success chance = 40% base + dependability
      // Only attempt if dependability is decent (> 30) for reasonable success chance
      const shiftsAtJob = (player.totalShiftsWorked || 0);
      if (shiftsAtJob >= 3 && player.dependability >= 30 && player.currentWage < job.baseWage * 2.5) {
        if (currentLocation === jobLocation) {
          actions.push({
            type: 'request-raise',
            priority: 48,
            description: `Request raise at ${job.name}`,
            details: { jobId: job.id },
          });
        }
      }
    }
  }

  // GAP-8: Voluntary downgrade to homeless when completely broke and about to be evicted
  if (player.housing !== 'homeless' && player.gold < 30 && player.savings < 20 && player.weeksSinceRent >= 3) {
    if (currentLocation === 'landlord') {
      actions.push({
        type: 'downgrade-housing',
        priority: 65,
        description: 'Go homeless to avoid eviction penalties',
        details: { tier: 'homeless' as HousingTier },
      });
    } else if (player.timeRemaining > moveCost('landlord') + 2) {
      actions.push({
        type: 'move',
        location: 'landlord',
        priority: 60,
        description: 'Travel to landlord to downgrade to homeless',
      });
    }
  }

  // Withdraw money if needed
  if (player.gold < 30 && player.savings > 50) {
    if (currentLocation === 'bank') {
      actions.push({
        type: 'withdraw-bank',
        priority: 65,
        description: 'Withdraw gold from bank',
        details: { amount: Math.min(100, player.savings) },
      });
    } else if (player.timeRemaining > moveCost('bank') + 2) {
      actions.push({
        type: 'move',
        location: 'bank',
        priority: 60,
        description: 'Travel to bank to withdraw',
      });
    }
  }

  // HARD AI: Proactive banking — deposit excess gold to protect from robbery and earn interest
  // In slums, robbery risk is real. Hard AI banks more aggressively.
  if (settings.planningDepth >= 3 && player.gold > 150) {
    const robberyRisk = player.housing === 'slums';
    const depositThreshold = robberyRisk ? 100 : 250; // Bank sooner in slums
    if (player.gold > depositThreshold) {
      const keepOnHand = robberyRisk ? 80 : 120; // Gold to keep for expenses
      const depositAmount = Math.floor(player.gold - keepOnHand);
      if (depositAmount > 30) {
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
        // Otherwise, banking will happen opportunistically when passing through
      }
    }
  }

  // HARD AI: Smarter withdrawal — calculate how much we actually need
  if (settings.planningDepth >= 3 && player.gold < 50 && player.savings > 100) {
    // Calculate upcoming expenses
    const rentCost = player.housing !== 'homeless' ? (player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing]) : 0;
    const foodCost = player.foodLevel < 30 ? 15 : 0;
    const neededGold = Math.max(80, rentCost + foodCost + 50); // 50g buffer
    const withdrawAmount = Math.min(neededGold, player.savings);

    if (withdrawAmount > 30 && currentLocation === 'bank') {
      actions.push({
        type: 'withdraw-bank',
        priority: 68,
        description: `Withdraw ${withdrawAmount}g for upcoming expenses`,
        details: { amount: withdrawAmount },
      });
    }
  }

  return actions;
}
