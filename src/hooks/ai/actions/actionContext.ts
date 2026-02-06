/**
 * Grimwald AI - Action Context
 *
 * Shared context type that all action generators receive.
 */

import type { Player, LocationId } from '@/types/game.types';
import type { DifficultySettings, GoalProgress, ResourceUrgency, AIAction } from '../types';

export interface ActionContext {
  player: Player;
  goals: { wealth: number; happiness: number; education: number; career: number };
  settings: DifficultySettings;
  week: number;
  priceModifier: number;
  currentLocation: LocationId;
  moveCost: (to: LocationId) => number;
  progress: GoalProgress;
  urgency: ResourceUrgency;
  weakestGoal: 'wealth' | 'happiness' | 'education' | 'career';
}
