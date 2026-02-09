/**
 * Grimwald AI - Action Generator
 *
 * The main decision engine that generates prioritized lists of possible actions.
 * Orchestrates category-based action generators and applies route optimization.
 */

import type { Player } from '@/types/game.types';
import { calculatePathDistance } from '@/data/locations';
import { useGameStore } from '@/store/gameStore';

import type { DifficultySettings, AIAction } from './types';
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

  // C4: Get rival players for competitive awareness
  const allPlayers = useGameStore.getState().players;
  const rivals = allPlayers.filter(p => p.id !== player.id && !p.isGameOver);

  // Helper to calculate movement cost
  const moveCost = (to: Parameters<typeof calculatePathDistance>[1]) =>
    calculatePathDistance(currentLocation, to);

  // Build shared context for all action generators
  const ctx: ActionContext = {
    player,
    goals,
    settings,
    week,
    priceModifier,
    currentLocation,
    moveCost,
    progress,
    urgency,
    weakestGoal,
    rivals,
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

  // Apply mistake chance for easier difficulties
  if (settings.mistakeChance > 0 && Math.random() < settings.mistakeChance && actions.length > 2) {
    // Swap top two actions randomly
    const temp = actions[0];
    actions[0] = actions[1];
    actions[1] = temp;
  }

  return actions;
}
