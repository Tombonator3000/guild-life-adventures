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
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-display text-base font-bold text-card-foreground">
          Turn Order
        </h3>
      </div>

      {/* Player List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
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
              className={`p-2 rounded transition-all ${
                isCurrentTurn
                  ? 'bg-primary/20 border border-primary'
                  : isDead
                  ? 'bg-destructive/10 opacity-60'
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Turn indicator */}
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {isCurrentTurn ? (
                    <Crown className="w-5 h-5 text-gold animate-pulse" />
                  ) : isDead ? (
                    <Skull className="w-5 h-5 text-destructive" />
                  ) : (
                    <span className="text-sm text-muted-foreground font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Player portrait */}
                <CharacterPortrait
                  portraitId={player.portraitId}
                  playerColor={player.color}
                  playerName={player.name}
                  size={28}
                  isAI={player.isAI}
                  hasCurse={(player.activeCurses?.length ?? 0) > 0}
                  curses={player.activeCurses}
                />

                {/* Name and status */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-display font-bold truncate ${isDead ? 'line-through' : ''}`}>
                      {player.name}
                    </span>
                    {player.isAI && (
                      <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                  {!isDead && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-gold">{player.gold}g</span>
                      <span className="text-time">{player.timeRemaining}h</span>
                    </div>
                  )}
                </div>

                {/* Progress indicator */}
                {!isDead && (
                  <div className="w-10 h-10 relative flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                      <circle
                        cx="20"
                        cy="20"
                        r="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-muted/30"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${overallProgress * 0.942} 100`}
                        className="text-secondary"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
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
      <div className="mt-3 pt-2 border-t border-border space-y-1.5">
        <h4 className="text-xs text-muted-foreground font-display flex items-center gap-1">
          <Target className="w-4 h-4" /> Goals to Win
        </h4>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="flex items-center gap-1">
            <Coins className="w-4 h-4 text-gold" />
            <span>{goalSettings.wealth}g</span>
          </div>
          <div className="flex items-center gap-1">
            <Smile className="w-4 h-4 text-happiness" />
            <span>{goalSettings.happiness}%</span>
          </div>
          <div className="flex items-center gap-1">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span>Lvl {goalSettings.education}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-secondary" />
            <span>Dep {goalSettings.career}</span>
          </div>
          {(goalSettings.adventure ?? 0) > 0 && (
            <div className="flex items-center gap-1 col-span-2">
              <Compass className="w-4 h-4 text-emerald-500" />
              <span>Adv {goalSettings.adventure}</span>
            </div>
          )}
        </div>
      </div>

      {/* Game Tip */}
      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground text-center italic">
          Click locations to travel directly
        </p>
      </div>
    </div>
  );
}
