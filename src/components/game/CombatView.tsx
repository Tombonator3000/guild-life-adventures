// Guild Life - Combat View
// Phase 4: Encounter-by-encounter combat interface
// Shows individual encounters with fight/retreat options and animated results

import { useState, useCallback } from 'react';
import {
  Swords,
  Shield,
  Heart,
  Skull,
  ChevronRight,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Clock,
} from 'lucide-react';
import type { DungeonFloor } from '@/data/dungeon';
import { getFloorTimeCost, calculateEducationBonuses } from '@/data/dungeon';
import { calculateCombatStats } from '@/data/items';
import { getLootMultiplier } from '@/data/dungeon';
import type { Player } from '@/types/game.types';
import {
  type DungeonRunState,
  type EncounterResult,
  type CombatStats,
  type EducationBonuses,
  initDungeonRun,
  resolveEncounter,
  applyEncounterResult,
  advanceToNextEncounter,
  retreatFromDungeon,
  getEncounterAction,
  getEncounterIcon,
} from '@/data/combatResolver';

// ─── Props ────────────────────────────────────────────────────

interface CombatViewProps {
  player: Player;
  floor: DungeonFloor;
  onComplete: (result: CombatRunResult) => void;
  onCancel: () => void;
  /** Callback to spend time from the player's turn */
  onSpendTime: (hours: number) => void;
  /** Time cost per encounter in hours */
  encounterTimeCost: number;
}

/** Final result returned to CavePanel when combat ends */
export interface CombatRunResult {
  success: boolean;
  goldEarned: number;
  totalDamage: number;
  totalHealed: number;
  isFirstClear: boolean;
  retreated: boolean;
  rareDropName: string | null;
  happinessChange: number;
  encounterLog: EncounterResult[];
}

// ─── Encounter Intro View ─────────────────────────────────────

