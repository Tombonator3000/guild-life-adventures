/**
 * Grimwald AI - Action Generator
 *
 * The main decision engine that generates prioritized lists of possible actions.
 * Orchestrates category-based action generators and applies route optimization,
 * personality-based priority scaling, time-budget awareness, and weather/festival context.
 */

import type { Player, LocationId } from '@/types/game.types';
import { HOURS_PER_TURN } from '@/types/game.types';
import { BOARD_PATH, calculatePathDistance } from '@/data/locations';
import { calculateCanonicalTravelCost } from '@/store/helpers/travelServiceHelpers';
import { getEffectiveHousingRent } from '@/store/helpers/economy/housingServiceHelpers';
import { useGameStore } from '@/store/gameStore';

import type { DifficultySettings, AIAction, AIPersonality, CommitmentPlan } from './types';
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
import { getAIActionIdentity } from './failedActionCache';
import { generateTacticalActions, isTacticallyFeasible, getSurvivalPriority, applyGoalRelevance, getEssentialReserve } from './tacticalPlanning';
import { getVelocityAdjustments } from './goalVelocityTracker';
import { getCommitmentBonus, isCommitmentValid } from './commitmentPlan';

/**
 * Maps each AI action type to its personality weight category.
 * Actions not in this map (e.g. 'move', 'end-turn') are left unscaled.
 */
const PERSONALITY_WEIGHT_CATEGORY: Partial<Record<string, keyof AIPersonality['weights']>> = {
  // Education
  'study': 'education',
  'graduate': 'education',
  // Wealth/work
  'work': 'wealth',
  'deposit-bank': 'wealth',
  'withdraw-bank': 'wealth',
  'apply-job': 'wealth',
  // Combat/dungeon/quest (M22 FIX: includes quest/bounty actions)
  'explore-dungeon': 'combat',
  'buy-equipment': 'combat',
  'temper-equipment': 'combat',
  'take-quest': 'combat',
  'take-chain-quest': 'combat',
  'take-bounty': 'combat',
  'complete-quest': 'combat',
  'buy-guild-pass': 'combat',
  // Social/happiness
  'rest': 'social',
  'buy-appliance': 'social',
  'buy-ticket': 'social',
  // Caution/health
  'heal': 'caution',
  'cure-sickness': 'caution',
  // Gambling/risk
  'buy-lottery-ticket': 'gambling',
  'buy-stock': 'gambling',
  'sell-stock': 'gambling',
};

/**
 * Apply personality-based priority scaling to all generated actions.
 * Each action type gets its priority multiplied by the relevant personality weight.
 */
function applyPersonalityWeights(actions: AIAction[], personality: AIPersonality): void {
  const w = personality.weights;
  for (const action of actions) {
    const category = PERSONALITY_WEIGHT_CATEGORY[action.type];
    if (category) {
      action.priority = Math.round(action.priority * w[category]);
    }
  }
}

/**
 * Dynamic personality scaling: adjust gambling/risk weights based on relative wealth position.
 * Behind = more aggressive/gambling. Ahead = more cautious/conservative.
 * Only modifies a COPY of weights for this turn — doesn't mutate the personality definition.
 */
function getDynamicPersonality(personality: AIPersonality, player: Player, rivals: Player[]): AIPersonality {
  if (rivals.length === 0) return personality;

  const myWealth = player.gold + player.savings + player.investments;
  const avgRivalWealth = rivals.reduce((sum, r) => sum + r.gold + r.savings + r.investments, 0) / rivals.length;

  if (avgRivalWealth <= 0) return personality;

  const wealthRatio = myWealth / Math.max(1, avgRivalWealth);

  // Behind (ratio < 0.7): boost gambling +30%, rivalry +20%
  // Ahead (ratio > 1.5): reduce gambling -30%, boost caution +20%
  // Middle: no change
  let gamblingMod = 1.0;
  let rivalryMod = 1.0;
  let cautionMod = 1.0;

  if (wealthRatio < 0.7) {
    gamblingMod = 1.3;
    rivalryMod = 1.2;
  } else if (wealthRatio > 1.5) {
    gamblingMod = 0.7;
    cautionMod = 1.2;
  }

  return {
    ...personality,
    weights: {
      ...personality.weights,
      gambling: personality.weights.gambling * gamblingMod,
      rivalry: personality.weights.rivalry * rivalryMod,
      caution: personality.weights.caution * cautionMod,
    },
  };
}

/**
 * Apply time-budget awareness: boost quick actions late in turn,
 * boost high-value actions early in turn.
 */
function applyTimeBudgetAwareness(actions: AIAction[], turnTimeRatio: number, planningDepth: number): void {
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

    // HARD AI: Mid-turn optimization (25-80% time remaining)
    // Avoid movement to distant locations when medium actions remain at current location
    if (planningDepth >= 3 && turnTimeRatio >= 0.25 && turnTimeRatio <= 0.8) {
      // Boost non-movement actions that can be done at current location
      if (action.type !== 'move' && action.type !== 'end-turn') {
        action.priority += 3; // Prefer doing something at current location over moving
      }
    }
  }
}


