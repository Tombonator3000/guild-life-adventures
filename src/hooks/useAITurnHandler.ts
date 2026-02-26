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
  const [currentAIAction, setCurrentAIAction] = useState<string>('');
  const aiTurnStartedRef = useRef(false);
  const lastAIPlayerIdRef = useRef<string | null>(null);

  // Use per-player difficulty if available, otherwise fall back to global setting
  const effectiveDifficulty = currentPlayer?.aiDifficulty ?? aiDifficulty;
  const { runAITurn, analyzeGameState, resetAdaptiveSystems, settings: aiSettings } = useGrimwaldAI(effectiveDifficulty);
  const hasResetRef = useRef(false);

  // Reset adaptive AI systems when a new game starts
  useEffect(() => {
    if (phase === 'setup') {
      hasResetRef.current = false;
    } else if (phase === 'playing' && !hasResetRef.current) {
      hasResetRef.current = true;
      resetAdaptiveSystems();
    }
  }, [phase, resetAdaptiveSystems]);

  // AI Turn Handler - triggers when it's any AI player's turn
  useEffect(() => {
    if (!currentPlayer || phase !== 'playing') {
      aiTurnStartedRef.current = false;
      lastAIPlayerIdRef.current = null;
      // BUG FIX: Reset aiIsThinking when leaving 'playing' phase (e.g. week-end events).
      // Without this, aiIsThinking stays true from the last AI player's turn.
      // When the phase returns to 'playing', lastAIPlayerIdRef is null so the reset
      // block never fires, and aiIsThinking=true blocks the start block — AI freezes.
      setAiIsThinking(false);
      return;
    }

    // Reset state when switching between different AI players
    if (currentPlayer.isAI && lastAIPlayerIdRef.current && lastAIPlayerIdRef.current !== currentPlayer.id) {
      aiTurnStartedRef.current = false;
      setAiIsThinking(false);
    }

    // Check if it's an AI player's turn and we haven't started their turn yet
    if (currentPlayer.isAI && !aiTurnStartedRef.current && !aiIsThinking) {
      aiTurnStartedRef.current = true;
      lastAIPlayerIdRef.current = currentPlayer.id;
      setAiIsThinking(true);
      setCurrentAIAction('');

      // Show toast notification with the AI's actual name
      toast.info(`${currentPlayer.name} is planning...`, {
        duration: 2000,
        icon: React.createElement(Bot, { className: 'w-4 h-4' }),
      });

      // Small delay before AI starts to let the UI settle
      setTimeout(() => {
        runAITurn(currentPlayer, (desc) => setCurrentAIAction(desc));
      }, 1000);
    }

    // Reset when it's no longer AI's turn
    if (!currentPlayer.isAI) {
      aiTurnStartedRef.current = false;
      lastAIPlayerIdRef.current = null;
      setAiIsThinking(false);
      setCurrentAIAction('');
    }
  }, [currentPlayer, phase, aiIsThinking, runAITurn]);

  // Listen for player changes to detect when AI turn ends or switches
  useEffect(() => {
    if (!currentPlayer) return;
    if (!currentPlayer.isAI) {
      setAiIsThinking(false);
      aiTurnStartedRef.current = false;
      lastAIPlayerIdRef.current = null;
    } else if (lastAIPlayerIdRef.current && lastAIPlayerIdRef.current !== currentPlayer.id) {
      // Different AI player's turn - reset so the new AI can start
      setAiIsThinking(false);
      aiTurnStartedRef.current = false;
    }
  }, [currentPlayer?.id]);

  return { aiIsThinking, currentAIAction };
}
