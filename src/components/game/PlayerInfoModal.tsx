// PlayerInfoModal — shows a quick-look card when clicking another player's token on the board
import { X, Briefcase, Coins, Heart, Apple, Smile, Bot } from 'lucide-react';
import { CharacterPortrait } from './CharacterPortrait';
import { getJob } from '@/data/jobs';
import type { Player } from '@/types/game.types';

interface PlayerInfoModalProps {
  player: Player;
  onClose: () => void;
}

export function PlayerInfoModal({ player, onClose }: PlayerInfoModalProps) {
  const job = player.currentJob ? getJob(player.currentJob) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card */}
      <div
        className="parchment-panel relative z-10 w-72 max-w-full p-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded text-amber-700 hover:bg-amber-100/60 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Portrait + name */}
        <div className="flex items-center gap-4 mb-4">
          <CharacterPortrait
            portraitId={player.portraitId}
            playerColor={player.color}
            playerName={player.name}
            size={72}
            isAI={player.isAI}
            hasCurse={(player.activeCurses?.length ?? 0) > 0}
            curses={player.activeCurses}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-bold text-amber-900 truncate">
                {player.name}
              </span>
              {player.isAI && <Bot className="w-4 h-4 text-amber-600 flex-shrink-0" />}
            </div>
            {player.isGameOver ? (
              <span className="text-xs text-red-600 font-display">Fallen adventurer</span>
            ) : (
              <span className="text-xs text-amber-700" style={{ color: player.color }}>
                ●&nbsp;Active
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-amber-300/60 pt-3 space-y-2">
          {/* Job */}
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-900 font-body">
              {job ? (
                <>
                  <span className="font-semibold">{job.name}</span>
                  <span className="text-amber-700"> — {job.baseWage}g/hr</span>
                </>
              ) : (
                <span className="italic text-amber-600">Unemployed</span>
              )}
            </span>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <span className="text-sm text-amber-900 font-body">
              <span className="font-semibold">{player.gold}</span>g gold
              {player.savings > 0 && (
                <span className="text-amber-600"> + {player.savings}g saved</span>
              )}
            </span>
          </div>

          {/* Health */}
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-amber-700">Health</span>
                <span className="font-semibold text-amber-900">{player.health}/100</span>
              </div>
              <div className="w-full bg-amber-200/60 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${player.health}%`,
                    background: player.health > 50 ? '#16a34a' : player.health > 25 ? '#d97706' : '#dc2626',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Food */}
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-amber-700">Food</span>
                <span className="font-semibold text-amber-900">{player.foodLevel}/100</span>
              </div>
              <div className="w-full bg-amber-200/60 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${player.foodLevel}%`,
                    background: player.foodLevel > 40 ? '#16a34a' : player.foodLevel > 15 ? '#d97706' : '#dc2626',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Happiness */}
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-amber-700">Happiness</span>
                <span className="font-semibold text-amber-900">{player.happiness}/100</span>
              </div>
              <div className="w-full bg-amber-200/60 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, player.happiness)}%`,
                    background: player.happiness > 60 ? '#d97706' : player.happiness > 30 ? '#ca8a04' : '#b45309',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
