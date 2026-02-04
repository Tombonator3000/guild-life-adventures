import { create } from 'zustand';
import type { 
  GameState, 
  Player, 
  LocationId, 
  GoalSettings,
  GuildRank,
  HousingTier,
  HOURS_PER_WEEK,
} from '@/types/game.types';
import { PLAYER_COLORS, AI_COLOR } from '@/types/game.types';

interface GameStore extends GameState {
  // Actions
  startNewGame: (playerNames: string[], includeAI: boolean, goals: GoalSettings) => void;
  movePlayer: (playerId: string, location: LocationId, timeCost: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyGold: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  endTurn: () => void;
  setPhase: (phase: GameState['phase']) => void;
  selectLocation: (location: LocationId | null) => void;
  selectedLocation: LocationId | null;
}

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
  timeRemaining: 168,
  currentLocation: 'guild-hall',
  guildRank: 'novice',
  housing: 'homeless',
  education: {},
  completedQuests: 0,
  clothingCondition: 100,
  weeksSinceRent: 0,
  isAI,
});

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  currentPlayerIndex: 0,
  players: [],
  week: 1,
  priceModifier: 1.0,
  goalSettings: {
    wealth: 50,
    happiness: 50,
    education: 50,
    career: 50,
  },
  winner: null,
  selectedLocation: null,

  startNewGame: (playerNames, includeAI, goals) => {
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
      selectedLocation: null,
    });
  },

  movePlayer: (playerId, location, timeCost) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { 
              ...p, 
              currentLocation: location, 
              timeRemaining: Math.max(0, p.timeRemaining - timeCost) 
            }
          : p
      ),
    }));
  },

  spendTime: (playerId, hours) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, timeRemaining: Math.max(0, p.timeRemaining - hours) }
          : p
      ),
    }));
  },

  modifyGold: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, gold: Math.max(0, p.gold + amount) }
          : p
      ),
    }));
  },

  modifyHealth: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, health: Math.max(0, Math.min(p.maxHealth, p.health + amount)) }
          : p
      ),
    }));
  },

  modifyHappiness: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, happiness: Math.max(0, Math.min(100, p.happiness + amount)) }
          : p
      ),
    }));
  },

  endTurn: () => {
    const state = get();
    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const isNewWeek = nextIndex === 0;

    set({
      currentPlayerIndex: nextIndex,
      week: isNewWeek ? state.week + 1 : state.week,
      priceModifier: isNewWeek 
        ? 0.7 + Math.random() * 0.6 
        : state.priceModifier,
      players: state.players.map((p, index) => 
        index === nextIndex 
          ? { ...p, timeRemaining: 168 }
          : p
      ),
    });
  },

  setPhase: (phase) => set({ phase }),

  selectLocation: (location) => set({ selectedLocation: location }),
}));

// Selector hooks
export const useCurrentPlayer = () => {
  const players = useGameStore((state) => state.players);
  const currentIndex = useGameStore((state) => state.currentPlayerIndex);
  return players[currentIndex];
};
