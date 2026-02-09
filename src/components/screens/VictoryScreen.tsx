import { useGameStore } from '@/store/gameStore';
import { calculateStockValue } from '@/data/stocks';
import { Crown, Trophy, Scroll, Coins, Heart, GraduationCap, Star, Check, X, Compass } from 'lucide-react';
import gameBoard from '@/assets/game-board.jpeg';
import { VictoryEffects } from '@/components/game/VictoryEffects';
import { getGameOption } from '@/data/gameOptions';

export function VictoryScreen() {
  const { setPhase, winner, players, goalSettings, eventMessage, stockPrices } = useGameStore();

  const winningPlayer = players.find(p => p.id === winner);

  // Check if this is a "last standing" victory or actual goals victory
  const isLastStanding = eventMessage?.includes('last one standing');

  // Handle case where all players perished
  if (!winningPlayer) {
    return (
      <div className="relative min-h-screen-safe overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${gameBoard})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background/95" />

        <div className="relative z-10 min-h-screen-safe flex flex-col items-center justify-center px-4">
          <div className="text-center mb-8">
            <Scroll className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground mb-4">
              Game Over
            </h1>
            <p className="font-display text-xl text-muted-foreground">
              All adventurers have perished...
            </p>
          </div>

          <button
            onClick={() => setPhase('title')}
            className="gold-button text-xl px-12 py-4 mt-8"
          >
            Return to Title
          </button>
        </div>
      </div>
    );
  }

  // Calculate player stats for display (matches checkVictory formula)
  const stockValue = calculateStockValue(winningPlayer.stocks, stockPrices);
  const totalWealth = winningPlayer.gold + winningPlayer.savings + winningPlayer.investments + stockValue - winningPlayer.loanAmount;
  // Use completedDegrees for education (Jones-style: 9 points per degree)
  const totalEducation = winningPlayer.completedDegrees.length * 9;

  // Check which goals are actually met
  const wealthMet = totalWealth >= goalSettings.wealth;
  const happinessMet = winningPlayer.happiness >= goalSettings.happiness;
  const educationMet = totalEducation >= goalSettings.education;
  // Career = dependability (Jones-style), 0 if no job
  const careerValue = winningPlayer.currentJob ? winningPlayer.dependability : 0;
  const careerMet = careerValue >= goalSettings.career;
  const adventureEnabled = (goalSettings.adventure ?? 0) > 0;
  const adventureValue = winningPlayer.completedQuests + winningPlayer.dungeonFloorsCleared.length;
  const adventureMet = !adventureEnabled || adventureValue >= goalSettings.adventure;
  const allGoalsMet = wealthMet && happinessMet && educationMet && careerMet && adventureMet;

  return (
    <div className="relative min-h-screen-safe overflow-hidden">
      {/* Confetti & Fireworks */}
      <VictoryEffects />
      {/* Background with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${gameBoard})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/70 via-amber-800/60 to-background/90" />

      {/* Content */}
      <div className="relative z-10 min-h-screen-safe flex flex-col items-center justify-center px-4">
        {/* Victory Banner */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Star className="w-10 h-10 text-gold animate-float" style={{ animationDelay: '0s' }} />
            <Crown className="w-16 h-16 text-gold animate-float" style={{ animationDelay: '0.3s' }} />
            <Trophy className="w-14 h-14 text-gold animate-float" style={{ animationDelay: '0.6s' }} />
            <Crown className="w-16 h-16 text-gold animate-float" style={{ animationDelay: '0.9s' }} />
            <Star className="w-10 h-10 text-gold animate-float" style={{ animationDelay: '1.2s' }} />
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-4 tracking-wider">
            VICTORY!
          </h1>

          <div
            className="inline-block px-6 py-2 rounded-full mb-4"
            style={{ backgroundColor: winningPlayer.color + '40', borderColor: winningPlayer.color, borderWidth: 2 }}
          >
            <p className="font-display text-2xl md:text-3xl text-foreground">
              {winningPlayer.name}
            </p>
          </div>

          <p className="font-display text-lg text-muted-foreground">
            {isLastStanding
              ? 'is the last one standing!'
              : allGoalsMet
                ? 'has achieved all victory goals!'
                : 'wins the game!'}
          </p>
          {getGameOption('enableAging') && (
            <p className="font-display text-sm text-muted-foreground/70 mt-1">
              Age {winningPlayer.age ?? 18} at time of victory
            </p>
          )}
        </div>

        {/* Stats Display */}
        <div className="parchment-panel p-6 mb-8 max-w-md w-full">
          <h2 className="font-display text-xl text-center mb-4 text-card-foreground">
            Final Stats
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <StatItem
              icon={<Coins className="w-5 h-5 text-amber-500" />}
              label="Wealth"
              value={`${totalWealth}g`}
              goal={`Goal: ${goalSettings.wealth}g`}
              isMet={wealthMet}
            />
            <StatItem
              icon={<Heart className="w-5 h-5 text-red-500" />}
              label="Happiness"
              value={winningPlayer.happiness.toString()}
              goal={`Goal: ${goalSettings.happiness}`}
              isMet={happinessMet}
            />
            <StatItem
              icon={<GraduationCap className="w-5 h-5 text-blue-500" />}
              label="Education"
              value={totalEducation.toString()}
              goal={`Goal: ${goalSettings.education}`}
              isMet={educationMet}
            />
            <StatItem
              icon={<Crown className="w-5 h-5 text-purple-500" />}
              label="Career"
              value={`${careerValue} dep`}
              goal={`Goal: ${goalSettings.career}+`}
              isMet={careerMet}
            />
            {adventureEnabled && (
              <StatItem
                icon={<Compass className="w-5 h-5 text-emerald-500" />}
                label="Adventure"
                value={`${adventureValue} pts`}
                goal={`Goal: ${goalSettings.adventure}`}
                isMet={adventureMet}
              />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setPhase('title')}
            className="gold-button text-lg px-8 py-3"
          >
            Return to Title
          </button>
          <button
            onClick={() => setPhase('setup')}
            className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-display text-lg hover:bg-secondary/80 transition-colors"
          >
            New Game
          </button>
        </div>

        {/* Footer */}
        <p className="absolute bottom-8 text-muted-foreground/60 text-sm font-display">
          Guild Life Adventures
        </p>
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  goal,
  isMet
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  goal: string;
  isMet: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${isMet ? 'bg-green-500/20' : 'bg-red-500/10'}`}>
      {icon}
      <div className="flex-1">
        <p className="font-display text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-lg text-card-foreground">{value}</p>
        <p className="font-display text-xs text-muted-foreground/70">{goal}</p>
      </div>
      {isMet ? (
        <Check className="w-5 h-5 text-green-500" />
      ) : (
        <X className="w-5 h-5 text-red-400" />
      )}
    </div>
  );
}
