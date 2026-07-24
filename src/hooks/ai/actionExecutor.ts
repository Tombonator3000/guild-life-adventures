/**
 * Grimwald AI - Action Executor
 *
 * Dispatches AI actions to domain-specific handler functions via a handler map.
 * Handler implementations live in `./handlers/` grouped by domain:
 *   - resourceHandlers        (food, clothing, tickets)
 *   - employmentEducationHandlers (work, study, jobs)
 *   - housingFinanceHandlers  (rent, housing, banking, stocks, loans)
 *   - equipmentHandlers       (appliances, weapons, armor, repairs)
 *   - questDungeonHandlers    (quests, bounties, dungeon exploration)
 *   - hexHandlers             (curses, hexes, dark rituals)
 */

import type { Player } from '@/types/game.types';
import { getPath } from '@/data/locations';
import { triggerAIAnimation } from '@/hooks/useAIAnimationBridge';
import { peerManager } from '@/network/PeerManager';
import { useGameStore } from '@/store/gameStore';
import { useBanterStore } from '@/store/banterStore';
import { getTrashTalkLine, TRASH_TALK_COOLDOWN, type TrashTalkTrigger } from '@/data/aiTrashTalk';
import { AI_ID_TO_PERSONALITY } from './types';

import type { AIAction, AIActionType } from './types';
import {
  // Resource purchases
  handleBuyFood,
  handleBuyClothing,
  handleBuyFreshFood,
  handleBuyTicket,
  handleBuyLotteryTicket,
  handleBuyReputationUnlock,
  // Employment & Education
  handleWork,
  handleApplyJob,
  handleRequestRaise,
  handleStudy,
  handleGraduate,
  // Housing & Finance
  handlePayRent,
  handleMoveHousing,
  handleDowngradeHousing,
  handleDepositBank,
  handleWithdrawBank,
  handleTakeLoan,
  handleRepayLoan,
  handleBuyStock,
  handleSellStock,
  // Equipment & Items
  handleBuyAppliance,
  handleBuyEquipment,
  handleTemperEquipment,
  handleRepairEquipment,
  handleSellItem,
  handlePawnAppliance,
  handleRepairAppliance,
  handleBuyAmulet,
  // Quests & Dungeon
  handleBuyGuildPass,
  handleTakeQuest,
  handleTakeChainQuest,
  handleTakeBounty,
  handleCompleteQuest,
  handleCompleteLocationObjective,
  handleExploreDungeon,
  // Hexes & Curses
  handleCastCurse,
  handleCastLocationHex,
  handleBuyHexScroll,
  handleDispelHex,
  handleDarkRitual,
  // Fence services
  handleBuyProtection,
  handleBuyTipOff,
  handleSabotagePlayer,
} from './handlers';

/**
 * All store actions needed by AI action handlers, bundled as a single object.
 * This replaces passing 35+ individual function references.
 */
