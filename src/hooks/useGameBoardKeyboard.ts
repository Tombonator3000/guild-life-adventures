import { useEffect } from 'react';
import type { Player } from '@/types/game.types';
import { audioManager } from '@/audio/audioManager';

export function useGameBoardKeyboard({
  setShowZoneEditor,
  setShowDebugOverlay,
  setShowGameMenu,
  aiIsThinking,
  setSkipAITurn,
  showGameMenu,
  currentPlayer,
  phase,
  endTurn,
  showTutorial,
  setShowTutorial,
  isLocalPlayerTurn,
}: {
  setShowZoneEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDebugOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  setShowGameMenu: React.Dispatch<React.SetStateAction<boolean>>;
  aiIsThinking: boolean;
  setSkipAITurn: (skip: boolean) => void;
  showGameMenu: boolean;
  currentPlayer: Player | undefined;
  phase: string;
  endTurn: () => void;
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
  isLocalPlayerTurn: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        setShowZoneEditor(prev => !prev);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugOverlay(prev => !prev);
      }
      // Escape opens/closes game menu
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowGameMenu(prev => !prev);
      }
      // Space skips AI turn
      if (e.key === ' ' && aiIsThinking) {
        e.preventDefault();
        setSkipAITurn(true);
      }
      // E = End Turn (when not in modal/menu and not AI turn, and it's local player's turn)
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey && !aiIsThinking && !showGameMenu) {
        e.preventDefault();
        if (currentPlayer && !currentPlayer.isAI && phase === 'playing' && isLocalPlayerTurn) {
          endTurn();
        }
      }
      // T = Toggle tutorial
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !showGameMenu) {
        e.preventDefault();
        setShowTutorial(!showTutorial);
      }
      // M = Toggle music mute
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !showGameMenu) {
        e.preventDefault();
        audioManager.toggleMute();
      }
      // F = Toggle fullscreen
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !showGameMenu) {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aiIsThinking, setSkipAITurn, showGameMenu, currentPlayer, phase, endTurn, showTutorial, setShowTutorial, isLocalPlayerTurn]);
}
