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

// Shadowfingers robbery event for display
export interface ShadowfingersEvent {
  type: 'street' | 'apartment';
  result: StreetRobberyResult | ApartmentRobberyResult;
}

// Full store interface used by helpers
export interface GameStore extends GameState {
  startNewGame: (playerNames: string[], includeAI: boolean, goals: GoalSettings, aiDifficulty?: AIDifficulty, aiConfigs?: AIConfig[], playerPortraits?: (string | null)[]) => void;
  movePlayer: (playerId: string, location: LocationId, timeCost: number) => void;
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
  completeDegree: (playerId: string, degreeId: DegreeId) => void;
  payRent: (playerId: string) => void;
  depositToBank: (playerId: string, amount: number) => void;
  withdrawFromBank: (playerId: string, amount: number) => void;
  invest: (playerId: string, amount: number) => void;
  withdrawInvestment: (playerId: string, amount: number) => void;
  buyItem: (playerId: string, itemId: string, cost: number) => void;
  buyDurable: (playerId: string, itemId: string, cost: number) => void;
  sellItem: (playerId: string, itemId: string, price: number) => void;
  sellDurable: (playerId: string, itemId: string, price: number) => void;
  buyGuildPass: (playerId: string) => void;
  takeQuest: (playerId: string, questId: string) => void;
  completeQuest: (playerId: string) => void;
  abandonQuest: (playerId: string) => void;
  // Quest Chain actions (B1)
  takeChainQuest: (playerId: string, chainId: string) => void;
  completeChainQuest: (playerId: string) => void;
  // Non-linear quest chain actions
  takeNonLinearChain: (playerId: string, chainId: string) => void;
  completeNonLinearChainStep: (playerId: string) => void;
  makeNLChainChoice: (playerId: string, choiceId: string) => void;
  // Bounty actions (B2)
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
  prepayRent: (playerId: string, weeks: number, totalCost: number) => void;
  moveToHousing: (playerId: string, tier: HousingTier, cost: number, lockInRent: number) => void;
  begForMoreTime: (playerId: string) => { success: boolean; message: string };
  applianceBreakageEvent: { playerId: string; applianceId: string; repairCost: number; fromCurse?: boolean; curserName?: string } | null;
  dismissApplianceBreakageEvent: () => void;
  // Toad curse event (shown at start of turn)
  toadCurseEvent: { hoursLost: number; curserName?: string } | null;
  dismissToadCurseEvent: () => void;
  // Death event modal
  dismissDeathEvent: () => void;
  // Equipment actions
  equipItem: (playerId: string, itemId: string, slot: EquipmentSlot) => void;
  unequipItem: (playerId: string, slot: EquipmentSlot) => void;
  // Dungeon actions
  clearDungeonFloor: (playerId: string, floorId: number) => void;
  applyRareDrop: (playerId: string, dropId: string) => void;
  // M31 FIX: Proper store actions for dungeon tracking (was direct setState in CavePanel)
  incrementDungeonAttempts: (playerId: string) => void;
  updatePlayerDungeonRecord: (playerId: string, floorId: number, goldEarned: number, encountersCompleted: number) => void;
  // Stock Market actions
  buyStock: (playerId: string, stockId: string, shares: number) => void;
  sellStock: (playerId: string, stockId: string, shares: number) => void;
  // Loan actions
  takeLoan: (playerId: string, amount: number) => void;
  repayLoan: (playerId: string, amount: number) => void;
  // Fresh food actions
  buyFreshFood: (playerId: string, units: number, cost: number) => boolean;
  // Regular food with spoilage risk (General Store without Preservation Box = 80% spoilage)
  buyFoodWithSpoilage: (playerId: string, foodValue: number, cost: number) => boolean;
  // Lottery actions
  buyLotteryTicket: (playerId: string, cost: number) => void;
  // Ticket actions
  buyTicket: (playerId: string, ticketType: string, cost: number) => void;
  // Forge actions
  temperEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, cost: number) => void;
  forgeRepairAppliance: (playerId: string, applianceId: string) => number;
  forgeRepairEquipment: (playerId: string, itemId: string, cost: number) => void;
  salvageEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, value: number) => void;
  // Equipment durability
  applyDurabilityLoss: (playerId: string, durabilityLoss: import('@/data/combatResolver').EquipmentDurabilityLoss) => void;
  // Hexes & Curses actions
  buyHexScroll: (playerId: string, hexId: string, cost: number) => void;
  castLocationHex: (playerId: string, hexId: string) => { success: boolean; message: string };
  castPersonalCurse: (playerId: string, hexId: string, targetId: string) => { success: boolean; message: string };
  buyProtectiveAmulet: (playerId: string, cost: number) => void;
  dispelLocationHex: (playerId: string, cost: number) => { success: boolean; message: string };
  cleanseCurse: (playerId: string, cost: number) => { success: boolean; message: string };
  performDarkRitual: (playerId: string, cost: number) => { success: boolean; message: string; backfired?: boolean };
  attemptCurseReflection: (playerId: string, cost: number) => { success: boolean; message: string };
  addHexScrollToPlayer: (playerId: string, hexId: string) => void;
  // Weekend event display
  dismissWeekendEvent: () => void;
  // Save/Load
  saveToSlot: (slot: number, slotName?: string) => boolean;
  loadFromSlot: (slot: number) => boolean;
  // AI speed control
  aiSpeedMultiplier: number;
  setAISpeedMultiplier: (multiplier: number) => void;
  skipAITurn: boolean;
  setSkipAITurn: (skip: boolean) => void;
  // Tutorial
  showTutorial: boolean;
  tutorialStep: number;
  setShowTutorial: (show: boolean) => void;
  setTutorialStep: (step: number) => void;
  // Debug actions (developer panel)
  setDebugWeather: (type: string) => void;
  setDebugFestival: (festivalId: string | null) => void;
}

// Zustand set/get function types
export type SetFn = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
export type GetFn = () => GameStore;
