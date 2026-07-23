import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transforms) {
  let source = readFileSync(path, 'utf8');
  for (const [label, search, replacement] of transforms) {
    const next = source.replace(search, replacement);
    if (next === source) throw new Error(`Rename target not found in ${path}: ${label}`);
    source = next;
  }
  writeFileSync(path, source);
  console.log(`Patched ${path}`);
}

patch('src/components/game/EnchanterPanel.tsx', [
  ['selector',
`  const useApplianceService = useGameStore(s => s.useApplianceService);`,
`  const applianceServiceAction = useGameStore(s => s.useApplianceService);`],
  ['repair call',
`    const result = useApplianceService(player.id, 'repair-enchanter', applianceId);`,
`    const result = applianceServiceAction(player.id, 'repair-enchanter', applianceId);`],
]);

patch('src/components/game/PawnShopPanel.tsx', [
  ['selector',
`  const useApplianceService = useGameStore(s => s.useApplianceService);`,
`  const applianceServiceAction = useGameStore(s => s.useApplianceService);`],
  ['pawn call',
`                  const result = useApplianceService(player.id, 'pawn', applianceId);`,
`                  const result = applianceServiceAction(player.id, 'pawn', applianceId);`],
  ['redeem call',
`                  const result = useApplianceService(player.id, 'redeem', pawned.applianceId);`,
`                  const result = applianceServiceAction(player.id, 'redeem', pawned.applianceId);`],
]);

patch('src/components/game/ForgePanel.tsx', [
  ['top prop',
`  useApplianceService: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;`,
`  applianceServiceAction: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;`],
  ['top destructure',
`  useApplianceService,`,
`  applianceServiceAction,`],
  ['repairs render prop',
`      return <RepairsSection player={player} spendTime={spendTime} useApplianceService={useApplianceService} forgeRepairEquipment={forgeRepairEquipment} />;`,
`      return <RepairsSection player={player} spendTime={spendTime} applianceServiceAction={applianceServiceAction} forgeRepairEquipment={forgeRepairEquipment} />;`],
  ['section destructure',
`  useApplianceService,
  forgeRepairEquipment,`,
`  applianceServiceAction,
  forgeRepairEquipment,`],
  ['section prop type',
`  useApplianceService: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;`,
`  applianceServiceAction: (playerId: string, service: 'repair-forge', applianceId: string) => { success: boolean; message: string } | void;`],
  ['repair callback',
`                  const result = useApplianceService(player.id, 'repair-forge', applianceId);`,
`                  const result = applianceServiceAction(player.id, 'repair-forge', applianceId);`],
]);

patch('src/components/game/locationTabs.tsx', [
  ['context field',
`  useApplianceService: GameStore['useApplianceService'];`,
`  applianceServiceAction: GameStore['useApplianceService'];`],
  ['forge destructure',
`  const { player, priceModifier, spendTime, modifyHappiness, temperEquipment, useApplianceService, forgeRepairEquipment, salvageEquipment } = ctx;`,
`  const { player, priceModifier, spendTime, modifyHappiness, temperEquipment, applianceServiceAction, forgeRepairEquipment, salvageEquipment } = ctx;`],
  ['forge prop',
`    useApplianceService,`,
`    applianceServiceAction,`],
]);

patch('src/components/game/LocationPanel.tsx', [
  ['context assignment',
`    useApplianceService: store.useApplianceService,`,
`    applianceServiceAction: store.useApplianceService,`],
]);
