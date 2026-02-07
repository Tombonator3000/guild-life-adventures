import { useState, useEffect, useRef } from 'react';
import { useGrimwaldAI } from '@/hooks/useGrimwaldAI';
import type { Player, AIDifficulty } from '@/types/game.types';
import { toast } from 'sonner';
import { Bot } from 'lucide-react';
import React from 'react';

interface UseAITurnHandlerParams {
  currentPlayer: Player | undefined;
  phase: string;
  aiDifficulty: AIDifficulty; // Fallback for legacy single-AI games
}

export function useAITurnHandler({ currentPlayer, phase, aiDifficulty }: UseAITurnHandlerParams) {
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const aiTurnStartedRef = useRef(false);

  // Use per-player difficulty if available, otherwise fall back to global setting
  const effectiveDifficulty = currentPlayer?.aiDifficulty ?? aiDifficulty;
  const { runAITurn, analyzeGameState, settings: aiSettings } = useGrimwaldAI(effectiveDifficulty);

  // AI Turn Handler - triggers when it's any AI player's turn
  useEffect(() => {
    if (!currentPlayer || phase !== 'playing') {
      aiTurnStartedRef.current = false;
      return;
    }

    // Check if it's an AI player's turn and we haven't started their turn yet
    if (currentPlayer.isAI && !aiTurnStartedRef.current && !aiIsThinking) {
      aiTurnStartedRef.current = true;
      setAiIsThinking(true);

      // Show toast notification with the AI's actual name
      toast.info(`${currentPlayer.name} is planning...`, {
        duration: 2000,
        icon: React.createElement(Bot, { className: 'w-4 h-4' }),
      });

      // Small delay before AI starts to let the UI settle
      setTimeout(() => {
        runAITurn(currentPlayer);
      }, 1000);
    }

    // Reset when it's no longer AI's turn
    if (!currentPlayer.isAI) {
      aiTurnStartedRef.current = false;
      setAiIsThinking(false);
    }
  }, [currentPlayer, phase, aiIsThinking, runAITurn]);

  // Listen for player changes to detect when AI turn ends
  useEffect(() => {
    if (currentPlayer && !currentPlayer.isAI) {
      setAiIsThinking(false);
    }
  }, [currentPlayer?.id]);

  return { aiIsThinking };
}
