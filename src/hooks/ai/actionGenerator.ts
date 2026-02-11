/**
 * Grimwald AI - Action Generator
 *
 * The main decision engine that generates prioritized lists of possible actions.
 * Orchestrates category-based action generators and applies route optimization,
 * personality-based priority scaling, time-budget awareness, and weather/festival context.
 */

import type { Player } from '@/types/game.types';
import { HOURS_PER_TURN } from '@/types/game.types';
import { calculatePathDistance } from '@/data/locations';
import { useGameStore } from '@/store/gameStore';

import type { DifficultySettings, AIAction, AIPersonality } from './types';
import { getAIPersonality } from './types';
import {
  calculateGoalProgress,
  calculateResourceUrgency,
  getWeakestGoal,
} from './strategy';
import {
  type ActionContext,
  generateCriticalActions,
  generateGoalActions,
  generateStrategicActions,
  generateEconomicActions,
  generateQuestDungeonActions,
  generateRivalryActions,
} from './actions';
import { getCounterStrategyWeights, type CounterStrategyWeights } from './playerObserver';

/**
 * Apply personality-based priority scaling to all generated actions.
 * Each action type gets its priority multiplied by the relevant personality weight.
 */
function applyPersonalityWeights(actions: AIAction[], personality: AIPersonality): void {
  for (const action of actions) {
    const w = personality.weights;
    switch (action.type) {
      // Education actions
      case 'study':
      case 'graduate':
        action.priority = Math.round(action.priority * w.education);
        break;
      // Wealth/work actions
      case 'work':
      case 'deposit-bank':
      case 'withdraw-bank':
      case 'apply-job':
        action.priority = Math.round(action.priority * w.wealth);
        break;
      // Combat/dungeon actions
      case 'explore-dungeon':
      case 'buy-equipment':
      case 'temper-equipment':
        action.priority = Math.round(action.priority * w.combat);
        break;
      // Social/happiness actions
      case 'rest':
      case 'buy-appliance':
      case 'buy-ticket':
        action.priority = Math.round(action.priority * w.social);
        break;
      // Caution/health actions
      case 'heal':
      case 'cure-sickness':
        action.priority = Math.round(action.priority * w.caution);
        break;
      // Gambling/risk actions
      case 'buy-lottery-ticket':
      case 'buy-stock':
      case 'sell-stock':
        action.priority = Math.round(action.priority * w.gambling);
        break;
      // Move actions inherit the weight of what they're moving toward
      // (handled by the description or left at 1.0)
      default:
        break;
    }
  }
}

/**
 * Apply time-budget awareness: boost quick actions late in turn,
 * boost high-value actions early in turn.
 */
function applyTimeBudgetAwareness(actions: AIAction[], turnTimeRatio: number): void {
  for (const action of actions) {
    if (turnTimeRatio < 0.25) {
      // Late in turn (< 15 hours left): boost quick errands, penalize long activities
      const quickActions = ['buy-food', 'buy-clothing', 'deposit-bank', 'withdraw-bank',
        'pay-rent', 'buy-fresh-food', 'buy-lottery-ticket', 'pawn-appliance',
        'complete-quest', 'graduate', 'sell-item', 'repay-loan'];
      if (quickActions.includes(action.type)) {
        action.priority += 8; // Boost quick actions
      }
      // Penalize activities that need lots of time
      if (action.type === 'study' || action.type === 'explore-dungeon') {
        action.priority -= 10;
      }
    } else if (turnTimeRatio > 0.8) {
      // Early in turn (> 48 hours left): boost high-value activities
      const highValueActions = ['work', 'study', 'explore-dungeon', 'take-quest'];
      if (highValueActions.includes(action.type)) {
        action.priority += 5; // Small boost for productive activities early
      }
    }
  }
}

/**
 * Apply counter-strategy weights based on observed human player behavior.
 * Boosts AI priorities in areas where humans are strong (competitive pressure)
 * and in areas humans neglect (exploit gaps).
 */
function applyCounterStrategyWeights(actions: AIAction[], counterWeights: CounterStrategyWeights): void {
  for (const action of actions) {
    switch (action.type) {
      case 'study':
      case 'graduate':
        action.priority = Math.round(action.priority * counterWeights.education);
        break;
      case 'work':
      case 'deposit-bank':
      case 'withdraw-bank':
      case 'apply-job':
      case 'buy-stock':
      case 'sell-stock':
        action.priority = Math.round(action.priority * counterWeights.wealth);
        break;
      case 'explore-dungeon':
      case 'buy-equipment':
      case 'temper-equipment':
      case 'take-quest':
      case 'take-bounty':
      case 'complete-quest':
        action.priority = Math.round(action.priority * counterWeights.combat);
        break;
      case 'rest':
      case 'buy-appliance':
      case 'buy-ticket':
        action.priority = Math.round(action.priority * counterWeights.happiness);
        break;
      default:
        break;
    }
  }
}

