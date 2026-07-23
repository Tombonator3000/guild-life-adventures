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
  ['vendor import',
`import { createServiceActions } from './economy/serviceHelpers';`,
`import { createServiceActions } from './economy/serviceHelpers';
import { createVendorActions } from './economy/vendorHelpers';`],
  ['vendor spread',
`    ...createServiceActions(set, get),`,
`    ...createServiceActions(set, get),
    ...createVendorActions(set, get),`],
]);

patch('src/store/storeTypes.ts', [
  ['vendor signature',
`  purchaseNewspaper: (playerId: string, vendor: 'general-store' | 'shadow-market') => ActionResult | void;`,
`  purchaseNewspaper: (playerId: string, vendor: 'general-store' | 'shadow-market') => ActionResult | void;
  purchaseVendorItem: (playerId: string, vendor: 'general-store' | 'shadow-market', itemId: string) => ActionResult | void;`],
]);

patch('src/network/types.ts', [
  ['remove numeric vendor actions',
`  'buyFreshFood',
  'buyLotteryTicket',
  'buyTicket',
  'buyFoodWithSpoilage',`,
`  // Vendor intent only. Host resolves catalogue, price, discount and effect.
  'purchaseVendorItem',`],
]);

patch('src/components/game/LocationPanel.tsx', [
  ['vendor context assignments',
`    buyFreshFood: store.buyFreshFood,
    buyFoodWithSpoilage: store.buyFoodWithSpoilage,
    buyLotteryTicket: store.buyLotteryTicket,
    buyTicket: store.buyTicket,`,
`    purchaseVendorItem: store.purchaseVendorItem,`],
]);

patch('src/components/game/locationTabs.tsx', [
  ['vendor context fields',
`  buyFreshFood: GameStore['buyFreshFood'];
  buyFoodWithSpoilage: GameStore['buyFoodWithSpoilage'];
  buyLotteryTicket: GameStore['buyLotteryTicket'];
  buyTicket: GameStore['buyTicket'];`,
`  purchaseVendorItem: GameStore['purchaseVendorItem'];`],
  ['general store context',
`  const { player, priceModifier, modifyGold, spendTime, modifyFood, modifyHappiness,
    onBuyNewspaper, buyFreshFood, buyFoodWithSpoilage, buyLotteryTicket } = ctx;`,
`  const { player, priceModifier } = ctx;`],
  ['general store props',
`        priceModifier={priceModifier}
        modifyGold={modifyGold}
        spendTime={spendTime}
        modifyFood={modifyFood}
        modifyHappiness={modifyHappiness}
        onBuyNewspaper={onBuyNewspaper}
        buyFreshFood={buyFreshFood}
        buyFoodWithSpoilage={buyFoodWithSpoilage}
        buyLotteryTicket={buyLotteryTicket}`, 
`        priceModifier={priceModifier}`],
  ['shadow market context',
`  const { player, players, priceModifier, spendTime, modifyGold, modifyHappiness, modifyFood,
    buyLotteryTicket, buyTicket, economyTrend, week, weeklyNewsEvents, onShowNewspaper } = ctx;`,
`  const { player, players, priceModifier, modifyGold,
    economyTrend, week, weeklyNewsEvents, onShowNewspaper } = ctx;`],
  ['shadow market props',
`  const shadowMarketProps = {
    player,
    priceModifier,
    onSpendTime: (hours: number) => spendTime(player.id, hours),
    onModifyGold: (amount: number) => modifyGold(player.id, amount),
    onModifyHappiness: (amount: number) => modifyHappiness(player.id, amount),
    onModifyFood: (amount: number) => modifyFood(player.id, amount),
    buyLotteryTicket,
    buyTicket,
  };`,
`  const shadowMarketProps = {
    player,
    priceModifier,
  };`],
]);

patch('src/components/game/ShadowMarketPanel.tsx', [
  ['shadow props interface',
`  onSpendTime: (hours: number) => void;
  onModifyGold: (amount: number) => void;
  onModifyHappiness: (amount: number) => void;
  onModifyFood: (amount: number) => void;
  buyLotteryTicket: (playerId: string, cost: number) => void;
  buyTicket: (playerId: string, ticketType: string, cost: number) => void;
  section?: ShadowMarketSection;`,
`  section?: ShadowMarketSection;`],
  ['shadow destructure',
`  onSpendTime,
  onModifyGold,
  onModifyHappiness,
  onModifyFood,
  buyLotteryTicket,
  buyTicket,
  section,`,
`  section,`],
  ['shadow store selectors',
`  const { buyAppliance, buyDurable } = useGameStore();`,
`  const buyAppliance = useGameStore(s => s.buyAppliance);
  const purchaseVendorItem = useGameStore(s => s.purchaseVendorItem);`],
  ['replace purchase handler body',
`  const handleBuyItem = (item: typeof SHADOW_MARKET_ITEMS[0], price: number) => {
    const itemName = t(\`items.\${item.id}.name\`) || item.name;

    if (item.isLotteryTicket) {
      buyLotteryTicket(player.id, price);
      toast.success(t('panelStore.purchased', { name: itemName }) + \` (\${player.lotteryTickets + 1} tickets for this week)\`);
      return;
    }

    if (item.isTicket && item.ticketType) {
      if (player.tickets.includes(item.ticketType)) {
        toast.error('You already have this ticket!');
        return;
      }
      buyTicket(player.id, item.ticketType, price);
      toast.success(t('panelStore.purchased', { name: itemName }));
      return;
    }

    onModifyGold(-price);

    if (item.effect?.type === 'food') {
      onModifyFood(item.effect.value);
    }
    if (item.effect?.type === 'happiness') {
      onModifyHappiness(item.effect.value);
    }
    toast.success(t('panelStore.purchased', { name: itemName }));
  };`,
`  const handleBuyItem = (item: typeof SHADOW_MARKET_ITEMS[0]) => {
    const itemName = t(\`items.\${item.id}.name\`) || item.name;
    const result = purchaseVendorItem(player.id, 'shadow-market', item.id);
    if (!result) return;
    if (result.success) {
      const ticketNote = item.isLotteryTicket
        ? \` (\${player.lotteryTickets + 1} tickets for this week)\`
        : '';
      toast.success(t('panelStore.purchased', { name: itemName }) + ticketNote);
    } else {
      toast.error(result.message);
    }
  };`],
  ['regular handler call',
`onClick={() => handleBuyItem(item, price)}`,
`onClick={() => handleBuyItem(item)}`],
  ['lottery handler call',
`onClick={() => handleBuyItem(item, price)}`,
`onClick={() => handleBuyItem(item)}`],
  ['ticket handler call',
`onClick={() => handleBuyItem(item, price)}`,
`onClick={() => handleBuyItem(item)}`],
  ['scholar purchase',
`            onClick={() => {
              buyDurable(player.id, item.id, price);
              toast.success(t('panelStore.purchased', { name: itemName }));
            }}`,
`            onClick={() => {
              const result = purchaseVendorItem(player.id, 'shadow-market', item.id);
              if (!result) return;
              if (result.success) toast.success(t('panelStore.purchased', { name: itemName }));
              else toast.error(result.message);
            }}`],
]);

patch('src/test/multiplayer.test.ts', [
  ['cross-player vendor list',
`      'repayLoan', 'buyFreshFood', 'buyLotteryTicket', 'buyTicket',
      'buyGuildPass', 'takeQuest', 'completeQuest', 'abandonQuest',`,
`      'repayLoan', 'purchaseVendorItem',
      'buyGuildPass', 'takeQuest', 'completeQuest', 'abandonQuest',`],
]);
