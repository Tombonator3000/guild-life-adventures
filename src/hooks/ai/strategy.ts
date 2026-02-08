/**
 * Grimwald AI - Strategy Functions
 *
 * Pure strategy and analysis functions with no React or store dependencies.
 */

import type { Player, LocationId } from '@/types/game.types';
import { getAvailableJobs, getJob, ALL_JOBS, canWorkJob, type Job } from '@/data/jobs';
import { getAvailableDegrees, type Degree } from '@/data/education';
import { DUNGEON_FLOORS, checkFloorRequirements, getFloorTimeCost, calculateEducationBonuses } from '@/data/dungeon';
import { calculateCombatStats } from '@/data/items';
import { getAvailableQuests, canTakeQuest } from '@/data/quests';

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

  // Career = dependability (Jones-style), 0 if no job
  const careerValue = player.currentJob ? player.dependability : 0;
  const careerProgress = Math.min(1, careerValue / goals.career);

  return {
    wealth: { current: totalWealth, target: goals.wealth, progress: wealthProgress },
    happiness: { current: player.happiness, target: goals.happiness, progress: happinessProgress },
    education: { current: educationPoints, target: goals.education, progress: educationProgress },
    career: { current: careerValue, target: goals.career, progress: careerProgress },
    overall: (wealthProgress + happinessProgress + educationProgress + careerProgress) / 4,
  };
}

/**
 * Find the goal the AI should focus on.
 *
 * Strategy: If any goal is >= 80% complete, sprint it to 100% first.
 * This prevents the AI from spreading effort across all goals equally
 * when it could finish one quickly and reduce the remaining work.
 *
 * If no goal is near completion, focus on the weakest goal (lowest progress).
 */
export function getWeakestGoal(progress: GoalProgress): 'wealth' | 'happiness' | 'education' | 'career' {
  const goals = [
    { name: 'wealth' as const, progress: progress.wealth.progress },
    { name: 'happiness' as const, progress: progress.happiness.progress },
    { name: 'education' as const, progress: progress.education.progress },
    { name: 'career' as const, progress: progress.career.progress },
  ];

  // Sprint: if any goal is >= 80% but not yet complete, prioritize finishing it
  const nearComplete = goals
    .filter(g => g.progress >= 0.8 && g.progress < 1.0)
    .sort((a, b) => b.progress - a.progress); // highest first (closest to done)

  if (nearComplete.length > 0) {
    return nearComplete[0].name;
  }

  // Otherwise focus on weakest goal
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

  // All AI should consider robbery risk when they have valuables
  const hasValuables = Object.keys(player.durables).length > 0 ||
                       Object.keys(player.appliances).length > 0 ||
                       player.gold > 500;

  const canAffordNoble = player.gold > 300; // First month + buffer

  // Strategic AI (medium/hard) upgrades proactively when they have valuables
  // Easy AI upgrades when they have 3+ valuables at risk (more conservative)
  if (settings.aggressiveness > 0.5) {
    return hasValuables && canAffordNoble;
  }
  const valuableCount = Object.keys(player.durables).length + Object.keys(player.appliances).length;
  return valuableCount >= 3 && canAffordNoble;
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

/**
 * Determine the best dungeon floor the AI can attempt.
 * Returns floor ID or null if no floor is advisable.
 */
export function getBestDungeonFloor(player: Player, settings: DifficultySettings): number | null {
  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
  );

  if (player.health < 40) return null;

  // Find highest uncleared floor we can enter
  for (let i = DUNGEON_FLOORS.length - 1; i >= 0; i--) {
    const floor = DUNGEON_FLOORS[i];
    if (player.dungeonFloorsCleared.includes(floor.id)) continue;

    const check = checkFloorRequirements(
      floor,
      player.dungeonFloorsCleared,
      player.equippedWeapon,
      player.equippedArmor,
      combatStats,
    );

    if (!check.canEnter) continue;

    const timeCost = getFloorTimeCost(floor, combatStats);
    if (player.timeRemaining < timeCost + 4) continue;

    // Strategic AI checks power ratio against boss
    if (settings.planningDepth >= 2) {
      const eduBonuses = calculateEducationBonuses(player.completedDegrees);
      const playerPower = combatStats.attack * (1 + eduBonuses.attackBonus) + combatStats.defense * 0.5;
      const bossRatio = playerPower / Math.max(1, floor.boss.basePower);
      if (bossRatio < 0.6) continue;
    }

    return floor.id;
  }

  // Re-run cleared floor for gold (wealth focus only)
  if (settings.aggressiveness > 0.5 && player.dungeonFloorsCleared.length > 0) {
    const highestCleared = Math.max(...player.dungeonFloorsCleared);
    const floor = DUNGEON_FLOORS.find(f => f.id === highestCleared);
    if (floor) {
      const timeCost = getFloorTimeCost(floor, combatStats);
      if (player.timeRemaining >= timeCost + 4 && player.health >= 50) {
        return floor.id;
      }
    }
  }

  return null;
}