export interface StoreActions {
  travelPlayer: (playerId: string, route: import('@/types/game.types').LocationId[]) => { success: boolean; message: string } | void;
  performWorkShift: (playerId: string, mode: 'full' | 'remaining') => { success: boolean; message: string } | void;
  attemptWorkplaceRaise: (playerId: string) => { success: boolean; message: string } | void;
  performHomeActivity: (playerId: string, activity: 'relax' | 'sleep') => { success: boolean; message: string } | void;
  useHealerService: (playerId: string, serviceId: 'minor' | 'moderate' | 'full' | 'cure' | 'blessing') => { success: boolean; message: string } | void;
  attendDegreeSession: (playerId: string, degreeId: import('@/types/game.types').DegreeId, mode: 'standard' | 'cram') => { success: boolean; message: string } | void;
  graduateDegree: (playerId: string, degreeId: import('@/types/game.types').DegreeId) => { success: boolean; message: string } | void;
  modifyGold: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyClothing: (playerId: string, amount: number) => void;
  modifyRelaxation: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  acceptJobOffer: (playerId: string, jobId: string) => { success: boolean; message: string } | void;
  payHousingRent: (playerId: string, weeks: 1 | 4 | 8) => { success: boolean; message: string } | void;
  transferBankFunds: (playerId: string, direction: 'deposit' | 'withdraw', amount: number) => { success: boolean; message: string } | void;
  buyAppliance: (playerId: string, applianceId: string, cost: number, source: string) => void;
  moveHousingAtLandlord: (playerId: string, tier: import('@/types/game.types').HousingTier) => { success: boolean; message: string } | void;
  buyDurable: (playerId: string, itemId: string, cost: number) => void;
  equipItem: (playerId: string, itemId: string, slot: string) => void;
  buyGuildPass: (playerId: string) => void;
  takeQuest: (playerId: string, questId: string) => void;
  takeChainQuest: (playerId: string, chainId: string) => void;
  takeBounty: (playerId: string, bountyId: string) => void;
  completeQuest: (playerId: string) => void;
  completeLocationObjective: (playerId: string, objectiveId: string) => void;
  clearDungeonFloor: (playerId: string, floorId: number) => void;
  applyRareDrop: (playerId: string, dropId: string) => void;
  manageLoan: (playerId: string, service: 'borrow' | 'repay', amount: number | 'all') => { success: boolean; message: string } | void;
  tradeStock: (playerId: string, side: 'buy' | 'sell', stockId: string, shares: number) => { success: boolean; message: string } | void;
  buyFreshFood: (playerId: string, units: number, cost: number) => boolean;
  buyFoodWithSpoilage: (playerId: string, foodValue: number, cost: number) => boolean;
  buyTicket: (playerId: string, ticketType: string, cost: number) => void;
  sellInventoryItem: (playerId: string, itemId: string) => { success: boolean; message: string } | void;
  pawnAppliance: (playerId: string, applianceId: string, pawnValue: number) => void;
  buyLotteryTicket: (playerId: string, cost: number) => void;
  temperEquipment: (playerId: string, itemId: string, slot: string, cost: number) => void;
  forgeRepairEquipment: (playerId: string, itemId: string, cost: number) => void;
  applyDurabilityLoss: (playerId: string, durabilityLoss: import('@/data/combatResolver').EquipmentDurabilityLoss) => void;
  // Hexes & Curses
  castLocationHex: (playerId: string, hexId: string) => { success: boolean; message: string };
  castPersonalCurse: (playerId: string, hexId: string, targetId: string) => { success: boolean; message: string };
  purchaseHexScroll: (playerId: string, vendor: 'enchanter' | 'shadow-market', hexId: string) => { success: boolean; message: string } | void;
  useHexDefense: (playerId: string, service: 'amulet' | 'dispel', targetLocation?: import('@/types/game.types').LocationId) => { success: boolean; message: string } | void;
  useGraveyardHexService: (playerId: string, service: 'ritual' | 'reflect' | 'cleanse') => { success: boolean; message: string; backfired?: boolean } | void;
  // Appliance repair
  repairAppliance: (playerId: string, applianceId: string) => number;
  forgeRepairAppliance: (playerId: string, applianceId: string) => number;
  // Salary
  // Reputation (host-authoritative, atomic)
  purchaseReputationUnlock: (playerId: string, unlockId: string) => { success: boolean; message: string } | void;
  // Fence services (host-authoritative, atomic)
  buyProtection: (playerId: string, weeks: number) => { success: boolean; message: string } | void;
  buyTipOff: (playerId: string, targetId: string) => { success: boolean; message: string } | void;
  sabotagePlayer: (saboteurId: string, targetId: string, optionId: string) => { success: boolean; message: string } | void;
  endTurn: () => void;
}

/** Handler function signature: takes player + action + store actions, returns success */
type ActionHandler = (player: Player, action: AIAction, store: StoreActions) => boolean;

// ─── Handlers kept in this file (trivial, no external deps) ─────────────

function handleMove(player: Player, action: AIAction, store: StoreActions): boolean {
  if (!action.location) return false;
  const state = useGameStore.getState();
  const path = getPath(player.currentLocation, action.location);
  const steps = Math.max(0, path.length - 1);
  const weatherExtra = state.weather?.movementCostExtra ?? 0;
  const cost = steps + Math.floor(steps * Math.max(0, weatherExtra));
  if (player.timeRemaining < cost) return false;
  const networkMode = state.networkMode;
  if (networkMode === 'host') {
    peerManager.broadcast({ type: 'movement-animation', playerId: player.id, path });
  }
  const result = store.travelPlayer(player.id, path);
  if (result && !result.success) return false;
  // Trigger visual path animation for AI token on the board
  triggerAIAnimation(player.id, path);
  return true;
}

function handleRest(player: Player, _action: AIAction, store: StoreActions): boolean {
  const result = store.performHomeActivity(player.id, 'relax');
  return result?.success ?? false;
}

function handleHeal(player: Player, _action: AIAction, store: StoreActions): boolean {
  const result = store.useHealerService(player.id, 'minor');
  return result?.success ?? false;
}

function handleCureSickness(player: Player, _action: AIAction, store: StoreActions): boolean {
  const result = store.useHealerService(player.id, 'cure');
  return result?.success ?? false;
}

function handleEndTurn(_player: Player, _action: AIAction, store: StoreActions): boolean {
  store.endTurn();
  return true;
}

// ─── Handler Map ────────────────────────────────────────────────────────

