import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transforms) {
  let source = readFileSync(path, 'utf8');
  for (const [label, search, replacement] of transforms) {
    const next = source.replace(search, replacement);
    if (next === source) throw new Error(`Patch target not found in ${path}: ${label}`);
    source = next;
  }
  writeFileSync(path, source);
  console.log(`Patched ${path}`);
}

patch('src/store/helpers/economyHelpers.ts', [
  ['equipment service import',
`import { createEquipmentActions } from './economy/equipmentHelpers';`,
`import { createEquipmentActions } from './economy/equipmentHelpers';
import { createEquipmentServiceActions } from './economy/equipmentServiceHelpers';`],
  ['equipment service spread',
`    ...createEquipmentActions(set, get),`,
`    ...createEquipmentActions(set, get),
    ...createEquipmentServiceActions(set, get),`],
]);

patch('src/store/storeTypes.ts', [
  ['equipment semantic signatures',
`  useApplianceService: (playerId: string, service: 'repair-enchanter' | 'repair-forge' | 'pawn' | 'redeem', applianceId: string) => ActionResult | void;`,
`  useApplianceService: (playerId: string, service: 'repair-enchanter' | 'repair-forge' | 'pawn' | 'redeem', applianceId: string) => ActionResult | void;
  purchaseEquipmentItem: (playerId: string, vendor: 'armory' | 'fence-used', itemId: string, mode?: 'primary' | 'backup') => ActionResult | void;
  useEquipmentService: (playerId: string, service: 'temper' | 'repair' | 'salvage', itemId: string) => ActionResult | void;`],
]);

patch('src/network/types.ts', [
  ['replace legacy durable actions',
`  'buyDurable',
  'sellDurable',
  // Appliance intent only. Host resolves vendor, price, source and service cost.`,
`  // Equipment intent only. Host resolves catalogue, price, durability and service values.
  'purchaseEquipmentItem',
  'useEquipmentService',
  // Appliance intent only. Host resolves vendor, price, source and service cost.`],
  ['remove equipment service legacy',
`  'temperEquipment',
  'forgeRepairEquipment',
  'salvageEquipment',`,
``],
]);

