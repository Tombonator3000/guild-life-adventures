import { create } from 'zustand';
import type {
  Player,
  LocationId,
  GoalSettings,
  DegreeId,
  AIDifficulty,
} from '@/types/game.types';
import { PLAYER_COLORS, AI_COLOR, AI_OPPONENTS, HOURS_PER_TURN, STARTING_AGE } from '@/types/game.types';
import type { AIConfig } from '@/types/game.types';
import { getInitialStockPrices } from '@/data/stocks';
import { CLEAR_WEATHER } from '@/data/weather';
import type { WeatherType, WeatherParticle } from '@/data/weather';
import { FESTIVALS } from '@/data/festivals';
import { saveGame, loadGame, deleteSave } from '@/data/saveLoad';
import { createPlayerActions } from './helpers/playerHelpers';
import { createEconomyActions } from './helpers/economyHelpers';
import { createTurnActions } from './helpers/turnHelpers';
import { createWorkEducationActions } from './helpers/workEducationHelpers';
import { createQuestActions } from './helpers/questHelpers';
import { createHexActions } from './helpers/hexHelpers';
import { forwardIfGuest, setStoreAccessor } from '@/network/NetworkActionProxy';
import { markEventDismissed, setNetworkStateStoreAccessor } from '@/network/networkState';
import { getDefaultAIPortrait } from '@/data/portraits';
import type { GameStore } from './storeTypes';

/**
 * Wrap a set of store actions with network-aware guards.
 * For online guests: actions are forwarded to the host instead of executing locally.
 * For local/host mode: actions pass through unchanged.
 */
function wrapWithNetworkGuard<T extends Record<string, unknown>>(actions: T): T {
  const wrapped = {} as Record<string, unknown>;
  for (const [name, fn] of Object.entries(actions)) {
    if (typeof fn !== 'function') {
      wrapped[name] = fn;
      continue;
    }
    wrapped[name] = (...args: unknown[]) => {
      if (forwardIfGuest(name, args)) return;
      return (fn as (...a: unknown[]) => unknown)(...args);
    };
  }
  return wrapped as T;
}

// Re-export ShadowfingersEvent from storeTypes for consumers
export type { ShadowfingersEvent } from './storeTypes';

const createPlayer = (
  id: string,
  name: string,
  color: string,
  isAI: boolean = false,
  aiDifficulty?: AIDifficulty,
  portraitId?: string | null
): Player => ({
  id,
  name,
  color,
  portraitId: portraitId ?? null,
  aiDifficulty: isAI ? (aiDifficulty || 'medium') : undefined,
  age: STARTING_AGE,
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
  clothingCondition: 35, // Casual tier (Jones-style: starts with basic clothes, need to buy better for higher jobs)
  weeksSinceRent: 0,
  foodLevel: 50,
  foodBoughtWithoutPreservation: false,
  hasStoreBoughtFood: false,
  savings: 0,
  investments: 0,
  currentJob: null,
  currentWage: 0,
  shiftsWorkedSinceHire: 0,
  totalShiftsWorked: 0, // Lifetime counter for loan eligibility
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
  rentExtensionUsed: false,
  // Death/Game Over state
  isGameOver: false,
  wasResurrectedThisWeek: false,
  // Combat & Equipment
  equippedWeapon: null,
  equippedArmor: null,
  equippedShield: null,
  dungeonFloorsCleared: [],
  dungeonAttemptsThisTurn: 0,
  permanentGoldBonus: 0,
  dungeonRecords: {},
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
  // Forge tempering
  temperedItems: [],
  // Equipment durability
  equipmentDurability: {},
  // Quest system B-features
  questChainProgress: {},
  completedBountiesThisWeek: [],
  questCooldownWeeksLeft: 0,
  guildReputation: 0,
  // Hexes & Curses
  hexScrolls: [],
  activeCurses: [],
  hasProtectiveAmulet: false,
  hexCastCooldown: 0,
});