/**
 * Maps each AI action type to its handler function.
 * Adding a new action type only requires adding the handler and a map entry.
 */
const ACTION_HANDLERS: Record<AIActionType, ActionHandler> = {
  'move': handleMove,
  'buy-food': handleBuyFood,
  'buy-clothing': handleBuyClothing,
  'work': handleWork,
  'study': handleStudy,
  'graduate': handleGraduate,
  'apply-job': handleApplyJob,
  'pay-rent': handlePayRent,
  'deposit-bank': handleDepositBank,
  'withdraw-bank': handleWithdrawBank,
  'buy-appliance': handleBuyAppliance,
  'move-housing': handleMoveHousing,
  'downgrade-housing': handleDowngradeHousing,
  'rest': handleRest,
  'heal': handleHeal,
  'buy-equipment': handleBuyEquipment,
  'temper-equipment': handleTemperEquipment,
  'repair-equipment': handleRepairEquipment,
  'buy-guild-pass': handleBuyGuildPass,
  'take-quest': handleTakeQuest,
  'take-chain-quest': handleTakeChainQuest,
  'take-bounty': handleTakeBounty,
  'complete-quest': handleCompleteQuest,
  'complete-location-objective': handleCompleteLocationObjective,
  'explore-dungeon': handleExploreDungeon,
  'cure-sickness': handleCureSickness,
  'take-loan': handleTakeLoan,
  'repay-loan': handleRepayLoan,
  'buy-stock': handleBuyStock,
  'sell-stock': handleSellStock,
  'buy-fresh-food': handleBuyFreshFood,
  'buy-ticket': handleBuyTicket,
  'sell-item': handleSellItem,
  'pawn-appliance': handlePawnAppliance,
  'buy-lottery-ticket': handleBuyLotteryTicket,
  'cast-curse': handleCastCurse,
  'cast-location-hex': handleCastLocationHex,
  'buy-amulet': handleBuyAmulet,
  'buy-hex-scroll': handleBuyHexScroll,
  'repair-appliance': handleRepairAppliance,
  'request-raise': handleRequestRaise,
  'dispel-hex': handleDispelHex,
  'dark-ritual': handleDarkRitual,
  'buy-reputation-unlock': handleBuyReputationUnlock,
  'buy-protection': handleBuyProtection,
  'buy-tip-off': handleBuyTipOff,
  'sabotage-player': handleSabotagePlayer,
  'end-turn': handleEndTurn,
};

// ─── Trash Talk Cooldown Tracking ────────────────────────────────────────
const lastTrashTalkTime: Record<string, number> = {};

/** Map action types to trash talk triggers */
const ACTION_TO_TRASH_TALK: Partial<Record<AIActionType, TrashTalkTrigger>> = {
  'work': 'work-shift',
  'buy-equipment': 'buy-equipment',
  'explore-dungeon': 'dungeon-clear',
  'complete-quest': 'quest-complete',
  'study': 'study',
  'graduate': 'graduate',
  'deposit-bank': 'deposit-bank',
  'buy-stock': 'buy-stock',
  'cast-curse': 'cast-curse',
  'take-quest': 'take-quest',
  'apply-job': 'apply-job',
  'move-housing': 'move-housing',
  'sabotage-player': 'sabotage-player',
  'buy-tip-off': 'buy-tip-off',
  'buy-protection': 'buy-protection',
};

/**
 * Execute a single AI action by dispatching to the appropriate handler.
 * On success, may trigger personality-based trash talk via banterStore.
 *
 * @returns true if the action succeeded, false otherwise
 */
export function executeAIAction(player: Player, action: AIAction, store: StoreActions): boolean {
  const handler = ACTION_HANDLERS[action.type];
  if (!handler) return false;
  try {
    const success = handler(player, action, store);

    // Trigger AI trash talk on successful actions
    if (success) {
      const trigger = ACTION_TO_TRASH_TALK[action.type];
      if (trigger) {
        const now = Date.now();
        const lastTime = lastTrashTalkTime[player.id] || 0;
        if (now - lastTime > TRASH_TALK_COOLDOWN) {
          const personalityId = AI_ID_TO_PERSONALITY[player.id] || 'grimwald';
          const line = getTrashTalkLine(personalityId, trigger);
          if (line) {
            lastTrashTalkTime[player.id] = now;
            // Use player's current location as the banter source
            useBanterStore.getState().setBanter(
              { text: line.text, mood: line.mood },
              player.currentLocation,
              player.name,
            );
          }
        }
      }
    }

    return success;
  } catch (err) {
    console.error(`[AI] Action '${action.type}' failed for ${player.name}:`, err);
    return false;
  }
}
