/**
 * Grimwald AI - Goal-Oriented Actions
 *
 * Generates actions based on the weakest goal (education, wealth, happiness, career, adventure).
 * Also handles opportunistic graduation checks and festival-aware bonuses.
 *
 * Refactored: Each goal case extracted into a focused function for clarity.
 */

import { getJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import { FESTIVALS } from '@/data/festivals';
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

// ─── Per-goal action generators ────────────────────────────────

function generateEducationActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, settings, currentLocation, moveCost } = ctx;

  const nextDegree = getNextDegree(player, settings);
  if (!nextDegree) return actions;

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
      const nearGraduationBoost = settings.planningDepth >= 3 && sessionsLeft <= 2 ? 10 : 0;
      actions.push({
        type: 'study',
        priority: 70 + (settings.aggressiveness * 20) + nearGraduationBoost,
        description: `Study ${nextDegree.name}${sessionsLeft <= 2 ? ' (almost done!)' : ''}`,
        details: { degreeId: nextDegree.id, cost: nextDegree.costPerSession, hours: nextDegree.hoursPerSession },
      });
    } else {
      const movementCost = moveCost('academy');
      if (player.timeRemaining > movementCost + nextDegree.hoursPerSession) {
        const nearGradTravelBoost = settings.planningDepth >= 3 && sessionsLeft <= 2 ? 8 : 0;
        actions.push({
          type: 'move',
          location: 'academy',
          priority: 65 + nearGradTravelBoost,
          description: 'Travel to academy to study',
        });
      }
    }
  }

  return actions;
}

function generateWealthActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, currentLocation, moveCost } = ctx;

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
  const banking = calculateBankingStrategy(player, ctx.settings);
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

  return actions;
}

function generateHappinessActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, currentLocation, moveCost, priceModifier } = ctx;

  // Buy appliances that increase happiness
  if (player.gold > 200) {
    const pm = priceModifier ?? 1;
    const wantedAppliances = [
      { id: 'cooking-fire', cost: Math.round(276 * pm), priority: 68 },
      { id: 'scrying-mirror', cost: Math.round(525 * pm), priority: 63 },
      { id: 'preservation-box', cost: Math.round(876 * pm), priority: 60 },
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

  // Relax at home for happiness + relaxation recovery
  if ((player.happiness < 40 || player.relaxation <= 20) && player.housing !== 'homeless' && player.timeRemaining >= 3) {
    const homeLocation = player.housing === 'noble' ? 'noble-heights' : 'slums';
    const relaxHours = player.housing === 'noble' ? 3 : 8;
    const priority = player.relaxation <= 20 ? 55 : 45;
    if (currentLocation === homeLocation && player.timeRemaining >= relaxHours) {
      actions.push({
        type: 'rest',
        priority,
        description: 'Relax to recover happiness and relaxation',
        details: { hours: relaxHours, happinessGain: 3, relaxGain: 5 },
      });
    } else {
      const homeMoveCost = moveCost(homeLocation as Parameters<typeof moveCost>[0]);
      if (player.timeRemaining > homeMoveCost + relaxHours) {
        actions.push({
          type: 'move',
          location: homeLocation as Parameters<typeof moveCost>[0],
          priority: priority - 5,
          description: 'Travel home to relax',
        });
      }
    }
  }

  return actions;
}

function generateCareerActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, currentLocation, moveCost, settings, rivals } = ctx;

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
    } else if (bestQuest && player.timeRemaining > moveCost('guild-hall') + 2) {
      actions.push({
        type: 'move',
        location: 'guild-hall',
        priority: 68,
        description: 'Travel to guild hall for quests',
      });
    }
  }

  return actions;
}

function generateAdventureActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, currentLocation, moveCost, settings } = ctx;

  // Buy guild pass if needed
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
    } else if (adventureQuest && player.timeRemaining > moveCost('guild-hall') + 2) {
      actions.push({
        type: 'move',
        location: 'guild-hall',
        priority: 78,
        description: 'Travel to guild hall for quests',
      });
    }
  }

  // Explore dungeon
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

  return actions;
}

// ─── Goal dispatch table ───────────────────────────────────────

const GOAL_ACTION_GENERATORS: Record<string, (ctx: ActionContext) => AIAction[]> = {
  education: generateEducationActions,
  wealth: generateWealthActions,
  happiness: generateHappinessActions,
  career: generateCareerActions,
  adventure: generateAdventureActions,
};

// ─── Festival-aware bonus actions ──────────────────────────────

