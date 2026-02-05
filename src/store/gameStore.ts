import { create } from 'zustand';
import type {
  Player,
  LocationId,
  GoalSettings,
  DegreeId,
  AIDifficulty,
} from '@/types/game.types';
import { PLAYER_COLORS, AI_COLOR, HOURS_PER_TURN } from '@/types/game.types';
import { createPlayerActions } from './helpers/playerHelpers';
import { createEconomyActions } from './helpers/economyHelpers';
import { createTurnActions } from './helpers/turnHelpers';
import { createWorkEducationActions } from './helpers/workEducationHelpers';
import { createQuestActions } from './helpers/questHelpers';
import type { GameStore } from './storeTypes';

// Re-export ShadowfingersEvent from storeTypes for consumers
export type { ShadowfingersEvent } from './storeTypes';

const createPlayer = (
  id: string,
  name: string,
  color: string,
  isAI: boolean = false
): Player => ({
  id,
  name,
  color,
  gold: 100,
  health: 100,
  maxHealth: 100,
  happiness: 50,
  timeRemaining: HOURS_PER_TURN, // Jones-style: 60 Hours per turn
  currentLocation: 'slums', // Players start in The Slums (like Jones)
  previousLocation: null, // Track where player came from (for street robbery)
  guildRank: 'novice',
  housing: 'homeless',
  education: {
    fighter: 0,
    mage: 0,
    priest: 0,
    business: 0,
  },
  educationProgress: {
    fighter: 0,
    mage: 0,
    priest: 0,
    business: 0,
  },
  // New Jones-style degree system
  completedDegrees: [],
  degreeProgress: {} as Record<DegreeId, number>,
  maxDependability: 100,
  maxExperience: 100,
  completedQuests: 0,
  clothingCondition: 50,
  weeksSinceRent: 0,
  foodLevel: 50,
  savings: 0,
  investments: 0,
  currentJob: null,
  currentWage: 0,
  shiftsWorkedSinceHire: 0,
  dependability: 50, // Start at 50%
  experience: 0,
  relaxation: 30, // Default relaxation (ranges 10-50)
  durables: {}, // Durable items owned at apartment
  appliances: {}, // Appliances with detailed tracking
  applianceHistory: [], // Appliance types ever owned (for happiness bonus)
  inventory: [],
  isAI,
  activeQuest: null,
  hasNewspaper: false,
  isSick: false,
  rentDebt: 0,
  // Housing prepayment system
  rentPrepaidWeeks: 0,
  lockedRent: 0,
  // Death/Game Over state
  isGameOver: false,
});

export const useGameStore = create<GameStore>((set, get) => {
  const playerActions = createPlayerActions(set, get);
  const economyActions = createEconomyActions(set, get);
  const turnActions = createTurnActions(set, get);
  const workEducationActions = createWorkEducationActions(set, get);
  const questActions = createQuestActions(set, get);

  return {
    // Initial state
    phase: 'title',
    currentPlayerIndex: 0,
    players: [],
    week: 1,
    priceModifier: 1.0,
    goalSettings: {
      wealth: 5000,
      happiness: 75,   // Reduced from 100 - happiness is harder to accumulate now
      education: 5,
      career: 4,
    },
    winner: null,
    eventMessage: null,
    rentDueWeek: 4,
    selectedLocation: null,
    shadowfingersEvent: null,
    aiDifficulty: 'medium' as AIDifficulty,

    // Game setup
    startNewGame: (playerNames, includeAI, goals, aiDifficulty = 'medium') => {
      const players: Player[] = playerNames.map((name, index) =>
        createPlayer(
          `player-${index}`,
          name,
          PLAYER_COLORS[index].value,
          false
        )
      );

      if (includeAI) {
        players.push(createPlayer('ai-grimwald', 'Grimwald', AI_COLOR.value, true));
      }

      set({
        phase: 'playing',
        players,
        currentPlayerIndex: 0,
        week: 1,
        priceModifier: 1.0,
        goalSettings: goals,
        winner: null,
        eventMessage: null,
        rentDueWeek: 4,
        selectedLocation: null,
        shadowfingersEvent: null,
        aiDifficulty,
      });
    },

    // Player actions
    ...playerActions,

    // Work and education actions
    ...workEducationActions,

    // Economy actions
    ...economyActions,

    // Quest and game status actions
    ...questActions,

    // Turn management actions
    ...turnActions,

    // Simple UI actions
    setPhase: (phase) => set({ phase }),
    selectLocation: (location) => set({ selectedLocation: location }),
    dismissEvent: () => set({ eventMessage: null, phase: 'playing' }),
    dismissShadowfingersEvent: () => set({ shadowfingersEvent: null }),
    setEventMessage: (message) => set({ eventMessage: message }),

    // Appliance breakage event state
    applianceBreakageEvent: null,
    dismissApplianceBreakageEvent: () => set({ applianceBreakageEvent: null }),
  };
});

// Selector hooks
export const useCurrentPlayer = () => {
  const players = useGameStore((state) => state.players);
  const currentIndex = useGameStore((state) => state.currentPlayerIndex);
  return players[currentIndex];
};

export const usePlayer = (playerId: string) => {
  return useGameStore((state) => state.players.find(p => p.id === playerId));
};
