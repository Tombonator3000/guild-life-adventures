import type { Player } from '@/types/game.types';
import type { AIDifficulty } from '@/types/game.types';
import { TurnTransition } from './TurnTransition';
import { Bot, Brain, SkipForward, FastForward, Play, Globe, Wifi } from 'lucide-react';

export function GameBoardOverlays({
  isMobile,
  isWaitingForOtherPlayer,
  phase,
  currentPlayer,
  isOnline,
  latency,
  roomCodeDisplay,
  isGuest,
  showTurnTransition,
  onTurnTransitionReady,
  aiIsThinking,
  aiDifficulty,
  aiSpeedMultiplier,
  setAISpeedMultiplier,
  setSkipAITurn,
}: {
  isMobile: boolean;
  isWaitingForOtherPlayer: boolean;
  phase: string;
  currentPlayer: Player | undefined;
  isOnline: boolean;
  latency: number;
  roomCodeDisplay: string | null;
  isGuest: boolean;
  showTurnTransition: boolean;
  onTurnTransitionReady: () => void;
  aiIsThinking: boolean;
  aiDifficulty: AIDifficulty;
  aiSpeedMultiplier: number;
  setAISpeedMultiplier: (speed: number) => void;
  setSkipAITurn: (skip: boolean) => void;
}) {
  return (
    <>
      {/* Online: Waiting for other player overlay */}
      {isWaitingForOtherPlayer && phase === 'playing' && (
        <div className={`fixed ${isMobile ? 'bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 z-40`}>
          <div className={`parchment-panel ${isMobile ? 'px-3 py-2' : 'px-6 py-3'} flex items-center gap-3 shadow-lg`}>
            <Globe className="w-5 h-5 text-primary animate-pulse" />
            <span className={`font-display text-card-foreground ${isMobile ? 'text-sm' : ''}`}>
              Waiting for <strong>{currentPlayer?.name}</strong>...
            </span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Online: Connection indicator with latency */}
      {isOnline && (
        <div className={`fixed ${isMobile ? 'bottom-1 right-1' : 'bottom-4 right-4'} z-40`}>
          <div className={`parchment-panel ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} flex items-center gap-2 text-xs`}>
            <Wifi className={`w-3 h-3 ${latency > 200 ? 'text-red-500' : latency > 100 ? 'text-yellow-500' : 'text-green-600'}`} />
            <span className="text-amber-800 font-display">
              Online {roomCodeDisplay ? `(${roomCodeDisplay})` : ''}
              {isGuest && latency > 0 && (
                <span className={`ml-1 ${latency > 200 ? 'text-red-600' : latency > 100 ? 'text-yellow-600' : 'text-green-700'}`}>
                  {latency}ms
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Turn Transition Privacy Screen (local multiplayer) */}
      {showTurnTransition && currentPlayer && !currentPlayer.isAI && (
        <TurnTransition
          player={currentPlayer}
          onReady={onTurnTransitionReady}
        />
      )}

      {/* AI Thinking Overlay with speed controls */}
      {aiIsThinking && currentPlayer?.isAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          <div className={`relative parchment-panel ${isMobile ? 'p-4' : 'p-6'} flex flex-col items-center gap-3`}>
            <div className="flex items-center gap-3">
              <Bot className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-primary animate-bounce`} />
              <Brain className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-secondary animate-spin`} style={{ animationDuration: '3s' }} />
            </div>
            <h3 className={`font-display ${isMobile ? 'text-base' : 'text-xl'} text-card-foreground`}>
              {currentPlayer?.name || 'AI'} is Scheming...
            </h3>
            {!isMobile && (
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {(currentPlayer?.aiDifficulty || aiDifficulty) === 'easy' && 'Hmm, let me think about this...'}
                {(currentPlayer?.aiDifficulty || aiDifficulty) === 'medium' && 'Calculating optimal strategy...'}
                {(currentPlayer?.aiDifficulty || aiDifficulty) === 'hard' && 'Analyzing all possibilities with precision!'}
              </p>
            )}
            <div className="flex gap-1 mb-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-2">
              <span className="text-xs text-muted-foreground font-display">Speed:</span>
              <button
                onClick={() => setAISpeedMultiplier(1)}
                className={`p-1.5 rounded text-xs ${aiSpeedMultiplier === 1 ? 'bg-primary/30 text-primary' : 'bg-background/50 text-muted-foreground hover:text-foreground'}`}
                title="Normal speed"
              >
                <Play className="w-3 h-3" />
              </button>
              <button
                onClick={() => setAISpeedMultiplier(3)}
                className={`p-1.5 rounded text-xs ${aiSpeedMultiplier === 3 ? 'bg-primary/30 text-primary' : 'bg-background/50 text-muted-foreground hover:text-foreground'}`}
                title="Fast (3x)"
              >
                <FastForward className="w-3 h-3" />
              </button>
              <button
                onClick={() => setSkipAITurn(true)}
                className="p-1.5 rounded text-xs bg-background/50 text-muted-foreground hover:text-foreground"
                title="Skip turn (Space)"
              >
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">Press Space to skip</p>
          </div>
        </div>
      )}
    </>
  );
}
