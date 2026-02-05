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
} from 'lucide-react';
import { ActionButton } from './ActionButton';
import { toast } from 'sonner';
import { calculateCombatStats } from '@/data/items';
import {
  DUNGEON_FLOORS,
  checkFloorRequirements,
  getDungeonProgress,
  calculateEducationBonuses,
  generateFloorEncounters,
  getFloorTimeCost,
  type DungeonFloor,
} from '@/data/dungeon';

interface CavePanelProps {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  modifyGold: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  clearDungeonFloor: (playerId: string, floorId: number) => void;
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

// ─── Auto-resolve a floor run ────────────────────────────────────

function resolveFloorRun(
  floor: DungeonFloor,
  combatStats: { attack: number; defense: number; blockChance: number },
  eduBonuses: ReturnType<typeof calculateEducationBonuses>,
  playerHealth: number,
) {
  const encounters = generateFloorEncounters(floor);
  let goldEarned = 0;
  let damageTaken = 0;
  let healed = 0;
  let currentHealth = playerHealth;
  let bossDefeated = false;
  const log: string[] = [];

  const attackPower = combatStats.attack * (1 + eduBonuses.attackBonus);

  for (const enc of encounters) {
    if (currentHealth <= 0) {
      log.push('Too injured — retreated!');
      break;
    }

    switch (enc.type) {
      case 'treasure': {
        const g = Math.floor(
          enc.baseGold * (1 + eduBonuses.goldBonus),
        );
        goldEarned += g;
        log.push(`${enc.name}: +${g}g`);
        break;
      }
      case 'healing': {
        const h = Math.abs(enc.baseDamage);
        healed += h;
        currentHealth = Math.min(playerHealth, currentHealth + h);
        log.push(`${enc.name}: +${h} HP`);
        break;
      }
      case 'trap': {
        if (enc.isDisarmable && eduBonuses.canDisarmTraps) {
          log.push(`${enc.name}: Disarmed!`);
        } else {
          let d = Math.floor(
            enc.baseDamage * (1 - eduBonuses.damageReduction),
          );
          d = Math.max(1, d);
          damageTaken += d;
          currentHealth -= d;
          log.push(`${enc.name}: -${d} HP`);
        }
        break;
      }
      case 'combat':
      case 'boss': {
        let effAtk = attackPower;
        if (enc.requiresArcane && !eduBonuses.canDamageEthereal) {
          effAtk *= 0.3;
        }

        const playerPower = effAtk + combatStats.defense * 0.5;
        const ratio = playerPower / Math.max(1, enc.basePower);

        // Damage: inversely proportional to power ratio
        let d = Math.floor(
          enc.baseDamage * Math.max(0.3, 1 - ratio * 0.5),
        );
        d = Math.floor(d * (1 - eduBonuses.damageReduction));
        if (
          combatStats.blockChance > 0 &&
          Math.random() < combatStats.blockChance
        ) {
          d = Math.floor(d * 0.5);
        }
        d = Math.max(1, d);

        // Gold: proportional to power ratio (capped at 1.5x)
        const g = Math.floor(
          enc.baseGold *
            (1 + eduBonuses.goldBonus) *
            Math.min(1.5, ratio),
        );

        damageTaken += d;
        goldEarned += g;
        currentHealth -= d;

        if (enc.type === 'boss') {
          bossDefeated = currentHealth > 0;
          log.push(
            bossDefeated
              ? `BOSS ${enc.name}: Defeated! (-${d} HP, +${g}g)`
              : `BOSS ${enc.name}: You fell! (-${d} HP)`,
          );
        } else {
          log.push(`${enc.name}: -${d} HP, +${g}g`);
        }
        break;
      }
    }

    // Healing potion chance from Alchemy
    if (
      eduBonuses.healingPotionChance > 0 &&
      Math.random() < eduBonuses.healingPotionChance
    ) {
      healed += 15;
      currentHealth += 15;
      log.push('Found Healing Potion: +15 HP');
    }
  }

  return { success: bossDefeated, goldEarned, damageTaken, healed, log };
}

// ─── Main component ──────────────────────────────────────────────

export function CavePanel({
  player,
  spendTime,
  modifyGold,
  modifyHealth,
  modifyHappiness,
  clearDungeonFloor,
}: CavePanelProps) {
  const [expandedFloor, setExpandedFloor] = useState<number | null>(null);

  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
  );
  const eduBonuses = calculateEducationBonuses(player.completedDegrees);
  const progress = getDungeonProgress(player.dungeonFloorsCleared);
  const progressPct = (progress.totalFloorsCleared / 5) * 100;

