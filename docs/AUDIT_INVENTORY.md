# Automatisk revisjonsinventar

Generert: 2026-07-23 09:08 UTC

Denne rapporten er maskinelt generert fra hele kildekoden. Definisjoner i store-laget er tatt med separat; kall utenfor store-laget er viktigst for migrering.

## Sammendrag

- TypeScript/TSX-filer: 326
- GameBoard-linjer: 727
- Rå modify-kall utenfor store: 78
- Pris-/effektbærende kall utenfor store: 51
- Hele-store useGameStore()-abonnementer: 0
- E2E-testfiler: 1

## Rå statsmutasjoner utenfor store-laget

```text
src/components/game/TavernPanel.tsx:69:                modifyGold(player.id, -price);
src/components/game/TavernPanel.tsx:71:                  modifyFood(player.id, item.effect.value);
src/components/game/TavernPanel.tsx:74:                  modifyHappiness(player.id, item.effect.value);
src/components/game/TavernPanel.tsx:84:                    modifyHealth(player.id, -damage);
src/components/game/CavePanel.tsx:517:    if (delta !== 0) modifyHealth(player.id, delta);
src/components/game/CavePanel.tsx:530:    if (result.goldEarned > 0) modifyGold(player.id, result.goldEarned);
src/components/game/CavePanel.tsx:541:    if (result.happinessChange !== 0) modifyHappiness(player.id, result.happinessChange);
src/components/game/CavePanel.tsx:869:            modifyHealth(player.id, healAmount);
src/components/game/CavePanel.tsx:870:            modifyHappiness(player.id, 1);
src/components/game/HomePanel.tsx:143:    modifyHappiness(player.id, 3);
src/components/game/HomePanel.tsx:144:    modifyRelaxation(player.id, 5);
src/components/game/HomePanel.tsx:149:    modifyHappiness(player.id, 8);
src/components/game/HomePanel.tsx:150:    modifyHealth(player.id, 10);
src/components/game/HomePanel.tsx:151:    modifyRelaxation(player.id, 5);
src/components/game/locationTabs.tsx:293:    modifyHappiness: (id: string, amount: number) => modifyHappiness(id, amount),
src/components/game/locationTabs.tsx:518:            modifyGold(player.id, -cost);
src/components/game/locationTabs.tsx:519:            modifyHealth(player.id, healthGain);
src/components/game/locationTabs.tsx:523:            modifyGold(player.id, -cost);
src/components/game/locationTabs.tsx:528:            modifyGold(player.id, -cost);
src/components/game/locationTabs.tsx:529:            modifyMaxHealth(player.id, 10);
src/components/game/locationTabs.tsx:649:    onModifyGold: (amount: number) => modifyGold(player.id, amount),
src/components/game/locationTabs.tsx:650:    onModifyHappiness: (amount: number) => modifyHappiness(player.id, amount),
src/components/game/locationTabs.tsx:651:    onModifyFood: (amount: number) => modifyFood(player.id, amount),
src/components/game/locationTabs.tsx:672:              modifyGold(player.id, -shadowNewspaperPrice);
src/components/game/locationTabs.tsx:733:  'used-clothes': (ctx) => ctx.modifyClothing(ctx.player.id, 50),
src/components/game/locationTabs.tsx:734:  'used-blanket': (ctx) => ctx.modifyHappiness(ctx.player.id, 3),
src/components/game/locationTabs.tsx:764:      modifyGold(player.id, -price);
src/components/game/locationTabs.tsx:769:      modifyGold(player.id, -stake);
src/components/game/locationTabs.tsx:772:        modifyGold(player.id, odds.payout);
src/components/game/locationTabs.tsx:773:        modifyHappiness(player.id, odds.winHappiness);
src/components/game/locationTabs.tsx:775:        modifyHappiness(player.id, odds.loseHappiness);
src/components/game/locationTabs.tsx:853:          modifyGold(player.id, -cost);
src/components/game/locationTabs.tsx:854:          modifyHappiness(player.id, happinessGain);
src/components/game/locationTabs.tsx:858:          modifyGold(player.id, -cost);
src/components/game/locationTabs.tsx:859:          modifyRelaxation(player.id, relaxationGain);
src/components/game/locationTabs.tsx:863:          modifyGold(player.id, -cost);
src/components/game/locationTabs.tsx:864:          modifyMaxHealth(player.id, maxHealthGain);
src/components/game/LocationPanel.tsx:75:    store.modifyGold(player.id, -price);
src/components/game/ForgePanel.tsx:158:                    modifyHappiness(player.id, 2);
src/components/game/tabs/DeveloperTab.tsx:139:              modifyGold(playerId, 10000);
src/components/game/tabs/DeveloperTab.tsx:140:              modifyHappiness(playerId, 1000);
src/components/game/tabs/DeveloperTab.tsx:213:          <button onClick={() => modifyGold(playerId, 500)} className={SMALL_BTN}>+500g</button>
src/components/game/tabs/DeveloperTab.tsx:214:          <button onClick={() => modifyGold(playerId, -500)} className={SMALL_BTN}>-500g</button>
src/components/game/tabs/DeveloperTab.tsx:215:          <button onClick={() => modifyGold(playerId, 5000)} className={SMALL_BTN}>+5000g</button>
src/components/game/tabs/DeveloperTab.tsx:218:          <button onClick={() => modifyHealth(playerId, 50)} className={SMALL_BTN}>+50 HP</button>
src/components/game/tabs/DeveloperTab.tsx:219:          <button onClick={() => modifyHealth(playerId, -50)} className={SMALL_BTN}>-50 HP</button>
src/components/game/tabs/DeveloperTab.tsx:220:          <button onClick={() => modifyHealth(playerId, 100)} className={SMALL_BTN}>Full HP</button>
src/components/game/tabs/DeveloperTab.tsx:223:          <button onClick={() => modifyHappiness(playerId, 50)} className={SMALL_BTN}>+50 Hap</button>
src/components/game/tabs/DeveloperTab.tsx:224:          <button onClick={() => modifyFood(playerId, 50)} className={SMALL_BTN}>+50 Food</button>
src/components/game/tabs/DeveloperTab.tsx:225:          <button onClick={() => modifyClothing(playerId, 50)} className={SMALL_BTN}>+50 Cloth</button>
src/components/game/tabs/DeveloperTab.tsx:229:          <button onClick={() => modifyRelaxation(playerId, 20)} className={SMALL_BTN}>+20 Relax</button>
src/components/game/tabs/DeveloperTab.tsx:260:              modifyGold(playerId, -50);
src/components/game/tabs/DeveloperTab.tsx:279:              modifyHealth(playerId, -30);
src/components/game/tabs/DeveloperTab.tsx:282:              modifyGold(playerId, -100);
src/components/game/tabs/DeveloperTab.tsx:343:        <button onClick={() => modifyMaxHealth(playerId, 20)} className={DEBUG_BTN}>
src/components/game/ArmoryPanel.tsx:164:                  modifyGold(player.id, -price);
src/components/game/ArmoryPanel.tsx:167:                    modifyHappiness(player.id, item.effect.value);
src/components/game/ArmoryPanel.tsx:241:                      modifyGold(player.id, -price);
src/components/game/ArmoryPanel.tsx:242:                      modifyClothing(player.id, clothingValue);
src/components/game/ArmoryPanel.tsx:244:                        modifyHappiness(player.id, item.happinessOnPurchase);
src/components/game/ArmoryPanel.tsx:323:              modifyGold(player.id, -price);
src/components/game/ArmoryPanel.tsx:324:              modifyClothing(player.id, clothingValue);
src/components/game/ArmoryPanel.tsx:326:                modifyHappiness(player.id, item.happinessOnPurchase);
src/hooks/ai/actionExecutor.ts:177:  store.modifyHappiness(player.id, happinessGain);
src/hooks/ai/actionExecutor.ts:178:  store.modifyRelaxation(player.id, relaxGain);
src/hooks/ai/actionExecutor.ts:186:  store.modifyGold(player.id, -cost);
src/hooks/ai/actionExecutor.ts:187:  store.modifyHealth(player.id, healAmount);
src/hooks/ai/actionExecutor.ts:195:  store.modifyGold(player.id, -cost);
src/hooks/ai/handlers/questDungeonHandlers.ts:127:  if (actualGold > 0) store.modifyGold(playerId, actualGold);
src/hooks/ai/handlers/questDungeonHandlers.ts:128:  if (result.healthChange !== 0) store.modifyHealth(playerId, result.healthChange);
src/hooks/ai/handlers/questDungeonHandlers.ts:132:    store.modifyHappiness(playerId, floor.happinessOnClear);
src/hooks/ai/handlers/questDungeonHandlers.ts:134:    store.modifyHappiness(playerId, -2);
src/hooks/ai/handlers/hexHandlers.ts:32:  store.modifyGold(player.id, -cost);
src/hooks/ai/handlers/equipmentHandlers.ts:44:  store.modifyHappiness(player.id, 2);
src/hooks/ai/handlers/resourceHandlers.ts:24:  store.modifyGold(player.id, -cost);
src/hooks/ai/handlers/resourceHandlers.ts:25:  store.modifyFood(player.id, foodGain);
src/hooks/ai/handlers/resourceHandlers.ts:36:  store.modifyGold(player.id, -cost);
src/hooks/ai/handlers/resourceHandlers.ts:37:  store.modifyClothing(player.id, clothingGain);
```