/**
 * Get the best equipment upgrade the AI should buy.
 */
export function getNextEquipmentUpgrade(player: Player): { itemId: string; cost: number; slot: string } | null {
  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
  );

  const weaponUpgrades = [
    { id: 'dagger', atk: 5, cost: 35, floor: 0 },
    { id: 'sword', atk: 15, cost: 90, floor: 0 },
    { id: 'steel-sword', atk: 25, cost: 250, floor: 2 },
    { id: 'enchanted-blade', atk: 40, cost: 500, floor: 3 },
  ];

  for (const w of weaponUpgrades) {
    if (combatStats.attack >= w.atk) continue;
    if (w.floor > 0 && !player.dungeonFloorsCleared.includes(w.floor)) continue;
    if (player.gold < w.cost) continue;
    if (player.durables[w.id]) continue;
    return { itemId: w.id, cost: w.cost, slot: 'weapon' };
  }

  const armorUpgrades = [
    { id: 'leather-armor', def: 10, cost: 75, floor: 0 },
    { id: 'chainmail', def: 20, cost: 200, floor: 2 },
    { id: 'plate-armor', def: 35, cost: 450, floor: 3 },
  ];

  for (const a of armorUpgrades) {
    if (combatStats.defense >= a.def) continue;
    if (a.floor > 0 && !player.dungeonFloorsCleared.includes(a.floor)) continue;
    if (player.gold < a.cost) continue;
    if (player.durables[a.id]) continue;
    return { itemId: a.id, cost: a.cost, slot: 'armor' };
  }

  if (!player.equippedShield && player.gold >= 45 && !player.durables['shield']) {
    return { itemId: 'shield', cost: 45, slot: 'shield' };
  }

  return null;
}

/**
 * Should AI buy a Guild Pass for quests?
 */
export function shouldBuyGuildPass(player: Player, settings: DifficultySettings): boolean {
  if (player.hasGuildPass) return false;
  if (player.gold < 500) return false;
  return settings.planningDepth >= 2 ? player.gold >= 600 : player.gold >= 700;
}

/**
 * Get the best quest the AI should take.
 */
export function getBestQuest(player: Player, settings: DifficultySettings): string | null {
  if (!player.hasGuildPass) return null;
  if (player.activeQuest) return null;

  const available = getAvailableQuests(player.guildRank);
  const takeable = available.filter((q) => {
    const check = canTakeQuest(q, player.guildRank, player.education, player.inventory, player.dungeonFloorsCleared);
    if (!check.canTake) return false;
    if (q.timeRequired > player.timeRemaining) return false;
    if (q.healthRisk > player.health - 20) return false;
    return true;
  });

  if (takeable.length === 0) return null;

  if (settings.planningDepth >= 2) {
    takeable.sort((a: { goldReward: number; timeRequired: number }, b: { goldReward: number; timeRequired: number }) =>
      (b.goldReward / b.timeRequired) - (a.goldReward / a.timeRequired)
    );
  } else {
    takeable.sort((a: { goldReward: number }, b: { goldReward: number }) => b.goldReward - a.goldReward);
  }

  return takeable[0].id;
}
