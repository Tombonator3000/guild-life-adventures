/**
 * Grimwald AI - Action Executor
 *
 * Replaces the monolithic switch statement in useGrimwaldAI.ts with
 * a handler-map pattern. Each AI action type maps to a focused handler
 * function, making the code easier to read, test, and extend.
 */

import type { Player, HousingTier, DegreeId, EquipmentSlot } from '@/types/game.types';
import { RENT_COSTS, GUILD_PASS_COST, LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';
import { getJob, canWorkJob, calculateOfferedWage } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import { calculatePathDistance, getPath } from '@/data/locations';
import { peerManager } from '@/network/PeerManager';
import { calculateCombatStats, CLOTHING_THRESHOLDS } from '@/data/items';
import { getFloor, calculateEducationBonuses, getEncounterTimeCost, getLootMultiplier, ENCOUNTERS_PER_FLOOR } from '@/data/dungeon';
import { autoResolveFloor } from '@/data/combatResolver';
import { FESTIVALS } from '@/data/festivals';
import { useGameStore } from '@/store/gameStore';

import type { AIAction, AIActionType } from './types';

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
  endTurn: () => void;
}

/** Handler function signature: takes player + action + store actions, returns success */
type ActionHandler = (player: Player, action: AIAction, store: StoreActions) => boolean;

// ─── Movement ───────────────────────────────────────────────────────────

function handleMove(player: Player, action: AIAction, store: StoreActions): boolean {
  if (!action.location) return false;
  const baseCost = calculatePathDistance(player.currentLocation, action.location);
  // C4 FIX: Include weather movement cost (same formula as human movement)
  const state = useGameStore.getState();
  const weather = state.weather;
  const path = getPath(player.currentLocation, action.location);
  const weatherExtraCost = (baseCost > 0 && weather?.movementCostExtra)
    ? path.length * weather.movementCostExtra
    : 0;
  const cost = baseCost + weatherExtraCost;
  if (player.timeRemaining < cost) return false;
  const networkMode = state.networkMode;
  if (networkMode === 'host') {
    peerManager.broadcast({ type: 'movement-animation', playerId: player.id, path });
  }
  store.movePlayer(player.id, action.location, cost);
  return true;
}

// ─── Resource purchases ─────────────────────────────────────────────────

function handleBuyFood(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 15;
  const foodGain = (action.details?.foodGain as number) || 25;
  if (player.gold < cost) return false;

  // General Store food uses spoilage mechanic (spoilage checked at turn end without Preservation Box)
  if (player.currentLocation === 'general-store') {
    store.buyFoodWithSpoilage(player.id, foodGain, cost);
    store.spendTime(player.id, 1);
    return true;
  }

  // Tavern/Shadow Market: always safe
  store.modifyGold(player.id, -cost);
  store.modifyFood(player.id, foodGain);
  store.spendTime(player.id, 1);
  return true;
}

function handleBuyClothing(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 12;
  // clothingGain is now the target condition level (SET-based, not additive)
  const clothingGain = (action.details?.clothingGain as number) || 35;
  if (player.gold < cost) return false;
  if (clothingGain <= player.clothingCondition) return false; // Already at or above this level
  store.modifyGold(player.id, -cost);
  store.modifyClothing(player.id, clothingGain);
  store.spendTime(player.id, 1);
  return true;
}

function handleBuyFreshFood(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 25;
  const units = (action.details?.units as number) || 2;
  if (player.gold < cost) return false;
  store.buyFreshFood(player.id, units, cost);
  store.spendTime(player.id, 1);
  return true;
}

function handleBuyTicket(player: Player, action: AIAction, store: StoreActions): boolean {
  const ticketType = action.details?.ticketType as string;
  const cost = (action.details?.cost as number) || 30;
  if (!ticketType || player.gold < cost) return false;
  store.buyTicket(player.id, ticketType, cost);
  store.spendTime(player.id, 1);
  return true;
}

function handleBuyLotteryTicket(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 5;
  if (player.gold < cost) return false;
  store.buyLotteryTicket(player.id, cost);
  store.spendTime(player.id, 1);
  return true;
}

// ─── Employment ─────────────────────────────────────────────────────────

