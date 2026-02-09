// Quest and game status helpers
// takeQuest, completeQuest, abandonQuest, checkDeath, promoteGuildRank, evictPlayer, checkVictory
// B1: takeChainQuest, completeChainQuest
// B2: takeBounty, completeBounty
// B3: Quest difficulty scaling (applied in completeQuest/completeChainQuest/completeBounty)
// B4: Quest failure consequences (applied in abandonQuest)
// B5: Guild reputation (incremented on quest/chain/bounty completion)

import type { LocationId, HousingTier, DeathEvent } from '@/types/game.types';
import { GUILD_PASS_COST, GUILD_RANK_ORDER, GUILD_RANK_REQUIREMENTS } from '@/types/game.types';
import { getGameOption } from '@/data/gameOptions';
import {
  getQuest,
  getQuestChain,
  getNextChainStep,
  getBounty,
  getScaledQuestGold,
  getScaledQuestHappiness,
  getReputationGoldMultiplier,
} from '@/data/quests';
import { calculateStockValue } from '@/data/stocks';
import { checkAchievements, updateAchievementStats } from '@/data/achievements';
import type { SetFn, GetFn } from '../storeTypes';

export function createQuestActions(set: SetFn, get: GetFn) {
  return {
    buyGuildPass: (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || player.hasGuildPass) return;

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
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;
      if (!player.hasGuildPass) return; // Guild Pass required for quests
      // B4: Check quest cooldown
      if (player.questCooldownWeeksLeft > 0) return;

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

      // Check if active quest is a chain step
      if (player.activeQuest.startsWith('chain:')) {
        get().completeChainQuest(playerId);
        return;
      }

      // Check if active quest is a bounty
      if (player.activeQuest.startsWith('bounty:')) {
        get().completeBounty(playerId);
        return;
      }

      const quest = getQuest(player.activeQuest);
      if (!quest) return;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          // B3: Scale rewards based on dungeon progression
          const scaledGold = getScaledQuestGold(quest.goldReward, p.dungeonFloorsCleared);
          const scaledHappiness = getScaledQuestHappiness(quest.happinessReward, p.dungeonFloorsCleared);

          // B5: Apply reputation gold multiplier
          const repMultiplier = getReputationGoldMultiplier(p.guildReputation);
          const finalGold = Math.round(scaledGold * repMultiplier);

          // Apply quest rewards and risks
          const healthLoss = Math.random() < 0.5 ? quest.healthRisk : Math.floor(quest.healthRisk / 2);

          return {
            ...p,
            gold: p.gold + finalGold,
            health: Math.max(0, p.health - healthLoss),
            happiness: Math.min(100, p.happiness + scaledHappiness),
            timeRemaining: Math.max(0, p.timeRemaining - quest.timeRequired),
            completedQuests: p.completedQuests + 1,
            guildReputation: p.guildReputation + 1,
            activeQuest: null,
          };
        }),
      }));

      // C6: Track quest completion for achievements
      const updatedPlayer = get().players.find(p => p.id === playerId);
      if (updatedPlayer && !updatedPlayer.isAI) {
        updateAchievementStats({ totalQuestsCompleted: 1, totalGoldEarned: quest.goldReward });
        checkAchievements({
          completedQuests: updatedPlayer.completedQuests,
          guildRank: updatedPlayer.guildRank,
        });
      }

      // Check for guild rank promotion
      get().promoteGuildRank(playerId);

      // Check if quest health risk killed the player
      get().checkDeath(playerId);
    },

    abandonQuest: (playerId: string) => {
      // B4: Quest Failure Consequences — -2 happiness, -3 dependability, 2-week cooldown
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                activeQuest: null,
                happiness: Math.max(0, p.happiness - 2),
                dependability: Math.max(0, p.dependability - 3),
                questCooldownWeeksLeft: 2,
              }
            : p
        ),
      }));
    },

    // ============================================================
    // B1: Quest Chain actions
    // ============================================================

    takeChainQuest: (playerId: string, chainId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;
      if (!player.hasGuildPass) return; // Guild Pass required for chain quests
      if (player.activeQuest) return; // already has active quest
      if (player.questCooldownWeeksLeft > 0) return; // B4: cooldown

      const chain = getQuestChain(chainId);
      if (!chain) return;

      const step = getNextChainStep(chainId, player.questChainProgress);
      if (!step) return; // chain complete

      // Store as "chain:<chainId>" so completeQuest knows to delegate
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, activeQuest: `chain:${chainId}` }
            : p
        ),
      }));
    },

    completeChainQuest: (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || !player.activeQuest) return;

      const chainId = player.activeQuest.replace('chain:', '');
      const chain = getQuestChain(chainId);
      if (!chain) return;

      const stepsCompleted = player.questChainProgress[chainId] || 0;
      const step = chain.steps[stepsCompleted];
      if (!step) return;

      const isLastStep = stepsCompleted + 1 >= chain.steps.length;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          // B3: Scale rewards
          const scaledGold = getScaledQuestGold(step.goldReward, p.dungeonFloorsCleared);
          const scaledHappiness = getScaledQuestHappiness(step.happinessReward, p.dungeonFloorsCleared);
          // B5: Reputation multiplier
          const repMultiplier = getReputationGoldMultiplier(p.guildReputation);
          let finalGold = Math.round(scaledGold * repMultiplier);
          let finalHappiness = scaledHappiness;

          // Chain completion bonus
          if (isLastStep) {
            finalGold += chain.completionBonusGold;
            finalHappiness += chain.completionBonusHappiness;
          }

          const healthLoss = Math.random() < 0.5 ? step.healthRisk : Math.floor(step.healthRisk / 2);

          const newChainProgress = { ...p.questChainProgress, [chainId]: stepsCompleted + 1 };

          return {
            ...p,
            gold: p.gold + finalGold,
            health: Math.max(0, p.health - healthLoss),
            happiness: Math.min(100, p.happiness + finalHappiness),
            timeRemaining: Math.max(0, p.timeRemaining - step.timeRequired),
            completedQuests: p.completedQuests + 1,
            guildReputation: p.guildReputation + (isLastStep ? 3 : 1), // chain completion = 3 rep
            activeQuest: null,
            questChainProgress: newChainProgress,
          };
        }),
      }));

      // Check for guild rank promotion
      get().promoteGuildRank(playerId);

      // Check death
      get().checkDeath(playerId);
    },

    // ============================================================
    // B2: Bounty actions
    // ============================================================

    takeBounty: (playerId: string, bountyId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;
      // Bounties are free — no Guild Pass required
      if (player.activeQuest) return; // already has active quest
      // Check if already completed this bounty this week
      if (player.completedBountiesThisWeek.includes(bountyId)) return;

      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, activeQuest: `bounty:${bountyId}` }
            : p
        ),
      }));
    },

    completeBounty: (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || !player.activeQuest) return;

      const bountyId = player.activeQuest.replace('bounty:', '');
      const bounty = getBounty(bountyId);
      if (!bounty) return;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          // B3: Scale rewards (bounties scale too, but from a lower base)
          const scaledGold = getScaledQuestGold(bounty.goldReward, p.dungeonFloorsCleared);
          // B5: Reputation multiplier
          const repMultiplier = getReputationGoldMultiplier(p.guildReputation);
          const finalGold = Math.round(scaledGold * repMultiplier);

          const healthLoss = Math.random() < 0.5 ? bounty.healthRisk : Math.floor(bounty.healthRisk / 2);

          return {
            ...p,
            gold: p.gold + finalGold,
            health: Math.max(0, p.health - healthLoss),
            happiness: Math.min(100, p.happiness + bounty.happinessReward),
            timeRemaining: Math.max(0, p.timeRemaining - bounty.timeRequired),
            guildReputation: p.guildReputation + 1,
            activeQuest: null,
            completedBountiesThisWeek: [...p.completedBountiesThisWeek, bountyId],
          };
        }),
      }));

      // Bounties contribute to guildReputation which drives guild rank promotion
      get().promoteGuildRank(playerId);

      // Check death
      get().checkDeath(playerId);
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
                appliances: {},
                equippedWeapon: null,
                equippedArmor: null,
                equippedShield: null,
                rentPrepaidWeeks: 0,
                lockedRent: 0,
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
        const enablePermadeath = getGameOption('enablePermadeath');

        // Check for resurrection (if has savings and wasn't already resurrected this week)
        if (player.savings >= 100 && !player.wasResurrectedThisWeek) {
          const deathEvent: DeathEvent = {
            playerId,
            playerName: player.name,
            isPermadeath: false,
            wasResurrected: true,
            message: "You fell in battle but the spirits of the Graveyard have restored you!\n\n100 gold was taken from your savings.",
          };
          set((state) => ({
            players: state.players.map((p) =>
              p.id === playerId
                ? {
                    ...p,
                    health: 50,
                    savings: p.savings - 100,
                    currentLocation: 'graveyard' as LocationId,
                    wasResurrectedThisWeek: true,
                  }
                : p
            ),
            deathEvent: player.isAI ? null : deathEvent,
            eventMessage: player.isAI
              ? `${player.name} fell but was resurrected at the Graveyard! 100g taken from savings.`
              : null,
          }));
          return false;
        }

        // Permadeath OFF: respawn at graveyard with 20 HP (no cost)
        if (!enablePermadeath) {
          const deathEvent: DeathEvent = {
            playerId,
            playerName: player.name,
            isPermadeath: false,
            wasResurrected: false,
            message: "Your body crumbles to the ground... but death is not the end.\n\nThe ancient magic of the Graveyard pulls your spirit back from the void. You awaken among the tombstones, weakened but alive.",
          };
          set((state) => ({
            players: state.players.map((p) =>
              p.id === playerId
                ? {
                    ...p,
                    health: 20,
                    currentLocation: 'graveyard' as LocationId,
                    wasResurrectedThisWeek: true,
                  }
                : p
            ),
            deathEvent: player.isAI ? null : deathEvent,
            eventMessage: player.isAI
              ? `${player.name} died but was resurrected at the Graveyard with 20 HP.`
              : null,
          }));
          return false;
        }

        // Permadeath ON: player is permanently eliminated
        const deathEvent: DeathEvent = {
          playerId,
          playerName: player.name,
          isPermadeath: true,
          wasResurrected: false,
          message: "The cold embrace of death claims you. There is no coming back.\n\nYour adventure ends here, brave soul. May the next adventurer fare better.",
        };
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, isGameOver: true }
              : p
          ),
          deathEvent: player.isAI ? null : deathEvent,
          eventMessage: player.isAI
            ? `${player.name} has perished! Permadeath claimed another soul.`
            : null,
        }));
        return true; // Player is dead
      }
      return false;
    },

    promoteGuildRank: (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      const rankOrder = GUILD_RANK_ORDER;
      let currentIndex = rankOrder.indexOf(player.guildRank);
      if (currentIndex >= rankOrder.length - 1) return; // Already max rank

      // Loop to handle multiple rank-ups at once (e.g., bounties pushed past several thresholds)
      let newRank = player.guildRank;
      while (currentIndex < rankOrder.length - 1) {
        const nextRank = rankOrder[currentIndex + 1];
        const required = GUILD_RANK_REQUIREMENTS[nextRank];
        // Use guildReputation (incremented by quests, chain steps, AND bounties)
        if (player.guildReputation >= required) {
          newRank = nextRank;
          currentIndex++;
        } else {
          break;
        }
      }

      if (newRank !== player.guildRank) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, guildRank: newRank }
              : p
          ),
          eventMessage: `Congratulations! You have been promoted to ${newRank.charAt(0).toUpperCase() + newRank.slice(1)}!`,
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

      // Check career (Jones-style: dependability stat, 0 if no job)
      const careerValue = player.currentJob ? player.dependability : 0;
      const careerMet = careerValue >= goals.career;

      // Check adventure goal (optional — 0 means disabled)
      // Adventure score = quests completed + unique dungeon floors cleared
      const adventureValue = player.completedQuests + player.dungeonFloorsCleared.length;
      const adventureMet = goals.adventure <= 0 || adventureValue >= goals.adventure;

      // C6: Check achievements on every victory check (covers turn-end milestones)
      if (!player.isAI) {
        checkAchievements({
          gold: player.gold,
          totalWealth,
          happiness: player.happiness,
          completedDegrees: player.completedDegrees.length,
          completedQuests: player.completedQuests,
          dungeonFloorsCleared: player.dungeonFloorsCleared.length,
          guildRank: player.guildRank,
          housing: player.housing,
          week: state.week,
          isVictory: false,
        });
      }

      if (wealthMet && happinessMet && educationMet && careerMet && adventureMet) {
        // C6: Record victory achievement + stats
        if (!player.isAI) {
          updateAchievementStats({ gamesWon: 1 });
          checkAchievements({
            totalWealth,
            happiness: player.happiness,
            completedDegrees: player.completedDegrees.length,
            completedQuests: player.completedQuests,
            dungeonFloorsCleared: player.dungeonFloorsCleared.length,
            guildRank: player.guildRank,
            housing: player.housing,
            week: state.week,
            isVictory: true,
          });
        }
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
