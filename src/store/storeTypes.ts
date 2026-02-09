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
  workShift: (playerId: string, hours: number, wage: number) => void;
  requestRaise: (playerId: string) => { success: boolean; newWage?: number; message: string };
  negotiateRaise: (playerId: string, newWage: number) => void;
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
  applianceBreakageEvent: { playerId: string; applianceId: string; repairCost: number } | null;
  dismissApplianceBreakageEvent: () => void;
  // Equipment actions
  equipItem: (playerId: string, itemId: string, slot: EquipmentSlot) => void;
  unequipItem: (playerId: string, slot: EquipmentSlot) => void;
  // Dungeon actions
  clearDungeonFloor: (playerId: string, floorId: number) => void;
  applyRareDrop: (playerId: string, dropId: string) => void;
  // Stock Market actions
  buyStock: (playerId: string, stockId: string, shares: number) => void;
  sellStock: (playerId: string, stockId: string, shares: number) => void;
  // Loan actions
  takeLoan: (playerId: string, amount: number) => void;
  repayLoan: (playerId: string, amount: number) => void;
  // Fresh food actions
  buyFreshFood: (playerId: string, units: number, cost: number) => void;
  // Lottery actions
  buyLotteryTicket: (playerId: string, cost: number) => void;
  // Ticket actions
  buyTicket: (playerId: string, ticketType: string, cost: number) => void;
  // Forge actions
  temperEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, cost: number) => void;
  forgeRepairAppliance: (playerId: string, applianceId: string) => number;
  salvageEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, value: number) => void;
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
}

// Zustand set/get function types
export type SetFn = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
export type GetFn = () => GameStore;