## Handlinger der klienten kan sende pris, beløp, tid eller effekt

```text
src/components/game/AcademyPanel.tsx:114:                        studyDegree(player.id, degId, price, degree.hoursPerSession);
src/components/game/AcademyPanel.tsx:126:                          studyDegree(player.id, degId, price, player.timeRemaining);
src/components/game/AcademyPanel.tsx:138:                          payFullTuition(player.id, degId, fullCourseCost, sessionsLeft);
src/components/game/EnchanterPanel.tsx:31:    const happinessGain = buyAppliance(player.id, applianceId, price, 'enchanter');
src/components/game/PawnShopPanel.tsx:117:                  pawnAppliance(player.id, applianceId, pawnValue);
src/components/game/PawnShopPanel.tsx:201:                buyAppliance(player.id, appliance.id, salePrice, 'pawn');
src/components/game/ShadowMarketPanel.tsx:51:    const happinessGain = buyAppliance(player.id, applianceId, price, 'market');
src/components/game/ShadowMarketPanel.tsx:65:      buyLotteryTicket(player.id, price);
src/components/game/ShadowMarketPanel.tsx:75:      buyTicket(player.id, item.ticketType, price);
src/components/game/ShadowMarketPanel.tsx:192:              buyDurable(player.id, item.id, price);
src/components/game/HexShopPanel.tsx:34:    store.buyHexScroll(player.id, hex.id, price);
src/components/game/HexShopPanel.tsx:61:    store.buyProtectiveAmulet(player.id, price);
src/components/game/HexShopPanel.tsx:67:    const result = store.dispelLocationHex(player.id, price);
src/components/game/LandlordPanel.tsx:89:                prepayRent(player.id, 1, effectiveRent);
src/components/game/LandlordPanel.tsx:102:                prepayRent(player.id, 4, effectiveRent * 4);
src/components/game/LandlordPanel.tsx:115:                prepayRent(player.id, 8, effectiveRent * 8);
src/components/game/LandlordPanel.tsx:186:                  moveToHousing(player.id, tier, moveCost, tierMarketRent);
src/components/game/WorkSection.tsx:79:            const worked = workShift(player.id, jobData.hoursPerShift, player.currentWage);
src/components/game/WorkSection.tsx:94:              const worked = workShift(player.id, partialHours, player.currentWage);
src/components/game/WorkSection.tsx:127:          const worked = workShift(player.id, jobData.hoursPerShift, player.currentWage);
src/components/game/WorkSection.tsx:142:            const worked = workShift(player.id, partialHours, player.currentWage);
src/components/game/GraveyardHexPanel.tsx:26:    const result = store.performDarkRitual(player.id, ritualCost);
src/components/game/GraveyardHexPanel.tsx:37:    const result = store.attemptCurseReflection(player.id, reflectionCost);
src/components/game/GraveyardHexPanel.tsx:46:    const result = store.cleanseCurse(player.id, cleanseCost);
src/components/game/locationTabs.tsx:143:      const worked = workShift(player.id, currentJobData.hoursPerShift, player.currentWage);
src/components/game/locationTabs.tsx:181:            negotiateRaise(player.id, newWage);
src/components/game/locationTabs.tsx:736:    ctx.buyDurable(ctx.player.id, 'sword', 0);
src/components/game/locationTabs.tsx:741:    ctx.buyDurable(ctx.player.id, 'shield', 0);
src/components/game/locationTabs.tsx:761:      sellItem(player.id, itemId, price);
src/components/game/ForgePanel.tsx:156:                    temperEquipment(player.id, item.id, slot, cost);
src/components/game/ForgePanel.tsx:427:                  salvageEquipment(player.id, item.id, slot, salvageValue);
src/components/game/GeneralStorePanel.tsx:59:              const success = buyFoodWithSpoilage(player.id, item.effect!.value, price);
src/components/game/GeneralStorePanel.tsx:87:              const success = buyFreshFood(player.id, units, price);
src/components/game/GeneralStorePanel.tsx:138:          buyLotteryTicket(player.id, lotteryPrice);
src/components/game/ArmoryPanel.tsx:165:                  buyDurable(player.id, item.id, 0); // Gold already deducted
src/hooks/ai/handlers/housingFinanceHandlers.ts:32:  store.moveToHousing(player.id, tier, cost, rent);
src/hooks/ai/handlers/housingFinanceHandlers.ts:40:  store.moveToHousing(player.id, tier, 0, RENT_COSTS[tier]);
src/hooks/ai/handlers/hexHandlers.ts:41:  const result = store.dispelLocationHex(player.id, cost);
src/hooks/ai/handlers/hexHandlers.ts:48:  const result = store.performDarkRitual(player.id, cost);
src/hooks/ai/handlers/employmentEducationHandlers.ts:31:  store.workShift(player.id, hours, wage);
src/hooks/ai/handlers/employmentEducationHandlers.ts:64:  store.studyDegree(player.id, degreeId, cost, hours);
src/hooks/ai/handlers/equipmentHandlers.ts:19:  store.buyAppliance(player.id, applianceId, cost, source);
src/hooks/ai/handlers/equipmentHandlers.ts:29:  store.buyDurable(player.id, itemId, cost);
src/hooks/ai/handlers/equipmentHandlers.ts:41:  store.temperEquipment(player.id, itemId, slot as EquipmentSlot, cost);
src/hooks/ai/handlers/equipmentHandlers.ts:61:  store.sellItem(player.id, itemId, price);
src/hooks/ai/handlers/equipmentHandlers.ts:70:  store.pawnAppliance(player.id, applianceId, pawnValue);
src/hooks/ai/handlers/equipmentHandlers.ts:99:  store.buyProtectiveAmulet(player.id, cost);
src/hooks/ai/handlers/resourceHandlers.ts:18:    store.buyFoodWithSpoilage(player.id, foodGain, cost);
src/hooks/ai/handlers/resourceHandlers.ts:46:  store.buyFreshFood(player.id, units, cost);
src/hooks/ai/handlers/resourceHandlers.ts:55:  store.buyTicket(player.id, ticketType, cost);
src/hooks/ai/handlers/resourceHandlers.ts:63:  store.buyLotteryTicket(player.id, cost);
```