/**
 * Improved mistake system: instead of just swapping top 2 actions,
 * simulate more realistic mistakes like overlooking opportunities.
 */
function applyMistakes(actions: AIAction[], mistakeChance: number): void {
  if (mistakeChance <= 0 || actions.length < 3) return;

  if (Math.random() < mistakeChance) {
    // Pick a random mistake type
    const mistakeType = Math.random();
    if (mistakeType < 0.4) {
      // 40%: Skip the best action (forgot about it)
      // Move the top action to position 2-4
      const insertPos = Math.min(2 + Math.floor(Math.random() * 3), actions.length - 1);
      const skipped = actions.splice(0, 1)[0];
      actions.splice(insertPos, 0, skipped);
    } else if (mistakeType < 0.7) {
      // 30%: Swap top two (classic mistake)
      const temp = actions[0];
      actions[0] = actions[1];
      actions[1] = temp;
    } else {
      // 30%: Randomly boost a mid-tier action (impulsive decision)
      const midIdx = Math.floor(actions.length * 0.3) + Math.floor(Math.random() * Math.floor(actions.length * 0.4));
      if (midIdx > 0 && midIdx < actions.length) {
        const impulsive = actions.splice(midIdx, 1)[0];
        actions.unshift(impulsive);
      }
    }
  }
}

/**
 * Main AI decision engine - generates prioritized list of possible actions
 */
export function generateActions(
  player: Player,
  goals: { wealth: number; happiness: number; education: number; career: number },
  settings: DifficultySettings,
  week: number,
  priceModifier: number
): AIAction[] {
  const progress = calculateGoalProgress(player, goals);
  const urgency = calculateResourceUrgency(player);
  const weakestGoal = getWeakestGoal(progress);
  const currentLocation = player.currentLocation;

  // Get personality for this AI player
  const personality = getAIPersonality(player.id);

  // C4: Get rival players for competitive awareness
  const state = useGameStore.getState();
  const allPlayers = state.players;
  const rivals = allPlayers.filter(p => p.id !== player.id && !p.isGameOver);

  // Weather and festival context
  // Weather uses movementCostExtra: additive hours per location step
  const weatherMoveExtra = state.weather?.movementCostExtra ?? 0;
  const activeFestival = state.activeFestival ?? null;

  // Express weather impact as a multiplier for ActionContext (approximate)
  const weatherMoveCostMult = weatherMoveExtra > 0 ? 1.5 : 1.0;

  // Time budget: fraction of turn remaining
  const turnTimeRatio = player.timeRemaining / HOURS_PER_TURN;

  // Helper to calculate movement cost (includes weather extra cost per step)
  const moveCost = (to: Parameters<typeof calculatePathDistance>[1]) => {
    const baseSteps = calculatePathDistance(currentLocation, to);
    // Weather adds extra hours per step
    return baseSteps + (baseSteps * weatherMoveExtra);
  };

  // Build shared context for all action generators
  const ctx: ActionContext = {
    player,
    goals,
    settings,
    personality,
    week,
    priceModifier,
    currentLocation,
    moveCost,
    progress,
    urgency,
    weakestGoal,
    rivals,
    weatherMoveCostMult,
    activeFestival,
    turnTimeRatio,
  };

  // Collect actions from all category generators
  const actions: AIAction[] = [
    ...generateCriticalActions(ctx),
    ...generateGoalActions(ctx),
    ...generateStrategicActions(ctx),
    ...generateEconomicActions(ctx),
    ...generateQuestDungeonActions(ctx),
    ...generateRivalryActions(ctx),
  ];

  // ============================================
  // PERSONALITY: Apply personality-based weights
  // ============================================
  applyPersonalityWeights(actions, personality);

  // ============================================
  // COUNTER-STRATEGY: Adapt to observed human player behavior
  // ============================================
  const humanRivalIds = rivals.filter(r => !r.isAI).map(r => r.id);
  if (humanRivalIds.length > 0) {
    const counterWeights = getCounterStrategyWeights(humanRivalIds, settings.planningDepth);
    applyCounterStrategyWeights(actions, counterWeights);
  }

  // ============================================
  // TIME BUDGET: Adjust priorities based on turn phase
  // ============================================
  applyTimeBudgetAwareness(actions, turnTimeRatio);

  // ============================================
  // AI-12: ROUTE OPTIMIZATION
  // ============================================
  // If multiple needs share a location, prefer that location
  const locationNeeds: Record<string, number> = {};
  for (const action of actions) {
    if (action.type === 'move' && action.location) {
      locationNeeds[action.location] = (locationNeeds[action.location] || 0) + 1;
    }
  }
  // Boost priority for moves to locations with multiple needs
  for (const action of actions) {
    if (action.type === 'move' && action.location && (locationNeeds[action.location] || 0) > 1) {
      action.priority += 5 * (locationNeeds[action.location] - 1);
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

  // ============================================
  // MISTAKES: Improved mistake system
  // ============================================
  applyMistakes(actions, settings.mistakeChance);

  return actions;
}
