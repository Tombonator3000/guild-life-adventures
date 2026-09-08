// Store type utilities for helper modules
// These avoid circular dependencies between gameStore.ts and helpers

import type {
  GameState,
  Player,
  LocationId,
  HousingTier,
  EducationPath,
  DegreeId,
  GuildRank,
  ApplianceSource,
  AIDifficulty,
  AIConfig,
  GoalSettings,
  EquipmentSlot,
} from '@/types/game.types';
import type { StreetRobberyResult, ApartmentRobberyResult } from '@/data/shadowfingers';
import type { DungeonActionResult, DungeonAdvanceAction, DungeonRunSession } from './dungeonTypes';

export interface ShadowfingersEvent {
  type: 'street' | 'apartment';
  result: StreetRobberyResult | ApartmentRobberyResult;
}

export interface GameStore extends GameState {
  startNewGame: (playerNames: string[], includeAI: boolean, goals: GoalSettings, aiDifficulty?: AIDifficulty, aiConfigs?: AIConfig[], playerPortraits?: (string | null)[]) => void;
  dungeonRuns: Record<string, DungeonRunSession>;
  movePlayer: (playerId: string, location: LocationId, timeCost: number) => void;
  travelPlayer: (playerId: string, route: LocationId[]) => ActionResult | undefined;
  spendTime: (playerId: string, hours: number) => void;
  modifyGold: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyClothing: (playerId: string, amount: number) => void;
  modifyMaxHealth: (playerId: string, amount: number) => void;
  modifyRelaxation: (playerId: string, amount: number) => void;
  setHousing: (playerId: string, tier: HousingTier) => void;
  setJob: (playerId: string, jobId: string | null, wage?: number) => void;
  cureSickness: (playerId: string) => void;
  workShift: (playerId: string, hours: number, wage: number) => boolean;
  requestRaise: (playerId: string) => { success: boolean; newWage?: number; message: string };
  negotiateRaise: (playerId: string, newWage: number) => void;
  spendRemainingTime: (playerId: string) => void;
  studySession: (playerId: string, path: EducationPath, cost: number, hours: number) => void;
  completeEducationLevel: (playerId: string, path: EducationPath) => void;
  studyDegree: (playerId: string, degreeId: DegreeId, cost: number, hours: number) => void;
  payFullTuition: (playerId: string, degreeId: DegreeId, totalCost: number, sessions: number) => void;
  completeDegree: (playerId: string, degreeId: DegreeId) => void;
  performWorkShift: (playerId: string, mode: 'full' | 'remaining') => ActionResult | undefined;
  attemptWorkplaceRaise: (playerId: string) => ActionResult | undefined;
  attendDegreeSession: (playerId: string, degreeId: DegreeId, mode: 'standard' | 'cram') => ActionResult | undefined;
  prepayDegree: (playerId: string, degreeId: DegreeId) => ActionResult | undefined;
  graduateDegree: (playerId: string, degreeId: DegreeId) => ActionResult | undefined;
  acceptJobOffer: (playerId: string, jobId: string) => ActionResult | undefined;
  acceptMarketRaise: (playerId: string) => ActionResult | undefined;
  performNpcFavor: (playerId: string, favorId: string) => ActionResult | undefined;
  performCityActivity: (playerId: string, activityId: string) => ActionResult | undefined;
  performHomeActivity: (playerId: string, activity: 'relax' | 'sleep') => ActionResult | undefined;
  purchaseTavernItem: (playerId: string, itemId: string) => ActionResult | undefined;
  purchaseAIResourceItem: (playerId: string, vendor: 'general-store' | 'shadow-market' | 'rusty-tankard' | 'armory', itemId: string) => ActionResult | undefined;
  performCaveRest: (playerId: string) => DungeonActionResult | undefined;
  beginDungeonRun: (playerId: string, floorId: number) => DungeonActionResult | undefined;
  resolveDungeonEncounter: (playerId: string) => DungeonActionResult | undefined;
  advanceDungeonRun: (playerId: string, action: DungeonAdvanceAction) => DungeonActionResult | undefined;
  finalizeDungeonRun: (playerId: string) => DungeonActionResult | undefined;
  swapOutfits: (playerId: string) => boolean;
  storeBackupOutfit: (playerId: string, condition: number, cost: number) => boolean;
  readBook: (playerId: string, hours: number, cost: number) => boolean;
  payRent: (playerId: string) => void;
  depositToBank: (playerId: string, amount: number) => void;
  withdrawFromBank: (playerId: string, amount: number) => void;
  invest: (playerId: string, amount: number) => void;
  withdrawInvestment: (playerId: string, amount: number) => void;
  transferBankFunds: (playerId: string, direction: 'deposit' | 'withdraw', amount: number) => ActionResult | undefined;
  manageInvestment: (playerId: string, service: 'invest' | 'withdraw', amount: number) => ActionResult | undefined;
  buyItem: (playerId: string, itemId: string, cost: number) => void;
  buyDurable: (playerId: string, itemId: string, cost: number) => void;
  sellItem: (playerId: string, itemId: string, price: number) => void;
  sellInventoryItem: (playerId: string, itemId: string) => ActionResult | undefined;
  sellDurable: (playerId: string, itemId: string, price: number) => void;
  buyGuildPass: (playerId: string) => void;
  takeQuest: (playerId: string, questId: string) => void;
  completeQuest: (playerId: string) => void;
  abandonQuest: (playerId: string) => void;
  completeLocationObjective: (playerId: string, objectiveId: string) => void;
  takeChainQuest: (playerId: string, chainId: string) => void;
  completeChainQuest: (playerId: string) => void;
  takeNonLinearChain: (playerId: string, chainId: string) => void;
  completeNonLinearChainStep: (playerId: string) => void;
  makeNLChainChoice: (playerId: string, choiceId: string) => void;
  takeBounty: (playerId: string, bountyId: string) => void;
  completeBounty: (playerId: string) => void;
  evictPlayer: (playerId: string) => void;
  checkDeath: (playerId: string) => boolean;
  promoteGuildRank: (playerId: string) => void;
  endTurn: () => void;
  startTurn: (playerId: string) => void;
  processWeekEnd: () => void;
  setPhase: (phase: GameState['phase']) => void;
  resetForNewGame: () => void;
  selectLocation: (location: LocationId | null) => void;
  dismissEvent: () => void;
  checkVictory: (playerId: string) => boolean;
  setEventMessage: (message: string | null) => void;
  selectedLocation: LocationId | null;
  shadowfingersEvent: ShadowfingersEvent | null;
  dismissShadowfingersEvent: () => void;
  buyAppliance: (playerId: string, applianceId: string, price: number, source: ApplianceSource) => number;
  repairAppliance: (playerId: string, applianceId: string) => number;
  pawnAppliance: (playerId: string, applianceId: string, pawnValue: number) => void;
  redeemAppliance: (playerId: string, applianceId: string) => boolean;
  prepayRent: (playerId: string, weeks: number, totalCost: number) => void;
  moveToHousing: (playerId: string, tier: HousingTier, cost: number, lockInRent: number) => void;
  begForMoreTime: (playerId: string) => { success: boolean; message: string };
  payHousingRent: (playerId: string, weeks: 1 | 4) => ActionResult | undefined;
  moveHousingAtLandlord: (playerId: string, tier: HousingTier) => ActionResult | undefined;
  requestRentExtensionAtLandlord: (playerId: string) => ActionResult | undefined;
  applianceBreakageEvent: { playerId: string; applianceId: string; repairCost: number; originalPrice?: number; fromCurse?: boolean; curserName?: string } | null;
  dismissApplianceBreakageEvent: () => void;
  toadCurseEvent: { hoursLost: number; curserName?: string } | null;
  dismissToadCurseEvent: () => void;
  dismissDeathEvent: () => void;
  equipItem: (playerId: string, itemId: string, slot: EquipmentSlot) => void;
  unequipItem: (playerId: string, slot: EquipmentSlot) => void;
  clearDungeonFloor: (playerId: string, floorId: number) => void;
  applyRareDrop: (playerId: string, dropId: string) => void;
  incrementDungeonAttempts: (playerId: string) => void;
  updatePlayerDungeonRecord: (playerId: string, floorId: number, goldEarned: number, encountersCompleted: number, week?: number, cleared?: boolean) => void;
  buyStock: (playerId: string, stockId: string, shares: number) => void;
  sellStock: (playerId: string, stockId: string, shares: number) => void;
  takeLoan: (playerId: string, amount: number) => void;
  repayLoan: (playerId: string, amount: number) => void;
  tradeStock: (playerId: string, side: 'buy' | 'sell', stockId: string, shares: number) => ActionResult | undefined;
  manageLoan: (playerId: string, service: 'borrow' | 'repay', amount: number | 'all') => ActionResult | undefined;
  buyFreshFood: (playerId: string, units: number, cost: number) => boolean;
  buyFoodWithSpoilage: (playerId: string, foodValue: number, cost: number) => boolean;
  buyLotteryTicket: (playerId: string, cost: number) => void;
  buyTicket: (playerId: string, ticketType: string, cost: number) => void;
  temperEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, cost: number) => void;
  forgeRepairAppliance: (playerId: string, applianceId: string) => number;
  forgeRepairEquipment: (playerId: string, itemId: string, cost: number) => void;
  salvageEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, value: number) => void;
  applyDurabilityLoss: (playerId: string, durabilityLoss: import('@/data/combatResolver').EquipmentDurabilityLoss) => void;
  buyHexScroll: (playerId: string, hexId: string, cost: number) => void;
  castLocationHex: (playerId: string, hexId: string) => { success: boolean; message: string };
  castPersonalCurse: (playerId: string, hexId: string, targetId: string) => { success: boolean; message: string };
  buyProtectiveAmulet: (playerId: string, cost: number) => void;
  dispelLocationHex: (playerId: string, cost: number) => { success: boolean; message: string };
  cleanseCurse: (playerId: string, cost: number) => { success: boolean; message: string };
  performDarkRitual: (playerId: string, cost: number) => { success: boolean; message: string; backfired?: boolean };
  attemptCurseReflection: (playerId: string, cost: number) => { success: boolean; message: string };
  addHexScrollToPlayer: (playerId: string, hexId: string) => void;
  purchaseHexScroll: (playerId: string, vendor: 'enchanter' | 'shadow-market', hexId: string) => ActionResult | undefined;
  useHexDefense: (playerId: string, service: 'amulet' | 'dispel', targetLocation?: LocationId) => ActionResult | undefined;
  useGraveyardHexService: (playerId: string, service: 'ritual' | 'reflect' | 'cleanse') => (ActionResult & { backfired?: boolean }) | undefined;
  dismissWeekendEvent: () => void;
  saveToSlot: (slot: number, slotName?: string) => boolean;
  loadFromSlot: (slot: number) => boolean;
  aiSpeedMultiplier: number;
  setAISpeedMultiplier: (multiplier: number) => void;
  skipAITurn: boolean;
  setSkipAITurn: (skip: boolean) => void;
  showTutorial: boolean;
  tutorialStep: number;
  setShowTutorial: (show: boolean) => void;
  setTutorialStep: (step: number) => void;
  setDebugWeather: (type: string) => void;
  setDebugFestival: (festivalId: string | null) => void;
  sabotagePlayer: (saboteurId: string, targetId: string, optionId: string) => ActionResult | undefined;
  buyProtection: (playerId: string, weeks: number) => ActionResult | undefined;
  buyTipOff: (playerId: string, targetId: string) => ActionResult | undefined;
  modifyReputation: (playerId: string, fame: number, infamy: number) => void;
  purchaseReputationUnlock: (playerId: string, unlockId: string) => ActionResult | undefined;
  useHealerService: (playerId: string, serviceId: 'minor' | 'moderate' | 'full' | 'cure' | 'blessing') => ActionResult | undefined;
  useGraveyardService: (playerId: string, serviceId: 'pray' | 'mourn' | 'blessing') => ActionResult | undefined;
  gambleAtFence: (playerId: string, stake: number) => ActionResult | undefined;
  purchaseNewspaper: (playerId: string, vendor: 'general-store' | 'shadow-market') => ActionResult | undefined;
  purchaseVendorItem: (playerId: string, vendor: 'general-store' | 'shadow-market', itemId: string) => ActionResult | undefined;
  purchaseAppliance: (playerId: string, vendor: 'enchanter' | 'shadow-market' | 'fence', applianceId: string) => ActionResult | undefined;
  useApplianceService: (playerId: string, service: 'repair-enchanter' | 'repair-forge' | 'pawn' | 'redeem', applianceId: string) => ActionResult | undefined;
  purchaseEquipmentItem: (playerId: string, vendor: 'armory' | 'fence-used', itemId: string, mode?: 'primary' | 'backup') => ActionResult | undefined;
  useEquipmentService: (playerId: string, service: 'temper' | 'repair' | 'salvage', itemId: string) => ActionResult | undefined;
}

// Network-guarded actions return undefined on guests while the host processes the request.
// Keep that value explicit in result unions so callers can use optional chaining.
export interface ActionResult {
  success: boolean;
  message: string;
}

export type SetFn = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
export type GetFn = () => GameStore;
