import { Player, GoalSettings } from '@/types/game.types';
import { HOURS_PER_TURN } from '@/types/game.types';
import { Crown, Users, Target, TrendingUp, GraduationCap, Smile, Coins, Clock, Skull, Bot, Compass } from 'lucide-react';
import { CharacterPortrait } from './CharacterPortrait';

interface TurnOrderPanelProps {
  players: Player[];
  currentPlayerIndex: number;
  week: number;
  priceModifier: number;
  goalSettings: GoalSettings;
}

export function TurnOrderPanel({
  players,
  currentPlayerIndex,
  week,
  priceModifier,
  goalSettings
}: TurnOrderPanelProps) {
  return (
    <div className="h-full flex flex-col p-[4%] bg-card/95 rounded-lg border-2 border-wood-dark/50">
      {/* Turn Order Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm font-bold text-card-foreground">
          Turn Order
        </h3>
      </div>

      {/* Player List */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {players.map((player, index) => {
          const isCurrentTurn = index === currentPlayerIndex;
          const isDead = player.health <= 0;

          // Calculate goal progress
          const wealthProgress = Math.min(100, ((player.gold + player.savings + player.investments) / goalSettings.wealth) * 100);
          const happinessProgress = Math.min(100, (player.happiness / goalSettings.happiness) * 100);
          const educationTotal = player.completedDegrees.length * 9;
          const educationProgress = Math.min(100, (educationTotal / goalSettings.education) * 100);
          const careerValue = player.currentJob ? player.dependability : 0;
          const careerProgress = Math.min(100, (careerValue / goalSettings.career) * 100);
          const adventureEnabled = (goalSettings.adventure ?? 0) > 0;
          const adventureValue = player.completedQuests + player.dungeonFloorsCleared.length;
          const adventureProgress = adventureEnabled ? Math.min(100, (adventureValue / goalSettings.adventure) * 100) : 0;
          const goalCount = adventureEnabled ? 5 : 4;
          const overallProgress = (wealthProgress + happinessProgress + educationProgress + careerProgress + (adventureEnabled ? adventureProgress : 0)) / goalCount;

          return (
            <div
              key={player.id}
              className={`p-1.5 rounded transition-all ${
                isCurrentTurn
                  ? 'bg-primary/20 border border-primary'
                  : isDead
                  ? 'bg-destructive/10 opacity-60'
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Turn indicator */}
                <div className="w-5 h-5 flex items-center justify-center">
                  {isCurrentTurn ? (
                    <Crown className="w-4 h-4 text-gold animate-pulse" />
                  ) : isDead ? (
                    <Skull className="w-4 h-4 text-destructive" />
                  ) : (
                    <span className="text-xs text-muted-foreground font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Player portrait */}
                <CharacterPortrait
                  portraitId={player.portraitId}
                  playerColor={player.color}
                  playerName={player.name}
                  size={16}
                  isAI={player.isAI}
                  hasCurse={player.activeCurses.length > 0}
                />

                {/* Name and status */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-display font-bold truncate ${isDead ? 'line-through' : ''}`}>
                      {player.name}
                    </span>
                    {player.isAI && (
                      <Bot className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  {!isDead && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="text-gold">{player.gold}g</span>
                      <span className="text-time">{player.timeRemaining}h</span>
                    </div>
                  )}
                </div>

                {/* Progress indicator */}
                {!isDead && (
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-muted/30"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${overallProgress * 0.754} 100`}
                        className="text-secondary"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold">
                      {Math.round(overallProgress)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Victory Goals Summary */}
      <div className="mt-2 pt-2 border-t border-border space-y-1">
        <h4 className="text-xs text-muted-foreground font-display flex items-center gap-1">
          <Target className="w-3 h-3" /> Goals to Win
        </h4>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-gold" />
            <span>{goalSettings.wealth}g</span>
          </div>
          <div className="flex items-center gap-1">
            <Smile className="w-3 h-3 text-happiness" />
            <span>{goalSettings.happiness}%</span>
          </div>
          <div className="flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-primary" />
            <span>Lvl {goalSettings.education}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-secondary" />
            <span>Dep {goalSettings.career}</span>
          </div>
          {(goalSettings.adventure ?? 0) > 0 && (
            <div className="flex items-center gap-1 col-span-2">
              <Compass className="w-3 h-3 text-emerald-500" />
              <span>Adv {goalSettings.adventure}</span>
            </div>
          )}
        </div>
      </div>

      {/* Game Tip */}
      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center italic">
          Click locations to travel directly
        </p>
      </div>
    </div>
  );
}