## Hele-store Zustand-abonnementer

```text
```

## Multiplayer-allowlist

```text
export const ALLOWED_GUEST_ACTIONS = new Set([
  'movePlayer',
  'spendTime',
  'endTurn',

  // Legacy raw mutations still used by older UI flows. Keep bounded by
  // STAT_MODIFIER_RULES until each remaining caller is migrated.
  'modifyGold',
  'modifyHealth',
  'modifyHappiness',
  'modifyFood',
  'modifyClothing',
  'modifyMaxHealth',
  'modifyRelaxation',
  'cureSickness',

  'setHousing',
  'payRent',
  'prepayRent',
  'moveToHousing',
  'begForMoreTime',

  'setJob',
  'workShift',
  'requestRaise',
  'negotiateRaise',
  'studySession',
  'studyDegree',
  'payFullTuition',

  'depositToBank',
  'withdrawFromBank',
  'invest',
  'withdrawInvestment',
  'buyItem',
  'sellItem',
  'buyDurable',
  'sellDurable',
  'buyAppliance',
  'repairAppliance',
  'pawnAppliance',
  'redeemAppliance',
  'equipItem',
  'unequipItem',
  'temperEquipment',
  'forgeRepairAppliance',
  'forgeRepairEquipment',
  'salvageEquipment',
  'applyDurabilityLoss',

  'buyStock',
  'sellStock',
  'takeLoan',
  'repayLoan',

  'buyFreshFood',
  'buyLotteryTicket',
  'buyTicket',
  'buyFoodWithSpoilage',

  'buyGuildPass',
  'takeQuest',
  'takeChainQuest',
  'takeNonLinearChain',
  'completeNonLinearChainStep',
  'makeNLChainChoice',
  'takeBounty',
  'completeQuest',
  'completeLocationObjective',
  'completeBounty',
  'completeChainQuest',
  'abandonQuest',
  'incrementDungeonAttempts',

  'buyHexScroll',
  'castLocationHex',
  'castPersonalCurse',
  'buyProtectiveAmulet',
  'dispelLocationHex',
  'cleanseCurse',
  'performDarkRitual',
  'attemptCurseReflection',

  'sabotagePlayer',
  'buyProtection',
  'buyTipOff',
  'purchaseReputationUnlock',

  // Canonical, atomic services. The host looks up price, time and effect.
  'useHealerService',
  'useGraveyardService',
  'gambleAtFence',
  'purchaseNewspaper',
]);
```

