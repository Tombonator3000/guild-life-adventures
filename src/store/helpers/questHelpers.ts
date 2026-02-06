// Quest and game status helpers
// takeQuest, completeQuest, abandonQuest, checkDeath, promoteGuildRank, evictPlayer, checkVictory

import type { LocationId, HousingTier } from '@/types/game.types';
import { getQuest } from '@/data/quests';
import { calculateStockValue } from '@/data/stocks';
import type { SetFn, GetFn } from '../storeTypes';

export function createQuestActions(set: SetFn, get: GetFn) {
  return {
    buyGuildPass: (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || player.hasGuildPass) return;

      const GUILD_PASS_COST = 500;
      if (player.gold < GUILD_PASS_COST) return;

      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, gold: p.gold - GUILD_PASS_COST, hasGuildPass: true }
            : p
        ),
      }));
    },

    takeQuest: (playerId: string, questId: string) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, activeQuest: questId }
            : p
        ),
      }));
    },

    completeQuest: (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || !player.activeQuest) return;

      const quest = getQuest(player.activeQuest);
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
    },

    abandonQuest: (playerId: string) => {
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

    evictPlayer: (playerId: string) => {
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

    checkDeath: (playerId: string): boolean => {
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

    checkVictory: (playerId: string): boolean => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return false;

      const goals = state.goalSettings;

      // Calculate total wealth (Jones-style Liquid Assets)
      // Cash + Bank + Investments + Stock Value - Loans
      const stockValue = calculateStockValue(player.stocks, state.stockPrices);
      const totalWealth = player.gold + player.savings + player.investments + stockValue - player.loanAmount;
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
  };
}
