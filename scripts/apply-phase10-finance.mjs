import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transform) {
  const source = readFileSync(path, 'utf8');
  const next = transform(source);
  if (next === source) throw new Error(`No changes applied to ${path}`);
  writeFileSync(path, next);
  console.log(`Patched ${path}`);
}

patch('src/store/helpers/economyHelpers.ts', source => source
  .replace(
    `import { createHousingServiceActions } from './economy/housingServiceHelpers';`,
    `import { createHousingServiceActions } from './economy/housingServiceHelpers';\nimport { createFinanceServiceActions } from './economy/financeServiceHelpers';`,
  )
  .replace(
    `    ...createHousingServiceActions(set, get),`,
    `    ...createHousingServiceActions(set, get),\n    ...createFinanceServiceActions(set, get),`,
  ));

patch('src/store/storeTypes.ts', source => source
  .replace(
    `  withdrawInvestment: (playerId: string, amount: number) => void;`,
    `  withdrawInvestment: (playerId: string, amount: number) => void;\n  transferBankFunds: (playerId: string, direction: 'deposit' | 'withdraw', amount: number) => ActionResult | void;\n  manageInvestment: (playerId: string, service: 'invest' | 'withdraw', amount: number) => ActionResult | void;`,
  )
  .replace(
    `  repayLoan: (playerId: string, amount: number) => void;`,
    `  repayLoan: (playerId: string, amount: number) => void;\n  tradeStock: (playerId: string, side: 'buy' | 'sell', stockId: string, shares: number) => ActionResult | void;\n  manageLoan: (playerId: string, service: 'borrow' | 'repay', amount: number | 'all') => ActionResult | void;`,
  ));

patch('src/network/types.ts', source => source
  .replace(
    `  'depositToBank',\n  'withdrawFromBank',\n  'invest',\n  'withdrawInvestment',`,
    `  // Finance intent only. Host validates Bank location, balances, products and live prices.\n  'transferBankFunds',\n  'manageInvestment',`,
  )
  .replace(
    `  'buyStock',\n  'sellStock',\n  'takeLoan',\n  'repayLoan',`,
    `  'tradeStock',\n  'manageLoan',`,
  ));

