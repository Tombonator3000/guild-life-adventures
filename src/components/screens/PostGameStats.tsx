/**
 * Post-Game Statistics Dashboard
 * Shows graphs over time and player comparison after game ends.
 */

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Users, Award, GraduationCap, Coins, Heart } from 'lucide-react';
import { calculateStockValue } from '@/data/stocks';
import type { Player, WeeklySnapshot } from '@/types/game.types';

interface PostGameStatsProps {
  players: Player[];
  winnerId: string | null;
  stockPrices: Record<string, number>;
  week: number;
}

type MetricKey = keyof Pick<WeeklySnapshot, 'gold' | 'health' | 'happiness' | 'totalWealth' | 'dependability' | 'education'>;

const METRIC_OPTIONS: { key: MetricKey; label: string; icon: React.ReactNode }[] = [
  { key: 'totalWealth', label: 'Total Wealth', icon: <Coins className="w-4 h-4" /> },
  { key: 'gold', label: 'Gold', icon: <Coins className="w-4 h-4" /> },
  { key: 'happiness', label: 'Happiness', icon: <Heart className="w-4 h-4" /> },
  { key: 'health', label: 'Health', icon: <Heart className="w-4 h-4" /> },
  { key: 'dependability', label: 'Career (Dep)', icon: <Award className="w-4 h-4" /> },
  { key: 'education', label: 'Education', icon: <GraduationCap className="w-4 h-4" /> },
];

function getLiveMetric(
  player: Player,
  metric: MetricKey,
  stockPrices: Record<string, number>,
): number {
  switch (metric) {
    case 'totalWealth':
      return player.gold
        + player.savings
        + player.investments
        + calculateStockValue(player.stocks, stockPrices)
        - player.loanAmount;
    case 'education':
      return player.completedDegrees.length * 9;
    case 'dependability':
      return player.currentJob ? player.dependability : 0;
    case 'gold':
      return player.gold;
    case 'health':
      return player.health;
    case 'happiness':
      return player.happiness;
  }
}

export function PostGameStats({ players, winnerId, stockPrices, week }: PostGameStatsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('totalWealth');

  // Historical snapshots remain the source for previous weeks, but the final point is
  // always overwritten with the live end-state so the chart cannot stop one turn early.
  const chartData = useMemo(() => {
    const points = new Map<number, Record<string, unknown>>();
    for (const player of players) {
      for (const snapshot of player.weeklySnapshots ?? []) {
        const point = points.get(snapshot.week) ?? { week: snapshot.week };
        point[player.name] = snapshot[selectedMetric];
        points.set(snapshot.week, point);
      }
    }

    const finalWeek = Math.max(1, week);
    const finalPoint = points.get(finalWeek) ?? { week: finalWeek };
    for (const player of players) {
      finalPoint[player.name] = getLiveMetric(player, selectedMetric, stockPrices);
    }
    points.set(finalWeek, finalPoint);

    return [...points.values()].sort((a, b) => Number(a.week) - Number(b.week));
  }, [players, selectedMetric, stockPrices, week]);

  // Comparison cards use the live Player objects, not the last weekly snapshot.
  const comparisonStats = useMemo(() => {
    return players.map(player => {
      const stats = player.gameStats ?? {} as Player['gameStats'];
      return {
        name: player.name,
        color: player.color,
        isWinner: player.id === winnerId,
        finalWealth: getLiveMetric(player, 'totalWealth', stockPrices),
        finalHappiness: player.happiness,
        finalEducation: player.completedDegrees.length * 9,
        finalDependability: player.currentJob ? player.dependability : 0,
        totalGoldEarned: stats.totalGoldEarned ?? 0,
        totalQuestsCompleted: (stats.totalQuestsCompleted ?? 0) + (stats.totalBountiesCompleted ?? 0),
        totalDungeonFloors: stats.totalDungeonFloors ?? 0,
        totalShiftsWorked: stats.totalShiftsWorked ?? player.totalShiftsWorked ?? 0,
        totalDegreesEarned: player.completedDegrees.length,
        timesRobbed: stats.timesRobbed ?? 0,
        deathCount: stats.deathCount ?? 0,
        hexesCast: stats.hexesCast ?? 0,
        weeksPlayed: week,
      };
    });
  }, [players, stockPrices, week, winnerId]);

  return (
    <div className="space-y-6">
      {/* Metric Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-gold" />
          <h3 className="font-display text-lg text-card-foreground">Progress Over Time</h3>
        </div>
        <div className="flex flex-wrap gap-1 mb-4">
          {METRIC_OPTIONS.map(metric => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                selectedMetric === metric.key
                  ? 'bg-primary/20 text-primary border border-primary'
                  : 'bg-[#e0d4b8] text-[#6b5a42] border border-[#8b7355] hover:bg-[#d4c8a8]'
              }`}
            >
              {metric.icon} {metric.label}
            </button>
          ))}
        </div>

        {/* Line Chart */}
        {chartData.length > 0 ? (
          <div className="bg-[#e0d4b8] rounded p-3 border border-[#8b7355]">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c9b888" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} label={{ value: 'Week', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f0e8d8', border: '1px solid #8b7355', borderRadius: 6, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {players.map(player => (
                  <Line
                    key={player.id}
                    type="monotone"
                    dataKey={player.name}
                    stroke={player.color}
                    strokeWidth={player.id === winnerId ? 3 : 1.5}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-[#6b5a42] text-center text-sm font-mono py-8">No stat data recorded yet.</p>
        )}
      </div>

      {/* Player Comparison */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-gold" />
          <h3 className="font-display text-lg text-card-foreground">Player Comparison</h3>
        </div>
        <p className="text-xs text-[#6b5a42] mb-3 font-mono">
          These are the live values at the exact moment the game ended.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {comparisonStats.map(stat => (
            <div
              key={stat.name}
              className={`bg-[#e0d4b8] border rounded p-3 ${
                stat.isWinner ? 'border-[#c9a227] ring-1 ring-[#c9a227]' : 'border-[#8b7355]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: stat.color }} />
                  <span className="font-mono text-sm font-bold text-[#3d2a14]">{stat.name}</span>
                </div>
                {stat.isWinner && (
                  <span className="text-xs font-mono text-[#c9a227] font-bold">👑 GOAL WINNER</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-[#6b5a42]">
                <CompStat label="Wealth" value={`${stat.finalWealth}g`} />
                <CompStat label="Happiness" value={stat.finalHappiness.toString()} />
                <CompStat label="Education" value={stat.finalEducation.toString()} />
                <CompStat label="Career" value={stat.finalDependability.toString()} />
                <CompStat label="Gold Earned" value={`${stat.totalGoldEarned}g`} />
                <CompStat label="Quests Done" value={stat.totalQuestsCompleted.toString()} />
                <CompStat label="Dungeon Floors" value={stat.totalDungeonFloors.toString()} />
                <CompStat label="Shifts Worked" value={stat.totalShiftsWorked.toString()} />
                <CompStat label="Degrees" value={stat.totalDegreesEarned.toString()} />
                <CompStat label="Times Robbed" value={stat.timesRobbed.toString()} />
                <CompStat label="Deaths" value={stat.deathCount.toString()} />
                <CompStat label="Hexes Cast" value={stat.hexesCast.toString()} />
                <CompStat label="Weeks" value={stat.weeksPlayed.toString()} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}:</span>
      <span className="text-[#3d2a14] font-bold">{value}</span>
    </div>
  );
}
