import { useState, useEffect, useRef } from 'react';
import { useGrimwaldAI } from '@/hooks/useGrimwaldAI';
import { useGameStore } from '@/store/gameStore';
import type { Player, AIDifficulty } from '@/types/game.types';
import { toast } from 'sonner';
import { Bot } from 'lucide-react';
import React from 'react';

interface UseAITurnHandlerParams {
  currentPlayer: Player | undefined;
  phase: string;
  aiDifficulty: AIDifficulty;
}

export function useAITurnHandler({ currentPlayer, phase, aiDifficulty }: UseAITurnHandlerParams) {
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const [currentAIAction, setCurrentAIAction] = useState<string>('');
  const aiTurnStartedRef = useRef(false);
  const lastAIPlayerIdRef = useRef<string | null>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPlayerId = currentPlayer?.id;
  const currentPlayerIsAI = currentPlayer?.isAI ?? false;

  const effectiveDifficulty = currentPlayer?.aiDifficulty ?? aiDifficulty;
  const { runAITurn, resetAdaptiveSystems } = useGrimwaldAI(effectiveDifficulty);
  const runAITurnRef = useRef(runAITurn);
  const hasResetRef = useRef(false);

  // useGrimwaldAI depends on live store state and may return a fresh callback after
  // normal game updates. Keep the latest callback in a ref so those updates do not
  // cancel an already scheduled AI turn.
  useEffect(() => {
    runAITurnRef.current = runAITurn;
  }, [runAITurn]);

  useEffect(() => {
    if (phase === 'setup') {
      hasResetRef.current = false;
    } else if (phase === 'playing' && !hasResetRef.current) {
      hasResetRef.current = true;
      resetAdaptiveSystems();
    }
  }, [phase, resetAdaptiveSystems]);

  useEffect(() => {
    const clearStartTimer = () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
    };

    if (!currentPlayerId || phase !== 'playing' || !currentPlayerIsAI) {
      clearStartTimer();
      aiTurnStartedRef.current = false;
      lastAIPlayerIdRef.current = null;
      setAiIsThinking(false);
      setCurrentAIAction('');
      return;
    }

    // The same AI player can cause many store updates while planning and acting.
    // Do not restart or cancel its opening timer for those updates.
    if (aiTurnStartedRef.current && lastAIPlayerIdRef.current === currentPlayerId) {
      return;
    }

    clearStartTimer();
    aiTurnStartedRef.current = true;
    lastAIPlayerIdRef.current = currentPlayerId;
    setAiIsThinking(true);
    setCurrentAIAction('');

    const playerName = currentPlayer?.name ?? 'AI adventurer';
    toast.info(`${playerName} is planning...`, {
      duration: 2000,
      icon: React.createElement(Bot, { className: 'w-4 h-4' }),
    });

    startTimerRef.current = setTimeout(() => {
      startTimerRef.current = null;
      const liveState = useGameStore.getState();
      const livePlayer = liveState.players[liveState.currentPlayerIndex];

      if (livePlayer?.id !== currentPlayerId || !livePlayer.isAI || liveState.phase !== 'playing') {
        aiTurnStartedRef.current = false;
        setAiIsThinking(false);
        return;
      }

      runAITurnRef.current(livePlayer, desc => setCurrentAIAction(desc));
    }, 1000);

    // This effect intentionally depends only on turn identity and phase. Local
    // thinking-state updates and normal store mutations must not clear the timer.
    return clearStartTimer;
  }, [currentPlayerId, currentPlayerIsAI, phase, currentPlayer?.name]);

  return { aiIsThinking, currentAIAction };
}
