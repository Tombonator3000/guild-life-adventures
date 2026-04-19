/**
 * AI Action Handlers — Barrel Export
 *
 * Re-exports all handler functions from domain-specific modules.
 * Each module groups related handlers for easier navigation and maintenance.
 */

export {
  handleBuyFood,
  handleBuyClothing,
  handleBuyFreshFood,
  handleBuyTicket,
  handleBuyLotteryTicket,
  handleBuyReputationUnlock,
} from './resourceHandlers';

export {
  handleWork,
  handleApplyJob,
  handleRequestRaise,
  handleStudy,
  handleGraduate,
} from './employmentEducationHandlers';

export {
  handlePayRent,
  handleMoveHousing,
  handleDowngradeHousing,
  handleDepositBank,
  handleWithdrawBank,
  handleTakeLoan,
  handleRepayLoan,
  handleBuyStock,
  handleSellStock,
} from './housingFinanceHandlers';

export {
  handleBuyAppliance,
  handleBuyEquipment,
  handleTemperEquipment,
  handleRepairEquipment,
  handleSellItem,
  handlePawnAppliance,
  handleRepairAppliance,
  handleBuyAmulet,
} from './equipmentHandlers';

export {
  handleBuyGuildPass,
  handleTakeQuest,
  handleTakeChainQuest,
  handleTakeBounty,
  handleCompleteQuest,
  handleCompleteLocationObjective,
  handleExploreDungeon,
} from './questDungeonHandlers';

export {
  handleCastCurse,
  handleCastLocationHex,
  handleBuyHexScroll,
  handleDispelHex,
  handleDarkRitual,
} from './hexHandlers';

export {
  handleBuyProtection,
  handleBuyTipOff,
  handleSabotagePlayer,
} from './fenceHandlers';
