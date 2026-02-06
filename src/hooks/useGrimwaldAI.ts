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
import type { Player, HousingTier, DegreeId, EquipmentSlot } from '@/types/game.types';
import { RENT_COSTS, GUILD_PASS_COST } from '@/types/game.types';
import { getJob, canWorkJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import { calculatePathDistance } from '@/data/locations';
import { calculateCombatStats } from '@/data/items';
import { getFloor, calculateEducationBonuses, getFloorTimeCost, getLootMultiplier } from '@/data/dungeon';
import { autoResolveFloor } from '@/data/combatResolver';

// Import from extracted modules
import { DIFFICULTY_SETTINGS } from '@/hooks/ai/types';
import type { AIDifficulty, AIAction } from '@/hooks/ai/types';
import { calculateGoalProgress, calculateResourceUrgency, getWeakestGoal } from '@/hooks/ai/strategy';
import { generateActions } from '@/hooks/ai/actionGenerator';

// Re-export types for backwards compatibility
export type { AIDifficulty, AIAction, GoalProgress, ResourceUrgency } from '@/hooks/ai/types';
export type { AIActionType } from '@/hooks/ai/types';

/**
 * Main AI Hook
 */
export function useGrimwaldAI(difficulty: AIDifficulty = 'medium') {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const isExecutingRef = useRef(false);
  const actionLogRef = useRef<string[]>([]);

  const {
    goalSettings,
    movePlayer,
    workShift,
    modifyGold,
    modifyHealth,
    modifyFood,
    modifyHappiness,
    modifyClothing,
    modifyRelaxation,
    spendTime,
    studyDegree,
    completeDegree,
    setJob,
    payRent,
    depositToBank,
    withdrawFromBank,
    buyAppliance,
    moveToHousing,
    buyDurable,
    equipItem,
    buyGuildPass,
    takeQuest,
    completeQuest,
    clearDungeonFloor,
    applyRareDrop,
    cureSickness,
    takeLoan,
    repayLoan,
    buyStock,
    sellStock,
    buyFreshFood,
    buyTicket,
    sellItem,
    pawnAppliance,
    buyLotteryTicket,
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
        const cost = (action.details?.cost as number) || 15;
        const foodGain = (action.details?.foodGain as number) || 25;
        if (player.gold < cost) return false;
        modifyGold(player.id, -cost);
        modifyFood(player.id, foodGain);
        spendTime(player.id, 1);
        return true;
      }

      case 'buy-clothing': {
        const cost = (action.details?.cost as number) || 25;
        const clothingGain = (action.details?.clothingGain as number) || 50;
        if (player.gold < cost) return false;
        modifyGold(player.id, -cost);
        modifyClothing(player.id, clothingGain);
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
        const cost = (action.details?.cost as number) || 300;
        if (!applianceId || player.gold < cost) return false;
        const source = (action.details?.source as string) || 'enchanter';
        buyAppliance(player.id, applianceId, cost, source as any);
        spendTime(player.id, 1);
        return true;
      }

      case 'move-housing': {
        const tier = action.details?.tier as HousingTier;
        const cost = (action.details?.cost as number) || 200;
        if (!tier || player.gold < cost) return false;
        const rent = (action.details?.rent as number) || RENT_COSTS[tier];
        moveToHousing(player.id, tier, cost, rent);
        spendTime(player.id, 1);
        return true;
      }

      case 'rest': {
        const hours = (action.details?.hours as number) || 4;
        const happinessGain = (action.details?.happinessGain as number) || 5;
        const relaxGain = (action.details?.relaxGain as number) || 3;
        if (player.timeRemaining < hours) return false;
        spendTime(player.id, hours);
        modifyHappiness(player.id, happinessGain);
        modifyRelaxation(player.id, relaxGain);
        return true;
      }

      case 'heal': {
        const cost = (action.details?.cost as number) || 30;
        const healAmount = (action.details?.healAmount as number) || 25;
        if (player.gold < cost) return false;
        modifyGold(player.id, -cost);
        modifyHealth(player.id, healAmount);
        spendTime(player.id, 2);
        return true;
      }

      case 'downgrade-housing': {
        const tier = action.details?.tier as HousingTier;
        if (!tier) return false;
        moveToHousing(player.id, tier, 0, RENT_COSTS[tier]);
        spendTime(player.id, 1);
        return true;
      }

      case 'buy-equipment': {
        const itemId = action.details?.itemId as string;
        const cost = (action.details?.cost as number) || 0;
        const slot = (action.details?.slot as string) || 'weapon';
        if (!itemId || player.gold < cost) return false;
        buyDurable(player.id, itemId, cost);
        equipItem(player.id, itemId, slot as EquipmentSlot);
        spendTime(player.id, 1);
        return true;
      }

      case 'buy-guild-pass': {
        if (player.hasGuildPass || player.gold < GUILD_PASS_COST) return false;
        buyGuildPass(player.id);
        spendTime(player.id, 1);
        return true;
      }

      case 'take-quest': {
        const questId = action.details?.questId as string;
        if (!questId || player.activeQuest) return false;
        takeQuest(player.id, questId);
        spendTime(player.id, 1);
        return true;
      }

      case 'complete-quest': {
        if (!player.activeQuest) return false;
        completeQuest(player.id);
        return true;
      }

      case 'explore-dungeon': {
        const floorId = action.details?.floorId as number;
        if (!floorId) return false;
        const floor = getFloor(floorId);
        if (!floor) return false;

        // H9: Check dungeon attempts limit and health
        const attemptsUsed = player.dungeonAttemptsThisTurn || 0;
        if (attemptsUsed >= 2) return false; // MAX_FLOOR_ATTEMPTS_PER_TURN
        if (player.health <= 20) return false; // Don't risk death

        // H9: Require at least 1 degree for cave access
        if (player.completedDegrees.length === 0) return false;

        const combatStats = calculateCombatStats(
          player.equippedWeapon,
          player.equippedArmor,
          player.equippedShield,
        );
        const eduBonuses = calculateEducationBonuses(player.completedDegrees);
        const timeCost = getFloorTimeCost(floor, combatStats);
        if (player.timeRemaining < timeCost) return false;

        spendTime(player.id, timeCost);

        // H7: Track dungeon attempts
        const storeState = useGameStore.getState();
        useGameStore.setState({
          players: storeState.players.map(p =>
            p.id === player.id
              ? { ...p, dungeonAttemptsThisTurn: (p.dungeonAttemptsThisTurn || 0) + 1 }
              : p
          ),
        });

        const isFirstClear = !player.dungeonFloorsCleared.includes(floorId);
        const lootMult = getLootMultiplier(floor, player.guildRank);
        const result = autoResolveFloor(floor, combatStats, eduBonuses, player.health, isFirstClear, lootMult);

        // Apply results
        if (result.goldEarned > 0) modifyGold(player.id, result.goldEarned);
        const netDamage = result.totalDamage - result.totalHealed;
        if (netDamage !== 0) modifyHealth(player.id, -netDamage);
        if (result.bossDefeated && isFirstClear) {
          clearDungeonFloor(player.id, floorId);
          modifyHappiness(player.id, floor.happinessOnClear);
        }
        if (result.rareDropName) {
          applyRareDrop(player.id, floor.rareDrop.id);
        }

        console.log(`[Grimwald AI] Dungeon Floor ${floorId}: ${result.success ? 'CLEARED' : 'FAILED'}. ` +
          `+${result.goldEarned}g, -${result.totalDamage} HP. ${result.log.join(' | ')}`);
        return true;
      }

      // AI-2: Cure sickness at enchanter
      case 'cure-sickness': {
        const cost = (action.details?.cost as number) || 75;
        if (!player.isSick || player.gold < cost || player.timeRemaining < 2) return false;
        modifyGold(player.id, -cost);
        spendTime(player.id, 2);
        cureSickness(player.id);
        return true;
      }

      // AI-3: Take a loan at the bank
      case 'take-loan': {
        const amount = (action.details?.amount as number) || 200;
        if (player.loanAmount > 0) return false; // Already has a loan
        takeLoan(player.id, amount);
        spendTime(player.id, 1);
        return true;
      }

      // AI-3: Repay loan
      case 'repay-loan': {
        const amount = (action.details?.amount as number) || player.loanAmount;
        if (player.loanAmount <= 0 || player.gold < amount) return false;
        repayLoan(player.id, amount);
        spendTime(player.id, 1);
        return true;
      }

      // AI-4: Buy stocks
      case 'buy-stock': {
        const stockId = action.details?.stockId as string;
        const shares = (action.details?.shares as number) || 5;
        const price = (action.details?.price as number) || 50;
        const cost = shares * price;
        if (!stockId || player.gold < cost) return false;
        buyStock(player.id, stockId, shares);
        spendTime(player.id, 1);
        return true;
      }

      // AI-4: Sell stocks
      case 'sell-stock': {
        const stockId = action.details?.stockId as string;
        const shares = (action.details?.shares as number) || 5;
        if (!stockId || !player.stocks[stockId] || player.stocks[stockId] < shares) return false;
        sellStock(player.id, stockId, shares);
        spendTime(player.id, 1);
        return true;
      }

      // AI-5: Buy fresh food
      case 'buy-fresh-food': {
        const cost = (action.details?.cost as number) || 25;
        const units = (action.details?.units as number) || 2;
        if (player.gold < cost) return false;
        buyFreshFood(player.id, cost, units);
        spendTime(player.id, 1);
        return true;
      }

      // AI-6: Buy weekend ticket
      case 'buy-ticket': {
        const ticketType = action.details?.ticketType as string;
        const cost = (action.details?.cost as number) || 30;
        if (!ticketType || player.gold < cost) return false;
        buyTicket(player.id, ticketType, cost);
        spendTime(player.id, 1);
        return true;
      }

      // AI-7: Sell inventory item at fence
      case 'sell-item': {
        const itemId = action.details?.itemId as string;
        const price = (action.details?.price as number) || 10;
        if (!itemId) return false;
        sellItem(player.id, itemId, price);
        spendTime(player.id, 1);
        return true;
      }

      // AI-7: Pawn an appliance at fence
      case 'pawn-appliance': {
        const applianceId = action.details?.applianceId as string;
        if (!applianceId || !player.appliances[applianceId]) return false;
        pawnAppliance(player.id, applianceId);
        spendTime(player.id, 1);
        return true;
      }

      // AI-8: Buy lottery ticket
      case 'buy-lottery-ticket': {
        const cost = (action.details?.cost as number) || 5;
        if (player.gold < cost) return false;
        buyLotteryTicket(player.id, cost);
        spendTime(player.id, 1);
        return true;
      }

      case 'end-turn':
        endTurn();
        return true;

      default:
        return false;
    }
  }, [movePlayer, modifyGold, modifyHealth, modifyFood, modifyHappiness, modifyClothing,
      modifyRelaxation, spendTime, studyDegree, completeDegree, setJob, payRent,
      depositToBank, withdrawFromBank, buyAppliance, moveToHousing, workShift,
      buyDurable, equipItem, buyGuildPass, takeQuest, completeQuest,
      clearDungeonFloor, applyRareDrop, cureSickness, takeLoan, repayLoan,
      buyStock, sellStock, buyFreshFood, buyTicket, sellItem, pawnAppliance,
      buyLotteryTicket, endTurn]);

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

      // Check skip request
      if (state.skipAITurn) {
        console.log(`[Grimwald AI] Turn skipped by player`);
        // Execute remaining actions instantly without delays
        let emergencyLimit = 30;
        while (emergencyLimit > 0) {
          const fastState = useGameStore.getState();
          const fastPlayer = fastState.players.find(p => p.id === player.id);
          if (!fastPlayer || fastPlayer.timeRemaining < 1 || fastPlayer.isGameOver) break;
          const fastActions = generateActions(fastPlayer, goalSettings, settings, fastState.week, fastState.priceModifier);
          if (fastActions[0].type === 'end-turn') break;
          await executeAction(fastPlayer, fastActions[0]);
          emergencyLimit--;
        }
        useGameStore.setState({ skipAITurn: false });
        endTurn();
        isExecutingRef.current = false;
        return;
      }

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

      // Continue with next action after delay (respect speed multiplier)
      const speedMult = useGameStore.getState().aiSpeedMultiplier || 1;
      const adjustedDelay = Math.max(50, Math.floor(settings.decisionDelay / speedMult));
      setTimeout(step, adjustedDelay);
    };

    // Start the turn
    const speedMult = useGameStore.getState().aiSpeedMultiplier || 1;
    const adjustedDelay = Math.max(50, Math.floor(settings.decisionDelay / speedMult));
    setTimeout(step, adjustedDelay);
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
