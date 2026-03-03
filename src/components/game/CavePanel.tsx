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
import { getHexById } from '@/data/hexes';
import { useTranslation } from '@/i18n';
import { calculateCombatStats, getDurabilityCondition, MAX_DURABILITY, getItem, ARMORY_ITEMS } from '@/data/items';
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
import type { EquipmentDurabilityLoss } from '@/data/combatResolver';

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

// ─── Durability indicator (reusable for weapon/armor/shield) ────

function DurabilityIndicator({ itemId, icon, durabilityMap }: {
  itemId: string | null;
  icon: string;
  durabilityMap: Record<string, number> | undefined;
}) {
  if (!itemId) return null;
  const dur = durabilityMap?.[itemId] ?? MAX_DURABILITY;
  const cond = getDurabilityCondition(dur);
  const color = cond === 'broken' ? 'text-red-500' : cond === 'poor' ? 'text-red-400' : cond === 'worn' ? 'text-amber-400' : 'text-green-400';
  return <span className={color}>{icon} {dur}%</span>;
}

// ─── Equipment repair warning ───────────────────────────────────

function RepairWarning({ equippedItems, durabilityMap }: {
  equippedItems: (string | null)[];
  durabilityMap: Record<string, number> | undefined;
}) {
  const items = equippedItems.filter(Boolean) as string[];
  if (items.length === 0) return null;
  const hasBroken = items.some(id => (durabilityMap?.[id] ?? MAX_DURABILITY) <= 0);
  const hasPoor = items.some(id => {
    const dur = durabilityMap?.[id] ?? MAX_DURABILITY;
    return dur > 0 && dur <= 25;
  });
  if (hasBroken) return <div className="text-red-400 mt-1">Equipment broken! Repair at the Forge.</div>;
  if (hasPoor) return <div className="text-amber-400 mt-1">Equipment wearing out. Visit the Forge soon.</div>;
  return null;
}

// ─── Combat result helpers ────────────────────────────────────────

/**
 * Returns a human-readable equipment wear summary string, or null if nothing degraded.
 * Pure function — no side effects.
 */
function formatEquipmentWear(loss: EquipmentDurabilityLoss): string | null {
  const parts: string[] = [];
  if (loss.weaponLoss > 0) parts.push(`Weapon -${loss.weaponLoss}`);
  if (loss.armorLoss > 0) parts.push(`Armor -${loss.armorLoss}`);
  if (loss.shieldLoss > 0) parts.push(`Shield -${loss.shieldLoss}`);
  return parts.length > 0 ? `Equipment wear: ${parts.join(', ')} durability` : null;
}

/**
 * Fires the appropriate toast for a completed combat run.
 * Pure side-effect helper — only shows notifications, mutates no state.
 */
function showCombatOutcomeToast(result: CombatRunResult, floor: DungeonFloor): void {
  if (result.success) {
    const firstClearBonus = result.isFirstClear
      ? `, +${floor.happinessOnClear} happiness, +${floor.dependabilityOnClear} dep`
      : '';
    toast.success(
      `Floor ${floor.id}: ${floor.name} — ${result.isFirstClear ? 'CLEARED!' : 'Completed!'} ` +
        `+${result.goldEarned}g, -${result.totalDamage} HP` + firstClearBonus,
      { duration: 5000 },
    );
  } else if (result.retreated) {
    toast(`Floor ${floor.id}: ${floor.name} — Retreated. +${result.goldEarned}g`, { duration: 4000 });
  } else {
    toast.error(
      `Floor ${floor.id}: ${floor.name} — Defeated! +${result.goldEarned}g, -${result.totalDamage} HP`,
      { duration: 5000 },
    );
  }
}

// ─── Floor card (expanded details + enter button) ───────────────

interface FloorCardProps {
  floor: DungeonFloor;
  player: Player;
  combatStats: ReturnType<typeof calculateCombatStats>;
  attemptsRemaining: number;
  dungeonRecords: Record<number, { bestGold: number; runs: number; totalGold: number }>;
  expandedFloor: number | null;
  setExpandedFloor: (id: number | null) => void;
  onEnterFloor: (floor: DungeonFloor) => void;
}