function handleWork(player: Player, action: AIAction, store: StoreActions): boolean {
  const hours = (action.details?.hours as number) || 6;
  const wage = (action.details?.wage as number) || player.currentWage;
  if (player.timeRemaining < hours) return false;
  if (player.clothingCondition <= 0) return false; // Bankruptcy Barrel
  // Clothing quality check: can't work if clothes don't meet job tier
  if (player.currentJob) {
    const job = getJob(player.currentJob);
    if (job) {
      const threshold = CLOTHING_THRESHOLDS[job.requiredClothing as keyof typeof CLOTHING_THRESHOLDS] ?? 0;
      if (player.clothingCondition < threshold) return false;
    }
  }
  store.workShift(player.id, hours, wage);
  return true;
}

function handleApplyJob(player: Player, action: AIAction, store: StoreActions): boolean {
  const jobId = action.details?.jobId as string;
  if (!jobId) return false;
  const job = getJob(jobId);
  if (!job) return false;
  if (!canWorkJob(job, player.completedDegrees, player.clothingCondition, player.experience, player.dependability)) {
    return false;
  }
  const { priceModifier, week } = useGameStore.getState();
  const offer = calculateOfferedWage(job, priceModifier, week);
  store.setJob(player.id, jobId, offer.offeredWage);
  store.spendTime(player.id, 1);
  return true;
}

// ─── Education ──────────────────────────────────────────────────────────

function handleStudy(player: Player, action: AIAction, store: StoreActions): boolean {
  const degreeId = action.details?.degreeId as DegreeId;
  const cost = (action.details?.cost as number) || 5;
  const hours = (action.details?.hours as number) || 6;
  if (!degreeId || player.gold < cost || player.timeRemaining < hours) return false;
  store.studyDegree(player.id, degreeId, cost, hours);
  return true;
}

function handleGraduate(player: Player, action: AIAction, store: StoreActions): boolean {
  const degreeId = action.details?.degreeId as DegreeId;
  if (!degreeId) return false;
  const degree = DEGREES[degreeId];
  const progress = player.degreeProgress[degreeId] || 0;
  if (progress < degree.sessionsRequired) return false;
  store.completeDegree(player.id, degreeId);
  return true;
}

// ─── Housing & Rent ─────────────────────────────────────────────────────

function handlePayRent(player: Player, action: AIAction, store: StoreActions): boolean {
  if (player.housing === 'homeless') return false;
  const cost = player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing];
  if (player.gold < cost) return false;
  store.payRent(player.id);
  store.spendTime(player.id, 1);
  return true;
}

function handleMoveHousing(player: Player, action: AIAction, store: StoreActions): boolean {
  const tier = action.details?.tier as HousingTier;
  const cost = (action.details?.cost as number) || 200;
  // BUG FIX: Check for 4 hours (same as human) instead of 1
  if (!tier || player.gold < cost || player.timeRemaining < 4) return false;
  const rent = (action.details?.rent as number) || RENT_COSTS[tier];
  store.moveToHousing(player.id, tier, cost, rent);
  store.spendTime(player.id, 4); // BUG FIX: Was 1, should be 4 (matches human)
  return true;
}

function handleDowngradeHousing(player: Player, action: AIAction, store: StoreActions): boolean {
  const tier = action.details?.tier as HousingTier;
  if (!tier) return false;
  store.moveToHousing(player.id, tier, 0, RENT_COSTS[tier]);
  store.spendTime(player.id, 4); // BUG FIX: Was 1, should be 4 (matches human)
  return true;
}

// ─── Banking & Finance ──────────────────────────────────────────────────

function handleDepositBank(player: Player, action: AIAction, store: StoreActions): boolean {
  const amount = (action.details?.amount as number) || 100;
  if (player.gold < amount) return false;
  store.depositToBank(player.id, amount);
  return true;
}

function handleWithdrawBank(player: Player, action: AIAction, store: StoreActions): boolean {
  const amount = (action.details?.amount as number) || 100;
  if (player.savings < amount) return false;
  store.withdrawFromBank(player.id, Math.min(amount, player.savings));
  return true;
}

function handleTakeLoan(player: Player, action: AIAction, store: StoreActions): boolean {
  const amount = (action.details?.amount as number) || 200;
  if (player.loanAmount > 0) return false;
  if ((player.totalShiftsWorked || 0) < LOAN_MIN_SHIFTS_REQUIRED) return false; // Job history
  store.takeLoan(player.id, amount);
  return true;
}