patch('src/components/game/ArmoryPanel.tsx', [
  ['store import',
`import { useTranslation } from '@/i18n';`,
`import { useTranslation } from '@/i18n';
import { useGameStore } from '@/store/gameStore';`],
  ['simplify prop interface',
`  modifyGold: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyClothing: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  buyDurable: (playerId: string, itemId: string, cost: number) => void;
  equipItem: (playerId: string, itemId: string, slot: EquipmentSlot) => void;
  unequipItem: (playerId: string, slot: EquipmentSlot) => void;
  storeBackupOutfit?: (playerId: string, condition: number, cost: number) => boolean;`,
`  equipItem: (playerId: string, itemId: string, slot: EquipmentSlot) => void;
  unequipItem: (playerId: string, slot: EquipmentSlot) => void;`],
  ['simplify destructure',
`  modifyGold,
  spendTime,
  modifyClothing,
  modifyHappiness,
  buyDurable,
  equipItem,
  unequipItem,
  storeBackupOutfit,`,
`  equipItem,
  unequipItem,`],
  ['equipment action selector',
`  const { t } = useTranslation();
  const { setPreview } = useItemPreview();`,
`  const { t } = useTranslation();
  const { setPreview } = useItemPreview();
  const purchaseEquipmentItem = useGameStore(s => s.purchaseEquipmentItem);

  const handlePurchase = (itemId: string, mode: 'primary' | 'backup' = 'primary') => {
    const result = purchaseEquipmentItem(player.id, 'armory', itemId, mode);
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };`],
  ['equipment purchase click',
`                onClick={() => {
                  modifyGold(player.id, -price);
                  buyDurable(player.id, item.id, 0); // Gold already deducted
                  if (item.effect?.type === 'happiness') {
                    modifyHappiness(player.id, item.effect.value);
                  }
                  toast.success(t('panelArmory.purchased', { name: t(\`items.\${item.id}.name\`) || item.name }));
                }}`,
`                onClick={() => handlePurchase(item.id)}`],
  ['backup availability',
`              const canStoreAsBackup = storeBackupOutfit && canAfford && clothingValue > (player.backupOutfit ?? 0);`,
`              const canStoreAsBackup = canAfford && clothingValue > (player.backupOutfit ?? 0);`],
  ['tabbed clothing purchase',
`                    onClick={() => {
                      modifyGold(player.id, -price);
                      modifyClothing(player.id, clothingValue);
                      if (item.happinessOnPurchase && item.happinessOnPurchase > 0) {
                        modifyHappiness(player.id, item.happinessOnPurchase);
                      }
                      const newTier = getClothingTier(Math.max(player.clothingCondition, clothingValue));
                      toast.success(\`Purchased \${t(\`items.\${item.id}.name\`) || item.name} — now \${CLOTHING_TIER_LABELS[newTier]} tier\`);
                    }}`,
`                    onClick={() => handlePurchase(item.id, 'primary')}`],
  ['backup purchase',
`                      onClick={() => {
                        const ok = storeBackupOutfit!(player.id, clothingValue, price);
                        if (ok) toast.success(\`Stored \${item.name} as backup outfit (\${clothingValue}%)\`);
                      }}`,
`                      onClick={() => handlePurchase(item.id, 'backup')}`],
  ['fallback clothing purchase',
`            onClick={() => {
              modifyGold(player.id, -price);
              modifyClothing(player.id, clothingValue);
              if (item.happinessOnPurchase && item.happinessOnPurchase > 0) {
                modifyHappiness(player.id, item.happinessOnPurchase);
              }
              const newTier = getClothingTier(Math.max(player.clothingCondition, clothingValue));
              toast.success(\`Purchased \${t(\`items.\${item.id}.name\`) || item.name} — now \${CLOTHING_TIER_LABELS[newTier]} tier\`);
            }}`,
`            onClick={() => handlePurchase(item.id, 'primary')}`],
]);

patch('src/components/game/PawnShopPanel.tsx', [
  ['remove used-item prop',
`  onBuyUsedItem: (itemId: string, price: number) => void;
`,
``],
  ['equipment selector',
`  const gambleAtFence = useGameStore(s => s.gambleAtFence);`,
`  const gambleAtFence = useGameStore(s => s.gambleAtFence);
  const purchaseEquipmentItem = useGameStore(s => s.purchaseEquipmentItem);`],
  ['used-item click',
`              onClick={() => onBuyUsedItem(item.id, price)}`,
`              onClick={() => {
                const result = purchaseEquipmentItem(player.id, 'fence-used', item.id, 'primary');
                if (!result) return;
                if (result.success) toast.success(result.message);
                else toast.error(result.message);
              }}`],
]);

