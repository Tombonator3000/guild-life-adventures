import { create } from 'zustand';
import type {
  GameState,
  Player,
  LocationId,
  GoalSettings,
  HousingTier,
  EducationPath,
  DegreeId,
  GuildRank,
  DurableItems,
  ApplianceSource,
  OwnedAppliance,
  AppliancesInventory,
  HOURS_PER_WEEK,
  RENT_INTERVAL,
  FOOD_DEPLETION_PER_WEEK,
  STARVATION_HEALTH_PENALTY,
  STARVATION_HAPPINESS_PENALTY,
  GUILD_RANK_ORDER,
  GUILD_RANK_INDEX,
} from '@/types/game.types';
import { GRADUATION_BONUSES, getDegree, type DegreeId as DegreeIdType } from '@/data/education';
import { PLAYER_COLORS, AI_COLOR, RENT_COSTS, CLOTHING_INTERVAL, APPLIANCE_BREAK_CHANCE } from '@/types/game.types';
import { checkWeeklyTheft, checkMarketCrash } from '@/data/events';
import {
  checkStreetRobbery,
  checkApartmentRobbery,
  type StreetRobberyResult,
  type ApartmentRobberyResult,
} from '@/data/shadowfingers';
import {
  getAppliance,
  calculateRepairCost,
  checkApplianceBreakage,
} from '@/data/items';

// Shadowfingers robbery event for display
export interface ShadowfingersEvent {
  type: 'street' | 'apartment';
  result: StreetRobberyResult | ApartmentRobberyResult;
}

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
  modifyMaxHealth: (playerId: string, amount: number) => void;
  modifyRelaxation: (playerId: string, amount: number) => void;
  setHousing: (playerId: string, tier: HousingTier) => void;
  setJob: (playerId: string, jobId: string | null, wage?: number) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
  requestRaise: (playerId: string) => { success: boolean; newWage?: number; message: string };
  studySession: (playerId: string, path: EducationPath, cost: number, hours: number) => void;
  completeEducationLevel: (playerId: string, path: EducationPath) => void;
  // New Jones-style degree functions
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
  // Shadowfingers robbery state
  shadowfingersEvent: ShadowfingersEvent | null;
  dismissShadowfingersEvent: () => void;
  // Appliance system (Jones-style)
  buyAppliance: (playerId: string, applianceId: string, price: number, source: ApplianceSource) => number; // Returns happiness gained
  repairAppliance: (playerId: string, applianceId: string) => number; // Returns repair cost
  pawnAppliance: (playerId: string, applianceId: string, pawnValue: number) => void;
  // Housing prepayment system (Jones-style)
  prepayRent: (playerId: string, weeks: number, totalCost: number) => void;
  moveToHousing: (playerId: string, tier: HousingTier, cost: number, lockInRent: number) => void;
  // Appliance breakage event
  applianceBreakageEvent: { playerId: string; applianceId: string; repairCost: number } | null;
  dismissApplianceBreakageEvent: () => void;
}

