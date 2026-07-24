import type {
  CombatStats,
  DungeonRunState,
  EducationBonuses,
  EncounterResult,
  EquippedItems,
  EquipmentDurabilityLoss,
} from '@/data/combatResolver';

export type DungeonAdvanceAction = 'continue' | 'skip-healing' | 'retreat' | 'leave';

/** Serializable host-owned state for one interactive dungeon run. */
export interface DungeonRunSession {
  floorId: number;
  runState: DungeonRunState;
  combatStats: CombatStats;
  educationBonuses: EducationBonuses;
  equippedItems: EquippedItems;
  encounterTimeCost: number;
  startedWeek: number;
}

/** Final display/result payload derived from the authoritative session. */
export interface DungeonCompletionSummary {
  success: boolean;
  goldEarned: number;
  totalDamage: number;
  totalHealed: number;
  healthChange: number;
  isFirstClear: boolean;
  retreated: boolean;
  rareDropName: string | null;
  happinessChange: number;
  encounterLog: EncounterResult[];
  encountersCompleted: number;
  durabilityLoss: EquipmentDurabilityLoss;
  hexScrollDropId: string | null;
}

export interface DungeonActionResult {
  success: boolean;
  message: string;
  summary?: DungeonCompletionSummary;
}