function handleRepayLoan(player: Player, action: AIAction, store: StoreActions): boolean {
  const amount = (action.details?.amount as number) || player.loanAmount;
  if (player.loanAmount <= 0 || player.gold < amount) return false;
  store.repayLoan(player.id, amount);
  return true;
}

function handleBuyStock(player: Player, action: AIAction, store: StoreActions): boolean {
  const stockId = action.details?.stockId as string;
  const shares = (action.details?.shares as number) || 5;
  const price = (action.details?.price as number) || 50;
  const cost = shares * price;
  if (!stockId || player.gold < cost) return false;
  store.buyStock(player.id, stockId, shares);
  return true;
}

function handleSellStock(player: Player, action: AIAction, store: StoreActions): boolean {
  const stockId = action.details?.stockId as string;
  const shares = (action.details?.shares as number) || 5;
  if (!stockId || !player.stocks[stockId] || player.stocks[stockId] < shares) return false;
  store.sellStock(player.id, stockId, shares);
  return true;
}

// ─── Health & Recovery ──────────────────────────────────────────────────

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

// ─── Equipment & Items ──────────────────────────────────────────────────

function handleBuyAppliance(player: Player, action: AIAction, store: StoreActions): boolean {
  const applianceId = action.details?.applianceId as string;
  const cost = (action.details?.cost as number) || 300;
  if (!applianceId || player.gold < cost) return false;
  const source = (action.details?.source as string) || 'enchanter';
  store.buyAppliance(player.id, applianceId, cost, source);
  store.spendTime(player.id, 1);
  return true;
}

function handleBuyEquipment(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  const cost = (action.details?.cost as number) || 0;
  const slot = (action.details?.slot as string) || 'weapon';
  if (!itemId || player.gold < cost) return false;
  store.buyDurable(player.id, itemId, cost);
  store.equipItem(player.id, itemId, slot as EquipmentSlot);
  store.spendTime(player.id, 1);
  return true;
}

function handleTemperEquipment(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  const cost = (action.details?.cost as number) || 0;
  const slot = (action.details?.slot as string) || 'weapon';
  if (!itemId || player.gold < cost) return false;
  if (player.temperedItems.includes(itemId)) return false;
  store.temperEquipment(player.id, itemId, slot as EquipmentSlot, cost);
  const temperTime = slot === 'shield' ? 2 : 3;
  store.spendTime(player.id, temperTime);
  store.modifyHappiness(player.id, 2);
  return true;
}

function handleRepairEquipment(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  const cost = (action.details?.cost as number) || 0;
  if (!itemId || player.gold < cost) return false;
  store.forgeRepairEquipment(player.id, itemId, cost);
  store.spendTime(player.id, 2); // EQUIPMENT_REPAIR_TIME
  return true;
}

function handleSellItem(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  const price = (action.details?.price as number) || 10;
  if (!itemId) return false;
  store.sellItem(player.id, itemId, price);
  store.spendTime(player.id, 1);
  return true;
}

function handlePawnAppliance(player: Player, action: AIAction, store: StoreActions): boolean {
  const applianceId = action.details?.applianceId as string;
  const pawnValue = (action.details?.pawnValue as number) || 50;
  if (!applianceId || !player.appliances[applianceId]) return false;
  store.pawnAppliance(player.id, applianceId, pawnValue);
  store.spendTime(player.id, 1);
  return true;
}

// ─── Quests & Guild ─────────────────────────────────────────────────────

function handleBuyGuildPass(player: Player, action: AIAction, store: StoreActions): boolean {
  if (player.hasGuildPass || player.gold < GUILD_PASS_COST) return false;
  store.buyGuildPass(player.id);
  store.spendTime(player.id, 1);
  return true;
}

function handleTakeQuest(player: Player, action: AIAction, store: StoreActions): boolean {
  const questId = action.details?.questId as string;
  if (!questId || player.activeQuest) return false;
  if (player.questCooldownWeeksLeft > 0) return false;
  store.takeQuest(player.id, questId);
  store.spendTime(player.id, 1);
  return true;
}

