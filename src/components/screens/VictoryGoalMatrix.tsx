import { Check, Crown, Target, X } from 'lucide-react';
import {
  formatGoalTarget,
  formatGoalValue,
  type PlayerPostGameResult,
} from '@/lib/postGameResults';

interface VictoryGoalMatrixProps {
  results: PlayerPostGameResult[];
  winnerId: string | null;
}

export function VictoryGoalMatrix({ results, winnerId }: VictoryGoalMatrixProps) {
  const goalRows = results[0]?.goals ?? [];
  if (goalRows.length === 0) return null;

  return (
    <div className="parchment-panel p-6 mb-8 max-w-4xl w-full">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl text-card-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-600" /> Victory Goals
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Live values from the exact moment the game ended — not the previous weekly snapshot.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Check className="w-4 h-4 text-green-600" /> reached</span>
          <span className="inline-flex items-center gap-1"><X className="w-4 h-4 text-red-500" /> missing</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-amber-300/70">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead className="bg-amber-100/80 text-amber-950">
            <tr>
              <th className="text-left px-3 py-2 font-display">Goal</th>
              <th className="text-right px-3 py-2 font-display">Target</th>
              {results.map(result => (
                <th key={result.player.id} className="text-center px-3 py-2 font-display">
                  <span className="inline-flex items-center gap-1">
                    {result.player.name}
                    {result.player.id === winnerId && <Crown className="w-3.5 h-3.5 text-amber-600" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goalRows.map((goal, rowIndex) => (
              <tr key={goal.key} className={rowIndex % 2 === 0 ? 'bg-white/15' : 'bg-black/[0.03]'}>
                <td className="px-3 py-2 font-display text-card-foreground">{goal.label}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {formatGoalTarget(goal)}
                </td>
                {results.map(result => {
                  const playerGoal = result.goals.find(candidate => candidate.key === goal.key);
                  if (!playerGoal) return <td key={result.player.id} className="px-3 py-2 text-center">—</td>;
                  return (
                    <td key={result.player.id} className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${
                        playerGoal.met ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {playerGoal.met
                          ? <Check className="w-4 h-4" aria-label="Goal reached" />
                          : <X className="w-4 h-4" aria-label="Goal missing" />}
                        {formatGoalValue(playerGoal)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
        {results.map(result => (
          <div
            key={result.player.id}
            className={`rounded-lg border px-3 py-2 text-sm ${
              result.allGoalsMet
                ? 'border-green-300 bg-green-50/60 text-green-900'
                : 'border-red-300 bg-red-50/60 text-red-900'
            }`}
          >
            {result.missingSummary}
          </div>
        ))}
      </div>
    </div>
  );
}
