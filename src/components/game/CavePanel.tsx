import type { Player } from '@/types/game.types';
import { Sparkles } from 'lucide-react';
import { ActionButton } from './ActionButton';
import { toast } from 'sonner';
import { calculateCombatStats, getItem } from '@/data/items';

interface CavePanelProps {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  modifyGold: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
}

export function CavePanel({
  player,
  spendTime,
  modifyGold,
  modifyHealth,
  modifyHappiness,
}: CavePanelProps) {
  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
  );

  // Equipment affects exploration outcomes
  const hasWeapon = player.equippedWeapon !== null;
  const totalPower = combatStats.attack + combatStats.defense;

  return (
    <div className="space-y-4">
      <h4 className="font-display text-lg text-muted-foreground flex items-center gap-2">
        <Sparkles className="w-5 h-5" /> Mysterious Cave
      </h4>
      <p className="text-sm text-muted-foreground">
        A dark cave entrance beckons. Who knows what treasures... or dangers... await within?
      </p>

      {/* Equipment status */}
      <div className="bg-[#2d1f0f] border border-[#8b7355] rounded p-2 text-xs font-mono">
        <div className="text-[#a09080] uppercase tracking-wide mb-1">Your Equipment</div>
        <div className="flex gap-3 text-[#e0d4b8]">
          <span className="text-red-400">⚔ ATK: {combatStats.attack}</span>
          <span className="text-blue-400">🛡 DEF: {combatStats.defense}</span>
          {combatStats.blockChance > 0 && (
            <span className="text-yellow-400">BLK: {Math.round(combatStats.blockChance * 100)}%</span>
          )}
        </div>
        <div className="text-[#8b7355] mt-1">
          {!hasWeapon && 'Tip: Equip a weapon at the Armory for better cave outcomes!'}
          {hasWeapon && totalPower < 20 && 'Basic equipment. Upgrade at the Armory for tougher floors.'}
          {totalPower >= 20 && totalPower < 40 && 'Decent gear. You can handle Floor 1-2 encounters.'}
          {totalPower >= 40 && 'Well-equipped for dungeon exploration.'}
        </div>
      </div>

      <div className="space-y-2">
        <ActionButton
          label="Explore the Cave"
          cost={0}
          time={6}
          disabled={player.timeRemaining < 6}
          onClick={() => {
            spendTime(player.id, 6);
            // Equipment-adjusted exploration outcomes
            const roll = Math.random();
            const attackBonus = combatStats.attack;
            const defenseBonus = combatStats.defense;

            if (roll < 0.2 + (attackBonus * 0.002)) {
              // Found treasure! Better weapons = more gold found
              const baseGold = Math.floor(Math.random() * 25) + 10;
              const goldFound = baseGold + Math.floor(attackBonus * 0.5);
              modifyGold(player.id, goldFound);
              modifyHappiness(player.id, 3);
              toast.success(`You found ${goldFound} gold in the cave!`);
            } else if (roll < 0.35) {
              // Found a hidden spring
              modifyHealth(player.id, 10);
              modifyHappiness(player.id, 2);
              toast.success('You found a healing spring deep in the cave!');
            } else if (roll < 0.6) {
              // Got lost
              modifyHappiness(player.id, -3);
              toast.info('You wandered around but found nothing of interest.');
            } else {
              // Encountered danger - defense reduces damage
              const baseDamage = Math.floor(Math.random() * 15) + 8;
              const mitigated = Math.floor(defenseBonus * 0.4);
              const blocked = combatStats.blockChance > 0 && Math.random() < combatStats.blockChance;
              let finalDamage = Math.max(3, baseDamage - mitigated);
              if (blocked) finalDamage = Math.floor(finalDamage * 0.5);

              modifyHealth(player.id, -finalDamage);

              if (hasWeapon) {
                // Fight back — earn some gold even in combat
                const combatGold = Math.floor(attackBonus * 0.3);
                if (combatGold > 0) modifyGold(player.id, combatGold);
                modifyHappiness(player.id, -2);
                toast.warning(
                  `Creature encounter! Took ${finalDamage} dmg${blocked ? ' (blocked!)' : ''}, earned ${combatGold}g fighting back.`
                );
              } else {
                modifyHappiness(player.id, -5);
                toast.error(`A creature attacked you for ${finalDamage} damage! Equip a weapon to fight back.`);
              }
            }
          }}
        />
        <ActionButton
          label="Rest in the Cave"
          cost={0}
          time={8}
          disabled={player.timeRemaining < 8 || player.health >= player.maxHealth}
          onClick={() => {
            spendTime(player.id, 8);
            const healAmount = Math.min(15, player.maxHealth - player.health);
            modifyHealth(player.id, healAmount);
            modifyHappiness(player.id, 1);
            toast.success(`You rested and recovered ${healAmount} health.`);
          }}
        />
      </div>

      {/* Dungeon floors - coming soon teaser */}
      {player.dungeonFloorsCleared.length === 0 && (
        <div className="border border-dashed border-[#8b7355] rounded p-2 text-xs text-[#8b7355] text-center">
          Deeper dungeon floors coming soon... Equip gear to prepare!
        </div>
      )}
    </div>
  );
}