patch('src/components/game/ForgePanel.tsx', [
  ['remove EquipmentSlot import',
`import type { Player, EquipmentSlot } from '@/types/game.types';`,
`import type { Player } from '@/types/game.types';`],
  ['replace forge props',
`  spendTime: (playerId: string, hours: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  temperEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, cost: number) => void;
  applianceServiceAction: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;
  forgeRepairEquipment: (playerId: string, itemId: string, cost: number) => void;
  salvageEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, value: number) => void;`,
`  equipmentServiceAction: (playerId: string, service: 'temper' | 'repair' | 'salvage', itemId: string) => { success: boolean; message: string } | void;
  applianceServiceAction: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;`],
  ['replace forge destructure',
`  spendTime,
  modifyHappiness,
  temperEquipment,
  applianceServiceAction,
  forgeRepairEquipment,
  salvageEquipment,`,
`  equipmentServiceAction,
  applianceServiceAction,`],
  ['replace section calls',
`      return <SmithingSection player={player} priceModifier={priceModifier} spendTime={spendTime} modifyHappiness={modifyHappiness} temperEquipment={temperEquipment} />;
    case 'repairs':
      return <RepairsSection player={player} spendTime={spendTime} applianceServiceAction={applianceServiceAction} forgeRepairEquipment={forgeRepairEquipment} />;
    case 'salvage':
      return <SalvageSection player={player} priceModifier={priceModifier} spendTime={spendTime} salvageEquipment={salvageEquipment} />;`,
`      return <SmithingSection player={player} priceModifier={priceModifier} equipmentServiceAction={equipmentServiceAction} />;
    case 'repairs':
      return <RepairsSection player={player} equipmentServiceAction={equipmentServiceAction} applianceServiceAction={applianceServiceAction} />;
    case 'salvage':
      return <SalvageSection player={player} priceModifier={priceModifier} equipmentServiceAction={equipmentServiceAction} />;`],
  ['smithing props',
`  spendTime,
  modifyHappiness,
  temperEquipment,`,
`  equipmentServiceAction,`],
  ['smithing types',
`  spendTime: (playerId: string, hours: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  temperEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, cost: number) => void;`,
`  equipmentServiceAction: (playerId: string, service: 'temper', itemId: string) => { success: boolean; message: string } | void;`],
  ['temper click',
`                  onClick={() => {
                    temperEquipment(player.id, item.id, slot, cost);
                    spendTime(player.id, time);
                    modifyHappiness(player.id, 2);
                    toast.success(t('panelForge.tempered', { name: t(\`items.\${item.id}.name\`) || item.name, bonus: bonusLabel }));
                  }}`,
`                  onClick={() => {
                    const result = equipmentServiceAction(player.id, 'temper', item.id);
                    if (!result) return;
                    if (result.success) toast.success(result.message);
                    else toast.error(result.message);
                  }}`],
  ['repair section props',
`  spendTime,
  applianceServiceAction,
  forgeRepairEquipment,`,
`  equipmentServiceAction,
  applianceServiceAction,`],
  ['repair section types',
`  spendTime: (playerId: string, hours: number) => void;
  applianceServiceAction: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;
  forgeRepairEquipment: (playerId: string, itemId: string, cost: number) => void;`,
`  equipmentServiceAction: (playerId: string, service: 'repair', itemId: string) => { success: boolean; message: string } | void;
  applianceServiceAction: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;`],
  ['equipment repair click',
`                onClick={() => {
                  forgeRepairEquipment(player.id, item.id, cost);
                  spendTime(player.id, EQUIPMENT_REPAIR_TIME);
                  toast.success(\`Repaired \${t(\`items.\${item.id}.name\`) || item.name} to full durability!\`);
                }}`,
`                onClick={() => {
                  const result = equipmentServiceAction(player.id, 'repair', item.id);
                  if (!result) return;
                  if (result.success) toast.success(result.message);
                  else toast.error(result.message);
                }}`],
  ['salvage props',
`  spendTime,
  salvageEquipment,`,
`  equipmentServiceAction,`],
  ['salvage types',
`  spendTime: (playerId: string, hours: number) => void;
  salvageEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, value: number) => void;`,
`  equipmentServiceAction: (playerId: string, service: 'salvage', itemId: string) => { success: boolean; message: string } | void;`],
  ['salvage click',
`                onClick={() => {
                  salvageEquipment(player.id, item.id, slot, salvageValue);
                  spendTime(player.id, SALVAGE_TIME);
                  toast.success(t('panelForge.salvaged', { name: t(\`items.\${item.id}.name\`) || item.name, gold: salvageValue }));
                }}`,
`                onClick={() => {
                  const result = equipmentServiceAction(player.id, 'salvage', item.id);
                  if (!result) return;
                  if (result.success) toast.success(result.message);
                  else toast.error(result.message);
                }}`],
]);

