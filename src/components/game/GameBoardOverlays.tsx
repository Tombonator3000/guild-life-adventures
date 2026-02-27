import type { Player } from '@/types/game.types';
import type { AIDifficulty } from '@/types/game.types';
import type { ConnectionStatus } from '@/network/types';
import { TurnTransition } from './TurnTransition';
import { CharacterPortrait } from './CharacterPortrait';
import { Bot, Brain, SkipForward, FastForward, Play, Globe, Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { useGameOptions } from '@/hooks/useGameOptions';

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
  currentAIAction,
  aiDifficulty,
  aiSpeedMultiplier,
  setAISpeedMultiplier,
  setSkipAITurn,
  connectionStatus,
  attemptReconnect,
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
  currentAIAction: string;
  aiDifficulty: AIDifficulty;
  aiSpeedMultiplier: number;
  setAISpeedMultiplier: (speed: number) => void;
  setSkipAITurn: (skip: boolean) => void;
  connectionStatus: ConnectionStatus;
  attemptReconnect: () => void;
}) {
  const { options } = useGameOptions();
  const showActions = options.showOpponentActions;

  return (
    <>
      {/* Online: Waiting for other player overlay */}
      {isWaitingForOtherPlayer && phase === 'playing' && (
        <div className={`fixed ${isMobile ? 'bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 z-40 animate-slide-up`}>
          <div className={`parchment-panel ${isMobile ? 'px-3 py-2' : 'px-6 py-3'} flex items-center gap-3 shadow-lg animate-scale-in`}>
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

      {/* Connection Lost Banner (in-game reconnect UI) */}
      {isOnline && connectionStatus !== 'connected' && connectionStatus !== 'connecting' && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className={`parchment-panel ${isMobile ? 'px-3 py-2 mt-1' : 'px-6 py-3 mt-2'} flex items-center gap-3 shadow-lg animate-slide-up pointer-events-auto`}>
            <WifiOff className="w-5 h-5 text-destructive" />
            <span className={`font-display text-card-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Connection Lost'}
            </span>
            {connectionStatus === 'reconnecting' ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <button
                onClick={attemptReconnect}
                className="px-3 py-1 text-xs wood-frame text-parchment font-display hover:brightness-110 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
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
          <div className={`relative parchment-panel ${isMobile ? 'p-5 min-w-[280px]' : 'p-8 min-w-[360px]'} flex flex-col items-center gap-4 animate-scale-in`}>
            {/* AI Portrait */}
            <div className="relative">
              <CharacterPortrait
                portraitId={currentPlayer?.portraitId || null}
                playerColor={currentPlayer?.color || '#E5E5E5'}
                playerName={currentPlayer?.name || 'AI'}
                size={isMobile ? 72 : 96}
                isAI
              />
              <div className="absolute -bottom-1 -right-1 bg-amber-100 rounded-full p-1 border-2 border-amber-600">
                <Brain className="w-4 h-4 text-amber-700 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Bot className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-primary animate-bounce`} />
              <h3 className={`font-display ${isMobile ? 'text-lg' : 'text-2xl'} text-card-foreground tracking-wide`}>
                {currentPlayer?.name || 'AI'} is Scheming...
              </h3>
            </div>
            {showActions && currentAIAction ? (
              <div className="text-center max-w-xs">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground italic`}>
                  {currentAIAction}
                </p>
              </div>
            ) : (
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground text-center max-w-xs`}>
                {(currentPlayer?.aiDifficulty || aiDifficulty) === 'easy' && 'Hmm, let me think about this...'}
                {(currentPlayer?.aiDifficulty || aiDifficulty) === 'medium' && 'Calculating optimal strategy...'}
                {(currentPlayer?.aiDifficulty || aiDifficulty) === 'hard' && 'Analyzing all possibilities with precision!'}
              </p>
            )}
            <div className="flex gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-3 w-full justify-center">
              <span className="text-xs text-muted-foreground font-display">Speed:</span>
              <button
                onClick={() => setAISpeedMultiplier(1)}
                className={`p-1.5 rounded text-xs ${aiSpeedMultiplier === 1 ? 'bg-primary/30 text-primary' : 'bg-background/50 text-muted-foreground hover:text-foreground'}`}
                title="Normal speed"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setAISpeedMultiplier(3)}
                className={`p-1.5 rounded text-xs ${aiSpeedMultiplier === 3 ? 'bg-primary/30 text-primary' : 'bg-background/50 text-muted-foreground hover:text-foreground'}`}
                title="Fast (3x)"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSkipAITurn(true)}
                className="p-1.5 rounded text-xs bg-background/50 text-muted-foreground hover:text-foreground"
                title="Skip turn (Space)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">Press Space to skip</p>
          </div>
        </div>
      )}
    </>
  );
}
