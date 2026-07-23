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
  ['appliance service import',
`import { createApplianceActions } from './economy/applianceHelpers';`,
`import { createApplianceActions } from './economy/applianceHelpers';
import { createApplianceServiceActions } from './economy/applianceServiceHelpers';`],
  ['appliance service spread',
`    ...createApplianceActions(set, get),`,
`    ...createApplianceActions(set, get),
    ...createApplianceServiceActions(set, get),`],
]);

patch('src/store/storeTypes.ts', [
  ['appliance semantic signatures',
`  purchaseVendorItem: (playerId: string, vendor: 'general-store' | 'shadow-market', itemId: string) => ActionResult | void;`,
`  purchaseVendorItem: (playerId: string, vendor: 'general-store' | 'shadow-market', itemId: string) => ActionResult | void;
  purchaseAppliance: (playerId: string, vendor: 'enchanter' | 'shadow-market' | 'fence', applianceId: string) => ActionResult | void;
  useApplianceService: (playerId: string, service: 'repair-enchanter' | 'repair-forge' | 'pawn' | 'redeem', applianceId: string) => ActionResult | void;`],
]);

patch('src/network/types.ts', [
  ['remove appliance legacy allowlist',
`  'buyAppliance',
  'repairAppliance',
  'pawnAppliance',
  'redeemAppliance',`,
`  // Appliance intent only. Host resolves vendor, price, source and service cost.
  'purchaseAppliance',
  'useApplianceService',`],
  ['remove forge appliance legacy',
`  'forgeRepairAppliance',
  'forgeRepairEquipment',`,
`  'forgeRepairEquipment',`],
]);

patch('src/components/game/ShadowMarketPanel.tsx', [
  ['shadow appliance selector',
`  const buyAppliance = useGameStore(s => s.buyAppliance);
  const purchaseVendorItem = useGameStore(s => s.purchaseVendorItem);`,
`  const purchaseAppliance = useGameStore(s => s.purchaseAppliance);
  const purchaseVendorItem = useGameStore(s => s.purchaseVendorItem);`],
  ['shadow appliance handler',
`  const handleBuyAppliance = (applianceId: string, price: number) => {
    const happinessGain = buyAppliance(player.id, applianceId, price, 'market');
    const appliance = getAppliance(applianceId);
    const applianceName = t(\`appliances.\${applianceId}.name\`) || appliance?.name;
    if (happinessGain > 0) {
      toast.success(t('panelStore.purchased', { name: applianceName }) + \` +\${happinessGain} Happiness\`);
    } else {
      toast.success(t('panelStore.purchased', { name: applianceName }));
    }
  };`,
`  const handleBuyAppliance = (applianceId: string) => {
    const result = purchaseAppliance(player.id, 'shadow-market', applianceId);
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };`],
  ['shadow appliance click',
`onClick={() => handleBuyAppliance(appliance.id, price)}`,
`onClick={() => handleBuyAppliance(appliance.id)}`],
]);

patch('src/components/game/PawnShopPanel.tsx', [
  ['pawn store selectors',
`  const { pawnAppliance, redeemAppliance, buyAppliance, gambleAtFence } = useGameStore();`,
`  const purchaseAppliance = useGameStore(s => s.purchaseAppliance);
  const useApplianceService = useGameStore(s => s.useApplianceService);
  const gambleAtFence = useGameStore(s => s.gambleAtFence);`],
  ['pawn appliance action',
`                onClick={() => {
                  pawnAppliance(player.id, applianceId, pawnValue);
                  toast.success(t('panelFence.pawned', { name: t(\`appliances.\${applianceId}.name\`) || appliance?.name, gold: pawnValue }));
                }}`,
`                onClick={() => {
                  const result = useApplianceService(player.id, 'pawn', applianceId);
                  if (!result) return;
                  if (result.success) toast.success(result.message);
                  else toast.error(result.message);
                }}`],
  ['redeem appliance action',
`                onClick={() => {
                  const ok = redeemAppliance(player.id, pawned.applianceId);
                  if (ok) {
                    toast.success(t('panelFence.redeemed', { name: t(\`appliances.\${pawned.applianceId}.name\`) || appliance?.name, gold: redeemCost }));
                  }
                }}`,
`                onClick={() => {
                  const result = useApplianceService(player.id, 'redeem', pawned.applianceId);
                  if (!result) return;
                  if (result.success) toast.success(result.message);
                  else toast.error(result.message);
                }}`],
  ['fence appliance purchase',
`              onClick={() => {
                buyAppliance(player.id, appliance.id, salePrice, 'pawn');
                toast.success(t('panelStore.purchased', { name: t(\`appliances.\${appliance.id}.name\`) || appliance.name }));
              }}`,
`              onClick={() => {
                const result = purchaseAppliance(player.id, 'fence', appliance.id);
                if (!result) return;
                if (result.success) toast.success(result.message);
                else toast.error(result.message);
              }}`],
]);

