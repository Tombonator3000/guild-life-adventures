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
  startNewGame: (playerNames: string[], includeAI: boolean, goals: GoalSettings, aiDifficulty?: AIDifficulty) => void;
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
  workShift: (playerId: string, hours: number, wage: number) => void;
  requestRaise: (playerId: string) => { success: boolean; newWage?: number; message: string };
  studySession: (playerId: string, path: EducationPath, cost: number, hours: number) => void;
  completeEducationLevel: (playerId: string, path: EducationPath) => void;
  studyDegree: (playerId: string, degreeId: DegreeId, cost: number, hours: number) => void;
  completeDegree: (playerId: string, degreeId: DegreeId) => void;
  payRent: (playerId: string) => void;
  depositToBank: (playerId: string, amount: number) => void;
  withdrawFromBank: (playerId: string, amount: number) => void;
  invest: (playerId: string, amount: number) => void;
  buyItem: (playerId: string, itemId: string, cost: number) => void;
  buyDurable: (playerId: string, itemId: string, cost: number) => void;
  sellItem: (playerId: string, itemId: string, price: number) => void;
  sellDurable: (playerId: string, itemId: string, price: number) => void;
  takeQuest: (playerId: string, questId: string) => void;
  completeQuest: (playerId: string) => void;
  abandonQuest: (playerId: string) => void;
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
}

// Zustand set/get function types
export type SetFn = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
export type GetFn = () => GameStore;
