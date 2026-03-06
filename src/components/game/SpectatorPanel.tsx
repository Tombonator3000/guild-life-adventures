// SpectatorPanel — shown in the center panel when the local player is dead (isGameOver=true)
// and watching the remaining game. Displays goal progress standings for all surviving players.

import { Eye, Coins, Heart, GraduationCap, Star, Swords, MapPin } from 'lucide-react';
import type { Player, GoalSettings } from '@/types/game.types';
import { CharacterPortrait } from './CharacterPortrait';
import { calculateStockValue } from '@/data/stocks';

interface SpectatorPanelProps {
  players: Player[];
  goalSettings: GoalSettings;
  week: number;
  stockPrices: Record<string, number>;
  isPureSpectator?: boolean;
}

function GoalBar({ label, value, pct, icon }: { label: string; value: string; pct: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-amber-700/70 w-3">{icon}</span>
      <span className="text-[#6b5a42] w-16 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-[#8b7355]/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-600/70 transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-[#6b5a42] w-10 text-right">{value}</span>
    </div>
  );
}

export function SpectatorPanel({ players, goalSettings, week, stockPrices, isPureSpectator = false }: SpectatorPanelProps) {
  const adventureGoal = goalSettings.adventure ?? 0;
  const goalCount = adventureGoal > 0 ? 5 : 4;

  const ranked = players
    .filter(p => !p.isAI || true) // show all players including AI
    .map(p => {
      const stockValue = calculateStockValue(p.stocks, stockPrices);
      const totalWealth = p.gold + p.savings + p.investments + stockValue - p.loanAmount;
      const pWealth = goalSettings.wealth > 0 ? Math.min(1, Math.max(0, totalWealth / goalSettings.wealth)) : 1;
      const pHappiness = goalSettings.happiness > 0 ? Math.min(1, Math.max(0, p.happiness / goalSettings.happiness)) : 1;
      const pEdu = goalSettings.education > 0 ? Math.min(1, Math.max(0, (p.completedDegrees.length * 9) / goalSettings.education)) : 1;
      const pCareer = goalSettings.career > 0 ? Math.min(1, Math.max(0, (p.currentJob ? p.dependability : 0) / goalSettings.career)) : 1;
      const pAdventure = adventureGoal > 0 ? Math.min(1, Math.max(0, (p.completedQuests + p.dungeonFloorsCleared.length) / adventureGoal)) : 0;
      const scoreSum = pWealth + pHappiness + pEdu + pCareer + (adventureGoal > 0 ? pAdventure : 0);
      const score = Math.round((scoreSum / goalCount) * 100);
      return {
        player: p,
        score,
        totalWealth,
        pWealth, pHappiness, pEdu, pCareer, pAdventure,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="h-full overflow-y-auto parchment-panel p-3 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#8b7355]/30 pb-2">
        <Eye className="w-4 h-4 text-amber-700" />
        <div>
          <p className="font-display text-sm font-bold text-[#3d2b1f]">
            {isPureSpectator ? 'Spectating' : 'You have fallen'}
          </p>
          <p className="text-xs text-[#6b5a42]">Week {week} — watching the remaining adventurers</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-1.5 bg-amber-900/10 border border-amber-700/20 rounded px-2 py-1.5">
        <MapPin className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#6b5a42]">
          Click any location on the board to watch what's happening there.
        </p>
      </div>

      {/* Player standings */}
      <div className="space-y-2.5">
        {ranked.map(({ player, score, totalWealth, pWealth, pHappiness, pEdu, pCareer, pAdventure }, idx) => (
          <div
            key={player.id}
            className={`rounded border p-2 ${player.isGameOver ? 'opacity-50 border-[#8b7355]/20' : 'border-[#8b7355]/40'}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-[#8b7355] font-mono w-4">#{idx + 1}</span>
              <CharacterPortrait
                portraitId={player.portraitId}
                playerColor={player.color}
                playerName={player.name}
                size={22}
                isAI={player.isAI}
                hasCurse={(player.activeCurses?.length ?? 0) > 0}
                curses={player.activeCurses}
              />
              <div className="flex-1 min-w-0">
                <span className="font-display text-xs font-bold text-[#3d2b1f] truncate block">
                  {player.name}
                  {player.isGameOver && ' 💀'}
                  {player.isAI && ' 🤖'}
                </span>
              </div>
              <span
                className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
                style={{ background: player.color + '25', color: player.color, border: `1px solid ${player.color}50` }}
              >
                {score}%
              </span>
            </div>
            <div className="space-y-0.5">
              {goalSettings.wealth > 0 && (
                <GoalBar
                  label="Wealth"
                  value={`${totalWealth}g`}
                  pct={pWealth * 100}
                  icon={<Coins className="w-3 h-3" />}
                />
              )}
              {goalSettings.happiness > 0 && (
                <GoalBar
                  label="Happiness"
                  value={`${player.happiness}`}
                  pct={pHappiness * 100}
                  icon={<Heart className="w-3 h-3" />}
                />
              )}
              {goalSettings.education > 0 && (
                <GoalBar
                  label="Education"
                  value={`${player.completedDegrees.length * 9}pts`}
                  pct={pEdu * 100}
                  icon={<GraduationCap className="w-3 h-3" />}
                />
              )}
              {goalSettings.career > 0 && (
                <GoalBar
                  label="Career"
                  value={`${player.dependability}%`}
                  pct={pCareer * 100}
                  icon={<Star className="w-3 h-3" />}
                />
              )}
              {adventureGoal > 0 && (
                <GoalBar
                  label="Adventure"
                  value={`${player.completedQuests + player.dungeonFloorsCleared.length}`}
                  pct={pAdventure * 100}
                  icon={<Swords className="w-3 h-3" />}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
