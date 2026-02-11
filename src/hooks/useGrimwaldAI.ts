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
 * - Learning from human player strategies (counter-strategy)
 * - Dynamic difficulty auto-adjustment based on performance gap
 */

import { useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Player } from '@/types/game.types';

// Import from extracted modules
import { DIFFICULTY_SETTINGS } from '@/hooks/ai/types';
import type { AIDifficulty, AIAction } from '@/hooks/ai/types';
import { calculateGoalProgress, calculateResourceUrgency, getWeakestGoal } from '@/hooks/ai/strategy';
import { generateActions } from '@/hooks/ai/actionGenerator';
import { executeAIAction, type StoreActions } from '@/hooks/ai/actionExecutor';
import { observeHumanPlayers, resetObservations } from '@/hooks/ai/playerObserver';
import { recordPerformance, calculateAdjustment, applyAdjustment, resetPerformanceHistory } from '@/hooks/ai/difficultyAdjuster';

// Re-export types for backwards compatibility
export type { AIDifficulty, AIAction, GoalProgress, ResourceUrgency } from '@/hooks/ai/types';
export type { AIActionType } from '@/hooks/ai/types';

/**
 * Main AI Hook
 */
export function useGrimwaldAI(difficulty: AIDifficulty = 'medium') {
  const baseSettings = DIFFICULTY_SETTINGS[difficulty];
  const isExecutingRef = useRef(false);
  const actionLogRef = useRef<string[]>([]);
  // Track actions that failed this turn to avoid re-attempting them
  const failedActionsRef = useRef<Set<string>>(new Set());

  const store = useGameStore();
  const { goalSettings, endTurn } = store;

  // Bundle all store actions into a single StoreActions object.
  // This replaces destructuring 35+ individual store functions.
  const storeActions: StoreActions = useMemo(() => ({
    movePlayer: store.movePlayer,
    workShift: store.workShift,
    modifyGold: store.modifyGold,
    modifyHealth: store.modifyHealth,
    modifyFood: store.modifyFood,
    modifyHappiness: store.modifyHappiness,
    modifyClothing: store.modifyClothing,
    modifyRelaxation: store.modifyRelaxation,
    spendTime: store.spendTime,
    studyDegree: store.studyDegree,
    completeDegree: store.completeDegree,
    setJob: store.setJob,
    payRent: store.payRent,
    depositToBank: store.depositToBank,
    withdrawFromBank: store.withdrawFromBank,
    buyAppliance: store.buyAppliance,
    moveToHousing: store.moveToHousing,
    buyDurable: store.buyDurable,
    equipItem: store.equipItem,
    buyGuildPass: store.buyGuildPass,
    takeQuest: store.takeQuest,
    takeChainQuest: store.takeChainQuest,
    takeBounty: store.takeBounty,
    completeQuest: store.completeQuest,
    clearDungeonFloor: store.clearDungeonFloor,
    applyRareDrop: store.applyRareDrop,
    cureSickness: store.cureSickness,
    takeLoan: store.takeLoan,
    repayLoan: store.repayLoan,
    buyStock: store.buyStock,
    sellStock: store.sellStock,
    buyFreshFood: store.buyFreshFood,
    buyTicket: store.buyTicket,
    sellItem: store.sellItem,
    pawnAppliance: store.pawnAppliance,
    buyLotteryTicket: store.buyLotteryTicket,
    temperEquipment: store.temperEquipment,
    endTurn: store.endTurn,
  }), [store]);

  /**
   * Execute a single AI action — delegates to the handler map in actionExecutor.ts
   */
  const executeAction = useCallback((player: Player, action: AIAction): boolean => {
    actionLogRef.current.push(`${player.name}: ${action.description}`);
    return executeAIAction(player, action, storeActions);
  }, [storeActions]);

  /**
   * Run the AI's turn
   */
  const runAITurn = useCallback(async (player: Player) => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    actionLogRef.current = [];
    failedActionsRef.current.clear(); // Reset failed action tracking for new turn

    // ── Observe human players & record performance for adaptive systems ──
    const initState = useGameStore.getState();
    const humanPlayers = initState.players.filter(p => !p.isAI && !p.isGameOver);
    observeHumanPlayers(humanPlayers, initState.week);
    recordPerformance(player, humanPlayers, goalSettings, initState.week);

    // ── Calculate dynamic difficulty adjustment ──
    const adjustment = calculateAdjustment(player.id);
    const settings = applyAdjustment(baseSettings, adjustment);

    if (adjustment.active) {
      console.log(`[Grimwald AI] ${player.name} difficulty adjusted: gap=${adjustment.performanceGap.toFixed(2)}, ` +
        `mistakes=${settings.mistakeChance.toFixed(3)}, aggression=${settings.aggressiveness.toFixed(2)}`);
    }

    console.log(`[Grimwald AI] ${player.name} starting turn (${difficulty} difficulty)`);

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
        let consecutiveFailures = 0;
        while (emergencyLimit > 0) {
          const fastState = useGameStore.getState();
          const fastPlayer = fastState.players.find(p => p.id === player.id);
          if (!fastPlayer || fastPlayer.timeRemaining < 1 || fastPlayer.isGameOver) break;
          const fastActions = generateActions(fastPlayer, goalSettings, settings, fastState.week, fastState.priceModifier);
          if (fastActions[0].type === 'end-turn') break;
          const success = executeAction(fastPlayer, fastActions[0]);
          if (!success) {
            consecutiveFailures++;
            if (consecutiveFailures >= 3) break; // Bail if stuck in failure loop
          } else {
            consecutiveFailures = 0;
          }
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

      // Generate possible actions (with adjusted settings)
      const actions = generateActions(
        currentPlayer,
        goalSettings,
        settings,
        state.week,
        state.priceModifier
      );

      // Filter out actions that already failed this turn (prevent re-attempting)
      const actionKey = (a: AIAction) => `${a.type}:${a.location || ''}:${a.details?.degreeId || a.details?.jobId || a.details?.itemId || ''}`;
      const viableActions = actions.filter(a => a.type === 'end-turn' || !failedActionsRef.current.has(actionKey(a)));

      // Get best viable action (fall back to full list if all filtered)
      const bestAction = viableActions.length > 0 ? viableActions[0] : actions[0];

      if (bestAction.type === 'end-turn') {
        console.log(`[Grimwald AI] Ending turn. Log: ${actionLogRef.current.join(' -> ')}`);
        endTurn();
        isExecutingRef.current = false;
        return;
      }

      // Execute action
      const success = executeAction(currentPlayer, bestAction);
      actionsRemaining--;

      if (!success) {
        // Track failed action to avoid re-attempting this turn
        failedActionsRef.current.add(actionKey(bestAction));
        console.log(`[Grimwald AI] Action failed: ${bestAction.description}`);
      }

      // Re-check death immediately after action execution
      const postActionPlayer = useGameStore.getState().players.find(p => p.id === player.id);
      if (!postActionPlayer || postActionPlayer.isGameOver || postActionPlayer.health <= 0) {
        console.log(`[Grimwald AI] Player died during action, ending turn immediately`);
        endTurn();
        isExecutingRef.current = false;
        return;
      }

      // Continue with next action after delay (respect speed multiplier)
      const speedMult = useGameStore.getState().aiSpeedMultiplier || 1;
      const adjustedDelay = Math.max(50, Math.floor(settings.decisionDelay / speedMult));
      setTimeout(step, adjustedDelay);
    };

    // Start the turn
    const speedMult = useGameStore.getState().aiSpeedMultiplier || 1;
    const adjustedDelay = Math.max(50, Math.floor(baseSettings.decisionDelay / speedMult));
    setTimeout(step, adjustedDelay);
  }, [difficulty, baseSettings, goalSettings, executeAction, endTurn]);

  /**
   * Reset adaptive systems when starting a new game.
   */
  const resetAdaptiveSystems = useCallback(() => {
    resetObservations();
    resetPerformanceHistory();
  }, []);

  /**
   * Get AI analysis of current game state
   */
  const analyzeGameState = useCallback((player: Player) => {
    const progress = calculateGoalProgress(player, goalSettings);
    const urgency = calculateResourceUrgency(player);
    const weakestGoal = getWeakestGoal(progress);
    const adjustment = calculateAdjustment(player.id);

    return {
      progress,
      urgency,
      weakestGoal,
      difficulty,
      settings: baseSettings,
      adjustment,
    };
  }, [goalSettings, difficulty, baseSettings]);

  return {
    runAITurn,
    analyzeGameState,
    resetAdaptiveSystems,
    actionLog: actionLogRef.current,
    difficulty,
    settings: baseSettings,
  };
}
