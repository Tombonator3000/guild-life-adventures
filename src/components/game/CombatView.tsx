// Guild Life - Combat View
// Phase 4: Encounter-by-encounter combat interface
// Shows individual encounters with fight/retreat options and animated results
// Supports dungeon modifiers and mini-boss encounters

import { useState, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import type { DungeonFloor } from '@/data/dungeon';
import { getLootMultiplier } from '@/data/dungeon';
import { FESTIVALS } from '@/data/festivals';
import { useGameStore } from '@/store/gameStore';
import { calculateCombatStats } from '@/data/items';
import { calculateEducationBonuses } from '@/data/dungeon';
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
} from '@/data/combatResolver';
import { EncounterIntro, EncounterResultView, FloorSummaryView } from './combat';

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
  /** Callback to apply health change per-encounter (immediate damage to game store) */
  onEncounterHealthDelta: (delta: number) => boolean;
}

/** Final result returned to CavePanel when combat ends */
export interface CombatRunResult {
  success: boolean;
  goldEarned: number;
  totalDamage: number;
  totalHealed: number;
  /** Actual health change (negative = damage, positive = net heal). Uses real HP delta, not raw totals. */
  healthChange: number;
  isFirstClear: boolean;
  retreated: boolean;
  rareDropName: string | null;
  happinessChange: number;
  encounterLog: EncounterResult[];
  /** Number of encounters completed (for leaderboard) */
  encountersCompleted: number;
}

// ─── Main CombatView Component ────────────────────────────────

export function CombatView({ player, floor, onComplete, onCancel, onSpendTime, encounterTimeCost, onEncounterHealthDelta }: CombatViewProps) {
  const combatStats: CombatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
    player.temperedItems,
  );
  const eduBonuses: EducationBonuses = calculateEducationBonuses(player.completedDegrees);
  const isFirstClear = !player.dungeonFloorsCleared.includes(floor.id);

  const [runState, setRunState] = useState<DungeonRunState>(() =>
    initDungeonRun(floor, player.health, isFirstClear, player.dungeonFloorsCleared),
  );

  // ─── Fight current encounter ──────────────────────────────

  const handleFight = useCallback(() => {
    const encounter = runState.encounters[runState.currentEncounterIndex];
    const result = resolveEncounter(encounter, combatStats, eduBonuses, runState.currentHealth, runState.modifier);
    const newState = applyEncounterResult(runState, result);

    // Apply health change immediately to game store (per-encounter, not deferred)
    const healthDelta = newState.currentHealth - runState.currentHealth;
    if (healthDelta !== 0) {
      const playerDied = onEncounterHealthDelta(healthDelta);
      if (playerDied) {
        // Player died mid-combat — force to floor summary immediately
        setRunState({
          ...newState,
          phase: 'floor-summary',
        });
        return;
      }
    }

    setRunState(newState);
  }, [runState, combatStats, eduBonuses, onEncounterHealthDelta]);

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
    // Defeat forfeits 75% gold (worse than retreat's 50%) so retreat is always the better choice
    const defeatGoldPenalty = (!runState.bossDefeated && !runState.retreated) ? 0.25 : 1.0;
    // C1: Festival dungeon gold multiplier (e.g. Spring Tournament +50%)
    const festivalId = useGameStore.getState().activeFestival;
    const festivalDungeonMult = festivalId
      ? (FESTIVALS.find(f => f.id === festivalId)?.dungeonGoldMultiplier ?? 1.0)
      : 1.0;
    // healthChange=0 here because damage was already applied per-encounter via onEncounterHealthDelta
    onComplete({
      success: runState.bossDefeated,
      goldEarned: Math.floor(runState.totalGold * lootMult * defeatGoldPenalty * festivalDungeonMult),
      totalDamage: runState.totalDamage,
      totalHealed: runState.totalHealed,
      healthChange: 0, // Already applied per-encounter
      isFirstClear: runState.isFirstClear && runState.bossDefeated,
      retreated: runState.retreated,
      rareDropName: runState.rareDropName,
      happinessChange,
      encounterLog: runState.results,
      encountersCompleted: runState.results.length,
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

      {/* Active modifier banner */}
      {runState.modifier && (
        <div
          className="text-xs font-mono px-2 py-1 rounded border flex items-center gap-1.5"
          style={{ borderColor: runState.modifier.color, color: runState.modifier.color, backgroundColor: `${runState.modifier.color}15` }}
        >
          <span>{runState.modifier.icon}</span>
          <span className="font-bold">{runState.modifier.name}</span>
          <span className="text-[#a09080]">— {runState.modifier.description}</span>
        </div>
      )}

      {/* Mini-boss warning */}
      {runState.hasMiniBoss && runState.phase === 'encounter-intro' && runState.currentEncounterIndex === 0 && (
        <div className="text-xs font-mono px-2 py-1 rounded border border-amber-600 bg-amber-950/30 text-amber-400">
          A wandering mini-boss has been spotted on this floor!
        </div>
      )}

      {/* Phase-specific view */}
      {runState.phase === 'encounter-intro' && currentEncounter && (
        <EncounterIntro
          encounter={currentEncounter}
          encounterIndex={runState.currentEncounterIndex}
          totalEncounters={runState.encounters.length}
          currentHealth={runState.currentHealth}
          maxHealth={player.maxHealth}
          canDisarm={eduBonuses.canDisarmTraps}
          onFight={handleFight}
        />
      )}

      {runState.phase === 'encounter-result' && runState.results.length > 0 && (
        <EncounterResultView
          result={runState.results[runState.results.length - 1]}
          currentHealth={runState.currentHealth}
          maxHealth={player.maxHealth}
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