function handleTakeChainQuest(player: Player, action: AIAction, store: StoreActions): boolean {
  const chainId = action.details?.chainId as string;
  if (!chainId || player.activeQuest) return false;
  if (player.questCooldownWeeksLeft > 0) return false;
  store.takeChainQuest(player.id, chainId);
  store.spendTime(player.id, 1);
  return true;
}

function handleTakeBounty(player: Player, action: AIAction, store: StoreActions): boolean {
  const bountyId = action.details?.bountyId as string;
  if (!bountyId || player.activeQuest) return false;
  if (player.completedBountiesThisWeek.includes(bountyId)) return false;
  store.takeBounty(player.id, bountyId);
  store.spendTime(player.id, 1);
  return true;
}

function handleCompleteQuest(player: Player, action: AIAction, store: StoreActions): boolean {
  if (!player.activeQuest) return false;
  store.completeQuest(player.id);
  return true;
}

// ─── Dungeon ────────────────────────────────────────────────────────────

/** Validate that the player can attempt a dungeon floor. Returns false if blocked. */
function canAttemptDungeon(player: Player, timeCost: number): boolean {
  const attemptsUsed = player.dungeonAttemptsThisTurn || 0;
  if (attemptsUsed >= 2) return false;
  if (player.health <= 20) return false;
  if (player.completedDegrees.length === 0) return false;
  if (player.timeRemaining < timeCost) return false;
  return true;
}

/** Increment the player's dungeon attempt counter for this turn. */
function trackDungeonAttempt(playerId: string): void {
  const storeState = useGameStore.getState();
  useGameStore.setState({
    players: storeState.players.map(p =>
      p.id === playerId
        ? { ...p, dungeonAttemptsThisTurn: (p.dungeonAttemptsThisTurn || 0) + 1 }
        : p
    ),
  });
}

/** Calculate festival-adjusted gold earned from a dungeon run. */
function calculateDungeonGold(baseGold: number, bossDefeated: boolean): number {
  const festivalId = useGameStore.getState().activeFestival;
  const festivalMult = festivalId
    ? (FESTIVALS.find(f => f.id === festivalId)?.dungeonGoldMultiplier ?? 1.0)
    : 1.0;
  const defeatMult = bossDefeated ? 1.0 : 0.25;
  return Math.floor(baseGold * defeatMult * festivalMult);
}

/** Apply all results from a dungeon run: gold, health, happiness, floor clear, rare drops, durability. */
function applyDungeonResults(
  playerId: string,
  floorId: number,
  floor: ReturnType<typeof getFloor> & object,
  result: ReturnType<typeof autoResolveFloor>,
  isFirstClear: boolean,
  store: StoreActions,
): number {
  const actualGold = calculateDungeonGold(result.goldEarned, result.bossDefeated);

  if (actualGold > 0) store.modifyGold(playerId, actualGold);
  if (result.healthChange !== 0) store.modifyHealth(playerId, result.healthChange);

  if (result.bossDefeated && isFirstClear) {
    store.clearDungeonFloor(playerId, floorId);
    store.modifyHappiness(playerId, floor.happinessOnClear);
  } else if (!result.bossDefeated) {
    store.modifyHappiness(playerId, -2);
  }

  if (result.rareDropName) {
    store.applyRareDrop(playerId, floor.rareDrop.id);
  }
  if (result.durabilityLoss) {
    store.applyDurabilityLoss(playerId, result.durabilityLoss);
  }

  return actualGold;
}

