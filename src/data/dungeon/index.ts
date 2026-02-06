// Guild Life - Dungeon System
// Barrel re-export for the dungeon module
// All imports from '@/data/dungeon' resolve here

export type {
  EncounterDifficulty,
  EncounterType,
  EncounterOutcome,
  FloorRunResult,
  DungeonEncounter,
  FloorRequirements,
  RareDrop,
  RareDropEffect,
  EducationDungeonBonus,
  DungeonFloor,
} from './types';

export {
  EDUCATION_DUNGEON_BONUSES,
  DUNGEON_FLOORS,
} from './floors';

export {
  ENCOUNTERS_PER_FLOOR,
  MAX_DUNGEON_FLOOR,
  MAX_FLOOR_ATTEMPTS_PER_TURN,
  HEALING_POTION_HP,
  getFloor,
  getAllFloors,
  checkFloorRequirements,
  calculateEducationBonuses,
  generateFloorEncounters,
  getLootMultiplier,
  getFloorTimeCost,
  getEncounterTimeCost,
  getHighestAvailableFloor,
  getDungeonProgress,
} from './helpers';