patch('src/components/game/ForgePanel.tsx', [
  ['forge prop type',
`  forgeRepairAppliance: (playerId: string, applianceId: string) => number;`,
`  useApplianceService: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;`],
  ['forge destructure',
`  forgeRepairAppliance,`,
`  useApplianceService,`],
  ['forge repairs render',
`      return <RepairsSection player={player} spendTime={spendTime} forgeRepairAppliance={forgeRepairAppliance} forgeRepairEquipment={forgeRepairEquipment} />;`,
`      return <RepairsSection player={player} spendTime={spendTime} useApplianceService={useApplianceService} forgeRepairEquipment={forgeRepairEquipment} />;`],
  ['repairs section prop',
`  forgeRepairAppliance,
  forgeRepairEquipment,`,
`  useApplianceService,
  forgeRepairEquipment,`],
  ['repairs section type',
`  forgeRepairAppliance: (playerId: string, applianceId: string) => number;`,
`  useApplianceService: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;`],
  ['forge appliance repair action',
`                onClick={() => {
                  const cost = forgeRepairAppliance(player.id, applianceId);
                  if (cost > 0) {
                    spendTime(player.id, FORGE_REPAIR_TIME);
                    toast.success(t('panelEnchanter.repaired', { name: t(\`appliances.\${applianceId}.name\`) || appliance.name }));
                  }
                }}`,
`                onClick={() => {
                  const result = useApplianceService(player.id, 'repair-forge', applianceId);
                  if (!result) return;
                  if (result.success) toast.success(result.message);
                  else toast.error(result.message);
                }}`],
]);

patch('src/components/game/locationTabs.tsx', [
  ['context appliance service field',
`  forgeRepairAppliance: GameStore['forgeRepairAppliance'];`,
`  useApplianceService: GameStore['useApplianceService'];`],
  ['forge context destructure',
`  const { player, priceModifier, spendTime, modifyHappiness, temperEquipment, forgeRepairAppliance, forgeRepairEquipment, salvageEquipment } = ctx;`,
`  const { player, priceModifier, spendTime, modifyHappiness, temperEquipment, useApplianceService, forgeRepairEquipment, salvageEquipment } = ctx;`],
  ['forge prop assignment',
`    forgeRepairAppliance,`,
`    useApplianceService,`],
  ['enchanter spend prop',
`          priceModifier={priceModifier}
          onSpendTime={(hours) => spendTime(player.id, hours)}`,
`          priceModifier={priceModifier}`],
]);

patch('src/components/game/LocationPanel.tsx', [
  ['location appliance service assignment',
`    forgeRepairAppliance: store.forgeRepairAppliance,`,
`    useApplianceService: store.useApplianceService,`],
]);

patch('src/test/multiplayer.test.ts', [
  ['cross-player appliance actions',
`      'buyItem', 'sellItem', 'buyDurable', 'buyAppliance', 'pawnAppliance',
      'redeemAppliance', 'prepayRent',`,
`      'buyItem', 'sellItem', 'buyDurable', 'purchaseAppliance', 'useApplianceService',
      'prepayRent',`],
]);
