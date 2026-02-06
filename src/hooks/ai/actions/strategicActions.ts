/**
 * Grimwald AI - General Strategic Actions
 *
 * Generates actions for general strategy: job seeking, job upgrades,
 * working, housing upgrades/downgrades, and banking withdrawals.
 */

import type { HousingTier } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { getJob } from '@/data/jobs';
import type { AIAction } from '../types';
import {
  getBestAvailableJob,
  shouldUpgradeHousing,
  getJobLocation,
} from '../strategy';
import type { ActionContext } from './actionContext';

/**
 * Generate general strategic actions (always considered)
 */
export function generateStrategicActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, settings, currentLocation, moveCost, progress } = ctx;

  // ============================================
  // GENERAL STRATEGIC ACTIONS (Always consider)
  // ============================================

  // Get a job if we don't have one
  if (!player.currentJob && player.timeRemaining > 8) {
    const bestJob = getBestAvailableJob(player);
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
  if (player.currentJob) {
    const currentJob = getJob(player.currentJob);
    const bestJob = getBestAvailableJob(player);
    if (currentJob && bestJob && bestJob.baseWage > currentJob.baseWage * 1.2) {
      if (currentLocation === 'guild-hall') {
        actions.push({
          type: 'apply-job',
          priority: 60,
          description: `Upgrade to ${bestJob.name}`,
          details: { jobId: bestJob.id },
        });
      }
    }
  }

  // Work if we have time and a job (check actual hoursPerShift, not hardcoded 6)
  if (player.currentJob) {
    const job = getJob(player.currentJob);
    if (job && player.timeRemaining >= job.hoursPerShift) {
      const jobLocation = getJobLocation(job);
      if (currentLocation === jobLocation || currentLocation === 'guild-hall') {
        actions.push({
          type: 'work',
          priority: 50 + (progress.wealth.progress < 0.5 ? 20 : 0),
          description: `Work shift as ${job.name}`,
          details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
        });
      } else if (player.timeRemaining > moveCost(jobLocation) + job.hoursPerShift) {
        actions.push({
          type: 'move',
          location: jobLocation,
          priority: 45,
          description: 'Travel to work',
        });
      }
    }
  }

  // Housing upgrade consideration
  if (shouldUpgradeHousing(player, settings)) {
    if (currentLocation === 'landlord') {
      actions.push({
        type: 'move-housing',
        priority: 55,
        description: 'Upgrade to Noble Heights',
        details: { tier: 'noble' as HousingTier },
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
  if (player.housing !== 'homeless' && player.gold < RENT_COSTS[player.housing] && player.weeksSinceRent >= 3) {
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

  return actions;
}
