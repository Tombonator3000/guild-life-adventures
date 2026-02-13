import type { Player, EquipmentSlot } from '@/types/game.types';
import { Hammer, Wrench, Recycle } from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
  ARMORY_ITEMS,
  getItem,
  getItemPrice,
  getTemperCost,
  getSalvageValue,
  getEquipmentRepairCost,
  TEMPER_BONUS,
  TEMPER_TIME,
  EQUIPMENT_REPAIR_TIME,
  MAX_DURABILITY,
  getDurabilityCondition,
  getAppliance,
  APPLIANCES,
  calculateRepairCost,
  calculateCombatStats,
} from '@/data/items';
import { toast } from 'sonner';

export type ForgeSection = 'smithing' | 'repairs' | 'salvage';

interface ForgePanelProps {
  player: Player;
  priceModifier: number;
  spendTime: (playerId: string, hours: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  temperEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, cost: number) => void;
  forgeRepairAppliance: (playerId: string, applianceId: string) => number;
  forgeRepairEquipment: (playerId: string, itemId: string, cost: number) => void;
  salvageEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, value: number) => void;
  section: ForgeSection;
}

export function ForgePanel({
  player,
  priceModifier,
  spendTime,
  modifyHappiness,
  temperEquipment,
  forgeRepairAppliance,
  forgeRepairEquipment,
  salvageEquipment,
  section,
}: ForgePanelProps) {
  switch (section) {
    case 'smithing':
      return <SmithingSection player={player} priceModifier={priceModifier} spendTime={spendTime} modifyHappiness={modifyHappiness} temperEquipment={temperEquipment} />;
    case 'repairs':
      return <RepairsSection player={player} spendTime={spendTime} forgeRepairAppliance={forgeRepairAppliance} forgeRepairEquipment={forgeRepairEquipment} />;
    case 'salvage':
      return <SalvageSection player={player} priceModifier={priceModifier} spendTime={spendTime} salvageEquipment={salvageEquipment} />;
  }
}

// === SMITHING (Equipment Tempering) ===

