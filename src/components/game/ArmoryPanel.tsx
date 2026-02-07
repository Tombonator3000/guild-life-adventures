import type { Player, EquipmentSlot } from '@/types/game.types';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
} from './JonesStylePanel';
import { WorkSection } from './WorkSection';
import { ARMORY_ITEMS, getItemPrice, calculateCombatStats, getItem } from '@/data/items';
import { toast } from 'sonner';

export type ArmorySection = 'clothing' | 'weapons' | 'armor' | 'shields';

interface ArmoryPanelProps {
  player: Player;
  priceModifier: number;
  modifyGold: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyClothing: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
  buyDurable: (playerId: string, itemId: string, cost: number) => void;
  equipItem: (playerId: string, itemId: string, slot: EquipmentSlot) => void;
  unequipItem: (playerId: string, slot: EquipmentSlot) => void;
  section?: ArmorySection;
}

export function ArmoryPanel({
  player,
  priceModifier,
  modifyGold,
  spendTime,
  modifyClothing,
  modifyHappiness,
  workShift,
  buyDurable,
  equipItem,
  unequipItem,
  section,
}: ArmoryPanelProps) {
  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
  );

  // In tabbed mode, use dark text on light parchment background
  const darkText = !!section;
  const largeText = !!section;

  const clothingItems = ARMORY_ITEMS.filter(item => item.effect?.type === 'clothing');
  const weaponItems = ARMORY_ITEMS.filter(item => item.equipSlot === 'weapon');
  const armorItems = ARMORY_ITEMS.filter(item => item.equipSlot === 'armor');
  const shieldItems = ARMORY_ITEMS.filter(item => item.equipSlot === 'shield');

  const canPurchaseEquipment = (item: typeof ARMORY_ITEMS[0]) => {
    if (item.requiresFloorCleared && !player.dungeonFloorsCleared.includes(item.requiresFloorCleared)) {
      return false;
    }
    return true;
  };

  const renderEquipSection = (
    title: string,
    items: typeof ARMORY_ITEMS,
    slot: EquipmentSlot,
    equippedId: string | null,
    showHeader = true,
  ) => (
    <>
      {showHeader && <JonesSectionHeader title={title} />}
      {items.map(item => {
        const price = getItemPrice(item, priceModifier);
        const owns = (player.durables[item.id] || 0) > 0;
        const isEquipped = equippedId === item.id;
        const canAfford = player.gold >= price && player.timeRemaining >= 1;
        const meetsFloorReq = canPurchaseEquipment(item);
        const stats = item.equipStats;

        // Build stat label
        const statParts: string[] = [];
        if (stats?.attack) statParts.push(`+${stats.attack} ATK`);
        if (stats?.defense) statParts.push(`+${stats.defense} DEF`);
        if (stats?.blockChance) statParts.push(`${Math.round(stats.blockChance * 100)}% BLK`);
        const statLabel = statParts.join(', ');

        const textSize = largeText ? 'text-base' : 'text-sm';
        const textColor = darkText ? 'text-[#3d2a14]' : 'text-[#8b7355]';
        const hoverBg = darkText ? 'hover:bg-[#d4c4a8]' : 'hover:bg-[#5c4a32]';

        if (!meetsFloorReq) {
          return (
            <div key={item.id} className="py-1 px-2 opacity-40">
              <div className={`font-mono ${textSize} ${textColor}`}>
                🔒 {item.name} ({statLabel}) — Floor {item.requiresFloorCleared} required
              </div>
            </div>
          );
        }

        return (
          <div key={item.id} className="py-0.5 px-1">
            {owns ? (
              <button
                onClick={() => {
                  if (isEquipped) {
                    unequipItem(player.id, slot);
                    toast.info(`Unequipped ${item.name}`);
                  } else {
                    equipItem(player.id, item.id, slot);
                    toast.success(`Equipped ${item.name}!`);
                  }
                }}
                className={`w-full text-left py-1 px-2 rounded transition-colors ${
                  isEquipped
                    ? darkText ? 'bg-[#b8d4b8] border border-[#4a9c5a]' : 'bg-[#2a5c3a] border border-[#4a9c5a]'
                    : hoverBg
                }`}
              >
                <div className={`flex items-baseline w-full font-mono ${textSize}`}>
                  <span className={isEquipped ? (darkText ? 'text-[#2a5c3a] font-bold' : 'text-[#a0d8b0] font-bold') : (darkText ? 'text-[#3d2a14]' : 'text-[#e0d4b8]')}>
                    {isEquipped ? '⚔ ' : '  '}{item.name}
                  </span>
                  <span className="flex-1"></span>
                  <span className={`text-xs ${darkText ? 'text-[#6b5a42]' : 'text-[#a09080]'} ml-2`}>{statLabel}</span>
                  <span className="ml-2 text-xs">
                    {isEquipped ? (
                      <span className={darkText ? 'text-[#2a5c3a]' : 'text-[#a0d8b0]'}>[EQUIPPED]</span>
                    ) : (
                      <span className="text-gold">[EQUIP]</span>
                    )}
                  </span>
                </div>
              </button>
            ) : (
              <JonesMenuItem
                label={`${item.name} (${statLabel})`}
                price={price}
                disabled={!canAfford}
                darkText={darkText}
                largeText={largeText}
                onClick={() => {
                  modifyGold(player.id, -price);
                  spendTime(player.id, 1);
                  buyDurable(player.id, item.id, 0); // Gold already deducted
                  if (item.effect?.type === 'happiness') {
                    modifyHappiness(player.id, item.effect.value);
                  }
                  toast.success(`Purchased ${item.name}!`);
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );

  const combatStatsHeader = (
    <div className={`${darkText ? 'bg-[#e8dcc8] border-[#8b7355]' : 'bg-[#2d1f0f] border-[#8b7355]'} border rounded p-2 mb-2`}>
      <div className={`text-xs ${darkText ? 'text-[#6b5a42]' : 'text-[#a09080]'} uppercase tracking-wide mb-1`}>Combat Stats</div>
      <div className={`flex gap-4 font-mono ${largeText ? 'text-base' : 'text-sm'}`}>
        <span className="text-red-600">⚔ ATK: {combatStats.attack}</span>
        <span className="text-blue-700">🛡 DEF: {combatStats.defense}</span>
        {combatStats.blockChance > 0 && (
          <span className="text-yellow-700">BLK: {Math.round(combatStats.blockChance * 100)}%</span>
        )}
      </div>
      <div className={`flex gap-3 mt-1 text-xs ${darkText ? 'text-[#6b5a42]' : 'text-[#8b7355]'}`}>
        <span>W: {player.equippedWeapon ? getItem(player.equippedWeapon)?.name : 'None'}</span>
        <span>A: {player.equippedArmor ? getItem(player.equippedArmor)?.name : 'None'}</span>
        <span>S: {player.equippedShield ? getItem(player.equippedShield)?.name : 'None'}</span>
      </div>
    </div>
  );

  const footerNote = (
    <div className={`mt-2 text-xs ${darkText ? 'text-[#6b5a42]' : 'text-[#8b7355]'} px-2`}>
      1 hour per purchase • Click owned items to equip/unequip
    </div>
  );

  // Tabbed mode: render only the specified section without JonesPanel wrapper
  if (section) {
    switch (section) {
      case 'clothing':
        return (
          <div>
            {clothingItems.map(item => {
              const price = getItemPrice(item, priceModifier);
              const canAfford = player.gold >= price && player.timeRemaining >= 1;
              return (
                <JonesMenuItem
                  key={item.id}
                  label={item.name}
                  price={price}
                  disabled={!canAfford}
                  darkText={darkText}
                  largeText={largeText}
                  onClick={() => {
                    modifyGold(player.id, -price);
                    spendTime(player.id, 1);
                    if (item.effect?.type === 'clothing') {
                      modifyClothing(player.id, item.effect.value);
                    }
                    toast.success(`Purchased ${item.name}!`);
                  }}
                />
              );
            })}
            {footerNote}
          </div>
        );
      case 'weapons':
        return (
          <div>
            {combatStatsHeader}
            {renderEquipSection('WEAPONS', weaponItems, 'weapon', player.equippedWeapon, false)}
            {footerNote}
          </div>
        );
      case 'armor':
        return (
          <div>
            {combatStatsHeader}
            {renderEquipSection('ARMOR', armorItems, 'armor', player.equippedArmor, false)}
            {footerNote}
          </div>
        );
      case 'shields':
        return (
          <div>
            {combatStatsHeader}
            {renderEquipSection('SHIELDS', shieldItems, 'shield', player.equippedShield, false)}
            {footerNote}
          </div>
        );
    }
  }

  // Full mode (legacy): render everything in JonesPanel
  return (
    <JonesPanel>
      <JonesPanelHeader title="Armory" subtitle="Equipment & Clothing" />
      <JonesPanelContent>
        {combatStatsHeader}

        {/* Clothing */}
        <JonesSectionHeader title="CLOTHING" />
        {clothingItems.map(item => {
          const price = getItemPrice(item, priceModifier);
          const canAfford = player.gold >= price && player.timeRemaining >= 1;
          return (
            <JonesMenuItem
              key={item.id}
              label={item.name}
              price={price}
              disabled={!canAfford}
              onClick={() => {
                modifyGold(player.id, -price);
                spendTime(player.id, 1);
                if (item.effect?.type === 'clothing') {
                  modifyClothing(player.id, item.effect.value);
                }
                toast.success(`Purchased ${item.name}!`);
              }}
            />
          );
        })}

        {/* Weapons */}
        {renderEquipSection('WEAPONS', weaponItems, 'weapon', player.equippedWeapon)}

        {/* Armor */}
        {renderEquipSection('ARMOR', armorItems, 'armor', player.equippedArmor)}

        {/* Shields */}
        {renderEquipSection('SHIELDS', shieldItems, 'shield', player.equippedShield)}

        {footerNote}

        {/* Work button for armory employees */}
        <WorkSection
          player={player}
          locationName="Armory"
          workShift={workShift}
          variant="jones"
        />
      </JonesPanelContent>
    </JonesPanel>
  );
}