  const hasAnyBonus =
    eduBonuses.canDisarmTraps ||
    eduBonuses.canDamageEthereal ||
    eduBonuses.damageReduction > 0 ||
    eduBonuses.attackBonus > 0 ||
    eduBonuses.goldBonus > 0 ||
    eduBonuses.healingPotionChance > 0;

  // ─── Enter floor handler ─────────────────────────────────────

  const handleEnterFloor = (floor: DungeonFloor) => {
    const timeCost = getFloorTimeCost(floor, combatStats);
    spendTime(player.id, timeCost);

    const result = resolveFloorRun(
      floor,
      combatStats,
      eduBonuses,
      player.health,
    );

    // Apply gold earned
    if (result.goldEarned > 0) modifyGold(player.id, result.goldEarned);

    // Apply net damage (damage - healing)
    const netDamage = result.damageTaken - result.healed;
    if (netDamage !== 0) modifyHealth(player.id, -netDamage);

    const isFirstClear =
      result.success && !player.dungeonFloorsCleared.includes(floor.id);

    if (result.success) {
      if (isFirstClear) {
        clearDungeonFloor(player.id, floor.id);
        modifyHappiness(player.id, floor.happinessOnClear);
      }

      // Rare drop check (only on first clear)
      if (isFirstClear && Math.random() < floor.rareDrop.dropChance) {
        toast.success(
          `RARE DROP: ${floor.rareDrop.name}! ${floor.rareDrop.description}`,
          { duration: 6000 },
        );
      }

      toast.success(
        `Floor ${floor.id}: ${floor.name} — ${isFirstClear ? 'CLEARED!' : 'Completed!'} ` +
          `+${result.goldEarned}g, -${result.damageTaken} HP` +
          (isFirstClear ? `, +${floor.happinessOnClear} happiness` : ''),
        { duration: 5000 },
      );
    } else {
      modifyHappiness(player.id, -2);
      toast.error(
        `Floor ${floor.id}: ${floor.name} — Retreated! ` +
          `+${result.goldEarned}g, -${result.damageTaken} HP`,
        { duration: 5000 },
      );
    }
  };

  // ─── Render ──────────────────────────────────────────────────

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

      {/* Progress bar */}
      <div className="bg-[#2d1f0f] border border-[#8b7355] rounded p-2">
        <div className="flex justify-between text-xs text-[#a09080] mb-1">
          <span>Dungeon Progress</span>
          <span className="text-[#e0d4b8]">
            {progress.totalFloorsCleared}/5 Floors
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
          );
          const timeCost = getFloorTimeCost(floor, combatStats);
          const canAttempt =
            status !== 'locked' &&
            reqCheck.canEnter &&
            player.timeRemaining >= timeCost &&
            player.health > 10;

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

          return (
            <div
              key={floor.id}
              className={`border border-[#8b7355] ${borderColor} border-l-4 rounded ${bgColor}`}
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
                <span className="text-xs font-mono text-[#8b7355] w-5">
                  F{floor.id}
                </span>
                <span className="text-sm text-[#e0d4b8] flex-1 truncate">
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
                      <Clock className="w-3 h-3" /> {timeCost} hrs
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
                        : !reqCheck.canEnter
                          ? 'Requirements not met'
                          : player.timeRemaining < timeCost
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