## Store-signaturer med klientleverte tallverdier

```text
39:  workShift: (playerId: string, hours: number, wage: number) => boolean;
41:  negotiateRaise: (playerId: string, newWage: number) => void;
43:  studySession: (playerId: string, path: EducationPath, cost: number, hours: number) => void;
45:  studyDegree: (playerId: string, degreeId: DegreeId, cost: number, hours: number) => void;
46:  payFullTuition: (playerId: string, degreeId: DegreeId, totalCost: number, sessions: number) => void;
54:  invest: (playerId: string, amount: number) => void;
55:  withdrawInvestment: (playerId: string, amount: number) => void;
56:  buyItem: (playerId: string, itemId: string, cost: number) => void;
57:  buyDurable: (playerId: string, itemId: string, cost: number) => void;
58:  sellItem: (playerId: string, itemId: string, price: number) => void;
59:  sellDurable: (playerId: string, itemId: string, price: number) => void;
87:  buyAppliance: (playerId: string, applianceId: string, price: number, source: ApplianceSource) => number;
89:  pawnAppliance: (playerId: string, applianceId: string, pawnValue: number) => void;
91:  prepayRent: (playerId: string, weeks: number, totalCost: number) => void;
92:  moveToHousing: (playerId: string, tier: HousingTier, cost: number, lockInRent: number) => void;
109:  buyFreshFood: (playerId: string, units: number, cost: number) => boolean;
110:  buyFoodWithSpoilage: (playerId: string, foodValue: number, cost: number) => boolean;
111:  buyLotteryTicket: (playerId: string, cost: number) => void;
112:  buyTicket: (playerId: string, ticketType: string, cost: number) => void;
113:  temperEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, cost: number) => void;
116:  salvageEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, value: number) => void;
118:  buyHexScroll: (playerId: string, hexId: string, cost: number) => void;
121:  buyProtectiveAmulet: (playerId: string, cost: number) => void;
122:  dispelLocationHex: (playerId: string, cost: number) => { success: boolean; message: string };
123:  cleanseCurse: (playerId: string, cost: number) => { success: boolean; message: string };
124:  performDarkRitual: (playerId: string, cost: number) => { success: boolean; message: string; backfired?: boolean };
125:  attemptCurseReflection: (playerId: string, cost: number) => { success: boolean; message: string };
```

