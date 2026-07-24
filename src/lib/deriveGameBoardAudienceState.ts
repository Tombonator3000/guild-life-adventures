import type { Player } from '@/types/game.types';

interface DeriveGameBoardAudienceStateOptions {
  players: readonly Player[];
  currentPlayer: Player | null | undefined;
  localPlayerId: string | null;
  isOnline: boolean;
  phase: string;
}

export function deriveGameBoardAudienceState({
  players,
  currentPlayer,
  localPlayerId,
  isOnline,
  phase,
}: DeriveGameBoardAudienceStateOptions) {
  const isLocalPlayerTurn = !isOnline || currentPlayer?.id === localPlayerId;
  const isWaitingForOtherPlayer = isOnline && !isLocalPlayerTurn && !currentPlayer?.isAI;
  const localPlayer = isOnline
    ? players.find(player => player.id === localPlayerId)
    : currentPlayer;
  const isPureSpectator = isOnline && !localPlayerId;
  const isSpectating = isPureSpectator
    || !!(
      localPlayer?.isGameOver
      && phase === 'playing'
      && players.some(player => !player.isGameOver)
    );

  return {
    isLocalPlayerTurn,
    isWaitingForOtherPlayer,
    localPlayer,
    isPureSpectator,
    isSpectating,
  };
}