patch('src/components/game/BankPanel.tsx', source => {
  let next = source
    .replace(`import { useTranslation } from '@/i18n';`, `import { useTranslation } from '@/i18n';\nimport { useGameStore } from '@/store/gameStore';`)
    .replace(/\n  spendTime\?: \(playerId: string, hours: number\) => void;\n  depositToBank:[\s\S]*?  repayLoan: \(playerId: string, amount: number\) => void;/, '')
    .replace(/export function BankPanel\(\{\n  player,\n  priceModifier = 1\.0,\n  depositToBank,\n  withdrawFromBank,\n  buyStock,\n  sellStock,\n  takeLoan,\n  repayLoan,\n  stockPrices,\n  stockPriceHistory,\n\}: BankPanelProps\) \{/, `export function BankPanel({\n  player,\n  priceModifier = 1.0,\n  stockPrices,\n  stockPriceHistory,\n}: BankPanelProps) {`)
    .replace(
      `  const { t } = useTranslation();\n  const [view, setView] = useState<BankView>('main');`,
      `  const { t } = useTranslation();\n  const transferFunds = useGameStore(state => state.transferBankFunds);\n  const investmentAction = useGameStore(state => state.manageInvestment);\n  const stockTradeAction = useGameStore(state => state.tradeStock);\n  const loanAction = useGameStore(state => state.manageLoan);\n  const [view, setView] = useState<BankView>('main');\n\n  const report = (result: { success: boolean; message: string } | void) => {\n    if (!result) return;\n    if (result.success) toast.success(result.message);\n    else toast.error(result.message);\n  };`,
    );

  next = next.replace(
    `                      buyStock(player.id, stock.id, 1);\n                      toast.success(t('panelBank.boughtShare', { name: t(\`stocks.\${stock.id}.name\`) || stock.name }));`,
    `                      report(stockTradeAction(player.id, 'buy', stock.id, 1));`,
  );
  next = next.replace(
    `                      sellStock(player.id, stock.id, 1);\n                      toast.success(t('panelBank.soldShare', { name: t(\`stocks.\${stock.id}.name\`) || stock.name }));`,
    `                      report(stockTradeAction(player.id, 'sell', stock.id, 1));`,
  );
  next = next.replace(
    `                    repayLoan(player.id, actual);\n                    toast.success(t('panelBank.loanRepaid', { amount: actual }));`,
    `                    report(loanAction(player.id, 'repay', actual));`,
  );
  next = next.replace(
    `                repayLoan(player.id, player.loanAmount);\n                toast.success(t('panelBank.loanRepaid', { amount: player.loanAmount }));`,
    `                report(loanAction(player.id, 'repay', 'all'));`,
  );
  next = next.replace(
    `                  takeLoan(player.id, amount);\n                  toast.success(t('panelBank.loanTaken', { amount }));`,
    `                  report(loanAction(player.id, 'borrow', amount));`,
  );
  next = next.replace(
    `          depositToBank(player.id, 50);\n          toast.success(t('panelBank.deposited', { amount: 50 }));`,
    `          report(transferFunds(player.id, 'deposit', 50));`,
  );
  next = next.replace(
    `          withdrawFromBank(player.id, 50);\n          toast.success(t('panelBank.withdrawn', { amount: 50 }));`,
    `          report(transferFunds(player.id, 'withdraw', 50));`,
  );

  const investmentAnchor = `      <JonesSectionHeader title={t('panelBank.loans')} />`;
  const investmentSection = `      <JonesSectionHeader title="Investments" />\n      <JonesMenuItem\n        label="Invest 50 gold"\n        price={50}\n        disabled={player.gold < 50}\n        darkText\n        largeText\n        onClick={() => report(investmentAction(player.id, 'invest', 50))}\n      />\n      <JonesMenuItem\n        label="Withdraw 50 invested gold (10% fee)"\n        disabled={player.investments < 50}\n        darkText\n        largeText\n        onClick={() => report(investmentAction(player.id, 'withdraw', 50))}\n      />\n      ${investmentAnchor}`;
  if (!next.includes(investmentAnchor)) throw new Error('Bank investment insertion point not found');
  next = next.replace(investmentAnchor, investmentSection);

  for (const legacy of ['depositToBank(', 'withdrawFromBank(', 'buyStock(', 'sellStock(', 'takeLoan(', 'repayLoan(']) {
    if (next.includes(legacy)) throw new Error(`Legacy BankPanel action remains: ${legacy}`);
  }
  return next;
});

patch('src/components/game/locationTabs.tsx', source => {
  let next = source
    .replace(`  depositToBank: GameStore['depositToBank'];\n  withdrawFromBank: GameStore['withdrawFromBank'];\n`, '')
    .replace(`  buyStock: GameStore['buyStock'];\n  sellStock: GameStore['sellStock'];\n  takeLoan: GameStore['takeLoan'];\n  repayLoan: GameStore['repayLoan'];\n`, '')
    .replace(
      `  const { player, priceModifier, depositToBank, withdrawFromBank, buyStock, sellStock, takeLoan, repayLoan, stockPrices, stockPriceHistory } = ctx;`,
      `  const { player, priceModifier, stockPrices, stockPriceHistory } = ctx;`,
    )
    .replace(`        depositToBank={depositToBank}\n        withdrawFromBank={withdrawFromBank}\n        buyStock={buyStock}\n        sellStock={sellStock}\n        takeLoan={takeLoan}\n        repayLoan={repayLoan}\n`, '');
  if (next.includes("depositToBank: GameStore['depositToBank']") || next.includes('buyStock={')) {
    throw new Error('Legacy Bank location props remain');
  }
  return next;
});

patch('src/components/game/LocationPanel.tsx', source => source
  .replace(`    depositToBank: store.depositToBank,\n    withdrawFromBank: store.withdrawFromBank,\n`, '')
  .replace(`    buyStock: store.buyStock,\n    sellStock: store.sellStock,\n    takeLoan: store.takeLoan,\n    repayLoan: store.repayLoan,\n`, ''));

patch('src/hooks/ai/actionExecutor.ts', source => source
  .replace(
    `  depositToBank: (playerId: string, amount: number) => void;\n  withdrawFromBank: (playerId: string, amount: number) => void;`,
    `  transferBankFunds: (playerId: string, direction: 'deposit' | 'withdraw', amount: number) => { success: boolean; message: string } | void;`,
  )
  .replace(
    `  takeLoan: (playerId: string, amount: number) => void;\n  repayLoan: (playerId: string, amount: number) => void;\n  buyStock: (playerId: string, stockId: string, shares: number) => void;\n  sellStock: (playerId: string, stockId: string, shares: number) => void;`,
    `  manageLoan: (playerId: string, service: 'borrow' | 'repay', amount: number | 'all') => { success: boolean; message: string } | void;\n  tradeStock: (playerId: string, side: 'buy' | 'sell', stockId: string, shares: number) => { success: boolean; message: string } | void;`,
  ));

patch('src/hooks/useGrimwaldAI.ts', source => source
  .replace(`    depositToBank: state.depositToBank,\n    withdrawFromBank: state.withdrawFromBank,`, `    transferBankFunds: state.transferBankFunds,`)
  .replace(`    takeLoan: state.takeLoan,\n    repayLoan: state.repayLoan,\n    buyStock: state.buyStock,\n    sellStock: state.sellStock,`, `    manageLoan: state.manageLoan,\n    tradeStock: state.tradeStock,`));

patch('src/hooks/ai/handlers/housingFinanceHandlers.ts', source => {
  let next = source
    .replace(
      `  store.depositToBank(player.id, amount);\n  return true;`,
      `  const result = store.transferBankFunds(player.id, 'deposit', amount);\n  return result?.success ?? false;`,
    )
    .replace(
      `  store.withdrawFromBank(player.id, Math.min(amount, player.savings));\n  return true;`,
      `  const result = store.transferBankFunds(player.id, 'withdraw', Math.min(amount, player.savings));\n  return result?.success ?? false;`,
    )
    .replace(
      `  store.takeLoan(player.id, amount);\n  return true;`,
      `  const result = store.manageLoan(player.id, 'borrow', amount);\n  return result?.success ?? false;`,
    )
    .replace(
      `  store.repayLoan(player.id, amount);\n  return true;`,
      `  const result = store.manageLoan(player.id, 'repay', amount);\n  return result?.success ?? false;`,
    )
    .replace(
      `  const price = (action.details?.price as number) || 50;\n  const cost = shares * price;\n  if (!stockId || player.gold < cost) return false;\n  store.buyStock(player.id, stockId, shares);\n  return true;`,
      `  if (!stockId) return false;\n  const result = store.tradeStock(player.id, 'buy', stockId, shares);\n  return result?.success ?? false;`,
    )
    .replace(
      `  store.sellStock(player.id, stockId, shares);\n  return true;`,
      `  const result = store.tradeStock(player.id, 'sell', stockId, shares);\n  return result?.success ?? false;`,
    );
  for (const legacy of ['store.depositToBank', 'store.withdrawFromBank', 'store.takeLoan', 'store.repayLoan', 'store.buyStock', 'store.sellStock']) {
    if (next.includes(legacy)) throw new Error(`Legacy AI finance call remains: ${legacy}`);
  }
  return next;
});

patch('src/hooks/ai/actions/economicActions.ts', source => {
  let next = source.replace(
    `    if (shouldBorrow) {`,
    `    if (shouldBorrow) {\n      const loanProducts = [100, 250, 500, 1000];\n      loanAmount = loanProducts.find(product => product >= loanAmount) ?? 1000;`,
  );
  next = next.replace(
    `details: { stockId: bestStock.id, shares: bestStock.shares, price: bestStock.price },`,
    `details: { stockId: bestStock.id, shares: bestStock.shares },`,
  );
  if (next.includes('shares: bestStock.shares, price: bestStock.price')) throw new Error('AI stock price detail remains');
  return next;
});

patch('src/network/actionValidation.test.ts', source => source
  .replace(`validateGuestActor('buyStock', [], 'human-a')`, `validateGuestActor('tradeStock', [], 'human-a')`)
  .replace(`validateGuestActor('buyStock', [42, 'ore', 1], 'human-a')`, `validateGuestActor('tradeStock', [42, 'buy', 'ore', 1], 'human-a')`));

patch('src/test/multiplayer.test.ts', source => {
  let next = source
    .replace(
      `    expect(ALLOWED_GUEST_ACTIONS.has('depositToBank')).toBe(true);`,
      `    expect(ALLOWED_GUEST_ACTIONS.has('transferBankFunds')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('manageInvestment')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('tradeStock')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('manageLoan')).toBe(true);`,
    )
    .replace(
      `'prepayDegree', 'graduateDegree', 'depositToBank', 'withdrawFromBank',\n      'invest', 'withdrawInvestment', 'sellInventoryItem',`,
      `'prepayDegree', 'graduateDegree', 'transferBankFunds', 'manageInvestment',\n      'sellInventoryItem',`,
    )
    .replace(
      `'equipItem', 'unequipItem', 'buyStock', 'sellStock', 'takeLoan',\n      'repayLoan', 'purchaseVendorItem',`,
      `'equipItem', 'unequipItem', 'tradeStock', 'manageLoan',\n      'purchaseVendorItem',`,
    );
  const anchor = `    expect(ALLOWED_GUEST_ACTIONS.has('begForMoreTime')).toBe(false);`;
  const blocked = `${anchor}\n    for (const legacy of ['depositToBank', 'withdrawFromBank', 'invest', 'withdrawInvestment', 'buyStock', 'sellStock', 'takeLoan', 'repayLoan']) {\n      expect(ALLOWED_GUEST_ACTIONS.has(legacy)).toBe(false);\n    }`;
  if (!next.includes(anchor)) throw new Error('Multiplayer blocked-action anchor not found');
  next = next.replace(anchor, blocked);
  return next;
});

patch('docs/AUDIT_LOG.md', source => source.replace(
  `- PR #332 er klar for squash-merge. Merge-SHA føres inn ved starten av neste fase.`,
  `- PR #332 ble squash-merget til \`main\` som commit \`c0c23f013b82105f66cba6a3868ab966894a4ce7\`.\n\n## Fase 10 – 23. juli 2026\n\n### Mål\n\n- Gjøre bankoverføringer, investeringer, aksjehandel og lån host-autoritative.\n- Skille frie, men strengt validerte brukerbeløp fra canonical priser og låneprodukter.\n\n### Utført\n\n- Opprettet arbeidsgren \`agent/audit-phase10-finance\` fra fase 9-merge \`c0c23f013b82105f66cba6a3868ab966894a4ce7\`.\n- Maskinell skanning kartla UI, store, AI, nettverksallowlist, protokollregler og eksisterende økonomitester.\n\n### Pågår\n\n- Innføring av fire semantiske finanshandlinger og migrering av Bank-panelet og AI.\n\n### Tester\n\n- Ikke kjørt ennå i fase 10.`,
));