import { HOURS_PER_TURN } from '@/types/game.types';

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
  shadowfingersEvent: null,

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
      shadowfingersEvent: null,
    });
  },

  movePlayer: (playerId, location, timeCost) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const previousLocation = player.currentLocation;

    // Update player position
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              previousLocation,
              currentLocation: location,
              timeRemaining: Math.max(0, p.timeRemaining - timeCost)
            }
          : p
      ),
    }));

    // Check for street robbery when leaving bank or shadow-market
    const updatedPlayer = get().players.find(p => p.id === playerId);
    if (updatedPlayer && !updatedPlayer.isAI) {
      const robberyResult = checkStreetRobbery(
        { ...updatedPlayer, currentLocation: previousLocation }, // Use previous location for check
        previousLocation,
        state.week
      );

      if (robberyResult) {
        // Apply robbery effects
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  gold: 0, // Street robbery takes all cash
                  happiness: Math.max(0, p.happiness + robberyResult.happinessLoss),
                }
              : p
          ),
          shadowfingersEvent: {
            type: 'street',
            result: robberyResult,
          },
        }));
      }
    }
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

  modifyMaxHealth: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, maxHealth: Math.max(50, p.maxHealth + amount), health: Math.min(p.health, p.maxHealth + amount) }
          : p
      ),
    }));
  },

  modifyRelaxation: (playerId, amount) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, relaxation: Math.max(10, Math.min(50, p.relaxation + amount)) }
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

  setJob: (playerId, jobId, wage = 0) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, currentJob: jobId, currentWage: wage, dependability: Math.max(30, p.dependability - 10) }
          : p
      ),
    }));
  },

  requestRaise: (playerId) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player || !player.currentJob) {
      return { success: false, message: "You don't have a job to request a raise for." };
    }

    // Raise chance based on dependability (50% base + dependability bonus)
    const raiseChance = 0.3 + (player.dependability / 200); // 30-80% chance
    const success = Math.random() < raiseChance;

    if (success) {
      const raiseAmount = Math.ceil(player.currentWage * 0.15); // 15% raise
      const newWage = player.currentWage + raiseAmount;
      
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, currentWage: newWage }
            : p
        ),
      }));
      
      return { success: true, newWage, message: `Raise approved! New wage: ${newWage} gold/hour.` };
    } else {
      // Failed raise request decreases dependability
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, dependability: Math.max(0, p.dependability - 10) }
            : p
        ),
      }));
      
      return { success: false, message: "Your raise request was denied. Work harder to prove yourself!" };
    }
  },

  workShift: (playerId, hours, wage) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;

        // Use current wage if player has a job, otherwise use passed wage
        const effectiveWage = p.currentJob ? p.currentWage : wage;

        // Work bonus: 6+ hours = 8 hours pay (33% efficiency bonus like original game)
        const bonusHours = hours >= 6 ? Math.ceil(hours * 1.33) : hours;
        let earnings = bonusHours * effectiveWage;

        // Garnishment: 50% + 2 gold interest if rent is overdue (4+ weeks)
        let garnishment = 0;
        let newRentDebt = p.rentDebt;
        if (p.weeksSinceRent >= 4 && p.housing !== 'homeless') {
          garnishment = Math.floor(earnings * 0.5) + 2;
          newRentDebt = Math.max(0, newRentDebt - garnishment);
          earnings -= garnishment;
        }

        // Dependability increases with work (capped at maxDependability)
        const newDependability = Math.min(p.maxDependability, p.dependability + 2);

        // Experience increases (capped at maxExperience like Jones)
        const newExperience = Math.min(p.maxExperience, p.experience + hours);

        return {
          ...p,
          gold: p.gold + Math.max(0, earnings),
          timeRemaining: Math.max(0, p.timeRemaining - hours),
          happiness: Math.max(0, p.happiness - 2), // Work is tiring
          dependability: newDependability,
          experience: newExperience,
          rentDebt: newRentDebt,
        };
      }),
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

  // New Jones-style degree functions
  studyDegree: (playerId, degreeId, cost, hours) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;

        const newProgress = { ...p.degreeProgress };
        newProgress[degreeId] = (newProgress[degreeId] || 0) + 1;

        return {
          ...p,
          gold: Math.max(0, p.gold - cost),
          timeRemaining: Math.max(0, p.timeRemaining - hours),
          degreeProgress: newProgress,
        };
      }),
    }));
  },

  completeDegree: (playerId, degreeId) => {
    const degree = getDegree(degreeId);
    if (!degree) return;

    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;

        // Add degree to completed list
        const newCompletedDegrees = [...p.completedDegrees, degreeId];

        // Reset progress for this degree
        const newProgress = { ...p.degreeProgress };
        delete newProgress[degreeId];

        // Apply graduation bonuses (like Jones)
        return {
          ...p,
          completedDegrees: newCompletedDegrees,
          degreeProgress: newProgress,
          happiness: Math.min(100, p.happiness + GRADUATION_BONUSES.happiness),
          dependability: Math.min(p.maxDependability, p.dependability + GRADUATION_BONUSES.dependability),
          maxDependability: p.maxDependability + GRADUATION_BONUSES.maxDependability,
          maxExperience: p.maxExperience + GRADUATION_BONUSES.maxExperience,
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

  sellItem: (playerId, itemId, price) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;
        const itemIndex = p.inventory.indexOf(itemId);
        if (itemIndex === -1) return p;
        const newInventory = [...p.inventory];
        newInventory.splice(itemIndex, 1);
        return {
          ...p,
          gold: p.gold + price,
          inventory: newInventory,
        };
      }),
    }));
  },

  buyDurable: (playerId, itemId, cost) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;
        const newDurables = { ...p.durables };
        newDurables[itemId] = (newDurables[itemId] || 0) + 1;
        return {
          ...p,
          gold: Math.max(0, p.gold - cost),
          durables: newDurables,
        };
      }),
    }));
  },

  sellDurable: (playerId, itemId, price) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;
        const newDurables = { ...p.durables };
        if ((newDurables[itemId] || 0) <= 0) return p;
        newDurables[itemId] = newDurables[itemId] - 1;
        if (newDurables[itemId] === 0) delete newDurables[itemId];
        return {
          ...p,
          gold: p.gold + price,
          durables: newDurables,
        };
      }),
    }));
  },

  takeQuest: (playerId, questId) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, activeQuest: questId }
          : p
      ),
    }));
  },

  completeQuest: (playerId) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player || !player.activeQuest) return;
    
    // Import quest data dynamically to avoid circular deps
    import('@/data/quests').then(({ getQuest, QUEST_RANK_REQUIREMENTS }) => {
      const quest = getQuest(player.activeQuest!);
      if (!quest) return;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          
          // Apply quest rewards and risks
          const healthLoss = Math.random() < 0.5 ? quest.healthRisk : Math.floor(quest.healthRisk / 2);
          
          return {
            ...p,
            gold: p.gold + quest.goldReward,
            health: Math.max(0, p.health - healthLoss),
            happiness: Math.min(100, p.happiness + quest.happinessReward),
            timeRemaining: Math.max(0, p.timeRemaining - quest.timeRequired),
            completedQuests: p.completedQuests + 1,
            activeQuest: null,
          };
        }),
      }));

      // Check for guild rank promotion
      get().promoteGuildRank(playerId);
    });
  },

  abandonQuest: (playerId) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { 
              ...p, 
              activeQuest: null,
              happiness: Math.max(0, p.happiness - 5), // Penalty for abandoning
            }
          : p
      ),
    }));
  },

  evictPlayer: (playerId) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              housing: 'homeless' as HousingTier,
              weeksSinceRent: 0,
              inventory: [], // Lose all items
              durables: {}, // Lose all durables too
              happiness: Math.max(0, p.happiness - 30),
            }
          : p
      ),
      eventMessage: "You have been evicted! All your possessions are lost.",
    }));
  },

  checkDeath: (playerId) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.isGameOver) return false;

    if (player.health <= 0) {
      // Check for resurrection (if has savings)
      if (player.savings >= 100) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  health: 50,
                  savings: p.savings - 100,
                  currentLocation: 'enchanter' as LocationId,
                }
              : p
          ),
          eventMessage: "The healers have revived you! 100 gold was taken from your savings.",
        }));
        return false;
      }
      // Player dies - mark as game over
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, isGameOver: true }
            : p
        ),
      }));
      return true; // Player is dead
    }
    return false;
  },

  endTurn: () => {
    const state = get();

    // Check if current player has achieved victory goals before switching turns
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer && !currentPlayer.isGameOver) {
      if (get().checkVictory(currentPlayer.id)) {
        return; // Victory achieved, don't continue with turn switching
      }
    }

    // Find next alive player
    const findNextAlivePlayer = (startIndex: number): { index: number; isNewWeek: boolean } => {
      let index = startIndex;
      let loopCount = 0;
      const totalPlayers = state.players.length;

      while (loopCount < totalPlayers) {
        index = (index + 1) % totalPlayers;
        const isNewWeek = index === 0;

        // Check if this player is alive
        if (!state.players[index].isGameOver) {
          return { index, isNewWeek };
        }

        // If we've checked a full loop and all players are dead, game over
        loopCount++;
        if (loopCount >= totalPlayers) {
          // All players are game over - this shouldn't normally happen
          return { index: 0, isNewWeek: true };
        }
      }

      return { index: (startIndex + 1) % totalPlayers, isNewWeek: (startIndex + 1) % totalPlayers === 0 };
    };

    // Check if only one player remains alive - they win
    const alivePlayers = state.players.filter(p => !p.isGameOver);
    if (alivePlayers.length === 1) {
      set({
        winner: alivePlayers[0].id,
        phase: 'victory',
        eventMessage: `${alivePlayers[0].name} is the last one standing and wins the game!`,
      });
      return;
    }

    if (alivePlayers.length === 0) {
      set({
        phase: 'victory',
        eventMessage: 'All players have perished. Game Over!',
      });
      return;
    }

    const { index: nextIndex, isNewWeek } = findNextAlivePlayer(state.currentPlayerIndex);

    if (isNewWeek) {
      get().processWeekEnd();
    } else {
      // Start next player's turn (includes apartment robbery check)
      const nextPlayer = state.players[nextIndex];
      // Move player to their home location at start of turn
      const homeLocation: LocationId = nextPlayer.housing === 'noble' ? 'noble-heights' : 'slums';
      set({
        currentPlayerIndex: nextIndex,
        players: state.players.map((p, index) =>
          index === nextIndex
            ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: homeLocation }
            : p
        ),
        selectedLocation: null,
      });
      // Check for apartment robbery at start of turn
      get().startTurn(nextPlayer.id);
    }
  },

  startTurn: (playerId: string) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.isAI) return;

    // Move player to their home location at start of turn (like Jones in the Fast Lane)
    const homeLocation: LocationId = player.housing === 'noble' ? 'noble-heights' : 'slums';
    if (player.currentLocation !== homeLocation) {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, currentLocation: homeLocation, previousLocation: p.currentLocation }
            : p
        ),
      }));
    }

    // Jones-style Starvation Check at start of turn
    // If player has no food and no Preservation Box with food, they starve and lose 20 Hours
    const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
    const hasFood = player.foodLevel > 0;

    if (!hasFood && !hasPreservationBox) {
      // Starving: Lose 20 Hours (1/3 of turn!) - Jones-style penalty
      const STARVATION_TIME_PENALTY = 20;
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, timeRemaining: Math.max(0, p.timeRemaining - STARVATION_TIME_PENALTY) }
            : p
        ),
        eventMessage: `${player.name} is starving! Lost ${STARVATION_TIME_PENALTY} Hours searching for food.`,
      }));
    }

    // Check for apartment robbery at the start of player's turn
    const robberyResult = checkApartmentRobbery(player);

    if (robberyResult) {
      // Remove stolen items from player's durables
      const newDurables = { ...player.durables };
      for (const stolen of robberyResult.stolenItems) {
        delete newDurables[stolen.itemId];
      }

      // Apply robbery effects
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                durables: newDurables,
                happiness: Math.max(0, p.happiness + robberyResult.happinessLoss),
              }
            : p
        ),
        shadowfingersEvent: {
          type: 'apartment',
          result: robberyResult,
        },
      }));
    }

    // Jones-style appliance breakage check (only if player has >500 gold)
    if (player.gold > 500) {
      const applianceIds = Object.keys(player.appliances);
      for (const applianceId of applianceIds) {
        const ownedAppliance = player.appliances[applianceId];
        if (!ownedAppliance.isBroken && checkApplianceBreakage(ownedAppliance.source, player.gold)) {
          const repairCost = calculateRepairCost(ownedAppliance.originalPrice);
          const appliance = getAppliance(applianceId);

          // Mark as broken and charge repair cost, lose happiness
          set((state) => ({
            players: state.players.map((p) => {
              if (p.id !== playerId) return p;
              const newAppliances = { ...p.appliances };
              newAppliances[applianceId] = { ...newAppliances[applianceId], isBroken: true };
              return {
                ...p,
                appliances: newAppliances,
                gold: Math.max(0, p.gold - repairCost),
                happiness: Math.max(0, p.happiness - 1),
              };
            }),
            applianceBreakageEvent: {
              playerId,
              applianceId,
              repairCost,
            },
          }));

          // Only trigger one breakage per turn
          break;
        }
      }
    }

    // Cooking Fire / Preservation Box per-turn happiness bonus
    const hasCookingAppliance = player.appliances['cooking-fire'] && !player.appliances['cooking-fire'].isBroken;
    if (hasCookingAppliance) {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, happiness: Math.min(100, p.happiness + 1) }
            : p
        ),
      }));
    }

    // Arcane Tome random income chance
    const hasArcaneTome = player.appliances['arcane-tome'] && !player.appliances['arcane-tome'].isBroken;
    if (hasArcaneTome && Math.random() < 0.15) { // 15% chance per turn
      const income = Math.floor(Math.random() * 50) + 10; // 10-60 gold
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, gold: p.gold + income }
            : p
        ),
        eventMessage: `Your Arcane Tome generated ${income} gold through mystical knowledge!`,
      }));
    }
  },

  processWeekEnd: () => {
    const state = get();
    const newWeek = state.week + 1;
    const isRentDue = newWeek % 4 === 0;
    const isClothingDegradation = newWeek % 8 === 0;
    let eventMessages: string[] = [];

    // Process all players for week-end effects
    const updatedPlayers = state.players.map((player) => {
      let p = { ...player };

      // Skip dead players
      if (p.isGameOver) {
        return p;
      }

      // Reset newspaper for new week
      p.hasNewspaper = false;

      // Dependability decay (decreases 5% each week if not working)
      p.dependability = Math.max(0, p.dependability - 5);
      
      // If dependability too low, may lose job
      if (p.currentJob && p.dependability < 20) {
        p.currentJob = null;
        p.currentWage = 0;
        if (!p.isAI) {
          eventMessages.push(`${p.name} was fired due to poor dependability!`);
        }
      }

      // Jones-style Market Crash events (affects employed players)
      if (p.currentJob) {
        const crashResult = checkMarketCrash(true);
        if (crashResult.type === 'layoff') {
          p.currentJob = null;
          p.currentWage = 0;
          p.happiness = Math.max(0, p.happiness - 20);
          if (!p.isAI) {
            eventMessages.push(`${p.name}: ${crashResult.message}`);
          }
        } else if (crashResult.type === 'paycut' && crashResult.wageMultiplier) {
          p.currentWage = Math.floor(p.currentWage * crashResult.wageMultiplier);
          p.happiness = Math.max(0, p.happiness - 10);
          if (!p.isAI) {
            eventMessages.push(`${p.name}: ${crashResult.message}`);
          }
        }
      }
      
      // Food depletion
      p.foodLevel = Math.max(0, p.foodLevel - 25);
      
      // Starvation effects
      if (p.foodLevel === 0) {
        p.health = Math.max(0, p.health - 10);
        p.happiness = Math.max(0, p.happiness - 15);
        if (!p.isAI) {
          eventMessages.push(`${p.name} is starving! -10 health, -15 happiness.`);
        }
      }
      
      // Clothing degradation
      if (isClothingDegradation) {
        p.clothingCondition = Math.max(0, p.clothingCondition - 25);
        if (!p.isAI && p.clothingCondition <= 25) {
          eventMessages.push(`${p.name}'s clothing is in poor condition!`);
        }
      }
      
      // Rent debt accumulation for garnishment
      if (p.housing !== 'homeless' && p.weeksSinceRent >= 4) {
        const rentCost = RENT_COSTS[p.housing];
        p.rentDebt += Math.floor(rentCost * 0.25); // Add 25% of rent as debt each week
      }
      
      // Eviction check - after 8 weeks without paying rent
      if (p.housing !== 'homeless' && p.weeksSinceRent >= 8) {
        p.housing = 'homeless';
        p.weeksSinceRent = 0;
        p.rentDebt = 0; // Clear debt on eviction
        p.inventory = []; // Lose all items
        p.happiness = Math.max(0, p.happiness - 30);
        if (!p.isAI) {
          eventMessages.push(`${p.name} has been evicted! All possessions lost.`);
        }
      } else if (p.housing !== 'homeless' && p.weeksSinceRent >= 4 && !p.isAI) {
        eventMessages.push(`${p.name}: Rent is overdue! Wages will be garnished 50%.`);
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
        if (!p.isAI) {
          eventMessages.push(`Shadowfingers struck! ${p.name} lost ${Math.abs(theftEvent.effect.gold)} gold!`);
        }
      }
      
      // Random sickness chance (5%)
      if (Math.random() < 0.05 && !p.isSick) {
        p.isSick = true;
        p.health = Math.max(0, p.health - 15);
        if (!p.isAI) {
          eventMessages.push(`${p.name} has fallen ill! Visit a healer to recover.`);
        }
      }
      
      // Rent tracking
      p.weeksSinceRent += 1;
      
      return p;
    });
    
    // Find first alive player for the new week
    const firstAliveIndex = updatedPlayers.findIndex(p => !p.isGameOver);

    // Check if all players are dead
    if (firstAliveIndex === -1) {
      set({
        week: newWeek,
        phase: 'victory',
        eventMessage: 'All players have perished. Game Over!',
      });
      return;
    }

    // Check if only one player remains
    const alivePlayers = updatedPlayers.filter(p => !p.isGameOver);
    if (alivePlayers.length === 1) {
      set({
        week: newWeek,
        winner: alivePlayers[0].id,
        phase: 'victory',
        eventMessage: `${alivePlayers[0].name} is the last one standing and wins the game!`,
      });
      return;
    }

    // Move first player to their home location
    const firstPlayer = updatedPlayers[firstAliveIndex];
    const firstPlayerHome: LocationId = firstPlayer.housing === 'noble' ? 'noble-heights' : 'slums';

    set({
      week: newWeek,
      currentPlayerIndex: firstAliveIndex,
      priceModifier: 0.7 + Math.random() * 0.6, // Random price between 0.7 and 1.3
      players: updatedPlayers.map((p, index) =>
        index === firstAliveIndex
          ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: firstPlayerHome }
          : p
      ),
      rentDueWeek: isRentDue ? newWeek : state.rentDueWeek,
      selectedLocation: null,
      eventMessage: eventMessages.length > 0 ? eventMessages.join('\n') : null,
      phase: eventMessages.length > 0 ? 'event' : 'playing',
    });

    // Check for apartment robbery at start of first alive player's turn
    if (firstPlayer && !firstPlayer.isGameOver) {
      get().startTurn(firstPlayer.id);
    }
  },

  setPhase: (phase) => set({ phase }),

  selectLocation: (location) => set({ selectedLocation: location }),

  dismissEvent: () => set({ eventMessage: null, phase: 'playing' }),

  dismissShadowfingersEvent: () => set({ shadowfingersEvent: null }),

  setEventMessage: (message) => set({ eventMessage: message }),

  promoteGuildRank: (playerId: string) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const rankOrder = ['novice', 'apprentice', 'journeyman', 'adept', 'veteran', 'elite', 'guild-master'] as const;
    const requirements = { novice: 0, apprentice: 3, journeyman: 10, adept: 25, veteran: 50, elite: 100, 'guild-master': 200 };
    
    const currentIndex = rankOrder.indexOf(player.guildRank);
    if (currentIndex >= rankOrder.length - 1) return; // Already max rank
    
    const nextRank = rankOrder[currentIndex + 1];
    const required = requirements[nextRank];
    
    if (player.completedQuests >= required) {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, guildRank: nextRank }
            : p
        ),
        eventMessage: `Congratulations! You have been promoted to ${nextRank.charAt(0).toUpperCase() + nextRank.slice(1)}!`,
      }));
    }
  },

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

    // Calculate total education using completedDegrees (Jones-style system)
    // Each degree is worth 9 education points (like Jones in the Fast Lane)
    const totalEducation = player.completedDegrees.length * 9;
    const educationMet = totalEducation >= goals.education;

    // Check career rank (guild rank)
    const rankIndex = ['novice', 'apprentice', 'journeyman', 'adept', 'veteran', 'elite', 'guild-master']
      .indexOf(player.guildRank) + 1;
    const careerMet = rankIndex >= goals.career;

    if (wealthMet && happinessMet && educationMet && careerMet) {
      set({
        winner: playerId,
        phase: 'victory',
        eventMessage: `${player.name} has achieved all victory goals and wins the game!`,
      });
      return true;
    }

    return false;
  },

  // Appliance breakage event state
  applianceBreakageEvent: null,
  dismissApplianceBreakageEvent: () => set({ applianceBreakageEvent: null }),

  // Buy appliance with Jones-style tracking
  buyAppliance: (playerId, applianceId, price, source) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return 0;

    const appliance = getAppliance(applianceId);
    if (!appliance) return 0;

    // Check if this is first time owning this type (for happiness bonus)
    const isFirstTime = !player.applianceHistory.includes(applianceId);
    const happinessGain = isFirstTime
      ? (source === 'enchanter' ? appliance.happinessEnchanter : appliance.happinessMarket)
      : 0;

    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;

        const newAppliances = { ...p.appliances };
        newAppliances[applianceId] = {
          itemId: applianceId,
          originalPrice: price,
          source,
          isBroken: false,
          purchasedFirstTime: isFirstTime,
        };

        const newHistory = isFirstTime
          ? [...p.applianceHistory, applianceId]
          : p.applianceHistory;

        return {
          ...p,
          gold: Math.max(0, p.gold - price),
          appliances: newAppliances,
          applianceHistory: newHistory,
          happiness: Math.min(100, p.happiness + happinessGain),
        };
      }),
    }));

    return happinessGain;
  },

  // Repair a broken appliance
  repairAppliance: (playerId, applianceId) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return 0;

    const ownedAppliance = player.appliances[applianceId];
    if (!ownedAppliance || !ownedAppliance.isBroken) return 0;

    const repairCost = calculateRepairCost(ownedAppliance.originalPrice);

    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;

        const newAppliances = { ...p.appliances };
        newAppliances[applianceId] = {
          ...newAppliances[applianceId],
          isBroken: false,
        };

        return {
          ...p,
          gold: Math.max(0, p.gold - repairCost),
          appliances: newAppliances,
        };
      }),
    }));

    return repairCost;
  },

  // Pawn an appliance
  pawnAppliance: (playerId, applianceId, pawnValue) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;

        const newAppliances = { ...p.appliances };
        delete newAppliances[applianceId];

        return {
          ...p,
          gold: p.gold + pawnValue,
          appliances: newAppliances,
          happiness: Math.max(0, p.happiness - 1), // -1 happiness for pawning
        };
      }),
    }));
  },

  // Prepay rent for multiple weeks
  prepayRent: (playerId, weeks, totalCost) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;

        return {
          ...p,
          gold: Math.max(0, p.gold - totalCost),
          rentPrepaidWeeks: p.rentPrepaidWeeks + weeks,
          weeksSinceRent: 0,
        };
      }),
    }));
  },

  // Move to new housing with locked-in rent
  moveToHousing: (playerId, tier, cost, lockInRent) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;

        return {
          ...p,
          gold: Math.max(0, p.gold - cost),
          housing: tier,
          weeksSinceRent: 0,
          rentPrepaidWeeks: 0,
          lockedRent: lockInRent,
        };
      }),
    }));
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