function FloorCard({
  floor, player, combatStats, attemptsRemaining,
  dungeonRecords, expandedFloor, setExpandedFloor, onEnterFloor,
}: FloorCardProps) {
  const status = getFloorStatus(floor, player.dungeonFloorsCleared);
  const isExpanded = expandedFloor === floor.id;
  const reqCheck = checkFloorRequirements(
    floor, player.dungeonFloorsCleared,
    player.equippedWeapon, player.equippedArmor,
    combatStats, player.completedDegrees,
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
      ? 'bg-green-950'
      : status === 'locked'
        ? 'bg-gray-900'
        : 'bg-[#2d1f0f]';

  const isUltraEndgame = floor.id === 6;

  return (
    <div
      className={`border border-[#8b7355] ${borderColor} border-l-4 rounded ${bgColor} ${isUltraEndgame ? 'ring-1 ring-amber-500/30' : ''}`}
    >
      {/* Floor header — clickable */}
      <button
        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpandedFloor(isExpanded ? null : floor.id)}
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
          <span className="text-amber-400 text-sm flex-shrink-0">⚔</span>
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
          <p className="text-sm text-[#a09080] mt-2 italic">{floor.description}</p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-mono">
            <span className="text-[#a09080] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {encounterTime}h/enc ({totalTimeCost}h total)
            </span>
            <span className="text-[#c9a227]">
              💰 {floor.goldRange[0]}-{floor.goldRange[1]}g
            </span>
            <span className="text-red-400 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> {floor.healthRisk[0]}-{floor.healthRisk[1]} dmg
            </span>
          </div>

          {/* Boss info */}
          <div className="text-sm flex items-center gap-1.5">
            <Skull className="w-4 h-4 text-red-600" />
            <span className="text-red-300">Boss: {floor.boss.name}</span>
            <span className="text-[#8b7355]">(Power {floor.boss.basePower})</span>
          </div>

          {/* Rare drop hint */}
          <div className="text-sm text-[#8b7355]">
            ✦ Rare Drop:{' '}
            {player.dungeonFloorsCleared.includes(floor.id) ? floor.rareDrop.name : '???'} (5%)
          </div>

          {/* Re-run mini-boss hint */}
          {player.dungeonFloorsCleared.includes(floor.id) && (
            <div className="text-sm text-amber-600">
              ★ 15% chance of wandering mini-boss on re-runs
            </div>
          )}

          {/* Dungeon modifier info */}
          <div className="text-sm text-[#8b7355]">
            ⚡ Random modifier may apply (60% chance per run)
          </div>

          {/* Requirements check */}
          {status === 'available' && (
            <div className="space-y-0.5">
              {reqCheck.canEnter ? (
                <div className="text-sm text-green-400">✓ All requirements met</div>
              ) : (
                reqCheck.reasons.map((reason, i) => (
                  <div key={i} className="text-sm text-red-400">✗ {reason}</div>
                ))
              )}
              {floor.requirements.recommendedDegrees.length > 0 && (
                <div className="text-sm text-[#8b7355]">
                  Recommended:{' '}
                  {floor.requirements.recommendedDegrees
                    .map((d) => DEGREE_NAMES[d] || d)
                    .join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Cleared badge */}
          {status === 'cleared' && (
            <div className="text-sm text-green-400">✓ Floor cleared! Run again for gold.</div>
          )}

          {/* Personal best */}
          {dungeonRecords[floor.id] && (
            <div className="text-sm text-[#c9a227] flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
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
              onClick={() => onEnterFloor(floor)}
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
              Clear Floor {floor.requirements.previousFloorCleared} to unlock
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── E4: Post-combat loot summary panel ─────────────────────────

interface CombatResultPanelProps {
  result: CombatRunResult;
  floor: DungeonFloor;
  onDismiss: () => void;
}

function CombatResultPanel({ result, floor, onDismiss }: CombatResultPanelProps) {
  const outcomeLabel = result.success
    ? result.isFirstClear ? 'Floor Cleared!' : 'Run Complete!'
    : result.retreated ? 'Retreated' : 'Defeated!';

  const wearMessage = formatEquipmentWear(result.durabilityLoss);

  return (
    <div className="space-y-3 bg-[#1a110a] rounded p-3">
      <h4 className="font-display text-lg text-[#c9b888] flex items-center gap-2">
        {result.success ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : result.retreated ? (
          <span className="text-xl">🏃</span>
        ) : (
          <Skull className="w-5 h-5 text-red-500" />
        )}
        {outcomeLabel}
      </h4>

      <div className="bg-[#2d1f0f] border border-[#8b7355] rounded p-3 space-y-1.5 text-sm font-mono">
        <div className="text-[#a09080] italic mb-1">{floor.name}</div>

        <div className="flex justify-between">
          <span className="text-[#a09080]">Gold earned:</span>
          <span className="text-[#c9a227]">+{result.goldEarned}g</span>
        </div>

        {result.totalDamage > 0 && (
          <div className="flex justify-between">
            <span className="text-[#a09080]">Damage taken:</span>
            <span className="text-red-400">-{result.totalDamage} HP</span>
          </div>
        )}

        {result.happinessChange !== 0 && (
          <div className="flex justify-between">
            <span className="text-[#a09080]">Happiness:</span>
            <span className={result.happinessChange > 0 ? 'text-green-400' : 'text-red-400'}>
              {result.happinessChange > 0 ? '+' : ''}{result.happinessChange}
            </span>
          </div>
        )}

        {wearMessage && (
          <div className="text-amber-400 pt-1 border-t border-[#8b7355]/20">
            {wearMessage}
          </div>
        )}

        {result.isFirstClear && (
          <div className="text-green-400 pt-1 border-t border-[#8b7355]/20">
            ✓ First clear! +{floor.happinessOnClear} hap · +{floor.dependabilityOnClear} dep
          </div>
        )}

        {result.rareDropName && (
          <div className="text-amber-300 font-display pt-1 border-t border-[#8b7355]/20">
            ✦ RARE DROP: {result.rareDropName}!
          </div>
        )}

        {result.hexScrollDropId && (
          <div className="text-purple-300 font-display">
            📜 Dark Scroll dropped!
          </div>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="w-full py-2 px-3 text-sm font-display rounded bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-[#e0d4b8] border border-amber-600/50 transition-all"
      >
        Continue
      </button>
    </div>
  );
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
  const { t } = useTranslation();
  const [expandedFloor, setExpandedFloor] = useState<number | null>(null);
  const [activeFloor, setActiveFloor] = useState<DungeonFloor | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // E4: post-combat result summary
  const [combatResult, setCombatResult] = useState<{ result: CombatRunResult; floor: DungeonFloor } | null>(null);

  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
    player.temperedItems,
    player.equipmentDurability,
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

  // ─── E3: Auto-equip best owned gear ─────────────────────────

  const handleAutoEquip = () => {
    const { equipItem } = useGameStore.getState();
    const ownedOfSlot = (slot: 'weapon' | 'armor' | 'shield') =>
      ARMORY_ITEMS.filter(i => i.equipSlot === slot && (player.durables[i.id] || 0) > 0);

    const bestWeapon = ownedOfSlot('weapon').sort((a, b) => (b.equipStats?.attack ?? 0) - (a.equipStats?.attack ?? 0))[0];
    const bestArmor = ownedOfSlot('armor').sort((a, b) => (b.equipStats?.defense ?? 0) - (a.equipStats?.defense ?? 0))[0];
    const bestShield = ownedOfSlot('shield').sort((a, b) => (b.equipStats?.defense ?? 0) - (a.equipStats?.defense ?? 0))[0];

    let equipped = 0;
    if (bestWeapon) { equipItem(player.id, bestWeapon.id, 'weapon'); equipped++; }
    if (bestArmor) { equipItem(player.id, bestArmor.id, 'armor'); equipped++; }
    if (bestShield) { equipItem(player.id, bestShield.id, 'shield'); equipped++; }

    if (equipped > 0) toast.success('Auto-equipped best available gear!');
    else toast('No gear to equip — buy weapons and armor at the Armory first.');
  };

  // ─── Enter floor — switch to combat view ───────────────────

  const handleEnterFloor = (floor: DungeonFloor) => {
    if (attemptsRemaining <= 0) {
      toast.error('You are too fatigued for another dungeon run this week.');
      return;
    }
    // Only charge for the first encounter's time on entry (rest charged per encounter)
    const encounterTime = getEncounterTimeCost(floor, combatStats);
    spendTime(player.id, encounterTime);
    // M31 FIX: Use proper store action instead of direct setState
    const { incrementDungeonAttempts } = useGameStore.getState();
    incrementDungeonAttempts(player.id);
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
    const { applyDurabilityLoss, checkDeath, updatePlayerDungeonRecord } = useGameStore.getState();

    // Gold
    if (result.goldEarned > 0) modifyGold(player.id, result.goldEarned);

    // Equipment durability
    applyDurabilityLoss(player.id, result.durabilityLoss);
    const wearMessage = formatEquipmentWear(result.durabilityLoss);
    if (wearMessage) toast(wearMessage, { duration: 3000 });

    // Health was applied per-encounter; do a final death check in case something was missed
    checkDeath(player.id);

    // Happiness
    if (result.happinessChange !== 0) modifyHappiness(player.id, result.happinessChange);

    // First-clear reward
    if (result.isFirstClear) clearDungeonFloor(player.id, activeFloor.id);

    // Rare drop
    if (result.rareDropName) {
      applyRareDrop(player.id, activeFloor.rareDrop.id);
      toast.success(`RARE DROP: ${result.rareDropName}! ${activeFloor.rareDrop.description}`, { duration: 6000 });
    }

    // Hex scroll drop (if hexes enabled and boss dropped one)
    if (result.hexScrollDropId) {
      const { addHexScrollToPlayer } = useGameStore.getState();
      addHexScrollToPlayer(player.id, result.hexScrollDropId);
      const hexDef = getHexById(result.hexScrollDropId);
      toast.success(
        `DARK SCROLL: ${hexDef?.name || 'Unknown Hex'}! A forbidden scroll materializes from the darkness.`,
        { duration: 6000 },
      );
    }

    // M31 FIX: Use proper store action instead of direct setState
    // E2: pass week and cleared for run history tracking
    const currentWeek = useGameStore.getState().week;
    updatePlayerDungeonRecord(player.id, activeFloor.id, result.goldEarned, result.encountersCompleted, currentWeek, result.success);

    // E4: Show detailed result panel instead of just a toast
    setCombatResult({ result, floor: activeFloor });
    setActiveFloor(null);
  };

  // ─── Cave access gating ────────────────────────────────────

  if (!hasCaveAccess) {
    return (
      <div className="space-y-3 bg-[#1a110a] rounded p-2">
        <div>
          <h4 className="font-display text-lg text-[#c9b888] flex items-center gap-2">
            <Lock className="w-5 h-5" /> {t('panelCave.dungeonFloors')}
          </h4>
          <p className="text-xs text-[#c9b888] mt-1">
            {t('panelCave.floorLocked')}
          </p>
        </div>
        <div className="bg-[#2d1f0f] border border-[#8b7355] rounded p-4 text-center">
          <Lock className="w-8 h-8 text-[#8b7355] mx-auto mb-2" />
          <p className="text-sm text-[#e0d4b8] font-display mb-2">
            {t('panelCave.floorLocked')}
          </p>
          <p className="text-xs text-[#a09080] mb-3">
            {t('panelCave.requiresEquipment')}
          </p>
          <p className="text-xs text-amber-400">
            {t('locations.academy')}
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

  // ─── E4: Post-combat result panel ──────────────────────────

  if (combatResult) {
    return (
      <CombatResultPanel
        result={combatResult.result}
        floor={combatResult.floor}
        onDismiss={() => setCombatResult(null)}
      />
    );
  }

  // ─── Floor selection view ──────────────────────────────────

  return (
    <div className="space-y-3 bg-[#1a110a] rounded p-2">
      {/* Header */}
      <div>
        <h4 className="font-display text-lg text-[#c9b888] flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> {t('panelCave.dungeonFloors')}
        </h4>
        <p className="text-sm text-[#c9b888] mt-1">
          {t('panelCave.enterDungeon')}
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
          <span>{t('panelCave.dungeonFloors')}</span>
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
            {t('panelCave.floorCleared')}
          </div>
        )}
      </div>

      {/* Equipment summary — E1: show item names + stats, E3: auto-equip button */}
      <div className="bg-[#2d1f0f] border border-[#8b7355] rounded p-2 text-sm font-mono">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#a09080] uppercase tracking-wide">
            {t('panelArmory.equipped')}
          </span>
          {/* E3: Auto-Equip Best button */}
          <button
            onClick={handleAutoEquip}
            className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            Auto-Equip Best
          </button>
        </div>

        {/* E1: Item names with individual stat contributions */}
        <div className="space-y-0.5">
          <div className="text-red-400 flex items-center justify-between">
            <span>
              ⚔ {player.equippedWeapon
                ? (getItem(player.equippedWeapon)?.name ?? player.equippedWeapon)
                : <span className="text-[#8b7355]">No weapon</span>}
            </span>
            {combatStats.attack > 0 && (
              <span className="text-[#a09080] text-xs">ATK {combatStats.attack}</span>
            )}
          </div>
          <div className="text-blue-400 flex items-center justify-between">
            <span>
              🛡 {player.equippedArmor
                ? (getItem(player.equippedArmor)?.name ?? player.equippedArmor)
                : <span className="text-[#8b7355]">No armor</span>}
            </span>
            {combatStats.defense > 0 && (
              <span className="text-[#a09080] text-xs">DEF {combatStats.defense}</span>
            )}
          </div>
          {(player.equippedShield || combatStats.blockChance > 0) && (
            <div className="text-yellow-400 flex items-center justify-between">
              <span>
                🔰 {player.equippedShield
                  ? (getItem(player.equippedShield)?.name ?? player.equippedShield)
                  : <span className="text-[#8b7355]">No shield</span>}
              </span>
              {combatStats.blockChance > 0 && (
                <span className="text-[#a09080] text-xs">BLK {Math.round(combatStats.blockChance * 100)}%</span>
              )}
            </div>
          )}
        </div>

        {/* Durability indicators */}
        {(player.equippedWeapon || player.equippedArmor || player.equippedShield) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[#a09080] text-xs">
            <DurabilityIndicator itemId={player.equippedWeapon} icon="⚔" durabilityMap={player.equipmentDurability} />
            <DurabilityIndicator itemId={player.equippedArmor} icon="🛡" durabilityMap={player.equipmentDurability} />
            <DurabilityIndicator itemId={player.equippedShield} icon="🔰" durabilityMap={player.equipmentDurability} />
          </div>
        )}
        {/* Repair warning */}
        <RepairWarning
          equippedItems={[player.equippedWeapon, player.equippedArmor, player.equippedShield]}
          durabilityMap={player.equipmentDurability}
        />
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
            <BookOpen className="w-3 h-3" /> {t('goals.education')}
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
            <span className="text-xs text-amber-400 font-display">{t('panelCave.dungeonFloors')}</span>
          </button>
          {showLeaderboard && (
            <div className="px-2 pb-2 space-y-2">
              {DUNGEON_FLOORS.map(floor => {
                const record = dungeonRecords[floor.id];
                if (!record) return null;
                const recentRuns = record.recentRuns ?? [];
                return (
                  <div key={floor.id}>
                    <div className="flex items-center gap-2 text-xs font-mono">
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
                    {/* E2: Show last 5 run history */}
                    {recentRuns.length > 0 && (
                      <div className="mt-0.5 ml-7 space-y-px">
                        {recentRuns.map((run, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono text-[#6b5a42]">
                            <span className={run.cleared ? 'text-green-500' : 'text-red-400'}>
                              {run.cleared ? '✓' : '✗'}
                            </span>
                            <span>W{run.week}</span>
                            <span className="text-[#c9a227]">{run.gold}g</span>
                            <span>{run.encounters} enc</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floor selection */}
      <div className="space-y-1.5">
        {DUNGEON_FLOORS.map((floor) => (
          <FloorCard
            key={floor.id}
            floor={floor}
            player={player}
            combatStats={combatStats}
            attemptsRemaining={attemptsRemaining}
            dungeonRecords={dungeonRecords}
            expandedFloor={expandedFloor}
            setExpandedFloor={setExpandedFloor}
            onEnterFloor={handleEnterFloor}
          />
        ))}
      </div>

      {/* Rest in Cave */}
      <div className="pt-2 border-t border-[#8b7355]/30">
        <ActionButton
          label={t('common.rest')}
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
