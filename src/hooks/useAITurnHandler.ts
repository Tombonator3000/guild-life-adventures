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
  const currentPlayerId = currentPlayer?.id;
  const currentPlayerIsAI = currentPlayer?.isAI ?? false;

  const effectiveDifficulty = currentPlayer?.aiDifficulty ?? aiDifficulty;
  const { runAITurn, resetAdaptiveSystems } = useGrimwaldAI(effectiveDifficulty);
  const hasResetRef = useRef(false);

  useEffect(() => {
    if (phase === 'setup') {
      hasResetRef.current = false;
    } else if (phase === 'playing' && !hasResetRef.current) {
      hasResetRef.current = true;
      resetAdaptiveSystems();
    }
  }, [phase, resetAdaptiveSystems]);

  useEffect(() => {
    if (!currentPlayer || phase !== 'playing') {
      aiTurnStartedRef.current = false;
      lastAIPlayerIdRef.current = null;
      setAiIsThinking(false);
      return;
    }

    if (currentPlayer.isAI && lastAIPlayerIdRef.current && lastAIPlayerIdRef.current !== currentPlayer.id) {
      aiTurnStartedRef.current = false;
      setAiIsThinking(false);
    }

    if (currentPlayer.isAI && !aiTurnStartedRef.current && !aiIsThinking) {
      aiTurnStartedRef.current = true;
      lastAIPlayerIdRef.current = currentPlayer.id;
      setAiIsThinking(true);
      setCurrentAIAction('');

      toast.info(`${currentPlayer.name} is planning...`, {
        duration: 2000,
        icon: React.createElement(Bot, { className: 'w-4 h-4' }),
      });

      const scheduledPlayerId = currentPlayer.id;
      const timer = setTimeout(() => {
        const liveState = useGameStore.getState();
        const livePlayer = liveState.players[liveState.currentPlayerIndex];
        if (livePlayer?.id !== scheduledPlayerId || !livePlayer.isAI || liveState.phase !== 'playing') {
          aiTurnStartedRef.current = false;
          setAiIsThinking(false);
          return;
        }
        runAITurn(livePlayer, desc => setCurrentAIAction(desc));
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (!currentPlayer.isAI) {
      aiTurnStartedRef.current = false;
      lastAIPlayerIdRef.current = null;
      setAiIsThinking(false);
      setCurrentAIAction('');
    }
  }, [currentPlayer, phase, aiIsThinking, runAITurn]);

  useEffect(() => {
    if (!currentPlayerId) return;
    if (!currentPlayerIsAI) {
      setAiIsThinking(false);
      aiTurnStartedRef.current = false;
      lastAIPlayerIdRef.current = null;
    } else if (lastAIPlayerIdRef.current && lastAIPlayerIdRef.current !== currentPlayerId) {
      setAiIsThinking(false);
      aiTurnStartedRef.current = false;
    }
  }, [currentPlayerId, currentPlayerIsAI]);

  return { aiIsThinking, currentAIAction };
}
