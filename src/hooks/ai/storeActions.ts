import type { GameStore } from '@/store/storeTypes';

/** Only the actions consumed by AI handlers; signatures follow the canonical store. */
export function selectAIStoreActions(state: GameStore) {
  return {
    acceptJobOffer: state.acceptJobOffer,
    attemptWorkplaceRaise: state.attemptWorkplaceRaise,
    attendDegreeSession: state.attendDegreeSession,
    buyGuildPass: state.buyGuildPass,
    buyProtection: state.buyProtection,
    buyTipOff: state.buyTipOff,
    castLocationHex: state.castLocationHex,
    castPersonalCurse: state.castPersonalCurse,
    completeLocationObjective: state.completeLocationObjective,
    completeQuest: state.completeQuest,
    endTurn: state.endTurn,
    equipItem: state.equipItem,
    graduateDegree: state.graduateDegree,
    manageLoan: state.manageLoan,
    moveHousingAtLandlord: state.moveHousingAtLandlord,
    payHousingRent: state.payHousingRent,
    performHomeActivity: state.performHomeActivity,
    performWorkShift: state.performWorkShift,
    purchaseAIResourceItem: state.purchaseAIResourceItem,
    purchaseHexScroll: state.purchaseHexScroll,
    purchaseReputationUnlock: state.purchaseReputationUnlock,
    sabotagePlayer: state.sabotagePlayer,
    spendTime: state.spendTime,
    takeBounty: state.takeBounty,
    takeChainQuest: state.takeChainQuest,
    takeQuest: state.takeQuest,
    tradeStock: state.tradeStock,
    transferBankFunds: state.transferBankFunds,
    travelPlayer: state.travelPlayer,
    useGraveyardHexService: state.useGraveyardHexService,
    useHealerService: state.useHealerService,
    useHexDefense: state.useHexDefense,
  };
}

export type StoreActions = ReturnType<typeof selectAIStoreActions>;
