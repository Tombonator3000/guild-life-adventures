import { useState } from 'react';
import type { Player } from '@/types/game.types';
import {
  Sparkles,
  Lock,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Clock,
  Skull,
  Heart,
  BookOpen,
  AlertTriangle,
  Trophy,
  Star,
} from 'lucide-react';
import { ActionButton } from './ActionButton';
import { toast } from 'sonner';
import { useGameStore } from '@/store/gameStore';
import { calculateCombatStats } from '@/data/items';
import {
  DUNGEON_FLOORS,
  checkFloorRequirements,
  getDungeonProgress,
  calculateEducationBonuses,
  getFloorTimeCost,
  getEncounterTimeCost,
  MAX_FLOOR_ATTEMPTS_PER_TURN,
  MAX_DUNGEON_FLOOR,
  updateDungeonRecord,
  type DungeonFloor,
} from '@/data/dungeon';
import { CombatView, type CombatRunResult } from './CombatView';

interface CavePanelProps {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  modifyGold: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  clearDungeonFloor: (playerId: string, floorId: number) => void;
  applyRareDrop: (playerId: string, dropId: string) => void;
}

// ─── Degree ID to display name ───────────────────────────────────

const DEGREE_NAMES: Record<string, string> = {
  'trade-guild': 'Trade Guild',
  'combat-training': 'Combat Training',
  'master-combat': 'Master Combat',
  'arcane-studies': 'Arcane Studies',
  alchemy: 'Alchemy',
  scholar: 'Scholar',
  loremaster: 'Loremaster',
};

// ─── Floor status ────────────────────────────────────────────────

type FloorStatus = 'cleared' | 'available' | 'locked';

function getFloorStatus(
  floor: DungeonFloor,
  floorsCleared: number[],
): FloorStatus {
  if (floorsCleared.includes(floor.id)) return 'cleared';
  const prevReq = floor.requirements.previousFloorCleared;
  if (prevReq > 0 && !floorsCleared.includes(prevReq)) return 'locked';
  return 'available';
}

// ─── Main component ──────────────────────────────────────────────