function generateFestivalBonusActions(ctx: ActionContext): AIAction[] {
  if (!ctx.activeFestival) return [];

  const festival = FESTIVALS.find(f => f.id === ctx.activeFestival);
  if (!festival) return [];

  const actions: AIAction[] = [];
  const { player, currentLocation, moveCost, priceModifier, settings } = ctx;

  // Harvest Festival: prices 15% lower — stock up on food
  if (festival.priceMultiplier < 1.0 && player.gold > 100) {
    if (player.foodLevel < 60 && (currentLocation === 'general-store' || currentLocation === 'rusty-tankard')) {
      actions.push({
        type: 'buy-food',
        priority: 52,
        description: 'Stock up on food during festival discount',
        details: { cost: Math.round(15 * priceModifier), foodGain: 15 },
      });
    }
  }

  // Winter Solstice: education bonus — boost study priority
  if (festival.educationBonus > 0 && player.timeRemaining >= 6) {
    const nextDeg = getNextDegree(player, settings);
    if (nextDeg && player.gold >= nextDeg.costPerSession) {
      if (currentLocation === 'academy') {
        actions.push({
          type: 'study',
          priority: 75,
          description: `Study during ${festival.name} (bonus progress!)`,
          details: { degreeId: nextDeg.id, cost: nextDeg.costPerSession, hours: nextDeg.hoursPerSession },
        });
      } else if (player.timeRemaining > moveCost('academy') + nextDeg.hoursPerSession) {
        actions.push({
          type: 'move',
          location: 'academy',
          priority: 70,
          description: `Travel to academy for ${festival.name} study bonus`,
        });
      }
    }
  }

  // Midsummer Fair: wage bonus — boost work priority
  if (festival.wageMultiplier > 1.0 && player.currentJob) {
    const festJob = getJob(player.currentJob);
    if (festJob && player.timeRemaining >= festJob.hoursPerShift) {
      const festJobLoc = getJobLocation(festJob);
      if (currentLocation === festJobLoc) {
        actions.push({
          type: 'work',
          priority: 72,
          description: `Work during ${festival.name} (bonus wages!)`,
          details: { jobId: festJob.id, hours: festJob.hoursPerShift, wage: player.currentWage },
        });
      }
    }
  }

  // Spring Tournament: dungeon gold bonus — boost dungeon priority
  if (festival.dungeonGoldMultiplier > 1.0) {
    const dungeonFloor = getBestDungeonFloor(player, settings);
    if (dungeonFloor !== null) {
      if (currentLocation === 'cave') {
        actions.push({
          type: 'explore-dungeon',
          priority: 74,
          description: `Explore dungeon during ${festival.name} (bonus gold!)`,
          details: { floorId: dungeonFloor },
        });
      } else if (player.timeRemaining > moveCost('cave') + 8) {
        actions.push({
          type: 'move',
          location: 'cave',
          priority: 69,
          description: `Travel to cave for ${festival.name} dungeon bonus`,
        });
      }
    }
  }

  return actions;
}

// ─── Opportunistic graduation check ───────────────────────────

function generateGraduationActions(ctx: ActionContext): AIAction[] {
  if (ctx.currentLocation !== 'academy') return [];

  const actions: AIAction[] = [];
  for (const [degreeId, degree] of Object.entries(DEGREES)) {
    const progress = ctx.player.degreeProgress[degreeId as keyof typeof ctx.player.degreeProgress] || 0;
    if (progress >= degree.sessionsRequired && !ctx.player.completedDegrees.includes(degreeId as any)) {
      actions.push({
        type: 'graduate',
        priority: 88, // Very high - free bonuses
        description: `Graduate from ${degree.name}`,
        details: { degreeId },
      });
    }
  }
  return actions;
}

// ─── HARD AI: Multi-goal awareness ────────────────────────────

function generateSecondaryGoalActions(ctx: ActionContext): AIAction[] {
  if (ctx.settings.planningDepth < 3) return [];

  const { player, currentLocation, progress, weakestGoal, settings } = ctx;

  // Find second-weakest goal
  const goalProgresses = [
    { goal: 'wealth', progress: progress.wealth.progress },
    { goal: 'happiness', progress: progress.happiness.progress },
    { goal: 'education', progress: progress.education.progress },
    { goal: 'career', progress: progress.career.progress },
  ].filter(g => g.goal !== weakestGoal)
   .sort((a, b) => a.progress - b.progress);

  const secondWeakest = goalProgresses[0];
  if (!secondWeakest || secondWeakest.progress >= 0.6) return [];

  const actions: AIAction[] = [];

  switch (secondWeakest.goal) {
    case 'education': {
      const deg = getNextDegree(player, settings);
      if (deg && currentLocation === 'academy' && player.gold >= deg.costPerSession
          && player.timeRemaining >= deg.hoursPerSession) {
        actions.push({
          type: 'study',
          priority: 55,
          description: `Study ${deg.name} (secondary focus)`,
          details: { degreeId: deg.id, cost: deg.costPerSession, hours: deg.hoursPerSession },
        });
      }
      break;
    }
    case 'wealth': {
      if (player.currentJob) {
        const job = getJob(player.currentJob);
        if (job) {
          const jobLoc = getJobLocation(job);
          if (currentLocation === jobLoc && player.timeRemaining >= job.hoursPerShift) {
            actions.push({
              type: 'work',
              priority: 55,
              description: `Work shift (secondary wealth focus)`,
              details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
            });
          }
        }
      }
      break;
    }
    case 'career': {
      if (player.currentJob) {
        const job = getJob(player.currentJob);
        if (job) {
          const jobLoc = getJobLocation(job);
          if (currentLocation === jobLoc && player.timeRemaining >= job.hoursPerShift) {
            actions.push({
              type: 'work',
              priority: 52,
              description: `Work to build dependability (secondary career focus)`,
              details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
            });
          }
        }
      }
      break;
    }
  }

  return actions;
}

// ─── Main entry point ──────────────────────────────────────────

/**
 * Generate actions based on the weakest goal focus + opportunistic graduation + festival bonuses.
 *
 * Structure:
 * 1. Goal-specific actions via dispatch table
 * 2. Festival-aware priority boosts
 * 3. Opportunistic graduation checks
 * 4. HARD AI: Secondary goal actions
 */
export function generateGoalActions(ctx: ActionContext): AIAction[] {
  const goalGenerator = GOAL_ACTION_GENERATORS[ctx.weakestGoal];
  const goalActions = goalGenerator ? goalGenerator(ctx) : [];

  return [
    ...goalActions,
    ...generateFestivalBonusActions(ctx),
    ...generateGraduationActions(ctx),
    ...generateSecondaryGoalActions(ctx),
  ];
}
