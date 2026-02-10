/**
 * Grimwald AI - Action Context
 *
 * Shared context type that all action generators receive.
 */

import type { Player, LocationId } from '@/types/game.types';
import type { DifficultySettings, GoalProgress, ResourceUrgency, AIAction, AIPersonality } from '../types';

export interface ActionContext {
  player: Player;
  goals: { wealth: number; happiness: number; education: number; career: number; adventure?: number };
  settings: DifficultySettings;
  /** AI personality profile (unique per opponent: Grimwald/Seraphina/Thornwick/Morgath) */
  personality: AIPersonality;
  week: number;
  priceModifier: number;
  currentLocation: LocationId;
  moveCost: (to: LocationId) => number;
  progress: GoalProgress;
  urgency: ResourceUrgency;
  weakestGoal: 'wealth' | 'happiness' | 'education' | 'career' | 'adventure';
  /** C4: Other players for rivalry awareness (empty = no rivals) */
  rivals: Player[];
  /** Weather/festival context for smarter decisions */
  weatherMoveCostMult: number; // Weather movement cost multiplier (1.0 = normal)
  activeFestival: string | null; // Active festival ID
  /** Time budget: fraction of turn hours remaining (0-1) */
  turnTimeRatio: number; // timeRemaining / 60 — for early vs late turn decisions
}
