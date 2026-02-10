/**
 * Grimwald AI - Goal-Oriented Actions
 *
 * Generates actions based on the weakest goal (education, wealth, happiness, career).
 * Also handles opportunistic graduation checks.
 */

import { getJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import type { AIAction } from '../types';
import {
  getBestAvailableJob,
  getNextDegree,
  calculateBankingStrategy,
  getJobLocation,
  getBestQuest,
  getBestDungeonFloor,
} from '../strategy';
import type { ActionContext } from './actionContext';

/**
 * Generate actions based on the weakest goal focus + opportunistic graduation
 */
export function generateGoalActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, settings, currentLocation, moveCost, progress, weakestGoal, rivals } = ctx;

  // ============================================
  // GOAL-ORIENTED ACTIONS
  // ============================================

  // Focus strategy based on weakest goal
  switch (weakestGoal) {
    case 'education':
      // Pursue education
      const nextDegree = getNextDegree(player, settings);
      if (nextDegree) {
        const degreeProgress = player.degreeProgress[nextDegree.id] || 0;
        const sessionsLeft = nextDegree.sessionsRequired - degreeProgress;

        // Can graduate?
        if (sessionsLeft <= 0 && currentLocation === 'academy') {
          actions.push({
            type: 'graduate',
            priority: 85,
            description: `Graduate from ${nextDegree.name}`,
            details: { degreeId: nextDegree.id },
          });
        }
        // Can study?
        else if (player.gold >= nextDegree.costPerSession &&
                 player.timeRemaining >= nextDegree.hoursPerSession) {
          if (currentLocation === 'academy') {
            actions.push({
              type: 'study',
              priority: 70 + (settings.aggressiveness * 20),
              description: `Study ${nextDegree.name}`,
              details: { degreeId: nextDegree.id, cost: nextDegree.costPerSession, hours: nextDegree.hoursPerSession },
            });
          } else {
            const movementCost = moveCost('academy');
            if (player.timeRemaining > movementCost + nextDegree.hoursPerSession) {
              actions.push({
                type: 'move',
                location: 'academy',
                priority: 65,
                description: 'Travel to academy to study',
              });
            }
          }
        }
      }
      break;

    case 'wealth':
      // Focus on earning money
      // Prioritize working if we have a good job
      if (player.currentJob) {
        const job = getJob(player.currentJob);
        if (job && player.timeRemaining >= job.hoursPerShift) {
          const jobLocation = getJobLocation(job);
          if (currentLocation === jobLocation) {
            actions.push({
              type: 'work',
              priority: 80,
              description: `Work as ${job.name}`,
              details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
            });
          } else {
            const movementCost = moveCost(jobLocation);
            if (player.timeRemaining > movementCost + job.hoursPerShift) {
              actions.push({
                type: 'move',
                location: jobLocation,
                priority: 75,
                description: `Travel to ${jobLocation} for work`,
              });
            }
          }
        }
      }

      // Banking strategy - deposit excess to avoid robbery
      const banking = calculateBankingStrategy(player, settings);
      if (banking.deposit > 50) {
        if (currentLocation === 'bank') {
          actions.push({
            type: 'deposit-bank',
            priority: 60,
            description: `Deposit ${banking.deposit}g in bank`,
            details: { amount: banking.deposit },
          });
        } else if (player.timeRemaining > moveCost('bank') + 2) {
          actions.push({
            type: 'move',
            location: 'bank',
            priority: 55,
            description: 'Travel to bank to deposit gold',
          });
        }
      }
      break;

    case 'happiness':
      // Buy things that increase happiness
      // Appliances give one-time happiness bonus
      if (player.gold > 200) {
        // Priority: Cooking Fire (+1 hap/turn), then others
        const wantedAppliances = [
          { id: 'cooking-fire', cost: 276, priority: 68 },
          { id: 'scrying-mirror', cost: 525, priority: 63 },
          { id: 'preservation-box', cost: 876, priority: 60 },
        ];
        for (const wanted of wantedAppliances) {
          if (!player.appliances[wanted.id] && player.gold >= wanted.cost) {
            if (currentLocation === 'enchanter') {
              actions.push({
                type: 'buy-appliance',
                priority: wanted.priority,
                description: `Buy ${wanted.id} for happiness/utility`,
                details: { applianceId: wanted.id, cost: wanted.cost, source: 'enchanter' },
              });
              break; // Only try to buy one at a time
            } else if (player.timeRemaining > moveCost('enchanter') + 2) {
              actions.push({
                type: 'move',
                location: 'enchanter',
                priority: wanted.priority - 5,
                description: 'Travel to buy appliances',
              });
              break;
            }
          }
        }
      }

      // Rest for happiness (minor)
      if (player.happiness < 40 && player.timeRemaining >= 4) {
        const homeLocation = player.housing === 'noble' ? 'noble-heights' : 'slums';
        if (currentLocation === homeLocation) {
          actions.push({
            type: 'rest',
            priority: 45,
            description: 'Rest to recover happiness',
            details: { hours: 4, happinessGain: 5 },
          });
        } else {
          // Travel home to rest when happiness is low
          const homeMoveCost = moveCost(homeLocation as Parameters<typeof moveCost>[0]);
          if (player.timeRemaining > homeMoveCost + 4) {
            actions.push({
              type: 'move',
              location: homeLocation as Parameters<typeof moveCost>[0],
              priority: 40,
              description: 'Travel home to rest',
            });
          }
        }
      }
      break;

    case 'career':
      // Focus on getting better jobs and building dependability
      // First, make sure we have a job
      if (!player.currentJob) {
        const bestJob = getBestAvailableJob(player, rivals);
        if (bestJob) {
          if (currentLocation === 'guild-hall') {
            actions.push({
              type: 'apply-job',
              priority: 85,
              description: `Apply for ${bestJob.name}`,
              details: { jobId: bestJob.id },
            });
          } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
            actions.push({
              type: 'move',
              location: 'guild-hall',
              priority: 80,
              description: 'Travel to guild hall to find work',
            });
          }
        }
      }

      // Work to build dependability
      if (player.currentJob) {
        const job = getJob(player.currentJob);
        if (job && player.timeRemaining >= job.hoursPerShift) {
          const jobLocation = getJobLocation(job);
          if (currentLocation === jobLocation) {
            actions.push({
              type: 'work',
              priority: 75,
              description: `Work to build dependability`,
              details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
            });
          } else if (player.timeRemaining > moveCost(jobLocation) + job.hoursPerShift) {
            actions.push({
              type: 'move',
              location: jobLocation,
              priority: 70,
              description: 'Travel to work location',
            });
          }
        }
      }

      // Take and complete quests for guild rank promotion
      if (player.hasGuildPass && !player.activeQuest) {
        const bestQuest = getBestQuest(player, settings);
        if (currentLocation === 'guild-hall' && bestQuest) {
          actions.push({
            type: 'take-quest',
            priority: 72,
            description: 'Take quest for guild rank',
            details: { questId: bestQuest },
          });
        } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
          actions.push({
            type: 'move',
            location: 'guild-hall',
            priority: 68,
            description: 'Travel to guild hall for quests',
          });
        }
      }
      break;

    case 'adventure': {
      // Focus on quests and dungeon exploration for adventure points
      // Buy guild pass if needed (GUILD_PASS_COST = 500g, keep buffer)
      if (!player.hasGuildPass && player.gold >= 600) {
        if (currentLocation === 'guild-hall') {
          actions.push({
            type: 'buy-guild-pass',
            priority: 85,
            description: 'Buy Guild Pass for quests',
          });
        } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
          actions.push({
            type: 'move',
            location: 'guild-hall',
            priority: 80,
            description: 'Travel to guild hall for guild pass',
          });
        }
      }

      // Take quests
      if (player.hasGuildPass && !player.activeQuest) {
        const adventureQuest = getBestQuest(player, settings);
        if (currentLocation === 'guild-hall' && adventureQuest) {
          actions.push({
            type: 'take-quest',
            priority: 82,
            description: 'Take quest for adventure points',
            details: { questId: adventureQuest },
          });
        } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
          actions.push({
            type: 'move',
            location: 'guild-hall',
            priority: 78,
            description: 'Travel to guild hall for quests',
          });
        }
      }

      // Explore dungeon (use getBestDungeonFloor for proper floor selection with floorId)
      const adventureDungeonFloor = getBestDungeonFloor(player, settings);
      if (adventureDungeonFloor !== null) {
        if (currentLocation === 'cave') {
          actions.push({
            type: 'explore-dungeon',
            priority: 80,
            description: `Explore dungeon floor ${adventureDungeonFloor} for adventure`,
            details: { floorId: adventureDungeonFloor },
          });
        } else if (player.timeRemaining > moveCost('cave') + 8) {
          actions.push({
            type: 'move',
            location: 'cave',
            priority: 75,
            description: 'Travel to cave for dungeon exploration',
          });
        }
      }
      break;
    }
  }

  // Always check for ready graduations (free +5 happiness, +5 dependability)
  if (currentLocation === 'academy') {
    for (const [degreeId, degree] of Object.entries(DEGREES)) {
      const progress = player.degreeProgress[degreeId as keyof typeof player.degreeProgress] || 0;
      if (progress >= degree.sessionsRequired && !player.completedDegrees.includes(degreeId as any)) {
        actions.push({
          type: 'graduate',
          priority: 88, // Very high - free bonuses
          description: `Graduate from ${degree.name}`,
          details: { degreeId },
        });
      }
    }
  }

  return actions;
}
