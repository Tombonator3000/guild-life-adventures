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
import type { Player, WeeklySnapshot } from '@/types/game.types';

interface PostGameStatsProps {
  players: Player[];
  winnerId: string | null;
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

export function PostGameStats({ players, winnerId }: PostGameStatsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('totalWealth');
  
  // Build chart data: one point per week, each player as a separate line
  const chartData = useMemo(() => {
    const maxWeeks = Math.max(...players.map(p => (p.weeklySnapshots || []).length), 0);
    const data: Record<string, unknown>[] = [];
    for (let w = 0; w < maxWeeks; w++) {
      const point: Record<string, unknown> = { week: w + 1 };
      for (const p of players) {
        const snap = (p.weeklySnapshots || [])[w];
        point[p.name] = snap ? snap[selectedMetric] : null;
      }
      data.push(point);
    }
    return data;
  }, [players, selectedMetric]);

  // Player comparison stats
  const comparisonStats = useMemo(() => {
    return players.map(p => {
      const stats = p.gameStats || {} as Player['gameStats'];
      const snaps = p.weeklySnapshots || [];
      const lastSnap = snaps[snaps.length - 1];
      return {
        name: p.name,
        color: p.color,
        isWinner: p.id === winnerId,
        finalWealth: lastSnap?.totalWealth ?? p.gold,
        finalHappiness: lastSnap?.happiness ?? p.happiness,
        finalEducation: lastSnap?.education ?? 0,
        finalDependability: lastSnap?.dependability ?? p.dependability,
        totalGoldEarned: stats.totalGoldEarned ?? 0,
        totalQuestsCompleted: (stats.totalQuestsCompleted ?? 0) + (stats.totalBountiesCompleted ?? 0),
        totalDungeonFloors: stats.totalDungeonFloors ?? 0,
        totalShiftsWorked: stats.totalShiftsWorked ?? 0,
        totalDegreesEarned: stats.totalDegreesEarned ?? 0,
        timesRobbed: stats.timesRobbed ?? 0,
        deathCount: stats.deathCount ?? 0,
        hexesCast: stats.hexesCast ?? 0,
        weeksPlayed: snaps.length,
      };
    });
  }, [players, winnerId]);

  return (
    <div className="space-y-6">
      {/* Metric Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-gold" />
          <h3 className="font-display text-lg text-card-foreground">Progress Over Time</h3>
        </div>
        <div className="flex flex-wrap gap-1 mb-4">
          {METRIC_OPTIONS.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                selectedMetric === m.key
                  ? 'bg-primary/20 text-primary border border-primary'
                  : 'bg-[#e0d4b8] text-[#6b5a42] border border-[#8b7355] hover:bg-[#d4c8a8]'
              }`}
            >
              {m.icon} {m.label}
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
                {players.map(p => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.name}
                    stroke={p.color}
                    strokeWidth={p.id === winnerId ? 3 : 1.5}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {comparisonStats.map(s => (
            <div
              key={s.name}
              className={`bg-[#e0d4b8] border rounded p-3 ${
                s.isWinner ? 'border-[#c9a227] ring-1 ring-[#c9a227]' : 'border-[#8b7355]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-mono text-sm font-bold text-[#3d2a14]">{s.name}</span>
                </div>
                {s.isWinner && (
                  <span className="text-xs font-mono text-[#c9a227] font-bold">👑 WINNER</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-[#6b5a42]">
                <CompStat label="Wealth" value={`${s.finalWealth}g`} />
                <CompStat label="Happiness" value={s.finalHappiness.toString()} />
                <CompStat label="Education" value={s.finalEducation.toString()} />
                <CompStat label="Career" value={s.finalDependability.toString()} />
                <CompStat label="Gold Earned" value={`${s.totalGoldEarned}g`} />
                <CompStat label="Quests Done" value={s.totalQuestsCompleted.toString()} />
                <CompStat label="Dungeon Floors" value={s.totalDungeonFloors.toString()} />
                <CompStat label="Shifts Worked" value={s.totalShiftsWorked.toString()} />
                <CompStat label="Degrees" value={s.totalDegreesEarned.toString()} />
                <CompStat label="Times Robbed" value={s.timesRobbed.toString()} />
                <CompStat label="Deaths" value={s.deathCount.toString()} />
                <CompStat label="Hexes Cast" value={s.hexesCast.toString()} />
                <CompStat label="Weeks" value={s.weeksPlayed.toString()} />
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
    <div className="flex justify-between">
      <span>{label}:</span>
      <span className="text-[#3d2a14] font-bold">{value}</span>
    </div>
  );
}
