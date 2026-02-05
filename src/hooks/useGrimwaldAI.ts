/**
 * Grimwald AI - Smart AI Opponent for Guild Life Adventures
 * Based on Jones from Jones in the Fast Lane
 *
 * Features:
 * - Goal-oriented decision making
 * - Strategic planning for education and career
 * - Resource management (food, rent, clothing, health)
 * - Difficulty levels (Easy, Medium, Hard)
 * - Adaptive behavior based on game state
 */

import { useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Player, LocationId, HousingTier, DegreeId } from '@/types/game.types';
import { HOURS_PER_TURN, RENT_COSTS } from '@/types/game.types';
import { getAvailableJobs, getJob, ALL_JOBS, canWorkJob, type Job } from '@/data/jobs';
import { getAvailableDegrees, DEGREES, canEnrollIn, type Degree } from '@/data/education';
import { calculatePathDistance, getPath, BOARD_PATH } from '@/data/locations';

// AI Difficulty Settings
export type AIDifficulty = 'easy' | 'medium' | 'hard';

interface DifficultySettings {
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

const DIFFICULTY_SETTINGS: Record<AIDifficulty, DifficultySettings> = {
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
  | 'rest'
  | 'end-turn';

export interface AIAction {
  type: AIActionType;
  location?: LocationId;
  priority: number;
  details?: Record<string, unknown>;
  description: string;
}

// Goal progress tracking
interface GoalProgress {
  wealth: { current: number; target: number; progress: number };
  happiness: { current: number; target: number; progress: number };
  education: { current: number; target: number; progress: number };
  career: { current: number; target: number; progress: number };
  overall: number; // Average progress toward all goals
}

/**
 * Calculate the AI's progress toward all victory goals
 */
function calculateGoalProgress(player: Player, goals: { wealth: number; happiness: number; education: number; career: number }): GoalProgress {
  const totalWealth = player.gold + player.savings + player.investments;
  const wealthProgress = Math.min(1, totalWealth / goals.wealth);

  const happinessProgress = Math.min(1, player.happiness / goals.happiness);

  const educationPoints = player.completedDegrees.length * 9;
  const educationProgress = Math.min(1, educationPoints / goals.education);

  const rankOrder = ['novice', 'apprentice', 'journeyman', 'adept', 'veteran', 'elite', 'guild-master'];
  const currentRank = rankOrder.indexOf(player.guildRank) + 1;
  const careerProgress = Math.min(1, currentRank / goals.career);

  return {
    wealth: { current: totalWealth, target: goals.wealth, progress: wealthProgress },
    happiness: { current: player.happiness, target: goals.happiness, progress: happinessProgress },
    education: { current: educationPoints, target: goals.education, progress: educationProgress },
    career: { current: currentRank, target: goals.career, progress: careerProgress },
    overall: (wealthProgress + happinessProgress + educationProgress + careerProgress) / 4,
  };
}

/**
 * Find the goal with lowest progress (what the AI should focus on)
 */
function getWeakestGoal(progress: GoalProgress): 'wealth' | 'happiness' | 'education' | 'career' {
  const goals = [
    { name: 'wealth' as const, progress: progress.wealth.progress },
    { name: 'happiness' as const, progress: progress.happiness.progress },
    { name: 'education' as const, progress: progress.education.progress },
    { name: 'career' as const, progress: progress.career.progress },
  ];

  goals.sort((a, b) => a.progress - b.progress);
  return goals[0].name;
}

/**
 * Calculate urgency of resource needs (0-1, higher = more urgent)
 */
interface ResourceUrgency {
  food: number;
  rent: number;
  clothing: number;
  health: number;
  housing: number; // Urgency to upgrade housing (for robbery protection)
}

function calculateResourceUrgency(player: Player): ResourceUrgency {
  // Food urgency - critical below 25, concerning below 50
  const food = player.foodLevel < 25 ? 1.0 : player.foodLevel < 50 ? 0.6 : 0.1;

  // Rent urgency - critical at 3+ weeks overdue
  let rent = 0;
  if (player.housing !== 'homeless') {
    if (player.weeksSinceRent >= 3) rent = 1.0;
    else if (player.weeksSinceRent >= 2) rent = 0.5;
    else rent = 0.1;
  }

  // Clothing urgency - need for job
  const clothing = player.clothingCondition < 25 ? 0.9 : player.clothingCondition < 50 ? 0.4 : 0.1;

  // Health urgency
  const health = player.health < 30 ? 1.0 : player.health < 50 ? 0.5 : 0.1;

  // Housing upgrade urgency - consider if in slums with valuables
  const hasValuables = Object.keys(player.durables).length > 0 || Object.keys(player.appliances).length > 0;
  const housing = player.housing === 'slums' && hasValuables && player.gold > 200 ? 0.5 : 0.1;

  return { food, rent, clothing, health, housing };
}

/**
 * Get the best job the AI can currently apply for
 */
function getBestAvailableJob(player: Player): Job | null {
  const availableJobs = getAvailableJobs(
    player.completedDegrees,
    player.clothingCondition,
    player.experience,
    player.dependability
  );

  if (availableJobs.length === 0) return null;

  // Sort by wage and pick the best
  return availableJobs.sort((a, b) => b.baseWage - a.baseWage)[0];
}

/**
 * Get the next degree the AI should pursue
 */
function getNextDegree(player: Player, settings: DifficultySettings): Degree | null {
  const available = getAvailableDegrees(player.completedDegrees);
  if (available.length === 0) return null;

  // Strategic AI considers which degrees unlock better jobs
  if (settings.planningDepth >= 2) {
    // Prioritize degrees that unlock high-paying jobs
    const degreeValue = (degree: Degree): number => {
      const jobsUnlocked = ALL_JOBS.filter(job =>
        job.requiredDegrees.includes(degree.id) &&
        !job.requiredDegrees.some(req =>
          req !== degree.id && !player.completedDegrees.includes(req)
        )
      );

      if (jobsUnlocked.length === 0) return degree.educationPoints;

      const maxWage = Math.max(...jobsUnlocked.map(j => j.baseWage));
      return maxWage * 10 + degree.educationPoints;
    };

    return available.sort((a, b) => degreeValue(b) - degreeValue(a))[0];
  }

  // Simple AI just picks the cheapest available
  return available.sort((a, b) => a.costPerSession - b.costPerSession)[0];
}

/**
 * Check if AI should upgrade housing
 */
function shouldUpgradeHousing(player: Player, settings: DifficultySettings): boolean {
  if (player.housing === 'noble') return false;

  // Strategic AI considers robbery risk
  const hasValuables = Object.keys(player.durables).length > 0 ||
                       Object.keys(player.appliances).length > 0 ||
                       player.gold > 500;

  const canAffordNoble = player.gold > 300; // First month + buffer

  return hasValuables && canAffordNoble && settings.aggressiveness > 0.5;
}

/**
 * Calculate how much gold the AI should keep vs deposit
 */
function calculateBankingStrategy(player: Player, settings: DifficultySettings): { deposit: number; withdraw: number } {
  // Keep enough for immediate needs
  const immediateNeeds = 100; // Food, clothing buffer

  // Strategic AI deposits more to avoid robbery
  const safeAmount = settings.planningDepth >= 2 ? 200 : 100;

  if (player.gold > safeAmount + immediateNeeds) {
    return { deposit: player.gold - safeAmount, withdraw: 0 };
  }

  // Withdraw if we need cash
  if (player.gold < 50 && player.savings > 100) {
    return { deposit: 0, withdraw: Math.min(100, player.savings) };
  }

  return { deposit: 0, withdraw: 0 };
}

/**
 * Main AI decision engine - generates prioritized list of possible actions
 */
function generateActions(
  player: Player,
  goals: { wealth: number; happiness: number; education: number; career: number },
  settings: DifficultySettings,
  week: number,
  priceModifier: number
): AIAction[] {
  const actions: AIAction[] = [];
  const progress = calculateGoalProgress(player, goals);
  const urgency = calculateResourceUrgency(player);
  const weakestGoal = getWeakestGoal(progress);
  const currentLocation = player.currentLocation;

  // Helper to calculate movement cost
  const moveCost = (to: LocationId) => calculatePathDistance(currentLocation, to);

  // ============================================
  // CRITICAL NEEDS (Always check first)
  // ============================================

  // 1. FOOD - Prevent starvation (-20 hours penalty is devastating)
  if (urgency.food > 0.5) {
    const foodCost = 15; // Approximate food cost
    if (player.gold >= foodCost) {
      if (currentLocation === 'rusty-tankard') {
        actions.push({
          type: 'buy-food',
          priority: 100, // Highest priority
          description: 'Buy food to prevent starvation',
          details: { cost: 8, foodGain: 25 },
        });
      } else {
        const movementCost = moveCost('rusty-tankard');
        if (player.timeRemaining > movementCost + 2) {
          actions.push({
            type: 'move',
            location: 'rusty-tankard',
            priority: 95,
            description: 'Travel to tavern for food',
          });
        }
      }
    }
  }

  // 2. RENT - Prevent eviction (huge penalty)
  if (urgency.rent > 0.5 && player.housing !== 'homeless') {
    const rentCost = RENT_COSTS[player.housing];
    if (player.gold >= rentCost) {
      if (currentLocation === 'landlord') {
        actions.push({
          type: 'pay-rent',
          priority: 90,
          description: 'Pay rent to avoid eviction',
          details: { cost: rentCost },
        });
      } else {
        const movementCost = moveCost('landlord');
        if (player.timeRemaining > movementCost + 2) {
          actions.push({
            type: 'move',
            location: 'landlord',
            priority: 85,
            description: 'Travel to landlord to pay rent',
          });
        }
      }
    }
  }

  // 3. CLOTHING - Needed for jobs
  if (urgency.clothing > 0.6 && player.gold >= 30) {
    if (currentLocation === 'armory' || currentLocation === 'general-store') {
      actions.push({
        type: 'buy-clothing',
        priority: 75,
        description: 'Buy clothing for work',
        details: { cost: 30, type: 'casual' },
      });
    } else {
      const movementCost = Math.min(moveCost('armory'), moveCost('general-store'));
      if (player.timeRemaining > movementCost + 2) {
        actions.push({
          type: 'move',
          location: moveCost('armory') < moveCost('general-store') ? 'armory' : 'general-store',
          priority: 70,
          description: 'Travel to buy clothing',
        });
      }
    }
  }

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
          if (currentLocation === jobLocation || currentLocation === 'guild-hall') {
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
      if (player.gold > 300 && Object.keys(player.appliances).length < 3) {
        if (currentLocation === 'enchanter') {
          actions.push({
            type: 'buy-appliance',
            priority: 65,
            description: 'Buy magical appliance for happiness',
            details: { applianceId: 'scrying-mirror' },
          });
        } else if (player.timeRemaining > moveCost('enchanter') + 2) {
          actions.push({
            type: 'move',
            location: 'enchanter',
            priority: 60,
            description: 'Travel to buy appliances',
          });
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
        }
      }
      break;

    case 'career':
      // Focus on getting better jobs and building dependability
      // First, make sure we have a job
      if (!player.currentJob) {
        const bestJob = getBestAvailableJob(player);
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
      if (player.currentJob && player.timeRemaining >= 6) {
        const job = getJob(player.currentJob);
        if (job) {
          const jobLocation = getJobLocation(job);
          if (currentLocation === jobLocation || currentLocation === 'guild-hall') {
            actions.push({
              type: 'work',
              priority: 75,
              description: `Work to build dependability`,
              details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
            });
          } else {
            actions.push({
              type: 'move',
              location: jobLocation,
              priority: 70,
              description: 'Travel to work location',
            });
          }
        }
      }
      break;
  }

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

  // Work if we have time and a job
  if (player.currentJob && player.timeRemaining >= 6) {
    const job = getJob(player.currentJob);
    if (job) {
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

  // ============================================
  // DEFAULT ACTION - End turn if nothing else
  // ============================================
  actions.push({
    type: 'end-turn',
    priority: 1,
    description: 'End turn',
  });

  // Sort by priority (highest first)
  actions.sort((a, b) => b.priority - a.priority);

  // Apply mistake chance for easier difficulties
  if (settings.mistakeChance > 0 && Math.random() < settings.mistakeChance && actions.length > 2) {
    // Swap top two actions randomly
    const temp = actions[0];
    actions[0] = actions[1];
    actions[1] = temp;
  }

  return actions;
}

/**
 * Get the location where a job is performed
 */
function getJobLocation(job: Job): LocationId {
  const locationMap: Record<string, LocationId> = {
    'Guild Hall': 'guild-hall',
    'General Store': 'general-store',
    'Shadow Market': 'shadow-market',
    'Bank': 'bank',
    'Forge': 'forge',
    'Academy': 'academy',
    'Armory': 'armory',
    'Enchanter': 'enchanter',
    'Rusty Tankard': 'rusty-tankard',
  };
  return locationMap[job.location] || 'guild-hall';
}

/**
 * Main AI Hook
 */
export function useGrimwaldAI(difficulty: AIDifficulty = 'medium') {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const isExecutingRef = useRef(false);
  const actionLogRef = useRef<string[]>([]);

  const {
    players,
    goalSettings,
    week,
    priceModifier,
    movePlayer,
    workShift,
    modifyGold,
    modifyFood,
    modifyHappiness,
    modifyClothing,
    spendTime,
    studyDegree,
    completeDegree,
    setJob,
    payRent,
    depositToBank,
    withdrawFromBank,
    buyAppliance,
    moveToHousing,
    endTurn,
  } = useGameStore();

  /**
   * Execute a single AI action
   */
  const executeAction = useCallback(async (player: Player, action: AIAction): Promise<boolean> => {
    actionLogRef.current.push(`Grimwald: ${action.description}`);

    switch (action.type) {
      case 'move': {
        if (!action.location) return false;
        const cost = calculatePathDistance(player.currentLocation, action.location);
        if (player.timeRemaining < cost) return false;
        movePlayer(player.id, action.location, cost);
        return true;
      }

      case 'buy-food': {
        const cost = (action.details?.cost as number) || 8;
        const foodGain = (action.details?.foodGain as number) || 25;
        if (player.gold < cost) return false;
        modifyGold(player.id, -cost);
        modifyFood(player.id, foodGain);
        spendTime(player.id, 1);
        return true;
      }

      case 'buy-clothing': {
        const cost = (action.details?.cost as number) || 30;
        if (player.gold < cost) return false;
        modifyGold(player.id, -cost);
        modifyClothing(player.id, 30);
        spendTime(player.id, 1);
        return true;
      }

      case 'work': {
        const hours = (action.details?.hours as number) || 6;
        const wage = (action.details?.wage as number) || player.currentWage;
        if (player.timeRemaining < hours) return false;
        workShift(player.id, hours, wage);
        return true;
      }

      case 'study': {
        const degreeId = action.details?.degreeId as DegreeId;
        const cost = (action.details?.cost as number) || 5;
        const hours = (action.details?.hours as number) || 6;
        if (!degreeId || player.gold < cost || player.timeRemaining < hours) return false;
        studyDegree(player.id, degreeId, cost, hours);
        return true;
      }

      case 'graduate': {
        const degreeId = action.details?.degreeId as DegreeId;
        if (!degreeId) return false;
        const degree = DEGREES[degreeId];
        const progress = player.degreeProgress[degreeId] || 0;
        if (progress < degree.sessionsRequired) return false;
        completeDegree(player.id, degreeId);
        return true;
      }

      case 'apply-job': {
        const jobId = action.details?.jobId as string;
        if (!jobId) return false;
        const job = getJob(jobId);
        if (!job) return false;
        // Check if can actually work this job
        if (!canWorkJob(job, player.completedDegrees, player.clothingCondition, player.experience, player.dependability)) {
          return false;
        }
        // Set the job with a random wage offer (50-250% of base)
        const wageMultiplier = 0.5 + Math.random() * 2.0;
        const offeredWage = Math.round(job.baseWage * wageMultiplier);
        setJob(player.id, jobId, offeredWage);
        spendTime(player.id, 1);
        return true;
      }

      case 'pay-rent': {
        if (player.housing === 'homeless') return false;
        const cost = RENT_COSTS[player.housing];
        if (player.gold < cost) return false;
        payRent(player.id);
        spendTime(player.id, 1);
        return true;
      }

      case 'deposit-bank': {
        const amount = (action.details?.amount as number) || 100;
        if (player.gold < amount) return false;
        depositToBank(player.id, amount);
        spendTime(player.id, 1);
        return true;
      }

      case 'withdraw-bank': {
        const amount = (action.details?.amount as number) || 100;
        if (player.savings < amount) return false;
        withdrawFromBank(player.id, Math.min(amount, player.savings));
        spendTime(player.id, 1);
        return true;
      }

      case 'buy-appliance': {
        const applianceId = action.details?.applianceId as string;
        if (!applianceId) return false;
        // Simplified appliance buying
        const cost = 300; // Approximate
        if (player.gold < cost) return false;
        buyAppliance(player.id, applianceId, cost, 'enchanter');
        spendTime(player.id, 1);
        return true;
      }

      case 'move-housing': {
        const tier = action.details?.tier as HousingTier;
        if (!tier) return false;
        const cost = tier === 'noble' ? 200 : 50;
        if (player.gold < cost) return false;
        const rent = RENT_COSTS[tier];
        moveToHousing(player.id, tier, cost, rent);
        spendTime(player.id, 1);
        return true;
      }

      case 'rest': {
        const hours = (action.details?.hours as number) || 4;
        const happinessGain = (action.details?.happinessGain as number) || 5;
        if (player.timeRemaining < hours) return false;
        spendTime(player.id, hours);
        modifyHappiness(player.id, happinessGain);
        return true;
      }

      case 'end-turn':
        endTurn();
        return true;

      default:
        return false;
    }
  }, [movePlayer, modifyGold, modifyFood, modifyHappiness, modifyClothing, spendTime,
      studyDegree, completeDegree, setJob, payRent, depositToBank, withdrawFromBank,
      buyAppliance, moveToHousing, workShift, endTurn]);

  /**
   * Run the AI's turn
   */
  const runAITurn = useCallback(async (player: Player) => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    actionLogRef.current = [];

    console.log(`[Grimwald AI] Starting turn (${difficulty} difficulty)`);

    let actionsRemaining = 15; // Safety limit
    let currentPlayer = player;

    const step = async () => {
      // Get fresh player state
      const state = useGameStore.getState();
      currentPlayer = state.players.find(p => p.id === player.id) || currentPlayer;

      // Check exit conditions
      if (actionsRemaining <= 0 || currentPlayer.timeRemaining < 1 || currentPlayer.isGameOver) {
        console.log(`[Grimwald AI] Turn complete. Actions: ${actionLogRef.current.join(' -> ')}`);
        if (currentPlayer.timeRemaining > 0) {
          endTurn();
        }
        isExecutingRef.current = false;
        return;
      }

      // Generate possible actions
      const actions = generateActions(
        currentPlayer,
        goalSettings,
        settings,
        state.week,
        state.priceModifier
      );

      // Get best action
      const bestAction = actions[0];

      if (bestAction.type === 'end-turn') {
        console.log(`[Grimwald AI] Ending turn. Log: ${actionLogRef.current.join(' -> ')}`);
        endTurn();
        isExecutingRef.current = false;
        return;
      }

      // Execute action
      const success = await executeAction(currentPlayer, bestAction);

      if (!success) {
        console.log(`[Grimwald AI] Action failed: ${bestAction.description}`);
        // Try next action
        actionsRemaining--;
      } else {
        actionsRemaining--;
      }

      // Continue with next action after delay
      setTimeout(step, settings.decisionDelay);
    };

    // Start the turn
    setTimeout(step, settings.decisionDelay);
  }, [difficulty, settings, goalSettings, executeAction, endTurn]);

  /**
   * Get AI analysis of current game state
   */
  const analyzeGameState = useCallback((player: Player) => {
    const progress = calculateGoalProgress(player, goalSettings);
    const urgency = calculateResourceUrgency(player);
    const weakestGoal = getWeakestGoal(progress);

    return {
      progress,
      urgency,
      weakestGoal,
      difficulty,
      settings,
    };
  }, [goalSettings, difficulty, settings]);

  return {
    runAITurn,
    analyzeGameState,
    actionLog: actionLogRef.current,
    difficulty,
    settings,
  };
}

// Export types
export type { GoalProgress, ResourceUrgency };
