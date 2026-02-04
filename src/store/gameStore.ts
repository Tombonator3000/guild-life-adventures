import { create } from 'zustand';
import type { 
  GameState, 
  Player, 
  LocationId, 
  GoalSettings,
  HousingTier,
  EducationPath,
  GuildRank,
  HOURS_PER_WEEK,
  RENT_INTERVAL,
  FOOD_DEPLETION_PER_WEEK,
  STARVATION_HEALTH_PENALTY,
  STARVATION_HAPPINESS_PENALTY,
  GUILD_RANK_ORDER,
  GUILD_RANK_INDEX,
} from '@/types/game.types';
import { PLAYER_COLORS, AI_COLOR, RENT_COSTS, CLOTHING_INTERVAL } from '@/types/game.types';
import { checkWeeklyTheft } from '@/data/events';

interface GameStore extends GameState {
  // Actions
  startNewGame: (playerNames: string[], includeAI: boolean, goals: GoalSettings) => void;
  movePlayer: (playerId: string, location: LocationId, timeCost: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyGold: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyClothing: (playerId: string, amount: number) => void;
  setHousing: (playerId: string, tier: HousingTier) => void;
  setJob: (playerId: string, jobId: string | null) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
  studySession: (playerId: string, path: EducationPath, cost: number, hours: number) => void;
  completeEducationLevel: (playerId: string, path: EducationPath) => void;
  payRent: (playerId: string) => void;
  depositToBank: (playerId: string, amount: number) => void;
  withdrawFromBank: (playerId: string, amount: number) => void;
  invest: (playerId: string, amount: number) => void;
  buyItem: (playerId: string, itemId: string, cost: number) => void;
  endTurn: () => void;
  processWeekEnd: () => void;
  setPhase: (phase: GameState['phase']) => void;
  selectLocation: (location: LocationId | null) => void;
  dismissEvent: () => void;
  checkVictory: (playerId: string) => boolean;
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
  completedQuests: 0,
  clothingCondition: 50,
  weeksSinceRent: 0,
  foodLevel: 50,
  savings: 0,
  investments: 0,
  currentJob: null,
  inventory: [],
  isAI,
});

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  currentPlayerIndex: 0,
  players: [],
  week: 1,
  priceModifier: 1.0,
  goalSettings: {
    wealth: 5000,
    happiness: 100,
    education: 5,
    career: 4,
  },
  winner: null,
  eventMessage: null,
  rentDueWeek: 4,
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
      eventMessage: null,
      rentDueWeek: 4,
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

  modifyFood: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, foodLevel: Math.max(0, Math.min(100, p.foodLevel + amount)) }
          : p
      ),
    }));
  },

  modifyClothing: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, clothingCondition: Math.max(0, Math.min(100, p.clothingCondition + amount)) }
          : p
      ),
    }));
  },

  setHousing: (playerId, tier) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, housing: tier, weeksSinceRent: 0 }
          : p
      ),
    }));
  },

  setJob: (playerId, jobId) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, currentJob: jobId }
          : p
      ),
    }));
  },

  workShift: (playerId, hours, wage) => {
    const earnings = hours * wage;
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { 
              ...p, 
              gold: p.gold + earnings,
              timeRemaining: Math.max(0, p.timeRemaining - hours),
              happiness: Math.max(0, p.happiness - 2), // Work is tiring
            }
          : p
      ),
    }));
  },

  studySession: (playerId, path, cost, hours) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;
        
        const newProgress = { ...p.educationProgress };
        newProgress[path] = (newProgress[path] || 0) + 1;
        
        return { 
          ...p, 
          gold: Math.max(0, p.gold - cost),
          timeRemaining: Math.max(0, p.timeRemaining - hours),
          educationProgress: newProgress,
        };
      }),
    }));
  },

  completeEducationLevel: (playerId, path) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;
        
        const newEducation = { ...p.education };
        newEducation[path] = (newEducation[path] || 0) + 1;
        
        const newProgress = { ...p.educationProgress };
        newProgress[path] = 0;
        
        return { 
          ...p, 
          education: newEducation,
          educationProgress: newProgress,
          happiness: Math.min(100, p.happiness + 10), // Completing education is satisfying
        };
      }),
    }));
  },

  payRent: (playerId) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;
        const rentCost = RENT_COSTS[p.housing];
        return { 
          ...p, 
          gold: Math.max(0, p.gold - rentCost),
          weeksSinceRent: 0,
        };
      }),
    }));
  },

  depositToBank: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { 
              ...p, 
              gold: Math.max(0, p.gold - amount),
              savings: p.savings + amount,
            }
          : p
      ),
    }));
  },

  withdrawFromBank: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { 
              ...p, 
              gold: p.gold + Math.min(amount, p.savings),
              savings: Math.max(0, p.savings - amount),
            }
          : p
      ),
    }));
  },

  invest: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { 
              ...p, 
              gold: Math.max(0, p.gold - amount),
              investments: p.investments + amount,
            }
          : p
      ),
    }));
  },

  buyItem: (playerId, itemId, cost) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { 
              ...p, 
              gold: Math.max(0, p.gold - cost),
              inventory: [...p.inventory, itemId],
            }
          : p
      ),
    }));
  },

  endTurn: () => {
    const state = get();
    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const isNewWeek = nextIndex === 0;

    if (isNewWeek) {
      get().processWeekEnd();
    } else {
      set({
        currentPlayerIndex: nextIndex,
        players: state.players.map((p, index) => 
          index === nextIndex 
            ? { ...p, timeRemaining: 168 }
            : p
        ),
        selectedLocation: null,
      });
    }
  },

  processWeekEnd: () => {
    const state = get();
    const newWeek = state.week + 1;
    const isRentDue = newWeek % 4 === 0;
    const isClothingDegradation = newWeek % 8 === 0;
    
    // Process all players for week-end effects
    const updatedPlayers = state.players.map((player) => {
      let p = { ...player };
      
      // Food depletion
      p.foodLevel = Math.max(0, p.foodLevel - 25);
      
      // Starvation effects
      if (p.foodLevel === 0) {
        p.health = Math.max(0, p.health - 10);
        p.happiness = Math.max(0, p.happiness - 15);
      }
      
      // Clothing degradation
      if (isClothingDegradation) {
        p.clothingCondition = Math.max(0, p.clothingCondition - 25);
      }
      
      // Investment returns (small weekly interest)
      if (p.investments > 0) {
        const returns = Math.floor(p.investments * 0.02); // 2% weekly
        p.investments += returns;
      }
      
      // Savings interest
      if (p.savings > 0) {
        const interest = Math.floor(p.savings * 0.005); // 0.5% weekly
        p.savings += interest;
      }
      
      // Check for Shadowfingers theft
      const theftEvent = checkWeeklyTheft(p.housing, p.gold);
      if (theftEvent && theftEvent.effect.gold) {
        p.gold = Math.max(0, p.gold + theftEvent.effect.gold);
        if (theftEvent.effect.happiness) {
          p.happiness = Math.max(0, p.happiness + theftEvent.effect.happiness);
        }
      }
      
      // Rent tracking
      p.weeksSinceRent += 1;
      
      return p;
    });
    
    set({
      week: newWeek,
      currentPlayerIndex: 0,
      priceModifier: 0.7 + Math.random() * 0.6, // Random price between 0.7 and 1.3
      players: updatedPlayers.map((p, index) => 
        index === 0 ? { ...p, timeRemaining: 168 } : p
      ),
      rentDueWeek: isRentDue ? newWeek : state.rentDueWeek,
      selectedLocation: null,
    });
  },

  setPhase: (phase) => set({ phase }),

  selectLocation: (location) => set({ selectedLocation: location }),

  dismissEvent: () => set({ eventMessage: null, phase: 'playing' }),

  checkVictory: (playerId) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return false;

    const goals = state.goalSettings;
    
    // Calculate total wealth
    const totalWealth = player.gold + player.savings + player.investments;
    const wealthMet = totalWealth >= goals.wealth;
    
    // Check happiness
    const happinessMet = player.happiness >= goals.happiness;
    
    // Calculate total education
    const totalEducation = Object.values(player.education).reduce((sum, level) => sum + level, 0);
    const educationMet = totalEducation >= goals.education;
    
    // Check career rank
    const rankIndex = ['novice', 'apprentice', 'journeyman', 'adept', 'veteran', 'elite', 'guild-master']
      .indexOf(player.guildRank) + 1;
    const careerMet = rankIndex >= goals.career;
    
    if (wealthMet && happinessMet && educationMet && careerMet) {
      set({ winner: playerId, phase: 'victory' });
      return true;
    }
    
    return false;
  },
}));

// Selector hooks
export const useCurrentPlayer = () => {
  const players = useGameStore((state) => state.players);
  const currentIndex = useGameStore((state) => state.currentPlayerIndex);
  return players[currentIndex];
};

export const usePlayer = (playerId: string) => {
  return useGameStore((state) => state.players.find(p => p.id === playerId));
};
