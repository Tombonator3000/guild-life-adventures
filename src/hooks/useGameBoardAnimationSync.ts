import { useEffect } from 'react';
import { registerAIAnimateCallback } from './useAIAnimationBridge';
import type { LocationId } from '@/types/game.types';

interface RemoteAnimationRequest {
  playerId: string;
  path: LocationId[];
}

interface UseGameBoardAnimationSyncOptions {
  animatingPlayer: string | null;
  remoteAnimation: RemoteAnimationRequest | null;
  startRemoteAnimation: (playerId: string, path: LocationId[]) => void;
  clearRemoteAnimation: () => void;
}

export function useGameBoardAnimationSync({
  animatingPlayer,
  remoteAnimation,
  startRemoteAnimation,
  clearRemoteAnimation,
}: UseGameBoardAnimationSyncOptions) {
  useEffect(() => {
    registerAIAnimateCallback(startRemoteAnimation);
    return () => registerAIAnimateCallback(null);
  }, [startRemoteAnimation]);

  useEffect(() => {
    if (!remoteAnimation || animatingPlayer) return;

    startRemoteAnimation(remoteAnimation.playerId, remoteAnimation.path);
    clearRemoteAnimation();
  }, [remoteAnimation, animatingPlayer, startRemoteAnimation, clearRemoteAnimation]);
}
