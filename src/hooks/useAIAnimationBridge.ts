/**
 * AI Animation Bridge
 *
 * A singleton callback registry that lets the AI action executor (outside React)
 * trigger path animations in GameBoard (inside React).
 *
 * Usage:
 *   GameBoard calls registerAIAnimateCallback(startRemoteAnimation) on mount.
 *   actionExecutor calls triggerAIAnimation(playerId, path) after movePlayer().
 */

import type { LocationId } from '@/types/game.types';

type AIAnimateCallback = (playerId: string, path: LocationId[]) => void;

let _callback: AIAnimateCallback | null = null;

export function registerAIAnimateCallback(cb: AIAnimateCallback | null): void {
  _callback = cb;
}

export function triggerAIAnimation(playerId: string, path: LocationId[]): void {
  if (_callback && path.length > 1) {
    _callback(playerId, path);
  }
}