/**
 * HARD AI: Location batching bonus.
 * When we're already at a location, boost all non-move actions
 * that can be performed here. This prevents the AI from leaving
 * a location before doing everything it can there.
 */
function applyLocationBatchingBonus(actions: AIAction[], currentLocation: string): void {
  // Boost actions that can be performed at the current location (no move needed)
  const localActions = actions.filter(a =>
    a.type !== 'move' && a.type !== 'end-turn' &&
    (!a.location || a.location === currentLocation)
  );

  if (localActions.length > 1) {
    // Boost local actions to encourage batching at current location
    for (const action of localActions) {
      action.priority += 5;
    }
  }
}


/**
 * Maps each AI action type to its counter-strategy weight category.
 * Counter-strategy uses different categories than personality (e.g. stocks → wealth, not gambling).
 */
const COUNTER_STRATEGY_CATEGORY: Partial<Record<string, keyof CounterStrategyWeights>> = {
  // Education
  'study': 'education',
  'graduate': 'education',
  // Wealth (includes stocks — counter-strategy treats stock trading as wealth, not gambling)
  'work': 'wealth',
  'deposit-bank': 'wealth',
  'withdraw-bank': 'wealth',
  'apply-job': 'wealth',
  'buy-stock': 'wealth',
  'sell-stock': 'wealth',
  // Combat
  'explore-dungeon': 'combat',
  'buy-equipment': 'combat',
  'temper-equipment': 'combat',
  'take-quest': 'combat',
  'take-bounty': 'combat',
  'complete-quest': 'combat',
  // Happiness
  'rest': 'happiness',
  'buy-appliance': 'happiness',
  'buy-ticket': 'happiness',
};

/**
 * Apply counter-strategy weights based on observed human player behavior.
 * Boosts AI priorities in areas where humans are strong (competitive pressure)
 * and in areas humans neglect (exploit gaps).
 */
