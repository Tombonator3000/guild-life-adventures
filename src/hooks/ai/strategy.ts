/**
 * Grimwald AI - Strategy Functions
 *
 * Pure strategy and analysis functions with no React or store dependencies.
 */

import type { Player, LocationId } from '@/types/game.types';
import { getAvailableJobs, getJob, ALL_JOBS, canWorkJob, type Job } from '@/data/jobs';
import { getAvailableDegrees, type Degree } from '@/data/education';

import type { DifficultySettings, GoalProgress, ResourceUrgency } from './types';

/**
 * Calculate the AI's progress toward all victory goals
 */
export function calculateGoalProgress(
  player: Player,
  goals: { wealth: number; happiness: number; education: number; career: number }
): GoalProgress {
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
export function getWeakestGoal(progress: GoalProgress): 'wealth' | 'happiness' | 'education' | 'career' {
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
export function calculateResourceUrgency(player: Player): ResourceUrgency {
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
export function getBestAvailableJob(player: Player): Job | null {
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
export function getNextDegree(player: Player, settings: DifficultySettings): Degree | null {
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
export function shouldUpgradeHousing(player: Player, settings: DifficultySettings): boolean {
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
export function calculateBankingStrategy(
  player: Player,
  settings: DifficultySettings
): { deposit: number; withdraw: number } {
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
 * Get the location where a job is performed
 */
export function getJobLocation(job: Job): LocationId {
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
