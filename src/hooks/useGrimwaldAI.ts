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

import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import type { Player } from '@/types/game.types';

// Import from extracted modules
import { DIFFICULTY_SETTINGS } from '@/hooks/ai/types';
import type { AIDifficulty, AIAction, CommitmentPlan } from '@/hooks/ai/types';
import { calculateGoalProgress, calculateResourceUrgency, getWeakestGoal } from '@/hooks/ai/strategy';
import { generateActions } from '@/hooks/ai/actionGenerator';
import { executeAIAction } from '@/hooks/ai/actionExecutor';
import { selectAIStoreActions } from '@/hooks/ai/storeActions';
import { observeHumanPlayers, resetObservations } from '@/hooks/ai/playerObserver';
import { recordPerformance, calculateAdjustment, applyAdjustment, resetPerformanceHistory } from '@/hooks/ai/difficultyAdjuster';
import { recordAIGoalProgress, resetVelocityData } from '@/hooks/ai/goalVelocityTracker';
import { generateCommitmentPlan, isCommitmentValid } from '@/hooks/ai/commitmentPlan';
import {
  createAIFailedActionCache,
  getViableAIActions,
  recordFailedAIAction,
  type AIFailedActionCache,
} from '@/hooks/ai/failedActionCache';

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
  // Track structured failures for this turn. A record blocks only the same
  // action for the same relevant player state and is shared by normal/fast paths.
  const failedActionsRef = useRef<AIFailedActionCache>(createAIFailedActionCache());
  // Track visited locations this turn to prevent back-and-forth oscillation
  const visitedLocationsRef = useRef<Set<string>>(new Set());
  // Commitment plan: persists across turns for 2-4 turn strategic focus
  const commitmentPlansRef = useRef<Map<string, CommitmentPlan>>(new Map());

  const goalSettings = useGameStore(state => state.goalSettings);
  const endTurn = useGameStore(state => state.endTurn);

  // Subscribe only to action references. The AI hook no longer rerenders for
  // every gold, time, movement or event mutation in the game store.
  const storeActions = useGameStore(useShallow(selectAIStoreActions));

  /**
   * Execute a single AI action — delegates to the handler map in actionExecutor.ts
   */
  const executeAction = useCallback((player: Player, action: AIAction, onActionStart?: (desc: string) => void): boolean => {
    actionLogRef.current.push(`${player.name}: ${action.description}`);
    onActionStart?.(action.description);
    return executeAIAction(player, action, storeActions);
  }, [storeActions]);

  /**
   * Run the AI's turn
   * @param player The AI player
   * @param onActionStart Optional callback — called with a human-readable description each time an action begins
   */
  const runAITurn = useCallback(async (player: Player, onActionStart?: (desc: string) => void) => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    actionLogRef.current = [];
    failedActionsRef.current.clear(); // Reset failed action tracking for new turn
    visitedLocationsRef.current.clear(); // Reset location history for new turn
    visitedLocationsRef.current.add(player.currentLocation); // Mark starting location as visited

    // BUG FIX: Capture currentPlayerIndex at turn start to detect stale step execution.
    // If useAutoEndTurn or any external code advances the turn while an AI step is still
    // scheduled, the stale step's endTurn() call would double-advance the turn, skipping
    // another player. The guard in step() aborts when the index no longer matches.
    const startingPlayerIndex = useGameStore.getState().currentPlayerIndex;

    let actionsRemaining = 32; // Bounded budget shared by normal and fast execution.
    const startingWeek = useGameStore.getState().week;
    const ownsTurn = () => {
      const live = useGameStore.getState();
      return live.phase !== 'victory' && live.week === startingWeek
        && live.currentPlayerIndex === startingPlayerIndex
        && live.players[startingPlayerIndex]?.id === player.id;
    };
    const endOwnedTurn = () => {
      isExecutingRef.current = false;
      if (ownsTurn()) endTurn();
    };
    let commitmentPlan = commitmentPlansRef.current.get(player.id) ?? null;
    const refreshPlan = (livePlayer: Player) => {
      const live = useGameStore.getState();
      const progress = calculateGoalProgress(livePlayer, goalSettings, live.stockPrices);
      if (commitmentPlan && !isCommitmentValid(commitmentPlan, livePlayer, progress, live.week)) commitmentPlan = null;
      if (!commitmentPlan) commitmentPlan = generateCommitmentPlan(livePlayer, progress, baseSettings, live.week);
      if (commitmentPlan) commitmentPlansRef.current.set(player.id, commitmentPlan);
      else commitmentPlansRef.current.delete(player.id);
    };
    let currentPlayer = player;
    let settings = baseSettings; // Set before step closure so it's always defined

    // BUG FIX: Wrap initialization in try-catch so any exception in helper functions
    // (observeHumanPlayers, recordPerformance, generateCommitmentPlan, etc.) resets
    // isExecutingRef and calls endTurn rather than leaving the AI permanently frozen.
    try {
      // ── Observe human players & record performance for adaptive systems ──
      const initState = useGameStore.getState();
      const humanPlayers = initState.players.filter(p => !p.isAI && !p.isGameOver);
      observeHumanPlayers(humanPlayers, initState.week);
      recordPerformance(player, humanPlayers, goalSettings, initState.week);

      // ── Goal velocity tracking: record progress snapshot at turn start ──
      const initProgress = calculateGoalProgress(player, goalSettings, initState.stockPrices);
      recordAIGoalProgress(player.id, initProgress, initState.week);

      // Each opponent keeps its own multi-turn plan when the shared hook switches seats.
      refreshPlan(player);

      // ── Calculate dynamic difficulty adjustment ──
      const adjustment = calculateAdjustment(player.id);
      settings = applyAdjustment(baseSettings, adjustment);

      if (adjustment.active) {
        console.log(`[Grimwald AI] ${player.name} difficulty adjusted: gap=${adjustment.performanceGap.toFixed(2)}, ` +
          `mistakes=${settings.mistakeChance.toFixed(3)}, aggression=${settings.aggressiveness.toFixed(2)}`);
      }

      console.log(`[Grimwald AI] ${player.name} starting turn (${difficulty} difficulty)`);
    } catch (initErr) {
      console.error('[Grimwald AI] Init error in runAITurn, resetting execution flag:', initErr);
      isExecutingRef.current = false;
      try { endOwnedTurn(); } catch { /* ignore */ }
      return;
    }

    const step = async () => {
      try {
        // Get fresh player state
        const state = useGameStore.getState();
        currentPlayer = state.players.find(p => p.id === player.id) || currentPlayer;

        // BUG FIX: Stale-step guard — abort if the turn was advanced externally (e.g. by
        // useAutoEndTurn firing before the AI step). Without this, the stale step would
        // see timeRemaining=0 and call endTurn() a second time, skipping the next player.
        if (!ownsTurn()) {
          console.log(`[Grimwald AI] Stale step for ${player.name} (expected idx ${startingPlayerIndex}, got ${state.currentPlayerIndex}), aborting`);
          isExecutingRef.current = false;
          return;
        }

        // Check skip request
        if (state.skipAITurn) {
          console.log(`[Grimwald AI] Turn skipped by player`);
          // Execute remaining actions instantly without delays. BUG-013: this path
          // must use the same dependency-aware failure records as the normal loop.
          let emergencyLimit = actionsRemaining;
          while (emergencyLimit > 0) {
            const fastState = useGameStore.getState();
            const fastPlayer = fastState.players.find(p => p.id === player.id);
            if (!ownsTurn() || !fastPlayer || fastPlayer.timeRemaining < 1 || fastPlayer.isGameOver) break;
            refreshPlan(fastPlayer);
            const fastActions = generateActions(
              fastPlayer,
              goalSettings,
              settings,
              fastState.week,
              fastState.priceModifier,
              fastState.stockPrices,
              commitmentPlan,
              visitedLocationsRef.current,
            );
            const viableFastActions = getViableAIActions(
              fastActions,
              fastPlayer,
              failedActionsRef.current,
            );
            const fastAction = viableFastActions[0];
            if (!fastAction || fastAction.type === 'end-turn') break;

            const success = executeAction(fastPlayer, fastAction);
            if (!success) {
              const failure = recordFailedAIAction(
                failedActionsRef.current,
                fastAction,
                fastPlayer,
              );
              console.log(
                `[Grimwald AI] Fast action failed (${failure.reason}, attempt ${failure.attemptsForSignature}): ${fastAction.description}`,
              );
            } else {
              if (fastAction.type === 'move' && fastAction.location) {
                visitedLocationsRef.current.add(fastAction.location);
              }
            }
            emergencyLimit--;
          }
          useGameStore.setState({ skipAITurn: false });
          endOwnedTurn();
          return;
        }

        // Check exit conditions
        if (actionsRemaining <= 0 || currentPlayer.timeRemaining < 1 || currentPlayer.isGameOver) {
          console.log(`[Grimwald AI] Turn complete. Actions: ${actionLogRef.current.join(' -> ')}`);
          // FIX: always call endTurn unless the player is already game over (death system handles that case)
          // Previously used `timeRemaining > 0` guard which skipped endTurn when time hit exactly 0,
          // freezing the turn permanently.
          if (!currentPlayer.isGameOver) {
            endOwnedTurn();
          }
          isExecutingRef.current = false;
          return;
        }

        refreshPlan(currentPlayer);

        // Generate possible actions (with adjusted settings + commitment plan)
        const actions = generateActions(
          currentPlayer,
          goalSettings,
          settings,
          state.week,
          state.priceModifier,
          state.stockPrices,
          commitmentPlan,
          visitedLocationsRef.current,
        );

        // Suppress only the exact action + prerequisite state that failed. If the
        // AI moves, earns money or progresses education, the signature changes.
        const viableActions = getViableAIActions(
          actions,
          currentPlayer,
          failedActionsRef.current,
        );

        // Both presentation speeds use the same scoring and failure filter.
        // Travel history was already considered before difficulty mistakes.
        const bestAction = viableActions[0];

        if (!bestAction || bestAction.type === 'end-turn') {
          console.log(`[Grimwald AI] Ending turn. Log: ${actionLogRef.current.join(' -> ')}`);
          endOwnedTurn();
          return;
        }

        // Execute action
        const success = executeAction(currentPlayer, bestAction, onActionStart);
        actionsRemaining--;

        if (!success) {
          const failure = recordFailedAIAction(
            failedActionsRef.current,
            bestAction,
            currentPlayer,
          );
          console.log(
            `[Grimwald AI] Action failed (${failure.reason}, attempt ${failure.attemptsForSignature}): ${bestAction.description}`,
          );
        } else if (bestAction.type === 'move' && bestAction.location) {
          // Track visited location to prevent oscillation back to this spot
          visitedLocationsRef.current.add(bestAction.location);
        }

        // Re-check death immediately after action execution
        const postActionPlayer = useGameStore.getState().players.find(p => p.id === player.id);
        if (!postActionPlayer || postActionPlayer.isGameOver || postActionPlayer.health <= 0) {
          console.log(`[Grimwald AI] Player died during action, ending turn immediately`);
          endOwnedTurn();
          return;
        }

        // Continue with next action after delay (respect speed multiplier)
        const speedMult = useGameStore.getState().aiSpeedMultiplier || 1;
        const adjustedDelay = Math.max(50, Math.floor(settings.decisionDelay / speedMult));
        setTimeout(step, adjustedDelay);
      } catch (err) {
        // Guarantee flag is always reset — prevents AI from freezing permanently on uncaught error
        console.error('[Grimwald AI] Uncaught error in step, resetting execution flag:', err);
        isExecutingRef.current = false;
        try { endOwnedTurn(); } catch { /* ignore secondary failure */ }
      }
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
    resetVelocityData();
    commitmentPlansRef.current.clear();
    failedActionsRef.current.clear();
    visitedLocationsRef.current.clear();
  }, []);

  /**
   * Get AI analysis of current game state
   */
  const analyzeGameState = useCallback((player: Player) => {
    const progress = calculateGoalProgress(player, goalSettings, useGameStore.getState().stockPrices);
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