function applyCounterStrategyWeights(actions: AIAction[], counterWeights: CounterStrategyWeights): void {
  for (const action of actions) {
    const category = COUNTER_STRATEGY_CATEGORY[action.type];
    if (category) {
      action.priority = Math.round(action.priority * counterWeights[category]);
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
 * Apply velocity-based priority adjustments.
 * Boosts actions for goals that have momentum; boosts alternatives for stuck goals.
 */
function applyVelocityAdjustments(
  actions: AIAction[],
  playerId: string,
  week: number,
  planningDepth: number,
): void {
  const adjustments = getVelocityAdjustments(playerId, week, planningDepth);
  for (const action of actions) {
    const multiplier = adjustments[action.type];
    if (multiplier && multiplier !== 1.0) {
      action.priority = Math.round(action.priority * multiplier);
    }
  }
}

/**
 * Apply commitment plan priority bonus to aligned actions.
 * Gives the AI a sense of purpose and direction across multiple turns.
 */
function applyCommitmentBonus(actions: AIAction[], plan: CommitmentPlan | null): void {
  if (!plan) return;
  for (const action of actions) {
    const bonus = getCommitmentBonus(plan, action);
    if (bonus > 0) {
      action.priority += bonus;
    }
  }
}

/**
 * Apply counter-strategy weights from observed human player behavior.
 * Only runs when there are human rivals to observe.
 */
function applyCounterStrategy(
  actions: AIAction[],
  rivals: Player[],
  planningDepth: number,
): void {
  const humanRivalIds = rivals.filter(r => !r.isAI).map(r => r.id);
  if (humanRivalIds.length === 0) return;
  const counterWeights = getCounterStrategyWeights(humanRivalIds, planningDepth);
  applyCounterStrategyWeights(actions, counterWeights);
}



/**
 * Main AI decision engine - generates prioritized list of possible actions
 */
export function generateActions(
  player: Player,
  goals: { wealth: number; happiness: number; education: number; career: number; adventure?: number },
  settings: DifficultySettings,
  week: number,
  priceModifier: number,
  stockPrices?: Record<string, number>,
  commitmentPlan?: CommitmentPlan | null,
  visitedLocations: ReadonlySet<string> = new Set(),
): AIAction[] {
  const progress = calculateGoalProgress(player, goals, stockPrices);
  const state = useGameStore.getState();
  const rivals = state.players.filter(p => p.id !== player.id && !p.isGameOver);
  const personality = getDynamicPersonality(getAIPersonality(player.id), player, rivals);
  const weatherExtra = state.weather?.movementCostExtra ?? 0;
  const travelCost = (from: LocationId, to: LocationId) =>
    calculateCanonicalTravelCost(calculatePathDistance(from, to), weatherExtra);
  const plan = commitmentPlan && isCommitmentValid(commitmentPlan, player, progress, week) ? commitmentPlan : null;
  const generators = [generateCriticalActions, generateGoalActions, generateStrategicActions,
    generateEconomicActions, generateQuestDungeonActions, generateRivalryActions];

  const makeContext = (at: Player): ActionContext => ({
    player: at, goals, settings, personality, week, priceModifier,
    currentLocation: at.currentLocation,
    moveCost: to => travelCost(at.currentLocation, to),
    progress, urgency: calculateResourceUrgency(at), weakestGoal: getWeakestGoal(progress), rivals,
    weatherMoveCostMult: 1 + Math.max(0, weatherExtra), activeFestival: state.activeFestival ?? null,
    turnTimeRatio: at.timeRemaining / HOURS_PER_TURN,
  });
  const initialContext = makeContext(player);
  // Novices still consider obvious destinations; medium/hard inspect every board
  // location. This is bounded one-visit lookahead, not simulated future dice rolls.
  const locations = settings.planningDepth >= 2 ? BOARD_PATH : [...new Set([
    player.currentLocation,
    ...generators.flatMap(gen => gen(initialContext)).filter(a => a.type === 'move' && a.location).map(a => a.location!),
  ])];
  const candidates: Array<{ action: AIAction; ctx: ActionContext; travel: number }> = [];
  for (const location of locations) {
    const travel = travelCost(player.currentLocation, location);
    if (travel >= player.timeRemaining && location !== player.currentLocation) continue;
    const at = { ...player, currentLocation: location, timeRemaining: player.timeRemaining - travel };
    const ctx = makeContext(at);
    const unique = new Map<string, AIAction>();
    for (const action of [...generators.flatMap(gen => gen(ctx)),
      ...generateTacticalActions(ctx, plan?.type === 'earn-degree' ? plan.targetId : undefined)]) {
      if (!isTacticallyFeasible(action, ctx)) continue;
      if (action.type === 'pay-rent') {
        const rent = getEffectiveHousingRent(player.housing, player.lockedRent, priceModifier);
        const weeks = player.gold >= rent * 4 + getEssentialReserve(player, priceModifier) + 50 ? 4 : 1;
        action.details = { ...action.details, weeks };
        action.description = `Pay ${weeks} week${weeks === 1 ? '' : 's'} of rent`;
      }
      if (action.type === 'deposit-bank') {
        const amount = Math.min(Number(action.details?.amount ?? 0), player.gold - getEssentialReserve(player, priceModifier) - 40);
        if (amount < 25) continue;
        action.details = { ...action.details, amount };
      }
      const key = getAIActionIdentity(action);
      if (!unique.has(key) || unique.get(key)!.priority < action.priority) unique.set(key, action);
    }
    const actions = [...unique.values()];
    applyPersonalityWeights(actions, personality);
    applyCounterStrategy(actions, rivals, settings.planningDepth);
    applyCommitmentBonus(actions, plan);
    applyTimeBudgetAwareness(actions, ctx.turnTimeRatio, settings.planningDepth);
    if (location === player.currentLocation && settings.planningDepth >= 3) applyLocationBatchingBonus(actions, location);
    for (const action of actions) candidates.push({ action, ctx, travel });
  }
  // Velocity tracking has a per-week cooldown: sample it once, then apply the
  // same adjustments to current and projected actions.
  applyVelocityAdjustments(candidates.map(c => c.action), player.id, week, settings.planningDepth);
  const ranked = candidates.map(({ action, ctx, travel }) => {
    applyGoalRelevance(action, ctx);
    // An affordable, feasible degree commitment is a real decision. Otherwise
    // lucrative local work can outscore it forever and trap an AI in a low-wage
    // job. Survival and immediate victory still outrank this investment.
    if (plan?.type === 'earn-degree' && action.details?.degreeId === plan.targetId
      && (action.type === 'study' || action.type === 'graduate')) action.priority = Math.max(action.priority, 240);
    const survivalPriority = getSurvivalPriority(action, ctx);
    if (survivalPriority) action.priority = survivalPriority;
    if (travel === 0) return action;
    const revisitPenalty = visitedLocations.has(ctx.currentLocation) && !survivalPriority ? 8 : 0;
    return {
      type: 'move' as const,
      location: ctx.currentLocation,
      priority: action.priority - travel * (1 + settings.efficiencyWeight * 2) - revisitPenalty,
      description: `Travel to ${ctx.currentLocation}: ${action.description}`,
      details: { nextActionType: action.type, nextActionDetails: action.details },
    };
  });
  ranked.push({ type: 'end-turn', priority: 1, description: 'End turn' });
  ranked.sort((a, b) => b.priority - a.priority);
  // Mistakes choose among useful alternatives, never survival, victory or idle.
  if (ranked[0].priority < 400 && ranked[0].type !== 'end-turn') {
    const choices = ranked.filter(a => a.type !== 'end-turn' && a.priority >= ranked[0].priority * 0.75).slice(0, 5);
    applyMistakes(choices, settings.mistakeChance);
    if (choices[0]) return [choices[0], ...ranked.filter(a => a !== choices[0])];
  }
  return ranked;
}