export function CavePanel({
  player,
  spendTime,
  modifyGold,
  modifyHealth,
  modifyHappiness,
  clearDungeonFloor,
  applyRareDrop,
}: CavePanelProps) {
  const [expandedFloor, setExpandedFloor] = useState<number | null>(null);
  const [activeFloor, setActiveFloor] = useState<DungeonFloor | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
    player.temperedItems,
  );
  const eduBonuses = calculateEducationBonuses(player.completedDegrees);
  const progress = getDungeonProgress(player.dungeonFloorsCleared);
  const progressPct = (progress.totalFloorsCleared / MAX_DUNGEON_FLOOR) * 100;

  const hasAnyBonus =
    eduBonuses.canDisarmTraps ||
    eduBonuses.canDamageEthereal ||
    eduBonuses.damageReduction > 0 ||
    eduBonuses.attackBonus > 0 ||
    eduBonuses.goldBonus > 0 ||
    eduBonuses.healingPotionChance > 0;

  // Cave access gating: require at least 1 completed degree
  const hasCaveAccess = player.completedDegrees.length > 0;
  const attemptsUsed = player.dungeonAttemptsThisTurn || 0;
  const attemptsRemaining = MAX_FLOOR_ATTEMPTS_PER_TURN - attemptsUsed;

  const dungeonRecords = player.dungeonRecords || {};

  // ─── Enter floor — switch to combat view ───────────────────

  const handleEnterFloor = (floor: DungeonFloor) => {
    if (attemptsRemaining <= 0) {
      toast.error('You are too fatigued for another dungeon run this week.');
      return;
    }
    // Only charge for the first encounter's time on entry (rest charged per encounter)
    const encounterTime = getEncounterTimeCost(floor, combatStats);
    spendTime(player.id, encounterTime);
    // Increment dungeon attempts via direct store set
    const { players } = useGameStore.getState();
    useGameStore.setState({
      players: players.map(p =>
        p.id === player.id
          ? { ...p, dungeonAttemptsThisTurn: (p.dungeonAttemptsThisTurn || 0) + 1 }
          : p
      ),
    });
    setActiveFloor(floor);
  };

  // ─── Per-encounter health application (immediate damage) ──

  const handleEncounterHealthDelta = (delta: number): boolean => {
    if (delta !== 0) modifyHealth(player.id, delta);
    // Check for death immediately after each encounter
    const { checkDeath } = useGameStore.getState();
    return checkDeath(player.id);
  };

  // ─── Combat complete — apply results ───────────────────────

  const handleCombatComplete = (result: CombatRunResult) => {
    if (!activeFloor) return;

    // Apply gold earned
    if (result.goldEarned > 0) modifyGold(player.id, result.goldEarned);

    // Health was already applied per-encounter via handleEncounterHealthDelta
    // Only do a final death check in case something was missed
    const { checkDeath } = useGameStore.getState();
    checkDeath(player.id);

    // Apply happiness change
    if (result.happinessChange !== 0) {
      modifyHappiness(player.id, result.happinessChange);
    }

    // Mark floor as cleared on first successful clear
    if (result.isFirstClear) {
      clearDungeonFloor(player.id, activeFloor.id);
    }

    // Apply rare drop effect
    if (result.rareDropName) {
      applyRareDrop(player.id, activeFloor.rareDrop.id);
      toast.success(
        `RARE DROP: ${result.rareDropName}! ${activeFloor.rareDrop.description}`,
        { duration: 6000 },
      );
    }

    // Update dungeon leaderboard records
    const { players } = useGameStore.getState();
    useGameStore.setState({
      players: players.map(p => {
        if (p.id !== player.id) return p;
        const currentRecords = p.dungeonRecords || {};
        const updatedRecord = updateDungeonRecord(
          currentRecords[activeFloor.id],
          result.goldEarned,
          result.encountersCompleted,
        );
        return {
          ...p,
          dungeonRecords: {
            ...currentRecords,
            [activeFloor.id]: updatedRecord,
          },
        };
      }),
    });

    if (result.success) {
      const firstClearBonus = result.isFirstClear
        ? `, +${activeFloor.happinessOnClear} happiness, +${activeFloor.dependabilityOnClear} dep`
        : '';
      toast.success(
        `Floor ${activeFloor.id}: ${activeFloor.name} — ${result.isFirstClear ? 'CLEARED!' : 'Completed!'} ` +
          `+${result.goldEarned}g, -${result.totalDamage} HP` + firstClearBonus,
        { duration: 5000 },
      );
    } else if (result.retreated) {
      toast(`Floor ${activeFloor.id}: ${activeFloor.name} — Retreated. +${result.goldEarned}g`, {
        duration: 4000,
      });
    } else {
      toast.error(
        `Floor ${activeFloor.id}: ${activeFloor.name} — Defeated! +${result.goldEarned}g, -${result.totalDamage} HP`,
        { duration: 5000 },
      );
    }

    // Return to floor selection
    setActiveFloor(null);
  };

  // ─── Cave access gating ────────────────────────────────────

  if (!hasCaveAccess) {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="font-display text-lg text-muted-foreground flex items-center gap-2">
            <Lock className="w-5 h-5" /> The Dungeon
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            The cave entrance is sealed with ancient runes.
          </p>
        </div>
        <div className="bg-[#2d1f0f] border border-[#8b7355] rounded p-4 text-center">
          <Lock className="w-8 h-8 text-[#8b7355] mx-auto mb-2" />
          <p className="text-sm text-[#e0d4b8] font-display mb-2">
            Dungeon Access Locked
          </p>
          <p className="text-xs text-[#a09080] mb-3">
            You must complete at least one degree at the Academy before the Guild will grant you a dungeon exploration permit.
          </p>
          <p className="text-xs text-amber-400">
            Visit the Academy to begin your education.
          </p>
        </div>
      </div>
    );
  }

  // ─── If in combat, show combat view ────────────────────────

  if (activeFloor) {
    return (
      <CombatView
        player={player}
        floor={activeFloor}
        onComplete={handleCombatComplete}
        onCancel={() => setActiveFloor(null)}
        onSpendTime={(hours: number) => spendTime(player.id, hours)}
        encounterTimeCost={getEncounterTimeCost(activeFloor, combatStats)}
        onEncounterHealthDelta={handleEncounterHealthDelta}
      />
    );
  }

  // ─── Floor selection view ──────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h4 className="font-display text-lg text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> The Dungeon
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          Descend into the depths. Each floor grows more dangerous — and
          more rewarding.
        </p>
      </div>

      {/* Attempts remaining */}
      {attemptsRemaining < MAX_FLOOR_ATTEMPTS_PER_TURN && (
        <div className={`text-xs font-mono px-2 py-1 rounded ${attemptsRemaining <= 0 ? 'bg-red-950/40 text-red-400' : 'bg-amber-950/40 text-amber-400'}`}>
          Dungeon Runs: {attemptsRemaining}/{MAX_FLOOR_ATTEMPTS_PER_TURN} remaining this week
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-[#2d1f0f] border border-[#8b7355] rounded p-2">
        <div className="flex justify-between text-xs text-[#a09080] mb-1">
          <span>Dungeon Progress</span>
          <span className="text-[#e0d4b8]">
            {progress.totalFloorsCleared}/{MAX_DUNGEON_FLOOR} Floors
          </span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-700 to-amber-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {progress.allFloorsCleared && (
          <div className="text-xs text-amber-400 text-center mt-1">
            All floors conquered!
          </div>
        )}
      </div>

      {/* Equipment summary */}
      <div className="bg-[#2d1f0f] border border-[#8b7355] rounded p-2 text-xs font-mono">
        <div className="text-[#a09080] uppercase tracking-wide mb-1">
          Your Equipment
        </div>
        <div className="flex gap-3 text-[#e0d4b8]">
          <span className="text-red-400">
            ⚔ ATK: {combatStats.attack}
          </span>
          <span className="text-blue-400">
            🛡 DEF: {combatStats.defense}
          </span>
          {combatStats.blockChance > 0 && (
            <span className="text-yellow-400">
              BLK: {Math.round(combatStats.blockChance * 100)}%
            </span>
          )}
        </div>
        {combatStats.attack === 0 && (
          <div className="text-[#8b7355] mt-1">
            Tip: Equip gear at the Armory before entering the dungeon!
          </div>
        )}
      </div>

      {/* Education bonuses */}
      {hasAnyBonus && (
        <div className="bg-[#1a1a2e] border border-[#4a4a7a] rounded p-2 text-xs">
          <div className="text-[#8888cc] uppercase tracking-wide mb-1 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Education Bonuses
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[#aaaadd]">
            {eduBonuses.canDisarmTraps && <span>✓ Trap Sense</span>}
            {eduBonuses.canDamageEthereal && <span>✓ Arcane Sight</span>}
            {eduBonuses.damageReduction > 0 && (
              <span>
                ✓ -{Math.round(eduBonuses.damageReduction * 100)}% dmg
              </span>
            )}
            {eduBonuses.attackBonus > 0 && (
              <span>
                ✓ +{Math.round(eduBonuses.attackBonus * 100)}% ATK
              </span>
            )}
            {eduBonuses.goldBonus > 0 && (
              <span>
                ✓ +{Math.round(eduBonuses.goldBonus * 100)}% gold
              </span>
            )}
            {eduBonuses.healingPotionChance > 0 && (
              <span>
                ✓ {Math.round(eduBonuses.healingPotionChance * 100)}%
                potion
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dungeon Leaderboard */}
      {Object.keys(dungeonRecords).length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#4a4a7a] rounded">
          <button
            className="w-full flex items-center gap-2 p-2 text-left hover:bg-white/5 transition-colors"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
          >
            {showLeaderboard ? (
              <ChevronDown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            )}
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-400 font-display">Dungeon Records</span>
          </button>
          {showLeaderboard && (
            <div className="px-2 pb-2 space-y-1">
              {DUNGEON_FLOORS.map(floor => {
                const record = dungeonRecords[floor.id];
                if (!record) return null;
                return (
                  <div key={floor.id} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[#8b7355] w-5">F{floor.id}</span>
                    <span className="text-[#e0d4b8] flex-1 truncate">{floor.name}</span>
                    <span className="text-[#c9a227]" title="Best gold in single run">
                      <Star className="w-3 h-3 inline" /> {record.bestGold}g
                    </span>
                    <span className="text-[#a09080]" title="Total runs">
                      {record.runs}x
                    </span>
                    <span className="text-[#a09080]" title="Total gold earned">
                      ({record.totalGold}g total)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floor selection */}
      <div className="space-y-1.5">
        {DUNGEON_FLOORS.map((floor) => {
          const status = getFloorStatus(
            floor,
            player.dungeonFloorsCleared,
          );
          const isExpanded = expandedFloor === floor.id;
          const reqCheck = checkFloorRequirements(
            floor,
            player.dungeonFloorsCleared,
            player.equippedWeapon,
            player.equippedArmor,
            combatStats,
            player.completedDegrees,
          );
          const totalTimeCost = getFloorTimeCost(floor, combatStats);
          const encounterTime = getEncounterTimeCost(floor, combatStats);
          const canAttempt =
            status !== 'locked' &&
            reqCheck.canEnter &&
            player.timeRemaining >= encounterTime &&
            player.health > 10 &&
            attemptsRemaining > 0;

          const borderColor =
            status === 'cleared'
              ? 'border-l-green-600'
              : status === 'available'
                ? reqCheck.canEnter
                  ? 'border-l-amber-500'
                  : 'border-l-red-800'
                : 'border-l-gray-700';

          const bgColor =
            status === 'cleared'
              ? 'bg-green-950/30'
              : status === 'locked'
                ? 'bg-gray-950/30'
                : 'bg-[#2d1f0f]';

          // Floor 6 gets a special golden glow
          const isUltraEndgame = floor.id === 6;

          return (
            <div
              key={floor.id}
              className={`border border-[#8b7355] ${borderColor} border-l-4 rounded ${bgColor} ${isUltraEndgame ? 'ring-1 ring-amber-500/30' : ''}`}
            >
              {/* Floor header — clickable */}
              <button
                className="w-full flex items-center gap-2 p-2 text-left hover:bg-white/5 transition-colors"
                onClick={() =>
                  setExpandedFloor(isExpanded ? null : floor.id)
                }
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#8b7355] flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#8b7355] flex-shrink-0" />
                )}
                <span className={`text-xs font-mono w-5 ${isUltraEndgame ? 'text-amber-400' : 'text-[#8b7355]'}`}>
                  F{floor.id}
                </span>
                <span className={`text-sm flex-1 truncate ${isUltraEndgame ? 'text-amber-300 font-display' : 'text-[#e0d4b8]'}`}>
                  {floor.name}
                </span>

                {/* Status icon */}
                {status === 'cleared' && (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                {status === 'available' && reqCheck.canEnter && (
                  <span className="text-amber-400 text-sm flex-shrink-0">
                    ⚔
                  </span>
                )}
                {status === 'available' && !reqCheck.canEnter && (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                {status === 'locked' && (
                  <Lock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-[#8b7355]/30">
                  <p className="text-xs text-[#a09080] mt-2 italic">
                    {floor.description}
                  </p>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono">
                    <span className="text-[#a09080] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {encounterTime}h/encounter ({totalTimeCost}h total)
                    </span>
                    <span className="text-[#c9a227]">
                      💰 {floor.goldRange[0]}-{floor.goldRange[1]}g
                    </span>
                    <span className="text-red-400 flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {floor.healthRisk[0]}
                      -{floor.healthRisk[1]} dmg
                    </span>
                  </div>

                  {/* Boss info */}
                  <div className="text-xs flex items-center gap-1.5">
                    <Skull className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-red-300">
                      Boss: {floor.boss.name}
                    </span>
                    <span className="text-[#8b7355]">
                      (Power {floor.boss.basePower})
                    </span>
                  </div>

                  {/* Rare drop hint */}
                  <div className="text-xs text-[#8b7355]">
                    ✦ Rare Drop:{' '}
                    {player.dungeonFloorsCleared.includes(floor.id)
                      ? floor.rareDrop.name
                      : '???'}{' '}
                    (5%)
                  </div>

                  {/* Re-run mini-boss hint */}
                  {player.dungeonFloorsCleared.includes(floor.id) && (
                    <div className="text-xs text-amber-600">
                      ★ 15% chance of wandering mini-boss on re-runs
                    </div>
                  )}

                  {/* Dungeon modifier info */}
                  <div className="text-xs text-[#8b7355]">
                    ⚡ Random modifier may apply (60% chance per run)
                  </div>

                  {/* Requirements check */}
                  {status === 'available' && (
                    <div className="space-y-0.5">
                      {reqCheck.canEnter ? (
                        <div className="text-xs text-green-400">
                          ✓ All requirements met
                        </div>
                      ) : (
                        reqCheck.reasons.map((reason, i) => (
                          <div key={i} className="text-xs text-red-400">
                            ✗ {reason}
                          </div>
                        ))
                      )}
                      {floor.requirements.recommendedDegrees.length >
                        0 && (
                        <div className="text-xs text-[#8b7355]">
                          Recommended:{' '}
                          {floor.requirements.recommendedDegrees
                            .map(
                              (d) =>
                                DEGREE_NAMES[d] || d,
                            )
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cleared badge */}
                  {status === 'cleared' && (
                    <div className="text-xs text-green-400">
                      ✓ Floor cleared! Run again for gold.
                    </div>
                  )}

                  {/* Personal best */}
                  {dungeonRecords[floor.id] && (
                    <div className="text-xs text-[#c9a227] flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Best: {dungeonRecords[floor.id].bestGold}g | Runs: {dungeonRecords[floor.id].runs} | Total: {dungeonRecords[floor.id].totalGold}g
                    </div>
                  )}

                  {/* Enter / Re-enter button */}
                  {status !== 'locked' && (
                    <button
                      className={
                        'w-full py-1.5 px-3 text-sm font-display rounded ' +
                        'bg-gradient-to-r from-amber-800 to-amber-700 ' +
                        'hover:from-amber-700 hover:to-amber-600 ' +
                        'disabled:opacity-40 disabled:cursor-not-allowed ' +
                        'text-[#e0d4b8] border border-amber-600/50 transition-all'
                      }
                      disabled={!canAttempt}
                      onClick={() => handleEnterFloor(floor)}
                    >
                      {canAttempt
                        ? status === 'cleared'
                          ? `Re-enter Floor ${floor.id}`
                          : `Enter Floor ${floor.id}`
                        : attemptsRemaining <= 0
                          ? 'Too fatigued (max attempts)'
                          : !reqCheck.canEnter
                            ? 'Requirements not met'
                            : player.timeRemaining < encounterTime
                              ? 'Not enough time'
                              : 'Too injured'}
                    </button>
                  )}

                  {/* Locked message */}
                  {status === 'locked' && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      Clear Floor{' '}
                      {floor.requirements.previousFloorCleared} to
                      unlock
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rest in Cave */}
      <div className="pt-2 border-t border-[#8b7355]/30">
        <ActionButton
          label="Rest in the Cave"
          cost={0}
          time={8}
          disabled={
            player.timeRemaining < 8 ||
            player.health >= player.maxHealth
          }
          onClick={() => {
            spendTime(player.id, 8);
            const healAmount = Math.min(
              15,
              player.maxHealth - player.health,
            );
            modifyHealth(player.id, healAmount);
            modifyHappiness(player.id, 1);
            toast.success(
              `You rested and recovered ${healAmount} health.`,
            );
          }}
        />
      </div>
    </div>
  );
}