export const useGameStore = create<GameStore>((set, get) => {
  const playerActions = createPlayerActions(set, get);
  const economyActions = createEconomyActions(set, get);
  const turnActions = createTurnActions(set, get);
  const workEducationActions = createWorkEducationActions(set, get);
  const questActions = createQuestActions(set, get);
  const hexActions = createHexActions(set, get);

  return {
    // Initial state
    phase: 'title',
    currentPlayerIndex: 0,
    players: [],
    week: 1,
    priceModifier: 1.0,
    basePriceModifier: 1.0,
    economyTrend: 0,
    economyCycleWeeksLeft: 4,
    goalSettings: {
      wealth: 5000,
      happiness: 75,   // Reduced from 100 - happiness is harder to accumulate now
      education: 45,   // 45 points = 5 degrees (each degree = 9 pts, Jones-style)
      career: 75,      // Dependability target (Jones-style: career = dependability)
      adventure: 0,    // Adventure points (quests + dungeon floors), 0 = disabled
    },
    winner: null,
    eventMessage: null,
    rentDueWeek: 4,
    selectedLocation: null,
    shadowfingersEvent: null,
    aiDifficulty: 'medium' as AIDifficulty,
    stockPrices: getInitialStockPrices(),
    weekendEvent: null,
    weather: { ...CLEAR_WEATHER },
    activeFestival: null,
    deathEvent: null,

    // AI speed control
    aiSpeedMultiplier: 1,
    skipAITurn: false,

    // Tutorial
    showTutorial: false,
    tutorialStep: 0,

    // Online multiplayer
    networkMode: 'local' as const,
    localPlayerId: null as string | null,
    roomCode: null as string | null,
    weeklyNewsEvents: [],
    locationHexes: [],

    // Game setup (not network-wrapped — guarded explicitly)
    startNewGame: (playerNames, includeAI, goals, aiDifficulty = 'medium', aiConfigs, playerPortraits) => {
      // Block on guest clients — only host/local can start a new game
      if (get().networkMode === 'guest') return;
      const players: Player[] = playerNames.map((name, index) =>
        createPlayer(
          `player-${index}`,
          name,
          PLAYER_COLORS[index].value,
          false,
          undefined,
          playerPortraits?.[index] ?? null
        )
      );

      // Support multiple AI opponents via aiConfigs, or single via legacy includeAI
      if (aiConfigs && aiConfigs.length > 0) {
        aiConfigs.forEach((config, i) => {
          const aiDef = AI_OPPONENTS[i] || AI_OPPONENTS[0];
          players.push(createPlayer(
            aiDef.id,
            config.name || aiDef.name,
            aiDef.color,
            true,
            config.difficulty,
            config.portraitId ?? getDefaultAIPortrait(i)
          ));
        });
      } else if (includeAI) {
        // Legacy single-AI path (backwards compatible)
        players.push(createPlayer('ai-grimwald', 'Grimwald', AI_COLOR.value, true, aiDifficulty, 'ai-grimwald'));
      }

      set({
        phase: 'playing',
        players,
        currentPlayerIndex: 0,
        week: 1,
        priceModifier: 1.0,
        basePriceModifier: 1.0,
        economyTrend: 0,
        economyCycleWeeksLeft: 4,
        goalSettings: goals,
        winner: null,
        eventMessage: null,
        rentDueWeek: 4,
        selectedLocation: null,
        shadowfingersEvent: null,
        aiDifficulty,
        stockPrices: getInitialStockPrices(),
        weekendEvent: null,
        weather: { ...CLEAR_WEATHER },
        activeFestival: null,
        deathEvent: null,
        locationHexes: [],
      });
    },

    // Player actions (network-aware: guest actions forwarded to host)
    ...wrapWithNetworkGuard(playerActions),

    // Work and education actions (network-aware)
    ...wrapWithNetworkGuard(workEducationActions),

    // Economy actions (network-aware)
    ...wrapWithNetworkGuard(economyActions),

    // Hex & Curse actions (network-aware)
    ...wrapWithNetworkGuard(hexActions),

    // Quest and game status actions (network-aware)
    ...wrapWithNetworkGuard(questActions),

    // Turn management actions (network-aware)
    ...wrapWithNetworkGuard(turnActions),

    // Simple UI actions
    setPhase: (phase) => {
      // When entering victory, delete the autosave to prevent the
      // "Continue → instant re-victory" loop on TitleScreen.
      if (phase === 'victory') {
        try { deleteSave(0); } catch { /* ignore */ }
      }
      set({ phase });
    },

    // Reset all game state and return to title screen.
    // Used from VictoryScreen to ensure clean slate for next game.
    resetForNewGame: () => {
      try { deleteSave(0); } catch { /* ignore */ }
      set({
        phase: 'title',
        players: [],
        currentPlayerIndex: 0,
        week: 1,
        winner: null,
        eventMessage: null,
        selectedLocation: null,
        shadowfingersEvent: null,
        deathEvent: null,
        weekendEvent: null,
        weather: { ...CLEAR_WEATHER },
        activeFestival: null,
        locationHexes: [],
        stockPrices: getInitialStockPrices(),
        priceModifier: 1.0,
        basePriceModifier: 1.0,
        economyTrend: 0,
        economyCycleWeeksLeft: 4,
      });
    },
    selectLocation: (location) => set({ selectedLocation: location }),
    dismissEvent: () => {
      if (get().networkMode === 'guest') markEventDismissed('eventMessage');
      set({ eventMessage: null, phase: 'playing' });
    },
    dismissShadowfingersEvent: () => {
      if (get().networkMode === 'guest') markEventDismissed('shadowfingersEvent');
      set({ shadowfingersEvent: null });
    },
    setEventMessage: (message) => set({ eventMessage: message }),

    // Death event modal
    dismissDeathEvent: () => {
      if (get().networkMode === 'guest') markEventDismissed('deathEvent');
      // After death/resurrection, show the Graveyard panel if player is there
      const state = get();
      const deathEvt = state.deathEvent;
      if (deathEvt && !deathEvt.isPermadeath) {
        const player = state.players.find(p => p.id === deathEvt.playerId);
        if (player?.currentLocation === 'graveyard') {
          set({ deathEvent: null, selectedLocation: 'graveyard' });
          return;
        }
      }
      set({ deathEvent: null });
    },

    // Appliance breakage event state
    applianceBreakageEvent: null,
    dismissApplianceBreakageEvent: () => {
      if (get().networkMode === 'guest') markEventDismissed('applianceBreakageEvent');
      set({ applianceBreakageEvent: null });
    },
    // Weekend event state
    dismissWeekendEvent: () => {
      if (get().networkMode === 'guest') markEventDismissed('weekendEvent');
      set({ weekendEvent: null });
    },

    // Save/Load
    saveToSlot: (slot: number, slotName?: string) => {
      // Block manual saves during online games
      if (get().networkMode !== 'local') return false;
      const state = get();
      return saveGame(state, slot, slotName);
    },
    loadFromSlot: (slot: number) => {
      // Block save loading during online games to prevent state corruption
      if (get().networkMode !== 'local') return false;
      const data = loadGame(slot);
      if (!data) return false;
      const gs = data.gameState;

      // Defensive validation: corrupted or structurally broken saves could crash
      // the app or set phase to undefined, causing the UI to hang.
      const validPhases = ['title', 'setup', 'playing', 'victory', 'event', 'online-lobby'];
      if (!gs || !gs.players || !Array.isArray(gs.players) || gs.players.length === 0) {
        console.warn('[Guild Life] Save data is corrupted — missing players. Deleting bad save.');
        try { deleteSave(slot); } catch { /* ignore */ }
        return false;
      }
      if (!gs.phase || !validPhases.includes(gs.phase)) {
        console.warn('[Guild Life] Save has invalid phase:', gs.phase, '— defaulting to playing.');
        gs.phase = 'playing';
      }

      // H1 FIX: Migrate 'modest' housing to 'slums' (Jones 2-tier system)
      const migratedPlayers = gs.players.map((p: Player) =>
        p.housing === ('modest' as string) ? { ...p, housing: 'slums' as const } : p
      );
      set({
        phase: gs.phase === 'event' ? 'playing' : gs.phase,
        currentPlayerIndex: gs.currentPlayerIndex,
        players: migratedPlayers,
        week: gs.week,
        priceModifier: gs.priceModifier,
        economyTrend: gs.economyTrend ?? 0,
        economyCycleWeeksLeft: gs.economyCycleWeeksLeft ?? 4,
        // Migrate old saves: career was guild rank 1-7, now dependability 10-100
        // Also ensure adventure field exists (added in v3, defaults to 0 = disabled)
        goalSettings: {
          ...(gs.goalSettings.career <= 7
            ? { ...gs.goalSettings, career: Math.round(gs.goalSettings.career * 100 / 7) }
            : gs.goalSettings),
          adventure: gs.goalSettings.adventure ?? 0,
        },
        winner: gs.winner,
        eventMessage: null,
        rentDueWeek: gs.rentDueWeek,
        selectedLocation: null,
        shadowfingersEvent: null,
        aiDifficulty: gs.aiDifficulty,
        stockPrices: gs.stockPrices || getInitialStockPrices(),
        weekendEvent: null,
        weather: gs.weather || { ...CLEAR_WEATHER },
        activeFestival: gs.activeFestival || null,
        deathEvent: null,
      });
      return true;
    },

    // AI speed control
    setAISpeedMultiplier: (multiplier: number) => set({ aiSpeedMultiplier: multiplier }),
    setSkipAITurn: (skip: boolean) => set({ skipAITurn: skip }),

    // Tutorial
    setShowTutorial: (show: boolean) => set({ showTutorial: show }),
    setTutorialStep: (step: number) => set({ tutorialStep: step }),

    // Debug actions (developer panel only)
    setDebugWeather: (type: string) => {
      if (type === 'clear') {
        set({ weather: { ...CLEAR_WEATHER } });
      } else {
        // Import weather events data to set specific weather
        const weatherMap: Record<string, { name: string; description: string; particle: string | null; movementCostExtra: number; priceMultiplier: number; happinessPerWeek: number; robberyMultiplier: number; foodSpoilageChance: number }> = {
          'snowstorm': { name: 'Snowstorm', description: 'DEBUG: Forced snowstorm.', particle: 'snow', movementCostExtra: 1, priceMultiplier: 1.10, happinessPerWeek: -2, robberyMultiplier: 0.5, foodSpoilageChance: 0 },
          'thunderstorm': { name: 'Thunderstorm', description: 'DEBUG: Forced thunderstorm.', particle: 'rain', movementCostExtra: 1, priceMultiplier: 1.05, happinessPerWeek: -1, robberyMultiplier: 1.5, foodSpoilageChance: 0 },
          'drought': { name: 'Drought', description: 'DEBUG: Forced drought.', particle: 'heatwave', movementCostExtra: 0, priceMultiplier: 1.15, happinessPerWeek: -2, robberyMultiplier: 1.0, foodSpoilageChance: 0.25 },
          'enchanted-fog': { name: 'Enchanted Fog', description: 'DEBUG: Forced fog.', particle: 'fog', movementCostExtra: 1, priceMultiplier: 0.95, happinessPerWeek: 3, robberyMultiplier: 1.2, foodSpoilageChance: 0 },
          'harvest-rain': { name: 'Harvest Rain', description: 'DEBUG: Forced rain.', particle: 'light-rain', movementCostExtra: 0, priceMultiplier: 0.90, happinessPerWeek: 2, robberyMultiplier: 1.0, foodSpoilageChance: 0 },
        };
        const data = weatherMap[type];
        if (data) {
          set({
            weather: {
              type: type as WeatherType,
              name: data.name,
              description: data.description,
              weeksRemaining: 99, // Persist until manually cleared
              particle: data.particle as WeatherParticle | null,
              movementCostExtra: data.movementCostExtra,
              priceMultiplier: data.priceMultiplier,
              happinessPerWeek: data.happinessPerWeek,
              robberyMultiplier: data.robberyMultiplier,
              foodSpoilageChance: data.foodSpoilageChance,
            },
          });
        }
      }
    },
    setDebugFestival: (festivalId: string | null) => {
      if (!festivalId) {
        set({ activeFestival: null });
      } else {
        const festival = FESTIVALS.find(f => f.id === festivalId);
        if (festival) {
          set({ activeFestival: festival.id });
        }
      }
    },
  };
});