patch('src/components/game/locationTabs.tsx', [
  ['remove durable context field',
`  buyDurable: GameStore['buyDurable'];
`,
``],
  ['replace equipment context fields',
`  temperEquipment: GameStore['temperEquipment'];
  applianceServiceAction: GameStore['useApplianceService'];
  forgeRepairEquipment: GameStore['forgeRepairEquipment'];
  salvageEquipment: GameStore['salvageEquipment'];
  storeBackupOutfit: GameStore['storeBackupOutfit'];`,
`  equipmentServiceAction: GameStore['useEquipmentService'];
  applianceServiceAction: GameStore['useApplianceService'];`],
  ['forge context',
`  const { player, priceModifier, spendTime, modifyHappiness, temperEquipment, applianceServiceAction, forgeRepairEquipment, salvageEquipment } = ctx;`,
`  const { player, priceModifier, equipmentServiceAction, applianceServiceAction } = ctx;`],
  ['forge props',
`    spendTime: (id: string, hours: number) => spendTime(id, hours),
    modifyHappiness: (id: string, amount: number) => modifyHappiness(id, amount),
    temperEquipment,
    applianceServiceAction,
    forgeRepairEquipment,
    salvageEquipment,`,
`    equipmentServiceAction,
    applianceServiceAction,`],
  ['armory context',
`  const { player, priceModifier, modifyGold, spendTime, modifyClothing, modifyHappiness,
    buyDurable, equipItem, unequipItem, storeBackupOutfit } = ctx;`,
`  const { player, priceModifier, equipItem, unequipItem } = ctx;`],
  ['armory props',
`    modifyGold,
    spendTime,
    modifyClothing,
    modifyHappiness,
    buyDurable,
    equipItem,
    unequipItem,
    storeBackupOutfit,`,
`    equipItem,
    unequipItem,`],
  ['remove used item effects block',
`// Used item effect handlers by item ID
const USED_ITEM_EFFECTS: Record<string, (ctx: LocationTabContext) => void> = {
  'used-clothes': (ctx) => ctx.modifyClothing(ctx.player.id, 50),
  'used-blanket': (ctx) => ctx.modifyHappiness(ctx.player.id, 3),
  'used-sword': (ctx) => {
    ctx.buyDurable(ctx.player.id, 'sword', 0);
    ctx.equipItem(ctx.player.id, 'sword', 'weapon');
    toast.success('Equipped Used Sword!');
  },
  'used-shield': (ctx) => {
    ctx.buyDurable(ctx.player.id, 'shield', 0);
    ctx.equipItem(ctx.player.id, 'shield', 'shield');
    toast.success('Equipped Dented Shield!');
  },
};

`,
``],
  ['remove used-item callback',
`    onBuyUsedItem: (itemId: string, price: number) => {
      modifyGold(player.id, -price);
      USED_ITEM_EFFECTS[itemId]?.(ctx);
    },
`,
``],
]);

patch('src/components/game/LocationPanel.tsx', [
  ['remove durable assignment',
`    buyDurable: store.buyDurable,
`,
``],
  ['replace equipment assignments',
`    temperEquipment: store.temperEquipment,
    applianceServiceAction: store.useApplianceService,
    forgeRepairEquipment: store.forgeRepairEquipment,
    salvageEquipment: store.salvageEquipment,
    storeBackupOutfit: store.storeBackupOutfit,`,
`    equipmentServiceAction: store.useEquipmentService,
    applianceServiceAction: store.useApplianceService,`],
]);

patch('src/test/multiplayer.test.ts', [
  ['cross-player equipment list',
`      'invest', 'withdrawInvestment', 'buyItem', 'sellItem', 'buyDurable',
      'sellDurable', 'purchaseAppliance', 'useApplianceService',`,
`      'invest', 'withdrawInvestment', 'buyItem', 'sellItem',
      'purchaseEquipmentItem', 'useEquipmentService', 'purchaseAppliance', 'useApplianceService',`],
]);