function handleExploreDungeon(player: Player, action: AIAction, store: StoreActions): boolean {
  const floorId = action.details?.floorId as number;
  // H8 FIX: Use explicit null check instead of falsy (floor 0 is valid)
  if (floorId === undefined || floorId === null) return false;
  const floor = getFloor(floorId);
  if (!floor) return false;

  // Calculate time cost and validate
  const combatStats = calculateCombatStats(
    player.equippedWeapon, player.equippedArmor, player.equippedShield,
    player.temperedItems, player.equipmentDurability,
  );
  const eduBonuses = calculateEducationBonuses(player.completedDegrees);
  const timeCost = getEncounterTimeCost(floor, combatStats) * ENCOUNTERS_PER_FLOOR;
  if (!canAttemptDungeon(player, timeCost)) return false;

  // Execute dungeon run
  store.spendTime(player.id, timeCost);
  trackDungeonAttempt(player.id);

  const isFirstClear = !player.dungeonFloorsCleared.includes(floorId);
  const lootMult = getLootMultiplier(floor, player.guildRank);
  const equippedItems = { weapon: player.equippedWeapon, armor: player.equippedArmor, shield: player.equippedShield };
  const result = autoResolveFloor(floor, combatStats, eduBonuses, player.health, isFirstClear, lootMult, player.dungeonFloorsCleared, equippedItems, player.maxHealth);

  // Apply results and check for death
  const actualGold = applyDungeonResults(player.id, floorId, floor, result, isFirstClear, store);
  const { checkDeath } = useGameStore.getState();
  checkDeath(player.id);

  console.log(`[Grimwald AI] Dungeon Floor ${floorId}: ${result.success ? 'CLEARED' : 'FAILED'}. ` +
    `+${actualGold}g, ${result.healthChange} HP. ${result.log.join(' | ')}`);
  return true;
}

// ─── Hexes & Curses ─────────────────────────────────────────────────────

function handleCastCurse(player: Player, action: AIAction, store: StoreActions): boolean {
  const hexId = action.details?.hexId as string;
  const targetId = action.details?.targetId as string;
  if (!hexId || !targetId) return false;
  const result = store.castPersonalCurse(player.id, hexId, targetId);
  return result.success;
}

function handleCastLocationHex(player: Player, action: AIAction, store: StoreActions): boolean {
  const hexId = action.details?.hexId as string;
  if (!hexId) return false;
  const result = store.castLocationHex(player.id, hexId);
  return result.success;
}

function handleBuyAmulet(player: Player, _action: AIAction, store: StoreActions): boolean {
  if (player.hasProtectiveAmulet) return false;
  const state = useGameStore.getState();
  const cost = Math.round(400 * state.priceModifier);
  if (player.gold < cost) return false;
  store.buyProtectiveAmulet(player.id, cost);
  return true;
}

// ─── GAP-2: Appliance Repair ─────────────────────────────────────────────

function handleRepairAppliance(player: Player, action: AIAction, store: StoreActions): boolean {
  const applianceId = action.details?.applianceId as string;
  const location = action.details?.location as string;
  if (!applianceId) return false;
  const appliance = player.appliances[applianceId];
  if (!appliance || !appliance.isBroken) return false;
  if (location === 'forge') {
    store.forgeRepairAppliance(player.id, applianceId);
  } else {
    store.repairAppliance(player.id, applianceId);
  }
  store.spendTime(player.id, 1);
  return true;
}

// ─── GAP-3: Salary Negotiation ───────────────────────────────────────────

function handleRequestRaise(player: Player, _action: AIAction, store: StoreActions): boolean {
  if (!player.currentJob) return false;
  const result = store.requestRaise(player.id);
  store.spendTime(player.id, 1);
  return result.success;
}

// ─── GAP-6: Dispel Location Hex ──────────────────────────────────────────

function handleDispelHex(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 250;
  if (player.gold < cost) return false;
  const result = store.dispelLocationHex(player.id, cost);
  return result.success;
}

// ─── GAP-7: Graveyard Dark Ritual ────────────────────────────────────────

function handleDarkRitual(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 100;
  if (player.gold < cost) return false;
  const result = store.performDarkRitual(player.id, cost);
  return result.success;
}

// ─── Turn Control ───────────────────────────────────────────────────────

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
  'repair-appliance': handleRepairAppliance,
  'request-raise': handleRequestRaise,
  'dispel-hex': handleDispelHex,
  'dark-ritual': handleDarkRitual,
  'end-turn': handleEndTurn,
};

/**
 * Execute a single AI action by dispatching to the appropriate handler.
 *
 * @returns true if the action succeeded, false otherwise
 */
export function executeAIAction(player: Player, action: AIAction, store: StoreActions): boolean {
  const handler = ACTION_HANDLERS[action.type];
  if (!handler) return false;
  try {
    return handler(player, action, store);
  } catch (err) {
    console.error(`[AI] Action '${action.type}' failed for ${player.name}:`, err);
    return false;
  }
}