function SmithingSection({
  player,
  priceModifier,
  spendTime,
  modifyHappiness,
  temperEquipment,
}: {
  player: Player;
  priceModifier: number;
  spendTime: (playerId: string, hours: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  temperEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, cost: number) => void;
}) {
  const { t } = useTranslation();
  // Get combat stats including temper bonuses
  const getEffectiveStats = () => {
    const base = calculateCombatStats(player.equippedWeapon, player.equippedArmor, player.equippedShield);
    let attack = base.attack;
    let defense = base.defense;
    let blockChance = base.blockChance;

    if (player.equippedWeapon && player.temperedItems.includes(player.equippedWeapon)) {
      attack += TEMPER_BONUS.weapon.attack;
    }
    if (player.equippedArmor && player.temperedItems.includes(player.equippedArmor)) {
      defense += TEMPER_BONUS.armor.defense;
    }
    if (player.equippedShield && player.temperedItems.includes(player.equippedShield)) {
      defense += TEMPER_BONUS.shield.defense;
      blockChance += TEMPER_BONUS.shield.blockChance;
    }
    return { attack, defense, blockChance };
  };

  const stats = getEffectiveStats();

  // Get all equipment the player owns (weapons, armor, shields)
  const ownedEquipment = ARMORY_ITEMS.filter(
    item => item.equipSlot && (player.durables[item.id] || 0) > 0
  );

  const hasEquipment = ownedEquipment.length > 0;

  return (
    <div className="space-y-2">
      {/* Combat stats display */}
      <div className="bg-[#e8dcc8] border-[#8b7355] border rounded p-2">
        <div className="text-xs text-[#6b5a42] uppercase tracking-wide mb-1">{t('common.attack')} / {t('common.defense')}</div>
        <div className="flex gap-4 font-mono text-sm">
          <span className="text-red-700">ATK: {stats.attack}</span>
          <span className="text-blue-700">DEF: {stats.defense}</span>
          {stats.blockChance > 0 && (
            <span className="text-yellow-700">BLK: {Math.round(stats.blockChance * 100)}%</span>
          )}
        </div>
      </div>

      {!hasEquipment ? (
        <div className="bg-[#e8dcc8] border border-[#8b7355] rounded p-3 text-center">
          <p className="text-sm text-[#3d2a14] font-display mb-1">{t('panelForge.temperEquipment')}</p>
          <p className="text-xs text-[#6b5a42]">
            {t('locations.armory')}
          </p>
        </div>
      ) : (
        ownedEquipment.map(item => {
          const slot = item.equipSlot!;
          const isTempered = player.temperedItems.includes(item.id);
          const cost = Math.round(getTemperCost(item) * priceModifier);
          const time = TEMPER_TIME[slot];
          const canAfford = player.gold >= cost && player.timeRemaining >= time;
          const bonus = TEMPER_BONUS[slot];

          // Build bonus label
          const bonusParts: string[] = [];
          if ('attack' in bonus) bonusParts.push(`+${bonus.attack} ATK`);
          if ('defense' in bonus) bonusParts.push(`+${bonus.defense} DEF`);
          if ('blockChance' in bonus) bonusParts.push(`+${Math.round(bonus.blockChance * 100)}% BLK`);
          const bonusLabel = bonusParts.join(', ');

          return (
            <div key={item.id} className="py-1 px-1">
              {isTempered ? (
                <div className="bg-[#b8d4b8] border border-[#4a9c5a] rounded py-1.5 px-2">
                  <div className="flex items-baseline w-full font-mono text-base">
                    <span className="text-[#2a5c3a] font-bold">
                      {t('panelForge.alreadyTempered')} {t(`items.${item.id}.name`) || item.name}
                    </span>
                    <span className="flex-1" />
                    <span className="text-xs text-[#2a5c3a] ml-2">{bonusLabel}</span>
                    <span className="ml-2 text-xs text-[#2a5c3a]">[DONE]</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    temperEquipment(player.id, item.id, slot, cost);
                    spendTime(player.id, time);
                    modifyHappiness(player.id, 2);
                    toast.success(t('panelForge.tempered', { name: t(`items.${item.id}.name`) || item.name, bonus: bonusLabel }));
                  }}
                  disabled={!canAfford}
                  className="w-full text-left py-1.5 px-2 rounded transition-colors hover:bg-[#d4c4a8] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex items-baseline w-full font-mono text-base">
                    <span className="text-[#3d2a14]">
                      {t(`items.${item.id}.name`) || item.name}
                    </span>
                    <span className="flex-1" />
                    <span className="text-xs text-[#6b5a42] ml-2">{bonusLabel}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-[#6b5a42]">{time}h {t('common.work').toLowerCase()}</span>
                    <span className="text-sm font-bold text-[#c9a227]">{cost}g</span>
                  </div>
                </button>
              )}
            </div>
          );
        })
      )}

      <div className="mt-1 text-xs text-[#6b5a42] px-2">
        {t('panelForge.temperBonus')}
      </div>
    </div>
  );
}

// === REPAIRS (Appliance Repair — cheaper than Enchanter) ===

// Durability bar color based on condition
const DURABILITY_COLORS: Record<string, string> = {
  broken: 'bg-red-600',
  poor: 'bg-red-500',
  worn: 'bg-amber-500',
  good: 'bg-green-500',
  perfect: 'bg-green-400',
};

