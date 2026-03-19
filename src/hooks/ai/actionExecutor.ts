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
import { calculatePathDistance, getPath } from '@/data/locations';
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
} from './handlers';

/**
 * All store actions needed by AI action handlers, bundled as a single object.
 * This replaces passing 35+ individual function references.
 */
export interface StoreActions {
  movePlayer: (playerId: string, location: string, cost: number) => void;
  workShift: (playerId: string, hours: number, wage: number) => boolean;
  modifyGold: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyClothing: (playerId: string, amount: number) => void;
  modifyRelaxation: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  studyDegree: (playerId: string, degreeId: string, cost: number, hours: number) => void;
  completeDegree: (playerId: string, degreeId: string) => void;
  setJob: (playerId: string, jobId: string, wage: number) => void;
  payRent: (playerId: string) => void;
  depositToBank: (playerId: string, amount: number) => void;
  withdrawFromBank: (playerId: string, amount: number) => void;
  buyAppliance: (playerId: string, applianceId: string, cost: number, source: string) => void;
  moveToHousing: (playerId: string, tier: string, cost: number, rent: number) => void;
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
  cureSickness: (playerId: string) => void;
  takeLoan: (playerId: string, amount: number) => void;
  repayLoan: (playerId: string, amount: number) => void;
  buyStock: (playerId: string, stockId: string, shares: number) => void;
  sellStock: (playerId: string, stockId: string, shares: number) => void;
  buyFreshFood: (playerId: string, units: number, cost: number) => boolean;
  buyFoodWithSpoilage: (playerId: string, foodValue: number, cost: number) => boolean;
  buyTicket: (playerId: string, ticketType: string, cost: number) => void;
  sellItem: (playerId: string, itemId: string, price: number) => void;
  pawnAppliance: (playerId: string, applianceId: string, pawnValue: number) => void;
  buyLotteryTicket: (playerId: string, cost: number) => void;
  temperEquipment: (playerId: string, itemId: string, slot: string, cost: number) => void;
  forgeRepairEquipment: (playerId: string, itemId: string, cost: number) => void;
  applyDurabilityLoss: (playerId: string, durabilityLoss: import('@/data/combatResolver').EquipmentDurabilityLoss) => void;
  // Hexes & Curses
  castLocationHex: (playerId: string, hexId: string) => { success: boolean; message: string };
  castPersonalCurse: (playerId: string, hexId: string, targetId: string) => { success: boolean; message: string };
  buyProtectiveAmulet: (playerId: string, cost: number) => void;
  addHexScrollToPlayer: (playerId: string, hexId: string) => void;
  dispelLocationHex: (playerId: string, cost: number) => { success: boolean; message: string };
  performDarkRitual: (playerId: string, cost: number) => { success: boolean; message: string; backfired?: boolean };
  // Appliance repair
  repairAppliance: (playerId: string, applianceId: string) => number;
  forgeRepairAppliance: (playerId: string, applianceId: string) => number;
  // Salary
  requestRaise: (playerId: string) => { success: boolean; newWage?: number; message: string };
  // Reputation
  purchaseReputationUnlock: (playerId: string, unlockId: string, cost: number, effectType: string, effectValue: number, timeCost: number) => void;
  endTurn: () => void;
}

/** Handler function signature: takes player + action + store actions, returns success */
type ActionHandler = (player: Player, action: AIAction, store: StoreActions) => boolean;

// ─── Handlers kept in this file (trivial, no external deps) ─────────────

function handleMove(player: Player, action: AIAction, store: StoreActions): boolean {
  if (!action.location) return false;
  const baseCost = calculatePathDistance(player.currentLocation, action.location);
  // C4 FIX: Include weather movement cost (same formula as human movement)
  const state = useGameStore.getState();
  const weather = state.weather;
  const path = getPath(player.currentLocation, action.location);
  const weatherExtraCost = (baseCost > 0 && weather?.movementCostExtra)
    ? baseCost * weather.movementCostExtra
    : 0;
  const cost = baseCost + weatherExtraCost;
  if (player.timeRemaining < cost) return false;
  const networkMode = state.networkMode;
  if (networkMode === 'host') {
    peerManager.broadcast({ type: 'movement-animation', playerId: player.id, path });
  }
  store.movePlayer(player.id, action.location, cost);
  // Trigger visual path animation for AI token on the board
  triggerAIAnimation(player.id, path);
  return true;
}

function handleRest(player: Player, action: AIAction, store: StoreActions): boolean {
  const hours = (action.details?.hours as number) || 4;
  const happinessGain = (action.details?.happinessGain as number) || 5;
  const relaxGain = (action.details?.relaxGain as number) || 3;
  if (player.timeRemaining < hours) return false;
  store.spendTime(player.id, hours);
  store.modifyHappiness(player.id, happinessGain);
  store.modifyRelaxation(player.id, relaxGain);
  return true;
}

function handleHeal(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 30;
  const healAmount = (action.details?.healAmount as number) || 25;
  if (player.gold < cost) return false;
  store.modifyGold(player.id, -cost);
  store.modifyHealth(player.id, healAmount);
  store.spendTime(player.id, 2);
  return true;
}

function handleCureSickness(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 75;
  if (!player.isSick || player.gold < cost || player.timeRemaining < 2) return false;
  store.modifyGold(player.id, -cost);
  store.spendTime(player.id, 2);
  store.cureSickness(player.id);
  return true;
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
