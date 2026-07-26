import { Crown, Star, Trophy } from 'lucide-react';
import type { PlayerPostGameResult } from '@/lib/postGameResults';

interface PerformanceStandingsProps {
  results: PlayerPostGameResult[];
  winnerId: string | null;
  performanceWinnerId: string | null;
  isLastStanding: boolean;
}

export function PerformanceStandings({
  results,
  winnerId,
  performanceWinnerId,
  isLastStanding,
}: PerformanceStandingsProps) {
  const goalWinner = results.find(result => result.player.id === winnerId) ?? null;
  const performanceWinner = results.find(result => result.player.id === performanceWinnerId) ?? null;
  const ranked = [...results].sort((a, b) => (
    b.performanceScore - a.performanceScore
    || b.goalProgress - a.goalProgress
  ));

  return (
    <div className="parchment-panel p-6 mb-8 max-w-2xl w-full">
      <h2 className="font-display text-xl text-center text-card-foreground mb-4">
        Two Different Awards
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <AwardCard
          icon={<Crown className="w-7 h-7 text-amber-600" />}
          title="Victory Race Winner"
          playerName={goalWinner?.player.name ?? 'No survivor'}
          description={isLastStanding
            ? 'Won by being the last adventurer standing.'
            : 'First player to satisfy every active victory goal.'}
          color={goalWinner?.player.color}
        />
        <AwardCard
          icon={<Star className="w-7 h-7 text-purple-600" />}
          title="Overall MVP"
          playerName={performanceWinner?.player.name ?? 'No score'}
          description="Highest combined performance across goals, activity, wellbeing and the victory bonus."
          color={performanceWinner?.player.color}
        />
      </div>

      <div className="rounded-lg border border-amber-300/70 bg-amber-50/40 p-3 mb-4 text-xs text-amber-900">
        <strong>Performance score (0–10,000):</strong> 45% goal progress, 35% lifetime activity,
        10% final health and happiness, and 10% victory-race bonus. This score does not decide who won the game.
      </div>

      <div className="space-y-2">
        {ranked.map((result, index) => (
          <div
            key={result.player.id}
            className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 rounded-lg ${
              result.player.id === performanceWinnerId
                ? 'bg-purple-500/10 border border-purple-400/40'
                : 'bg-black/5'
            }`}
          >
            <span className="font-display text-center text-muted-foreground">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: result.player.color }} />
                <span className="font-display text-card-foreground truncate">{result.player.name}</span>
                {result.player.id === winnerId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[10px] text-amber-900">
                    <Crown className="w-3 h-3" /> Goal winner
                  </span>
                )}
                {result.player.id === performanceWinnerId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-200/80 px-1.5 py-0.5 text-[10px] text-purple-900">
                    <Star className="w-3 h-3" /> MVP
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {Math.round(result.goalProgress)}% goal progress
              </p>
            </div>
            <div className="text-right">
              <span className="font-display text-base font-bold tabular-nums text-card-foreground">
                {result.performanceScore.toLocaleString()}
              </span>
              <span className="block text-[10px] text-muted-foreground">points</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AwardCard({
  icon,
  title,
  playerName,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  playerName: string;
  description: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-amber-300/70 bg-white/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-display text-sm text-muted-foreground">{title}</h3>
      </div>
      <div className="flex items-center gap-2 mb-1">
        {color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />}
        <p className="font-display text-xl text-card-foreground">{playerName}</p>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