function RepairsSection({
  player,
  spendTime,
  forgeRepairAppliance,
  forgeRepairEquipment,
}: {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  forgeRepairAppliance: (playerId: string, applianceId: string) => number;
  forgeRepairEquipment: (playerId: string, itemId: string, cost: number) => void;
}) {
  const { t } = useTranslation();
  const FORGE_REPAIR_TIME = 3;

  // Get all owned appliances (broken and working)
  const ownedApplianceIds = Object.keys(player.appliances);
  const brokenAppliances = ownedApplianceIds.filter(
    id => player.appliances[id].isBroken
  );

  // Get equipment needing repair (durability < 100)
  const damagedEquipment = ARMORY_ITEMS.filter(item => {
    if (!item.equipSlot) return false;
    if (!player.durables[item.id] || player.durables[item.id] <= 0) return false;
    const dur = player.equipmentDurability?.[item.id];
    return dur !== undefined && dur < MAX_DURABILITY;
  });

  return (
    <div className="space-y-2">
      {/* Equipment Repair Section */}
      <div className="bg-[#e8dcc8] border-[#8b7355] border rounded p-2">
        <div className="text-xs text-[#6b5a42] uppercase tracking-wide mb-1">Equipment Repair</div>
        <p className="text-xs text-[#6b5a42]">
          Restore weapon, armor & shield durability — {EQUIPMENT_REPAIR_TIME}h
        </p>
      </div>

      {damagedEquipment.length === 0 ? (
        <div className="bg-[#e8dcc8] border border-[#8b7355] rounded p-3 text-center">
          <p className="text-sm text-[#3d2a14] font-display mb-1">Equipment Repair</p>
          <p className="text-xs text-[#6b5a42]">
            All equipment in good condition
          </p>
        </div>
      ) : (
        damagedEquipment.map(item => {
          const dur = player.equipmentDurability?.[item.id] ?? MAX_DURABILITY;
          const condition = getDurabilityCondition(dur);
          const cost = getEquipmentRepairCost(item, dur);
          const canAfford = player.gold >= cost && player.timeRemaining >= EQUIPMENT_REPAIR_TIME;
          const isEquipped = player.equippedWeapon === item.id || player.equippedArmor === item.id || player.equippedShield === item.id;
          const barColor = DURABILITY_COLORS[condition] || 'bg-gray-500';

          return (
            <div key={item.id} className="py-1 px-1">
              <button
                onClick={() => {
                  forgeRepairEquipment(player.id, item.id, cost);
                  spendTime(player.id, EQUIPMENT_REPAIR_TIME);
                  toast.success(`Repaired ${t(`items.${item.id}.name`) || item.name} to full durability!`);
                }}
                disabled={!canAfford}
                className="w-full text-left py-1.5 px-2 rounded transition-colors hover:bg-[#d4c4a8] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-baseline w-full font-mono text-base">
                  <span className={condition === 'broken' ? 'text-red-700 font-bold' : 'text-[#3d2a14]'}>
                    {isEquipped ? '* ' : ''}{t(`items.${item.id}.name`) || item.name}
                  </span>
                  <span className="flex-1" />
                  <span className={`text-xs ml-2 ${condition === 'broken' ? 'text-red-600' : condition === 'poor' ? 'text-red-500' : 'text-amber-600'}`}>
                    [{condition.toUpperCase()}]
                  </span>
                </div>
                {/* Durability bar */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all`}
                      style={{ width: `${dur}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#6b5a42] w-10 text-right">{dur}%</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-[#6b5a42]">{EQUIPMENT_REPAIR_TIME}h repair</span>
                  <span className="text-sm font-bold text-[#c9a227]">{cost}g</span>
                </div>
              </button>
            </div>
          );
        })
      )}

      {/* Divider between equipment and appliance repair */}
      <div className="border-t border-[#8b7355]/30 my-1" />

      {/* Appliance Repair Section */}
      <div className="bg-[#e8dcc8] border-[#8b7355] border rounded p-2">
        <div className="text-xs text-[#6b5a42] uppercase tracking-wide mb-1">{t('panelForge.repairAppliances')}</div>
        <p className="text-xs text-[#6b5a42]">
          {t('panelForge.repairAppliances')} — {FORGE_REPAIR_TIME}h
        </p>
      </div>

      {brokenAppliances.length === 0 ? (
        <div className="bg-[#e8dcc8] border border-[#8b7355] rounded p-3 text-center">
          <p className="text-sm text-[#3d2a14] font-display mb-1">{t('panelForge.repairAppliances')}</p>
          <p className="text-xs text-[#6b5a42]">
            OK
          </p>
        </div>
      ) : (
        brokenAppliances.map(applianceId => {
          const owned = player.appliances[applianceId];
          const appliance = getAppliance(applianceId);
          if (!appliance) return null;

          const fullRepairCost = calculateRepairCost(owned.originalPrice);
          const forgeCost = Math.max(5, Math.floor(fullRepairCost * 0.5));
          const canAfford = player.gold >= forgeCost && player.timeRemaining >= FORGE_REPAIR_TIME;

          return (
            <div key={applianceId} className="py-1 px-1">
              <button
                onClick={() => {
                  const cost = forgeRepairAppliance(player.id, applianceId);
                  if (cost > 0) {
                    spendTime(player.id, FORGE_REPAIR_TIME);
                    toast.success(t('panelEnchanter.repaired', { name: t(`appliances.${applianceId}.name`) || appliance.name }));
                  }
                }}
                disabled={!canAfford}
                className="w-full text-left py-1.5 px-2 rounded transition-colors hover:bg-[#d4c4a8] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-baseline w-full font-mono text-base">
                  <span className="text-red-700 font-bold">
                    {t(`appliances.${applianceId}.name`) || appliance.name}
                  </span>
                  <span className="flex-1" />
                  <span className="text-xs text-red-600 ml-2">[BROKEN]</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-[#6b5a42]">{FORGE_REPAIR_TIME}h repair</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through text-[#a09080]">~{fullRepairCost}g</span>
                    <span className="text-sm font-bold text-[#2a5c3a]">~{forgeCost}g</span>
                  </div>
                </div>
              </button>
            </div>
          );
        })
      )}

      {/* Show all working appliances as greyed out */}
      {ownedApplianceIds.filter(id => !player.appliances[id].isBroken).length > 0 && (
        <div className="mt-1">
          <div className="text-xs text-[#6b5a42] px-2 mb-1">Working appliances:</div>
          {ownedApplianceIds.filter(id => !player.appliances[id].isBroken).map(id => {
            const appliance = getAppliance(id);
            if (!appliance) return null;
            return (
              <div key={id} className="py-0.5 px-2 opacity-50">
                <span className="font-mono text-sm text-[#3d2a14]">
                  {appliance.name} <span className="text-[#2a5c3a] text-xs">[OK]</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// === SALVAGE (Equipment Selling — better than Fence) ===

function SalvageSection({
  player,
  priceModifier,
  spendTime,
  salvageEquipment,
}: {
  player: Player;
  priceModifier: number;
  spendTime: (playerId: string, hours: number) => void;
  salvageEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, value: number) => void;
}) {
  const { t } = useTranslation();
  const SALVAGE_TIME = 1;

  // Get all equipment the player owns
  const ownedEquipment = ARMORY_ITEMS.filter(
    item => item.equipSlot && (player.durables[item.id] || 0) > 0
  );

  const hasEquipment = ownedEquipment.length > 0;

  return (
    <div className="space-y-2">
      <div className="bg-[#e8dcc8] border-[#8b7355] border rounded p-2">
        <div className="text-xs text-[#6b5a42] uppercase tracking-wide mb-1">{t('panelForge.salvageEquipment')}</div>
        <p className="text-xs text-[#6b5a42]">
          {t('panelForge.salvageValue')} 60% — {SALVAGE_TIME}h
        </p>
      </div>

      {!hasEquipment ? (
        <div className="bg-[#e8dcc8] border border-[#8b7355] rounded p-3 text-center">
          <p className="text-sm text-[#3d2a14] font-display mb-1">{t('panelForge.salvageEquipment')}</p>
          <p className="text-xs text-[#6b5a42]">
            {t('panelArmory.weapons')} / {t('panelArmory.armor')} / {t('panelArmory.shields')}
          </p>
        </div>
      ) : (
        ownedEquipment.map(item => {
          const slot = item.equipSlot!;
          const salvageValue = getSalvageValue(item, priceModifier);
          const isEquipped = player.equippedWeapon === item.id || player.equippedArmor === item.id || player.equippedShield === item.id;
          const canAfford = player.timeRemaining >= SALVAGE_TIME;
          const fenceValue = Math.round(item.basePrice * 0.4 * priceModifier);

          return (
            <div key={item.id} className="py-1 px-1">
              <button
                onClick={() => {
                  salvageEquipment(player.id, item.id, slot, salvageValue);
                  spendTime(player.id, SALVAGE_TIME);
                  toast.success(t('panelForge.salvaged', { name: t(`items.${item.id}.name`) || item.name, gold: salvageValue }));
                }}
                disabled={!canAfford}
                className="w-full text-left py-1.5 px-2 rounded transition-colors hover:bg-[#d4c4a8] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-baseline w-full font-mono text-base">
                  <span className="text-[#3d2a14]">
                    {isEquipped ? '* ' : ''}{t(`items.${item.id}.name`) || item.name}
                  </span>
                  <span className="flex-1" />
                  {item.equipStats && (
                    <span className="text-xs text-[#6b5a42] ml-2">
                      {item.equipStats.attack ? `+${item.equipStats.attack} ATK` : ''}
                      {item.equipStats.defense ? `+${item.equipStats.defense} DEF` : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-[#6b5a42]">
                    {SALVAGE_TIME}h{isEquipped ? ' (will unequip)' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through text-[#a09080]">{fenceValue}g fence</span>
                    <span className="text-sm font-bold text-[#c9a227]">{salvageValue}g</span>
                  </div>
                </div>
              </button>
            </div>
          );
        })
      )}

      <div className="mt-1 text-xs text-[#6b5a42] px-2">
        * = currently equipped (will be unequipped on salvage)
      </div>
    </div>
  );
}