## E2E-dekning

### e2e/smoke.spec.ts
```text
3:test('title screen loads without runtime errors', async ({ page }) => {
9:  await expect(page.getByRole('heading', { name: 'Guild Life' })).toBeVisible();
10:  await expect(page.getByText('Welcome to Guildholm')).toBeVisible();
11:  await expect(page.getByRole('button', { name: /new adventure/i })).toBeVisible();
12:  expect(pageErrors).toEqual([]);
15:test('a new adventure opens the game setup screen', async ({ page }) => {
22:  await expect(page.getByRole('heading', { name: 'Prepare Your Adventure' })).toBeVisible();
23:  await expect(page.getByRole('heading', { name: 'Victory Goals' })).toBeVisible();
24:  await expect(page.getByRole('button', { name: 'Begin Adventure' })).toBeVisible();
25:  expect(pageErrors).toEqual([]);
```

## TODO/FIXME og eksplisitte kompatibilitetsmerknader

```text
src/types/game.types.ts:298:  // UI components may use optional chaining as defensive practice for old-save compatibility.
src/types/game.types.ts:480:// Legacy constant for backward compatibility
src/network/types.ts:39:  | { type: 'player-disconnected'; playerName: string; temporary?: boolean }
src/network/types.ts:134:  // Legacy raw mutations still used by older UI flows. Keep bounded by
src/network/useOnlineGame.ts:533:        const isTemporary = message.temporary ?? false;
src/network/useOnlineGame.ts:595:        temporary: true,
src/network/PeerManager.ts:480:        // Notify game about temporary disconnect (for UI)
src/store/helpers/workEducationHelpers.ts:58:// Map degrees to legacy education paths for quest compatibility
src/store/helpers/workEducationHelpers.ts:389:          // Update legacy education field for quest compatibility
src/store/gameStore.ts:302:        // Legacy single-AI path (backwards compatible)
src/audio/sfxManager.ts:158:    // Volume controlled via GainNode (element.volume stays at 1 for iOS compatibility)
src/audio/sfxManager.ts:195:  /** Get current settings - returns cached immutable object for React compatibility. */
src/audio/audioManager.ts:133:  /** Get current settings - returns cached immutable object for React compatibility. */
src/audio/speechNarrator.ts:103:    // Cancel current speech with delay workaround (Bug 3)
src/i18n/es.ts:258:    narrationNotSupported: 'La narración por voz no es compatible con este navegador.',
src/data/education.ts:6:// Re-export types for backwards compatibility
src/data/events.ts:315:      'Your employer announces "temporary" wage adjustments.',
src/data/locations.ts:288:// Convert zone config to Location format for backward compatibility
src/data/newspaper.ts:538:          `Economic pressures have forced employers to slash wages. ${event.playerName}'s income has been reduced. Employers promise the cuts are "temporary." Historians note this promise has a 0% track record.`,
src/data/jobs/definitions.ts:596:// Legacy exports for backwards compatibility
src/data/banter.ts:699:    { text: "Death is temporary in Guildholm. The bill, however, is permanent.", mood: 'grumpy' },
src/hooks/useGrimwaldAI.ts:32:// Re-export types for backwards compatibility
```
