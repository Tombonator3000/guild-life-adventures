// Guild Life - Combat View
// Host-authoritative encounter-by-encounter dungeon interface.
// The client only sends semantic choices; the host owns all random rolls and settlement.

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { playSFX } from '@/audio/sfxManager';
import type { DungeonFloor } from '@/data/dungeon';
import { useGameStore } from '@/store/gameStore';
import type { Player } from '@/types/game.types';
import { buildDungeonCompletionSummary } from '@/store/helpers/dungeonServiceHelpers';
import type { DungeonCompletionSummary } from '@/store/dungeonTypes';
import { EncounterIntro, EncounterResultView, FloorSummaryView } from './combat';
import { toast } from 'sonner';
import './combat/cave.css';
import { retreatFromDungeon } from '@/data/combatResolver';

interface CombatViewProps {
  player: Player;
  floor: DungeonFloor;
  onComplete: (result: CombatRunResult) => void;
  onCancel: () => void;
}

export type CombatRunResult = DungeonCompletionSummary;

export function CombatView({ player, floor, onComplete, onCancel }: CombatViewProps) {
  const session = useGameStore(state => state.dungeonRuns[player.id]);
  const activeFestival = useGameStore(state => state.activeFestival);
  const resolveEncounter = useGameStore(state => state.resolveDungeonEncounter);
  const advanceRun = useGameStore(state => state.advanceDungeonRun);
  const finalizeRun = useGameStore(state => state.finalizeDungeonRun);
  const [pendingSummary, setPendingSummary] = useState<DungeonCompletionSummary | null>(null);
  const lastResultCount = useRef(0);

  useEffect(() => {
    if (!session) {
      lastResultCount.current = 0;
      return;
    }
    const results = session.runState.results;
    if (results.length <= lastResultCount.current) return;
    const latest = results[results.length - 1];
    if (latest.damageDealt > 0) playSFX('damage-taken');
    if (latest.goldEarned > 0) playSFX('coin-gain');
    if (latest.healed > 0 || latest.potionHealed > 0) playSFX('heal');
    lastResultCount.current = results.length;
  }, [session]);

  useEffect(() => {
    if (!pendingSummary || session) return;
    onComplete(pendingSummary);
    setPendingSummary(null);
  }, [pendingSummary, session, onComplete]);

  if (!session || session.floorId !== floor.id) {
    return (
      <div className="space-y-3 bg-[#1a110a] rounded p-4 text-center">
        <Sparkles className="w-6 h-6 text-amber-400 mx-auto animate-pulse" />
        <p className="text-sm text-[#c9b888]">Preparing the dungeon on the host…</p>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded border border-[#8b7355] text-[#e0d4b8] hover:bg-[#2d1f0f]"
        >
          Back
        </button>
      </div>
    );
  }

  const runState = session.runState;
  const currentEncounter = runState.encounters[runState.currentEncounterIndex];
  const previousHealth = runState.results.slice(0, -1).reduce((health, result) => Math.min(player.maxHealth, Math.max(0, health - result.damageDealt + result.healed + result.potionHealed)), runState.startHealth);
  const retreatGold = buildDungeonCompletionSummary({ ...session, runState: retreatFromDungeon(runState) }, player, activeFestival).goldEarned;
  const settledGold = buildDungeonCompletionSummary(session, player, activeFestival).goldEarned;
  const nextEncounter = runState.encounters[runState.currentEncounterIndex + 1];
  const canRetreat = nextEncounter?.type !== 'boss' && currentEncounter?.type !== 'boss';

  const showFailure = (result: { success: boolean; message: string } | void) => {
    if (result && !result.success) toast.error(result.message);
  };

  const handleFinish = () => {
    const summary = buildDungeonCompletionSummary(session, player, activeFestival);
    setPendingSummary(summary);
    const result = finalizeRun(player.id);
    if (result && !result.success) {
      setPendingSummary(null);
      toast.error(result.message);
      return;
    }
    if (result?.summary) {
      setPendingSummary(null);
      onComplete(result.summary);
    }
  };

  return (
    <div className="cave-run" data-phase={runState.phase}>
      <div className="cave-run-heading">
        <h4 className="font-display">
          <Sparkles className="w-4 h-4 text-amber-400" />
          {floor.name}
        </h4>
        {runState.phase !== 'floor-summary' && (
          <span className="cave-floor-number">Floor {floor.id}</span>
        )}
      </div>

      {runState.modifier && (
        <div
          className="cave-modifier"
          style={{
            borderColor: runState.modifier.color,
            color: '#4c261b',
            backgroundColor: `${runState.modifier.color}15`,
          }}
        >
          <span>{runState.modifier.icon}</span>
          <span className="font-bold">{runState.modifier.name}</span>
          <span className="cave-modifier-description">— {runState.modifier.description}</span>
        </div>
      )}

      {runState.hasMiniBoss && runState.phase === 'encounter-intro' && runState.currentEncounterIndex === 0 && (
        <div className="text-xs font-mono px-2 py-1 rounded border border-amber-600 bg-amber-950/30 text-amber-400">
          A wandering mini-boss has been spotted on this floor!
        </div>
      )}

      {runState.phase === 'encounter-intro' && currentEncounter && (
        <EncounterIntro
          encounter={currentEncounter}
          encounterIndex={runState.currentEncounterIndex}
          totalEncounters={runState.encounters.length}
          currentHealth={runState.currentHealth}
          maxHealth={player.maxHealth}
          canDisarm={session.educationBonuses.canDisarmTraps && !runState.modifier?.disableDisarm}
          modifier={runState.modifier}
          onFight={() => showFailure(resolveEncounter(player.id))}
          onSkip={() => showFailure(advanceRun(player.id, 'skip-healing'))}
        />
      )}

      {runState.phase === 'encounter-result' && runState.results.length > 0 && (
        <EncounterResultView
          result={runState.results[runState.results.length - 1]}
          encounterIndex={runState.currentEncounterIndex}
          totalEncounters={runState.encounters.length}
          totalGold={runState.totalGold}
          previousHealth={previousHealth}
          retreatGold={retreatGold}
          currentHealth={runState.currentHealth}
          maxHealth={player.maxHealth}
          canRetreat={canRetreat}
          onContinue={() => showFailure(advanceRun(player.id, 'continue'))}
          onRetreat={() => showFailure(advanceRun(player.id, 'retreat'))}
          onLeaveDungeon={() => showFailure(advanceRun(player.id, 'leave'))}
          encounterTimeCost={session.encounterTimeCost}
          hasEnoughTime={player.timeRemaining >= session.encounterTimeCost}
        />
      )}

      {runState.phase === 'floor-summary' && (
        <FloorSummaryView
          state={runState}
          floor={floor}
          settledGold={settledGold}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
