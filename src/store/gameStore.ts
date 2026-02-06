import { create } from 'zustand';
import type {
  Player,
  LocationId,
  GoalSettings,
  DegreeId,
  AIDifficulty,
} from '@/types/game.types';
import { PLAYER_COLORS, AI_COLOR, HOURS_PER_TURN } from '@/types/game.types';
import { getInitialStockPrices } from '@/data/stocks';
import { saveGame, loadGame } from '@/data/saveLoad';
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
  housing: 'slums',  // Start in slums like Jones (not homeless - too punishing)
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
  hasGuildPass: false,
  hasNewspaper: false,
  isSick: false,
  rentDebt: 0,
  // Housing prepayment system
  rentPrepaidWeeks: 0,
  lockedRent: 0,
  // Death/Game Over state
  isGameOver: false,
  // Combat & Equipment
  equippedWeapon: null,
  equippedArmor: null,
  equippedShield: null,
  dungeonFloorsCleared: [],
  dungeonAttemptsThisTurn: 0,
  permanentGoldBonus: 0,
  // Stock Market
  stocks: {},
  // Loans
  loanAmount: 0,
  loanWeeksRemaining: 0,
  // Weekend tickets
  tickets: [],
  // Fresh Food Storage
  freshFood: 0,
  // Lottery
  lotteryTickets: 0,
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
      education: 45,   // 45 points = 5 degrees (each degree = 9 pts, Jones-style)
      career: 4,
    },
    winner: null,
    eventMessage: null,
    rentDueWeek: 4,
    selectedLocation: null,
    shadowfingersEvent: null,
    aiDifficulty: 'medium' as AIDifficulty,
    stockPrices: getInitialStockPrices(),
    weekendEvent: null,

    // AI speed control
    aiSpeedMultiplier: 1,
    skipAITurn: false,

    // Tutorial
    showTutorial: false,
    tutorialStep: 0,

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
        stockPrices: getInitialStockPrices(),
        weekendEvent: null,
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
    // Weekend event state
    dismissWeekendEvent: () => set({ weekendEvent: null }),

    // Save/Load
    saveToSlot: (slot: number, slotName?: string) => {
      const state = get();
      return saveGame(state, slot, slotName);
    },
    loadFromSlot: (slot: number) => {
      const data = loadGame(slot);
      if (!data) return false;
      const gs = data.gameState;
      set({
        phase: gs.phase === 'event' ? 'playing' : gs.phase,
        currentPlayerIndex: gs.currentPlayerIndex,
        players: gs.players,
        week: gs.week,
        priceModifier: gs.priceModifier,
        goalSettings: gs.goalSettings,
        winner: gs.winner,
        eventMessage: null,
        rentDueWeek: gs.rentDueWeek,
        selectedLocation: null,
        shadowfingersEvent: null,
        aiDifficulty: gs.aiDifficulty,
        stockPrices: gs.stockPrices || getInitialStockPrices(),
        weekendEvent: null,
      });
      return true;
    },

    // AI speed control
    setAISpeedMultiplier: (multiplier: number) => set({ aiSpeedMultiplier: multiplier }),
    setSkipAITurn: (skip: boolean) => set({ skipAITurn: skip }),

    // Tutorial
    setShowTutorial: (show: boolean) => set({ showTutorial: show }),
    setTutorialStep: (step: number) => set({ tutorialStep: step }),
  };
});

// Auto-save: save to slot 0 whenever game state changes during play
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
useGameStore.subscribe((state) => {
  if (state.phase === 'playing' || state.phase === 'event') {
    // Debounce auto-save to avoid excessive writes
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveGame(state, 0);
    }, 2000);
  }
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