// Register store accessors to break circular dependencies.
// Both NetworkActionProxy and networkState need access to the store but can't import
// useGameStore directly (that would create gameStore → module → gameStore cycles).
setStoreAccessor(() => useGameStore.getState());
setNetworkStateStoreAccessor({
  getState: () => useGameStore.getState() as Record<string, unknown>,
  setState: (update) => useGameStore.setState(update),
});

// Auto-save: save to slot 0 whenever game state changes during play
// Disabled for online modes (multiplayer saves can't be restored properly)
// Wrapped in try-catch: this executes at module load time. If it throws,
// the entire module evaluation fails and React can't mount ("Loading the realm..." freeze).
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
try {
  useGameStore.subscribe((state) => {
    if ((state.phase === 'playing' || state.phase === 'event') && state.networkMode === 'local') {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        try {
          saveGame(state, 0);
        } catch (e) {
          console.warn('[Guild Life] Auto-save failed:', e);
        }
      }, 2000);
    }
  });
} catch (e) {
  console.warn('[Guild Life] Failed to set up auto-save subscription:', e);
}

// Selector hooks
export const useCurrentPlayer = () => {
  const players = useGameStore((state) => state.players);
  const currentIndex = useGameStore((state) => state.currentPlayerIndex);
  return players[currentIndex];
};

export const usePlayer = (playerId: string) => {
  return useGameStore((state) => state.players.find(p => p.id === playerId));
};
