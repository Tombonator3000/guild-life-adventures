// Guild Life - Floor Summary View
// Shows end-of-floor results with encounter log and totals

import type { DungeonRunState } from '@/data/combatResolver';
import { getEncounterIcon } from '@/data/combatResolver';
import type { DungeonFloor } from '@/data/dungeon';

interface FloorSummaryViewProps {
  state: DungeonRunState;
  floor: DungeonFloor;
  onFinish: () => void;
}

export function FloorSummaryView({
  state,
  floor,
  onFinish,
}: FloorSummaryViewProps) {
  const success = state.bossDefeated;
  const netHealing = state.totalHealed;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center">
        <div className="text-3xl mb-1">
          {success ? '🏆' : state.retreated ? '🏃' : '💀'}
        </div>
        <h3
          className={`font-display text-lg ${
            success
              ? 'text-green-300'
              : state.retreated
                ? 'text-amber-300'
                : 'text-red-300'
          }`}
        >
          {success
            ? state.isFirstClear
              ? 'Floor Cleared!'
              : 'Floor Completed!'
            : state.retreated
              ? 'Retreated Safely'
              : 'Defeated!'}
        </h3>
        <p className="text-xs text-[#8b7355] mt-0.5">
          {floor.name} — Floor {floor.id}
        </p>
      </div>

      {/* Encounter log */}
      <div className="bg-[#1a1308] border border-[#8b7355]/40 rounded-lg p-3 space-y-1.5">
        <div className="text-xs text-[#8b7355] uppercase tracking-wide mb-1">
          Encounter Log
        </div>
        {state.results.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-4 text-center">{getEncounterIcon(r.encounter.type)}</span>
            <span className="flex-1 text-[#a09080] truncate">{r.encounter.name}</span>
            {r.disarmed && <span className="text-green-400">Disarmed</span>}
            {r.damageDealt > 0 && (
              <span className="text-red-400">-{r.damageDealt}</span>
            )}
            {r.healed > 0 && (
              <span className="text-cyan-400">+{r.healed}</span>
            )}
            {r.goldEarned > 0 && (
              <span className="text-amber-400">+{r.goldEarned}g</span>
            )}
            {r.potionFound && <span className="text-emerald-400">🧪</span>}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="bg-[#2d1f0f] border border-[#8b7355] rounded-lg p-3">
        <div className="grid grid-cols-2 gap-2 text-sm font-mono">
          <div className="text-amber-400">
            💰 Gold: +{state.totalGold}g
          </div>
          <div className="text-red-400">
            ❤ Damage: -{state.totalDamage}
          </div>
          {netHealing > 0 && (
            <div className="text-cyan-400">
              💧 Healed: +{netHealing}
            </div>
          )}
          {success && state.isFirstClear && (
            <div className="text-green-400">
              ✨ +{floor.happinessOnClear} happiness
            </div>
          )}
        </div>

        {/* Rare drop */}
        {state.rareDropName && (
          <div className="mt-2 p-2 bg-purple-950/40 border border-purple-600/40 rounded text-center">
            <div className="text-purple-300 text-sm font-display">
              ✦ RARE DROP: {state.rareDropName}!
            </div>
            <div className="text-purple-400 text-xs mt-0.5">
              {floor.rareDrop.description}
            </div>
          </div>
        )}

        {/* First clear bonus */}
        {success && state.isFirstClear && !state.rareDropName && (
          <div className="mt-2 text-xs text-green-400 text-center">
            First clear bonus applied!
          </div>
        )}

        {/* Retreat note */}
        {state.retreated && (
          <div className="mt-2 text-xs text-[#8b7355] text-center">
            You retreated with 50% of your earnings. The floor remains uncleared.
          </div>
        )}

        {/* Defeat note */}
        {!success && !state.retreated && (
          <div className="mt-2 text-xs text-red-400 text-center">
            You were overwhelmed. Only 25% of gold salvaged.
          </div>
        )}
      </div>

      {/* Return button */}
      <button
        className="w-full py-2 px-4 text-sm font-display rounded-lg bg-gradient-to-r from-[#3d2f1f] to-[#2d1f0f] hover:from-[#4d3f2f] hover:to-[#3d2f1f] text-[#e0d4b8] border border-[#8b7355]/50 transition-all"
        onClick={onFinish}
      >
        Return to Dungeon
      </button>
    </div>
  );
}
