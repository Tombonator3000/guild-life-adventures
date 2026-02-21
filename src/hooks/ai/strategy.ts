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
import {
  getAvailableQuests,
  canTakeQuest,
  getWeeklyBounties,
  QUEST_CHAINS,
  getNextChainStep,
  canTakeChainStep,
} from '@/data/quests';

import { DEGREES } from '@/data/education';
import { RENT_COSTS } from '@/types/game.types';
import type { DifficultySettings, GoalProgress, ResourceUrgency, CashFlowForecast, DegreeROI } from './types';

/**
 * Calculate the AI's progress toward all victory goals
 */
export function calculateGoalProgress(
  player: Player,
  goals: { wealth: number; happiness: number; education: number; career: number; adventure?: number },
  stockPrices?: Record<string, number>
): GoalProgress {
  // BUG FIX: Include stock value and subtract loan (matches checkVictory in questHelpers.ts)
  let stockValue = 0;
  if (stockPrices && player.stocks) {
    for (const [stockId, shares] of Object.entries(player.stocks)) {
      stockValue += shares * (stockPrices[stockId] ?? 0);
    }
  }
  const totalWealth = player.gold + player.savings + player.investments + stockValue - player.loanAmount;
  const wealthProgress = goals.wealth > 0 ? Math.min(1, totalWealth / goals.wealth) : 1;

  const happinessProgress = goals.happiness > 0 ? Math.min(1, player.happiness / goals.happiness) : 1;

  const educationPoints = player.completedDegrees.length * 9;
  const educationProgress = goals.education > 0 ? Math.min(1, educationPoints / goals.education) : 1;

  // BUG FIX: Career = dependability (Jones-style), shown even when unemployed (matches checkVictory)
  const careerValue = player.dependability;
  const careerProgress = goals.career > 0 ? Math.min(1, careerValue / goals.career) : 1;

  // Adventure = quests + dungeon floors (optional, 0 = disabled)
  const adventureTarget = goals.adventure ?? 0;
  const adventureValue = player.completedQuests + player.dungeonFloorsCleared.length;
  const adventureProgress = adventureTarget > 0 ? Math.min(1, adventureValue / adventureTarget) : 1;

  const goalCount = adventureTarget > 0 ? 5 : 4;
  const totalProgress = wealthProgress + happinessProgress + educationProgress + careerProgress + (adventureTarget > 0 ? adventureProgress : 0);

  return {
    wealth: { current: totalWealth, target: goals.wealth, progress: wealthProgress },
    happiness: { current: player.happiness, target: goals.happiness, progress: happinessProgress },
    education: { current: educationPoints, target: goals.education, progress: educationProgress },
    career: { current: careerValue, target: goals.career, progress: careerProgress },
    adventure: { current: adventureValue, target: adventureTarget, progress: adventureProgress },
    overall: totalProgress / goalCount,
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
export function getWeakestGoal(progress: GoalProgress): 'wealth' | 'happiness' | 'education' | 'career' | 'adventure' {
  const goals: { name: 'wealth' | 'happiness' | 'education' | 'career' | 'adventure'; progress: number }[] = [
    { name: 'wealth', progress: progress.wealth.progress },
    { name: 'happiness', progress: progress.happiness.progress },
    { name: 'education', progress: progress.education.progress },
    { name: 'career', progress: progress.career.progress },
  ];
  // Only include adventure if enabled (target > 0)
  if (progress.adventure.target > 0) {
    goals.push({ name: 'adventure', progress: progress.adventure.progress });
  }

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

  // Clothing urgency - Jones-style 3-tier system (casual=15, dress=40, business=70)
  // Naked = max urgency, below casual = very high, below dress = moderate, below business = low
  const clothing = player.clothingCondition <= 0 ? 1.0
    : player.clothingCondition < 15 ? 0.9    // Below casual tier
    : player.clothingCondition < 40 ? 0.5    // Below dress tier
    : player.clothingCondition < 70 ? 0.3    // Below business tier
    : 0.1;

  // Health urgency
  const health = player.health < 30 ? 1.0 : player.health < 50 ? 0.5 : 0.1;

  // Housing upgrade urgency - consider if in slums with valuables
  const hasValuables = Object.keys(player.durables).length > 0 || Object.keys(player.appliances).length > 0;
  const housing = player.housing === 'slums' && hasValuables && player.gold > 200 ? 0.5 : 0.1;

  return { food, rent, clothing, health, housing };
}

/**
 * Get the best job the AI can currently apply for
 * Filters out jobs already held by other players (job blocking)
 */
export function getBestAvailableJob(player: Player, rivals?: Player[]): Job | null {
  const availableJobs = getAvailableJobs(
    player.completedDegrees,
    player.clothingCondition,
    player.experience,
    player.dependability
  );

  // Filter out jobs held by other active players
  const takenJobIds = new Set(
    (rivals ?? []).filter(p => !p.isGameOver && p.currentJob).map(p => p.currentJob!)
  );
  const openJobs = availableJobs.filter(j => !takenJobIds.has(j.id));

  if (openJobs.length === 0) return null;

  // Sort by wage and pick the best
  return openJobs.sort((a, b) => b.baseWage - a.baseWage)[0];
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
    player.temperedItems,
    player.equipmentDurability,
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
      player.completedDegrees,
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
 * Check if any equipped item needs repair (durability < 50%).
 * Returns the most damaged item that should be repaired, or null.
 */
export function getEquipmentNeedingRepair(player: Player): { itemId: string; durability: number } | null {
  const equipped = [player.equippedWeapon, player.equippedArmor, player.equippedShield].filter(Boolean) as string[];
  let worstItem: { itemId: string; durability: number } | null = null;

  for (const itemId of equipped) {
    const dur = player.equipmentDurability?.[itemId] ?? 100;
    if (dur < 50 && (!worstItem || dur < worstItem.durability)) {
      worstItem = { itemId, durability: dur };
    }
  }
  return worstItem;
}

/**
 * Get the best equipment upgrade the AI should buy.
 */
export function getNextEquipmentUpgrade(player: Player): { itemId: string; cost: number; slot: string } | null {
  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
    player.temperedItems,
    player.equipmentDurability,
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
 * Also considers quest cooldown (B4).
 */
export function getBestQuest(player: Player, settings: DifficultySettings): string | null {
  if (!player.hasGuildPass) return null;
  if (player.activeQuest) return null;
  if (player.questCooldownWeeksLeft > 0) return null; // B4: cooldown

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

/**
 * Get the best bounty the AI should take (B2).
 * Bounties are free — no Guild Pass required.
 */
export function getBestBounty(player: Player, week: number): string | null {
  if (player.activeQuest) return null;
  // M15 FIX: Bounties don't require Guild Pass (only quests do)

  const bounties = getWeeklyBounties(week);
  const takeable = bounties.filter(b => {
    if (player.completedBountiesThisWeek.includes(b.id)) return false;
    if (b.timeRequired > player.timeRemaining) return false;
    if (b.healthRisk > player.health - 20) return false;
    return true;
  });

  if (takeable.length === 0) return null;

  // Pick highest gold/time ratio
  takeable.sort((a, b) => (b.goldReward / b.timeRequired) - (a.goldReward / a.timeRequired));
  return takeable[0].id;
}

/**
 * Get the best chain quest the AI should take (B1).
 * Requires Guild Pass. Strategic AI prefers chains for the completion bonus.
 */
export function getBestChainQuest(player: Player, settings: DifficultySettings): string | null {
  if (!player.hasGuildPass) return null;
  if (player.activeQuest) return null;
  if (player.questCooldownWeeksLeft > 0) return null;

  // Only strategic AI pursues chains
  if (settings.planningDepth < 2) return null;

  for (const chain of QUEST_CHAINS) {
    const step = getNextChainStep(chain.id, player.questChainProgress);
    if (!step) continue; // chain complete

    const check = canTakeChainStep(chain, step, player.guildRank, player.education, player.dungeonFloorsCleared);
    if (!check.canTake) continue;
    if (step.timeRequired > player.timeRemaining) continue;
    if (step.healthRisk > player.health - 20) continue;

    return chain.id;
  }

  return null;
}

// ============================================================
// CASH FLOW FORECASTING
// ============================================================

/**
 * Forecast the AI's gold position for the next N turns.
 *
 * Models: job income, food costs, rent schedule, loan repayment.
 * Used by economic and critical-needs generators to make proactive
 * decisions rather than reacting to crises.
 *
 * Estimates per turn:
 *   + wage income (shifts × wage × hours)
 *   - food costs (~25-35g depending on housing)
 *   - rent (if due that turn, every 4 weeks)
 *   - loan garnishment (25% of wages if in default)
 */
export function forecastCashFlow(player: Player, week: number, weeksAhead: number = 3): CashFlowForecast {
  // ─── Income estimation ─────────────────────────────────
  // Estimate usable hours per turn (total 60h minus travel/overhead)
  const USABLE_HOURS_PER_TURN = 40;
  const job = player.currentJob ? getJob(player.currentJob) : null;
  const hourlyWage = player.currentWage ?? 0;
  const hoursPerShift = job?.hoursPerShift ?? 8;
  const shiftsPerTurn = job ? Math.floor(USABLE_HOURS_PER_TURN / hoursPerShift) : 0;
  const grossIncomePerTurn = shiftsPerTurn * hoursPerShift * hourlyWage;

  // Loan default: 25% wage garnishment
  const loanInDefault = player.loanAmount > 0 && player.loanWeeksRemaining <= 0;
  const netIncomePerTurn = loanInDefault
    ? Math.round(grossIncomePerTurn * 0.75)
    : grossIncomePerTurn;

  // ─── Food cost estimation ──────────────────────────────
  // Slums/homeless: cheaper food (~20g/turn), Noble: ~30g/turn
  const foodCostPerTurn = player.housing === 'noble' ? 30 : 20;

  // ─── Rent schedule ─────────────────────────────────────
  const rentCost = player.housing !== 'homeless'
    ? (player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing])
    : 0;

  // Calculate when rent is next due — criticalNeeds.ts uses: isRentWeek = (week + 1) % 4 === 0
  let rentDueInTurns = 999;
  if (rentCost > 0) {
    for (let i = 1; i <= 4; i++) {
      if ((week + i) % 4 === 0) {
        rentDueInTurns = i - 1; // 0-indexed (0 = this turn)
        break;
      }
    }
    if (rentDueInTurns === 999) rentDueInTurns = 4;
  }

  // ─── Project gold for each future turn ─────────────────
  const projectedGold: number[] = [];
  let runningGold = player.gold;

  for (let t = 1; t <= weeksAhead; t++) {
    runningGold += netIncomePerTurn;
    runningGold -= foodCostPerTurn;

    // Rent due this turn?
    if (rentCost > 0 && (week + t) % 4 === 0) {
      runningGold -= rentCost;
    }

    projectedGold.push(Math.round(runningGold));
  }

  // ─── Derive actionable signals ──────────────────────────
  const SHORTFALL_THRESHOLD = 50;
  const shortfallRisk = projectedGold.some(g => g < SHORTFALL_THRESHOLD);

  // Safe banking: how much we can deposit without risking a shortfall
  const nextTurnOutflow = foodCostPerTurn + (rentDueInTurns === 0 ? rentCost : 0) + SHORTFALL_THRESHOLD;
  const safeBankingAmount = Math.max(0, player.gold - nextTurnOutflow - 50);

  // Loan recommendation: only if we'd go below threshold and have no savings cushion
  let recommendedLoanAmount = 0;
  if (shortfallRisk && player.savings < 100 && player.loanAmount === 0) {
    const worstGold = Math.min(...projectedGold);
    if (worstGold < 0) {
      recommendedLoanAmount = Math.min(200, Math.abs(worstGold) + 100);
    }
  }

  return {
    projectedGold,
    rentDueInTurns,
    shortfallRisk,
    safeBankingAmount,
    recommendedLoanAmount,
  };
}

// ============================================================
// EDUCATION ROI CALCULATOR
// ============================================================

/**
 * Calculate the return-on-investment for a specific degree.
 *
 * ROI is measured in weeks to break even on tuition costs via
 * the wage increase the degree unlocks.
 *
 * Formula:
 *   payoffWeeks = remainingTuition / weeklyGainEstimate
 *   weeklyGainEstimate = (projectedWage - currentWage) × shiftsPerWeek × hoursPerShift
 */
export function calculateDegreeROI(degreeId: string, player: Player): DegreeROI {
  const degree = DEGREES[degreeId as keyof typeof DEGREES];
  if (!degree) {
    return {
      degreeId, degreeName: degreeId, remainingTuition: 0, currentHourlyWage: 0,
      projectedHourlyWage: 0, weeklyGainEstimate: 0, payoffWeeks: 999, roiScore: 0, unlocksJobId: null,
    };
  }

  const sessionsCompleted = player.degreeProgress[degreeId as keyof typeof player.degreeProgress] ?? 0;
  const sessionsRemaining = Math.max(0, degree.sessionsRequired - sessionsCompleted);
  const remainingTuition = sessionsRemaining * degree.costPerSession;

  const currentJob = player.currentJob ? getJob(player.currentJob) : null;
  const currentHourlyWage = player.currentWage ?? 0;

  // Find the best job unlocked by this degree that we don't already qualify for
  const degreesAfter = [...player.completedDegrees, degreeId];
  let bestUnlockedJob: Job | null = null;
  let bestUnlockedWage = currentHourlyWage;

  for (const job of ALL_JOBS) {
    if (job.baseWage <= bestUnlockedWage) continue;
    // Check if this degree is required for the job
    if (!job.requiredDegrees.includes(degreeId)) continue;
    // Check if all other required degrees are already completed
    const allPrereqsMet = job.requiredDegrees.every(req => degreesAfter.includes(req));
    if (!allPrereqsMet) continue;
    bestUnlockedJob = job;
    bestUnlockedWage = job.baseWage;
  }

  const projectedHourlyWage = bestUnlockedWage;
  const hourlyGain = projectedHourlyWage - currentHourlyWage;

  // Estimate weekly gain: assume 3 shifts at current job's hours per week
  const hoursPerShift = currentJob?.hoursPerShift ?? 8;
  const SHIFTS_PER_WEEK_ESTIMATE = 3;
  const weeklyGainEstimate = hourlyGain * hoursPerShift * SHIFTS_PER_WEEK_ESTIMATE;

  // Payoff weeks: infinite if no gain, 0 if already paid
  const payoffWeeks = weeklyGainEstimate > 0
    ? Math.round(remainingTuition / weeklyGainEstimate)
    : (remainingTuition === 0 ? 0 : 999);

  // ROI score: higher is better
  // Factors: fast payoff, high wage unlock, education points value
  const payoffScore = payoffWeeks > 0 ? Math.max(0, 100 - payoffWeeks * 5) : 50;
  const wageScore = Math.min(50, hourlyGain * 2);
  const educationScore = degree.educationPoints;
  const roiScore = payoffScore + wageScore + educationScore;

  return {
    degreeId,
    degreeName: degree.name,
    remainingTuition,
    currentHourlyWage,
    projectedHourlyWage,
    weeklyGainEstimate,
    payoffWeeks,
    roiScore,
    unlocksJobId: bestUnlockedJob?.id ?? null,
  };
}

/**
 * Rank all available degrees by ROI for this player.
 * Hard AI picks the top ROI degree; medium AI picks from top 2.
 */
export function getRankedDegreesROI(player: Player, settings: DifficultySettings): DegreeROI[] {
  const available = getAvailableDegrees(player.completedDegrees);
  if (available.length === 0) return [];

  return available
    .map(d => calculateDegreeROI(d.id, player))
    .sort((a, b) => b.roiScore - a.roiScore);
}

/**
 * Get the degree the AI should study next.
 * Hard AI uses full ROI ranking; medium/easy use existing logic.
 */
export function getNextDegreeByROI(player: Player, settings: DifficultySettings): import('@/data/education').Degree | null {
  if (settings.planningDepth < 3) {
    return getNextDegree(player, settings);
  }

  const ranked = getRankedDegreesROI(player, settings);
  if (ranked.length === 0) return null;

  const bestId = ranked[0].degreeId;
  return DEGREES[bestId as keyof typeof DEGREES] ?? null;
}

/**
 * Get the full prerequisite chain of degrees needed to unlock a target job.
 * Returns degrees in topological order (prerequisites first).
 */
export function getDegreeUnlockChain(targetJobId: string, player: Player): import('@/data/education').Degree[] {
  const targetJob = ALL_JOBS.find(j => j.id === targetJobId);
  if (!targetJob || targetJob.requiredDegrees.length === 0) return [];

  const chain: import('@/data/education').Degree[] = [];
  const needed = new Set<string>();

  // BFS to collect all required degrees (including transitive prerequisites)
  const queue = [...targetJob.requiredDegrees];
  while (queue.length > 0) {
    const degId = queue.shift()!;
    if (player.completedDegrees.includes(degId as any)) continue;
    if (needed.has(degId)) continue;

    const deg = DEGREES[degId as keyof typeof DEGREES];
    if (!deg) continue;

    needed.add(degId);
    for (const prereq of deg.prerequisites) {
      if (!player.completedDegrees.includes(prereq as any) && !needed.has(prereq)) {
        queue.push(prereq);
      }
    }
  }

  // Topological sort: prerequisites before dependents
  const sorted: string[] = [];
  const visited = new Set<string>();
  function visit(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    const deg = DEGREES[id as keyof typeof DEGREES];
    if (deg) {
      for (const prereq of deg.prerequisites) {
        if (needed.has(prereq)) visit(prereq);
      }
    }
    sorted.push(id);
  }
  for (const id of needed) visit(id);

  return sorted
    .map(id => DEGREES[id as keyof typeof DEGREES])
    .filter(Boolean) as import('@/data/education').Degree[];
}
