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
  DungeonModifier,
  DungeonRecord,
  MiniBoss,
} from './types';

export {
  EDUCATION_DUNGEON_BONUSES,
  DUNGEON_FLOORS,
  DUNGEON_MODIFIERS,
} from './floors';

export {
  MINI_BOSSES,
} from './encounters';

export {
  ENCOUNTERS_PER_FLOOR,
  MAX_DUNGEON_FLOOR,
  MAX_FLOOR_ATTEMPTS_PER_TURN,
  HEALING_POTION_HP,
  MINI_BOSS_CHANCE,
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
  rollDungeonModifier,
  getAllModifiers,
  getMiniBoss,
  shouldSpawnMiniBoss,
  miniBossToEncounter,
  updateDungeonRecord,
} from './helpers';