function EncounterIntro({
  encounter,
  encounterIndex,
  totalEncounters,
  currentHealth,
  startHealth,
  canDisarm,
  onFight,
}: {
  encounter: DungeonRunState['encounters'][0];
  encounterIndex: number;
  totalEncounters: number;
  currentHealth: number;
  startHealth: number;
  canDisarm: boolean;
  onFight: () => void;
}) {
  const icon = getEncounterIcon(encounter.type);
  const action = getEncounterAction(encounter, canDisarm);
  const isBoss = encounter.type === 'boss';
  const healthPct = Math.max(0, (currentHealth / startHealth) * 100);

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Encounter counter */}
      <div className="flex justify-between items-center text-xs text-[#8b7355]">
        <span>
          Encounter {encounterIndex + 1} of {totalEncounters}
        </span>
        <div className="flex items-center gap-1">
          <Heart className="w-3 h-3 text-red-400" />
          <span className={currentHealth <= startHealth * 0.3 ? 'text-red-400' : 'text-[#e0d4b8]'}>
            {currentHealth}/{startHealth}
          </span>
        </div>
      </div>

      {/* HP bar */}
      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            healthPct > 50 ? 'bg-green-500' : healthPct > 25 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${healthPct}%` }}
        />
      </div>

      {/* Encounter card */}
      <div
        className={`rounded-lg p-4 border-2 ${
          isBoss
            ? 'bg-gradient-to-b from-red-950/60 to-red-950/30 border-red-700/60'
            : encounter.type === 'treasure'
              ? 'bg-gradient-to-b from-amber-950/40 to-amber-950/20 border-amber-600/40'
              : encounter.type === 'healing'
                ? 'bg-gradient-to-b from-cyan-950/40 to-cyan-950/20 border-cyan-600/40'
                : encounter.type === 'trap'
                  ? 'bg-gradient-to-b from-orange-950/40 to-orange-950/20 border-orange-600/40'
                  : 'bg-gradient-to-b from-[#2d1f0f] to-[#1a1308] border-[#8b7355]/60'
        }`}
      >
        {/* Icon + Name */}
        <div className="text-center mb-3">
          <div className="text-3xl mb-1">{icon}</div>
          <h3
            className={`font-display text-lg ${
              isBoss ? 'text-red-300' : 'text-[#e0d4b8]'
            }`}
          >
            {encounter.name}
          </h3>
          {isBoss && (
            <div className="text-xs text-red-400 uppercase tracking-wider mt-0.5">
              Floor Boss
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-[#a09080] italic text-center mb-3">
          {encounter.flavorText}
        </p>

        {/* Enemy stats (for combat/boss) */}
        {(encounter.type === 'combat' || encounter.type === 'boss') && (
          <div className="flex justify-center gap-4 text-xs font-mono mb-3">
            <span className="text-red-400">
              Power: {encounter.basePower}
            </span>
            <span className="text-orange-400">
              Damage: {encounter.baseDamage}
            </span>
            <span className="text-amber-400">
              Gold: {encounter.baseGold}
            </span>
          </div>
        )}

        {/* Treasure info */}
        {encounter.type === 'treasure' && (
          <div className="text-center text-xs font-mono text-amber-400 mb-3">
            Contains gold: ~{encounter.baseGold}g
          </div>
        )}

        {/* Healing info */}
        {encounter.type === 'healing' && (
          <div className="text-center text-xs font-mono text-cyan-400 mb-3">
            Restores: +{Math.abs(encounter.baseDamage)} HP
          </div>
        )}

        {/* Trap info */}
        {encounter.type === 'trap' && (
          <div className="text-center text-xs font-mono text-orange-400 mb-3">
            {canDisarm ? 'You can disarm this trap!' : `Danger: ~${encounter.baseDamage} damage`}
          </div>
        )}

        {/* Arcane warning */}
        {encounter.requiresArcane && (
          <div className="text-center text-xs text-purple-400 mb-3 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            Ethereal — requires Arcane knowledge
          </div>
        )}
      </div>

      {/* Action button */}
      <button
        className={`w-full py-2.5 px-4 text-sm font-display rounded-lg transition-all ${
          isBoss
            ? 'bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-red-100 border border-red-600/50'
            : encounter.type === 'treasure'
              ? 'bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-amber-100 border border-amber-600/50'
              : encounter.type === 'healing'
                ? 'bg-gradient-to-r from-cyan-800 to-cyan-700 hover:from-cyan-700 hover:to-cyan-600 text-cyan-100 border border-cyan-600/50'
                : 'bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-[#e0d4b8] border border-amber-600/50'
        }`}
        onClick={onFight}
      >
        <span className="flex items-center justify-center gap-2">
          {(encounter.type === 'combat' || encounter.type === 'boss') && (
            <Swords className="w-4 h-4" />
          )}
          {action}
        </span>
      </button>
    </div>
  );
}

// ─── Encounter Result View ────────────────────────────────────

function EncounterResultView({
  result,
  currentHealth,
  startHealth,
  canRetreat,
  onContinue,
  onRetreat,
  onLeaveDungeon,
  encounterTimeCost,
  hasEnoughTime,
}: {
  result: EncounterResult;
  currentHealth: number;
  startHealth: number;
  canRetreat: boolean;
  onContinue: () => void;
  onRetreat: () => void;
  onLeaveDungeon: () => void;
  encounterTimeCost: number;
  hasEnoughTime: boolean;
}) {
  const enc = result.encounter;
  const icon = getEncounterIcon(enc.type);
  const healthPct = Math.max(0, (currentHealth / startHealth) * 100);

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Result header */}
      <div className="text-center">
        <div className="text-2xl mb-1">{icon}</div>
        <h3 className="font-display text-base text-[#e0d4b8]">{enc.name}</h3>
      </div>

      {/* Result details */}
      <div className="bg-[#1a1308] border border-[#8b7355]/40 rounded-lg p-3 space-y-2">
        {/* Damage taken */}
        {result.damageDealt > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-red-300">
              -{result.damageDealt} HP
              {result.blocked && (
                <span className="text-blue-400 ml-1">(blocked!)</span>
              )}
            </span>
          </div>
        )}

        {/* Trap disarmed */}
        {result.disarmed && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-green-300">Trap disarmed!</span>
          </div>
        )}

        {/* Gold earned */}
        {result.goldEarned > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-400 text-base">💰</span>
            <span className="text-amber-300">+{result.goldEarned}g</span>
          </div>
        )}

        {/* Healing received */}
        {result.healed > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-cyan-400 text-base">💧</span>
            <span className="text-cyan-300">+{result.healed} HP restored</span>
          </div>
        )}

        {/* Potion found */}
        {result.potionFound && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-400 text-base">🧪</span>
            <span className="text-emerald-300">
              Found Healing Potion! +{result.potionHealed} HP
            </span>
          </div>
        )}

        {/* Education bonuses activated */}
        {result.bonusesActivated.length > 0 && (
          <div className="flex items-center gap-2 text-xs mt-1">
            <BookOpen className="w-3 h-3 text-[#8888cc]" />
            <span className="text-[#aaaadd]">
              {result.bonusesActivated.join(' | ')}
            </span>
          </div>
        )}
      </div>

      {/* HP bar */}
      <div>
        <div className="flex justify-between text-xs text-[#8b7355] mb-1">
          <span>Health</span>
          <span className={currentHealth <= startHealth * 0.3 ? 'text-red-400' : 'text-[#e0d4b8]'}>
            {currentHealth}/{startHealth}
          </span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              healthPct > 50 ? 'bg-green-500' : healthPct > 25 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthPct}%` }}
          />
        </div>
      </div>

      {/* Low health warning */}
      {currentHealth <= startHealth * 0.3 && currentHealth > 0 && (
        <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-950/30 border border-orange-800/30 rounded p-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Health is low. Consider retreating to keep your gold.</span>
        </div>
      )}

      {/* Time cost info */}
      <div className="text-xs text-[#8b7355] flex items-center justify-center gap-1">
        <Clock className="w-3 h-3" />
        {hasEnoughTime
          ? `Continuing costs ${encounterTimeCost}h`
          : 'Not enough time to continue'}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {hasEnoughTime ? (
          <button
            className="flex-1 py-2 px-3 text-sm font-display rounded-lg bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-[#e0d4b8] border border-amber-600/50 transition-all"
            onClick={onContinue}
          >
            <span className="flex items-center justify-center gap-1.5">
              <ChevronRight className="w-4 h-4" />
              Continue Deeper ({encounterTimeCost}h)
            </span>
          </button>
        ) : (
          <button
            className="flex-1 py-2 px-3 text-sm font-display rounded-lg bg-[#2d1f0f] hover:bg-[#3d2f1f] text-[#a09080] border border-[#8b7355]/50 transition-all"
            onClick={onLeaveDungeon}
          >
            <span className="flex items-center justify-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Leave Dungeon (no time)
            </span>
          </button>
        )}
        {canRetreat && hasEnoughTime && (
          <button
            className="py-2 px-3 text-sm font-display rounded-lg bg-[#2d1f0f] hover:bg-[#3d2f1f] text-[#a09080] border border-[#8b7355]/50 transition-all"
            onClick={onRetreat}
          >
            <span className="flex items-center justify-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Retreat
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Floor Summary View ───────────────────────────────────────

function FloorSummaryView({
  state,
  floor,
  onFinish,
}: {
  state: DungeonRunState;
  floor: DungeonFloor;
  onFinish: () => void;
}) {
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
            You retreated with your earnings. The floor remains uncleared.
          </div>
        )}

        {/* Defeat note */}
        {!success && !state.retreated && (
          <div className="mt-2 text-xs text-red-400 text-center">
            You were overwhelmed. Partial gold salvaged.
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

// ─── Main CombatView Component ────────────────────────────────

export function CombatView({ player, floor, onComplete, onCancel, onSpendTime, encounterTimeCost }: CombatViewProps) {
  const combatStats: CombatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
  );
  const eduBonuses: EducationBonuses = calculateEducationBonuses(player.completedDegrees);
  const isFirstClear = !player.dungeonFloorsCleared.includes(floor.id);

  const [runState, setRunState] = useState<DungeonRunState>(() =>
    initDungeonRun(floor, player.health, isFirstClear),
  );

  // ─── Fight current encounter ──────────────────────────────

  const handleFight = useCallback(() => {
    const encounter = runState.encounters[runState.currentEncounterIndex];
    const result = resolveEncounter(encounter, combatStats, eduBonuses, runState.currentHealth);
    const newState = applyEncounterResult(runState, result);
    setRunState(newState);
  }, [runState, combatStats, eduBonuses]);

  // ─── Continue to next encounter (costs time) ─────────────

  const handleContinue = useCallback(() => {
    onSpendTime(encounterTimeCost);
    setRunState((s) => advanceToNextEncounter(s));
  }, [onSpendTime, encounterTimeCost]);

  // ─── Retreat (50% gold forfeit) ──────────────────────────

  const handleRetreat = useCallback(() => {
    setRunState((s) => retreatFromDungeon(s));
  }, []);

  // ─── Leave dungeon (no time remaining, keep all gold) ──

  const handleLeaveDungeon = useCallback(() => {
    setRunState((s) => ({
      ...s,
      phase: 'floor-summary' as const,
      retreated: true,
      // Keep all gold — leaving due to time, not cowardice
    }));
  }, []);

  // ─── Finish and return results to CavePanel ───────────────

  const handleFinish = useCallback(() => {
    const happinessChange = runState.bossDefeated && runState.isFirstClear
      ? floor.happinessOnClear
      : !runState.bossDefeated && !runState.retreated
        ? -2  // Defeat penalty
        : 0;

    const lootMult = getLootMultiplier(floor, player.guildRank);
    onComplete({
      success: runState.bossDefeated,
      goldEarned: Math.floor(runState.totalGold * lootMult),
      totalDamage: runState.totalDamage,
      totalHealed: runState.totalHealed,
      isFirstClear: runState.isFirstClear && runState.bossDefeated,
      retreated: runState.retreated,
      rareDropName: runState.rareDropName,
      happinessChange,
      encounterLog: runState.results,
    });
  }, [runState, floor, onComplete]);

  // ─── Render based on phase ────────────────────────────────

  const currentEncounter = runState.encounters[runState.currentEncounterIndex];
  const isBossNext =
    runState.currentEncounterIndex + 1 < runState.encounters.length &&
    runState.encounters[runState.currentEncounterIndex + 1].type === 'boss';
  const canRetreat = !isBossNext && currentEncounter?.type !== 'boss';

  return (
    <div className="space-y-2">
      {/* Floor header */}
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base text-[#e0d4b8] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          {floor.name}
        </h4>
        {runState.phase !== 'floor-summary' && (
          <span className="text-xs text-[#8b7355]">
            Floor {floor.id}
          </span>
        )}
      </div>

      {/* Phase-specific view */}
      {runState.phase === 'encounter-intro' && currentEncounter && (
        <EncounterIntro
          encounter={currentEncounter}
          encounterIndex={runState.currentEncounterIndex}
          totalEncounters={runState.encounters.length}
          currentHealth={runState.currentHealth}
          startHealth={runState.startHealth}
          canDisarm={eduBonuses.canDisarmTraps}
          onFight={handleFight}
        />
      )}

      {runState.phase === 'encounter-result' && runState.results.length > 0 && (
        <EncounterResultView
          result={runState.results[runState.results.length - 1]}
          currentHealth={runState.currentHealth}
          startHealth={runState.startHealth}
          canRetreat={canRetreat}
          onContinue={handleContinue}
          onRetreat={handleRetreat}
          onLeaveDungeon={handleLeaveDungeon}
          encounterTimeCost={encounterTimeCost}
          hasEnoughTime={player.timeRemaining >= encounterTimeCost}
        />
      )}

      {runState.phase === 'floor-summary' && (
        <FloorSummaryView
          state={runState}
          floor={floor}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
