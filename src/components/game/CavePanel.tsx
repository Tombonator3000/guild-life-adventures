import { useState } from 'react';
import type { Player } from '@/types/game.types';
import {
  Sparkles,
  Lock,
  CheckCircle,
  ChevronDown,
  ChevronRight,
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
import { useTranslation } from '@/i18n';
import { calculateCombatStats, getDurabilityCondition, MAX_DURABILITY, getItem, ARMORY_ITEMS } from '@/data/items';
import {
  DUNGEON_FLOORS,
  checkFloorRequirements,
  getDungeonProgress,
  calculateEducationBonuses,
  getEncounterTimeCost,
  MAX_FLOOR_ATTEMPTS_PER_TURN,
  MAX_DUNGEON_FLOOR,
  type DungeonFloor,
} from '@/data/dungeon';
import { CombatView, type CombatRunResult } from './CombatView';
import type { EquipmentDurabilityLoss } from '@/data/combatResolver';

interface CavePanelProps {
  player: Player;
}

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

export function CavePanel({ player }: CavePanelProps) {
  const { t } = useTranslation();
  const [expandedFloor, setExpandedFloor] = useState<number | null>(1);
  const [section, setSection] = useState<'explore' | 'equipment' | 'records'>('explore');
  const [activeFloor, setActiveFloor] = useState<DungeonFloor | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // E4: post-combat result summary
  const [combatResult, setCombatResult] = useState<{ result: CombatRunResult; floor: DungeonFloor } | null>(null);
  const activeSession = useGameStore(state => state.dungeonRuns[player.id]);
  const sessionFloor = activeSession ? DUNGEON_FLOORS.find(floor => floor.id === activeSession.floorId) ?? null : null;
  const currentFloor = activeFloor ?? sessionFloor;

  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
    player.temperedItems,
    player.equipmentDurability,
  );
  const eduBonuses = calculateEducationBonuses(player.completedDegrees);
  const progress = getDungeonProgress(player.dungeonFloorsCleared);

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
    setActiveFloor(floor);
    const result = useGameStore.getState().beginDungeonRun(player.id, floor.id);
    if (result && !result.success) {
      setActiveFloor(null);
      toast.error(result.message);
    }
  };

  // ─── Combat complete — the host has already settled all effects ──

  const handleCombatComplete = (result: CombatRunResult) => {
    const floor = currentFloor;
    if (!floor) return;
    const wearMessage = formatEquipmentWear(result.durabilityLoss);
    if (wearMessage) toast(wearMessage, { duration: 3000 });
    if (result.rareDropName) {
      toast.success(`RARE DROP: ${result.rareDropName}! ${floor.rareDrop.description}`, { duration: 6000 });
    }
    if (result.hexScrollDropId) {
      toast.success('DARK SCROLL: A forbidden scroll materializes from the darkness.', { duration: 6000 });
    }
    setCombatResult({ result, floor });
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

  if (currentFloor) {
    return (
      <CombatView
        player={player}
        floor={currentFloor}
        onComplete={handleCombatComplete}
        onCancel={() => setActiveFloor(null)}
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

  const selectedFloor = DUNGEON_FLOORS.find(f => f.id === expandedFloor) ?? DUNGEON_FLOORS[0];
  const requirements = checkFloorRequirements(selectedFloor, player.dungeonFloorsCleared, player.equippedWeapon, player.equippedArmor, combatStats, player.completedDegrees);
  const entryTime = getEncounterTimeCost(selectedFloor, combatStats);
  const reason = attemptsRemaining <= 0 ? 'No runs left this week.' : !requirements.canEnter ? requirements.reasons.join(' · ') : player.health <= 10 ? 'Recover above 10 HP before entering.' : player.timeRemaining < entryTime ? `You need ${entryTime} hours to enter.` : null;
  return <div className="cave-lobby">
    <nav className="cave-lobby-tabs" aria-label="Cave planning">
      {(['explore', 'equipment', 'records'] as const).map(tab => <button key={tab} aria-pressed={section === tab} onClick={() => setSection(tab)}>{tab === 'explore' ? 'Explore' : tab === 'equipment' ? 'Prepare gear' : 'Run records'}</button>)}
    </nav>
    {section === 'explore' && <>
      <p className="cave-progress"><strong>Choose your descent</strong><span>{attemptsRemaining} runs left · {progress.totalFloorsCleared}/{MAX_DUNGEON_FLOOR} cleared</span></p>
      <nav className="cave-floor-tabs" aria-label="Dungeon floors">{DUNGEON_FLOORS.map(f => <button key={f.id} aria-pressed={selectedFloor.id === f.id} onClick={() => setExpandedFloor(f.id)}>Floor {f.id}{player.dungeonFloorsCleared.includes(f.id) ? ' ✓' : getFloorStatus(f, player.dungeonFloorsCleared) === 'locked' ? ' · Locked' : ''}</button>)}</nav>
      <article className="material-card cave-plan">
        <h3>{selectedFloor.name}</h3><p>{selectedFloor.description}</p>
        <div className="cave-plan-numbers"><span><b>{entryTime} h</b> per encounter</span><span><b>{selectedFloor.goldRange[0]}–{selectedFloor.goldRange[1]} g</b> base reward range</span></div>
        <p>Four encounters end with <strong>{selectedFloor.boss.name}</strong>. Gear and education affect damage, rewards and time.</p>
        <p className="cave-hint">Retreat keeps 50% of earned gold and closes before the boss. Running out of time keeps all earned gold.</p>
        {reason && <p className="cave-entry-warning" role="status">{reason}</p>}
        <button className="gold-button" disabled={!!reason} onClick={() => handleEnterFloor(selectedFloor)}>Enter Floor {selectedFloor.id} · {entryTime}h</button>
      </article>
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
            const result = useGameStore.getState().performCaveRest(player.id);
            if (result && !result.success) {
              toast.error(result.message);
              return;
            }
            const healAmount = Math.min(15, player.maxHealth - player.health);
            toast.success(result?.message ?? `You rested and recovered ${healAmount} health.`);
          }}
        />
      </div>

    </>}
    {section === 'equipment' && <div className="space-y-2">      {/* Equipment summary — E1: show item names + stats, E3: auto-equip button */}
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

</div>}
    {section === 'records' && <div>      {/* Dungeon Leaderboard */}
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
                          <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono text-[#8b7355]">
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

{Object.keys(dungeonRecords).length === 0 && <p className="material-card">Your completed runs will appear here.</p>}</div>}
  </div>;
}
