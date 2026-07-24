import { useEffect, useRef, useState } from 'react';

interface TurnTransitionPlayer {
  id: string;
  isAI: boolean;
  isGameOver: boolean;
}

interface UseGameBoardTurnTransitionOptions {
  players: readonly TurnTransitionPlayer[];
  currentPlayer: TurnTransitionPlayer | null | undefined;
  phase: string;
  isOnline: boolean;
}

export function useGameBoardTurnTransition({
  players,
  currentPlayer,
  phase,
  isOnline,
}: UseGameBoardTurnTransitionOptions) {
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const lastHumanPlayerId = useRef<string | null>(null);
  const activeHumanPlayers = players.filter(player => !player.isAI && !player.isGameOver);
  const isMultiHuman = !isOnline && activeHumanPlayers.length >= 2;

  useEffect(() => {
    if (!currentPlayer || !isMultiHuman || currentPlayer.isAI) return;

    if (
      lastHumanPlayerId.current
      && lastHumanPlayerId.current !== currentPlayer.id
      && phase === 'playing'
    ) {
      setShowTurnTransition(true);
    }

    lastHumanPlayerId.current = currentPlayer.id;
  }, [currentPlayer?.id, currentPlayer?.isAI, isMultiHuman, phase]);

  return {
    showTurnTransition,
    dismissTurnTransition: () => setShowTurnTransition(false),
  };
}
