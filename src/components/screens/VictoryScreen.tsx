import { useMemo, useState } from 'react';
import { BarChart3, Crown, Scroll, Star, Trophy } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import gameBoard from '@/assets/game-board.jpeg';
import { VictoryEffects } from '@/components/game/VictoryEffects';
import { getGameOption } from '@/data/gameOptions';
import { buildPostGameResults, detectGoalProfile } from '@/lib/postGameResults';
import { PostGameStats } from './PostGameStats';
import { VictoryGoalMatrix } from './VictoryGoalMatrix';
import { PerformanceStandings } from './PerformanceStandings';
import { HighScorePanel } from './HighScorePanel';

export function VictoryScreen() {
  const {
    setPhase,
    resetForNewGame,
    winner,
    players,
    goalSettings,
    eventMessage,
    stockPrices,
    week,
    networkMode,
    localPlayerId,
  } = useGameStore();
  const [showStats, setShowStats] = useState(false);

  const results = useMemo(
    () => buildPostGameResults(players, goalSettings, stockPrices, week, winner),
    [goalSettings, players, stockPrices, week, winner],
  );
  const winningResult = results.find(result => result.player.id === winner) ?? null;
  const performanceWinner = useMemo(
    () => [...results].sort((a, b) => (
      b.performanceScore - a.performanceScore
      || b.goalProgress - a.goalProgress
    ))[0] ?? null,
    [results],
  );
  const goalProfile = useMemo(() => detectGoalProfile(goalSettings), [goalSettings]);
  const isLastStanding = eventMessage?.includes('last one standing') ?? false;

  // Handle the rare case where every player perished and no winner exists.
  if (!winningResult) {
    return (
      <div className="relative min-h-screen-safe overflow-x-hidden overflow-y-auto">
        <div
          className="fixed inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${gameBoard})` }}
        />
        <div className="fixed inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background/95" />

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
            onClick={() => resetForNewGame()}
            className="gold-button text-xl px-12 py-4 mt-8"
          >
            Return to Title
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen-safe overflow-x-hidden overflow-y-auto">
      <VictoryEffects />
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${gameBoard})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-amber-900/70 via-amber-800/60 to-background/90" />

      <div className="relative z-10 min-h-screen-safe flex flex-col items-center justify-center px-4 py-8">
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
            style={{
              backgroundColor: `${winningResult.player.color}40`,
              borderColor: winningResult.player.color,
              borderWidth: 2,
            }}
          >
            <p className="font-display text-2xl md:text-3xl text-foreground">
              {winningResult.player.name}
            </p>
          </div>

          <p className="font-display text-lg text-muted-foreground">
            {isLastStanding
              ? 'is the last one standing!'
              : winningResult.allGoalsMet
                ? 'won the victory-goal race!'
                : 'wins the game!'}
          </p>
          {performanceWinner && performanceWinner.player.id !== winner && (
            <p className="font-display text-sm text-purple-200 mt-2">
              Overall MVP: {performanceWinner.player.name} with {performanceWinner.performanceScore.toLocaleString()} points
            </p>
          )}
          {getGameOption('enableAging') && (
            <p className="font-display text-sm text-muted-foreground/70 mt-1">
              Age {winningResult.player.age ?? 18} at time of victory
            </p>
          )}
        </div>

        <VictoryGoalMatrix results={results} winnerId={winner} />

        <PerformanceStandings
          results={results}
          winnerId={winner}
          performanceWinnerId={performanceWinner?.player.id ?? null}
          isLastStanding={isLastStanding}
        />

        <button
          onClick={() => setShowStats(previous => !previous)}
          className="flex items-center gap-2 px-6 py-2 mb-4 bg-[#e0d4b8] border border-[#8b7355] rounded-lg font-display text-sm text-[#3d2a14] hover:bg-[#d4c8a8] transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          {showStats ? 'Hide Statistics' : 'Show Game Statistics'}
        </button>

        {showStats && (
          <div className="parchment-panel p-6 mb-8 max-w-2xl w-full">
            <PostGameStats
              players={players}
              winnerId={winner}
              stockPrices={stockPrices}
              week={week}
            />
          </div>
        )}

        <HighScorePanel
          results={results}
          winnerId={winner}
          performanceWinnerId={performanceWinner?.player.id ?? null}
          week={week}
          networkMode={networkMode}
          localPlayerId={localPlayerId}
          goalProfile={goalProfile}
        />

        <div className="flex flex-wrap justify-center gap-4 pb-16">
          <button
            onClick={() => resetForNewGame()}
            className="gold-button text-lg px-8 py-3"
          >
            Return to Title
          </button>
          <button
            onClick={() => { resetForNewGame(); setPhase('setup'); }}
            className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-display text-lg hover:bg-secondary/80 transition-colors"
          >
            New Game
          </button>
        </div>

        <p className="absolute bottom-4 text-muted-foreground/60 text-sm font-display">
          Guild Life Adventures
        </p>
      </div>
    </div>
  );
}
