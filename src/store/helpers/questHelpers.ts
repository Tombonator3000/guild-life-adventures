// Quest and game status helpers
// takeQuest, completeQuest, abandonQuest, checkDeath, promoteGuildRank, evictPlayer, checkVictory
// B1: takeChainQuest, completeChainQuest
// B1-NL: takeNonLinearChain, completeNonLinearChainStep, makeNLChainChoice
// B2: takeBounty, completeBounty
// B3: Quest difficulty scaling (applied in completeQuest/completeChainQuest/completeBounty)
// B4: Quest failure consequences (applied in abandonQuest)
// B5: Guild reputation (incremented on quest/chain/bounty completion)

import type { LocationId, HousingTier, DeathEvent, GoalSettings, Player } from '@/types/game.types';
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
  getChainCompletionSummary,
} from '@/data/quests';
import { calculateStockValue } from '@/data/stocks';
import { checkAchievements, updateAchievementStats } from '@/data/achievements';
import { deleteSave } from '@/data/saveLoad';
import {
  NON_LINEAR_QUEST_CHAINS,
  getNonLinearChain,
  getCurrentNonLinearStep,
  canTakeNonLinearChainStep,
  calculateChoiceRewards,
} from '@/data/questChains';
import type { QuestChainChoice } from '@/data/questChains';
import type { SetFn, GetFn } from '../storeTypes';

// Resurrection cost: base 100g + 10% of wealth above 500g, capped at 2000g
const RESURRECTION_HAPPINESS_PENALTY = 8;

function calculateResurrectionCost(gold: number, savings: number): number {
  const totalWealth = gold + savings;
  return Math.min(2000, Math.max(100, 100 + Math.floor((Math.max(0, totalWealth - 500)) * 0.10)));
}

/** Determine death outcome: paid resurrection, free respawn, or permadeath */
function resolveDeathOutcome(player: { id: string; name: string; gold: number; savings: number; happiness: number; wasResurrectedThisWeek: boolean }) {
  const scaledCost = calculateResurrectionCost(player.gold, player.savings);
  const enablePermadeath = getGameOption('enablePermadeath');

  // Path 1: Paid resurrection (has savings, not already resurrected this week)
  if (player.savings >= scaledCost && !player.wasResurrectedThisWeek) {
    return {
      isPermadeath: false,
      playerUpdate: {
        health: 50,
        savings: player.savings - scaledCost,
        happiness: Math.max(0, player.happiness - RESURRECTION_HAPPINESS_PENALTY),
        currentLocation: 'graveyard' as LocationId,
        wasResurrectedThisWeek: true,
      },
      deathEvent: {
        playerId: player.id,
        playerName: player.name,
        isPermadeath: false,
        wasResurrected: true,
        message: `You fell in battle but the spirits of the Graveyard have restored you!\n\n${scaledCost} gold was taken from your savings.\nThe trauma of death weighs on your spirit (-${RESURRECTION_HAPPINESS_PENALTY} happiness).`,
      } as DeathEvent,
      aiMessage: `${player.name} fell but was resurrected at the Graveyard! ${scaledCost}g taken from savings.`,
    };
  }

  // Path 2: Free respawn (permadeath disabled)
  if (!enablePermadeath) {
    return {
      isPermadeath: false,
      playerUpdate: {
        health: 20,
        happiness: Math.max(0, player.happiness - RESURRECTION_HAPPINESS_PENALTY),
        currentLocation: 'graveyard' as LocationId,
        wasResurrectedThisWeek: true,
      },
      deathEvent: {
        playerId: player.id,
        playerName: player.name,
        isPermadeath: false,
        wasResurrected: false,
        message: `Your body crumbles to the ground... but death is not the end.\n\nThe ancient magic of the Graveyard pulls your spirit back from the void. You awaken among the tombstones, weakened but alive.\nThe trauma of death weighs on your spirit (-${RESURRECTION_HAPPINESS_PENALTY} happiness).`,
      } as DeathEvent,
      aiMessage: `${player.name} died but was resurrected at the Graveyard with 20 HP.`,
    };
  }

  // Path 3: Permadeath
  return {
    isPermadeath: true,
    playerUpdate: { isGameOver: true },
    deathEvent: {
      playerId: player.id,
      playerName: player.name,
      isPermadeath: true,
      wasResurrected: false,
      message: "The cold embrace of death claims you. There is no coming back.\n\nYour adventure ends here, brave soul. May the next adventurer fare better.",
    } as DeathEvent,
    aiMessage: `${player.name} has perished! Permadeath claimed another soul.`,
  };
}

/** Shared reward calculation for quests, chain steps, and bounties.
 *  B3: Scales gold (and optionally happiness) by dungeon progression.
 *  B5: Applies reputation gold multiplier.
 *  Randomizes health risk (50% full / 50% half). */
function calculateQuestReward(
  baseGold: number,
  baseHappiness: number,
  healthRisk: number,
  dungeonFloorsCleared: number[],
  guildReputation: number,
  scaleHappiness = true,
): { finalGold: number; finalHappiness: number; healthLoss: number } {
  const scaledGold = getScaledQuestGold(baseGold, dungeonFloorsCleared);
  const repMultiplier = getReputationGoldMultiplier(guildReputation);
  const finalGold = Math.round(scaledGold * repMultiplier);
  const finalHappiness = scaleHappiness
    ? getScaledQuestHappiness(baseHappiness, dungeonFloorsCleared)
    : baseHappiness;
  const healthLoss = Math.random() < 0.5 ? healthRisk : Math.floor(healthRisk / 2);
  return { finalGold, finalHappiness, healthLoss };
}

// ── Goal evaluation (pure function — no side effects) ───────────────

interface GoalEvaluation {
  totalWealth: number;
  wealthMet: boolean;
  happinessMet: boolean;
  educationMet: boolean;
  careerMet: boolean;
  adventureMet: boolean;
  allMet: boolean;
}

function evaluateGoals(
  player: Player,
  goals: GoalSettings,
  stockPrices: Record<string, number>,
): GoalEvaluation {
  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const totalWealth = player.gold + player.savings + player.investments + stockValue - player.loanAmount;
  const totalEducation = player.completedDegrees.length * 9;
  const adventureValue = player.completedQuests + player.dungeonFloorsCleared.length;

  const wealthMet = totalWealth >= goals.wealth;
  const happinessMet = player.happiness >= goals.happiness;
  const educationMet = totalEducation >= goals.education;
  const careerMet = player.dependability >= goals.career;
  const adventureMet = goals.adventure <= 0 || adventureValue >= goals.adventure;

  return {
    totalWealth,
    wealthMet, happinessMet, educationMet, careerMet, adventureMet,
    allMet: wealthMet && happinessMet && educationMet && careerMet && adventureMet,
  };
}

/** Track achievements for human players (milestone check or victory) */
function trackAchievements(
  player: Player,
  evaluation: GoalEvaluation,
  week: number,
  isVictory: boolean,
) {
  if (player.isAI) return;
  if (isVictory) {
    updateAchievementStats({ gamesWon: 1 });
  }
  checkAchievements({
    gold: player.gold,
    totalWealth: evaluation.totalWealth,
    happiness: player.happiness,
    completedDegrees: player.completedDegrees.length,
    completedQuests: player.completedQuests,
    dungeonFloorsCleared: player.dungeonFloorsCleared.length,
    guildRank: player.guildRank,
    housing: player.housing,
    week,
    isVictory,
  });
}

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

      // Check if active quest is a non-linear chain step
      if (player.activeQuest.startsWith('nlchain:')) {
        get().completeNonLinearChainStep(playerId);
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
          const { finalGold, finalHappiness, healthLoss } = calculateQuestReward(
            quest.goldReward, quest.happinessReward, quest.healthRisk,
            p.dungeonFloorsCleared, p.guildReputation,
          );
          return {
            ...p,
            gold: p.gold + finalGold,
            health: Math.max(0, p.health - healthLoss),
            happiness: Math.min(100, p.happiness + finalHappiness),
            timeRemaining: Math.max(0, p.timeRemaining - quest.timeRequired),
            completedQuests: p.completedQuests + 1,
            guildReputation: p.guildReputation + 1,
            activeQuest: null,
            gameStats: {
              ...p.gameStats,
              totalQuestsCompleted: (p.gameStats.totalQuestsCompleted || 0) + 1,
              totalGoldEarned: (p.gameStats.totalGoldEarned || 0) + finalGold,
            },
          };
        }),
      }));

      // C6: Track quest completion for achievements
      const updatedPlayer = get().players.find(p => p.id === playerId);
      if (updatedPlayer && !updatedPlayer.isAI) {
        updateAchievementStats({ totalQuestsCompleted: 1, totalGoldEarned: quest.goldReward });
        const evaluation = evaluateGoals(updatedPlayer, get().goalSettings, get().stockPrices);
        checkAchievements({
          gold: updatedPlayer.gold,
          totalWealth: evaluation.totalWealth,
          happiness: updatedPlayer.happiness,
          completedDegrees: updatedPlayer.completedDegrees.length,
          completedQuests: updatedPlayer.completedQuests,
          dungeonFloorsCleared: updatedPlayer.dungeonFloorsCleared.length,
          guildRank: updatedPlayer.guildRank,
          housing: updatedPlayer.housing,
          week: get().week,
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
          const reward = calculateQuestReward(
            step.goldReward, step.happinessReward, step.healthRisk,
            p.dungeonFloorsCleared, p.guildReputation,
          );
          // Chain completion bonus
          const bonusGold = isLastStep ? chain.completionBonusGold : 0;
          const bonusHappiness = isLastStep ? chain.completionBonusHappiness : 0;

          return {
            ...p,
            gold: p.gold + reward.finalGold + bonusGold,
            health: Math.max(0, p.health - reward.healthLoss),
            happiness: Math.min(100, p.happiness + reward.finalHappiness + bonusHappiness),
            timeRemaining: Math.max(0, p.timeRemaining - step.timeRequired),
            completedQuests: p.completedQuests + (isLastStep ? 1 : 0),
            guildReputation: p.guildReputation + (isLastStep ? 3 : 1),
            activeQuest: null,
            questChainProgress: { ...p.questChainProgress, [chainId]: stepsCompleted + 1 },
            gameStats: {
              ...p.gameStats,
              totalQuestsCompleted: (p.gameStats.totalQuestsCompleted || 0) + (isLastStep ? 1 : 0),
              totalGoldEarned: (p.gameStats.totalGoldEarned || 0) + reward.finalGold + bonusGold,
            },
          };
        }),
      }));

      // Show humorous chain completion summary for human players
      if (isLastStep) {
        const completedPlayer = get().players.find(p => p.id === playerId);
        if (completedPlayer && !completedPlayer.isAI) {
          const summary = getChainCompletionSummary(chain);
          const rewardLine = `\n+${chain.completionBonusGold}g bonus | +${chain.completionBonusHappiness} happiness | +3 reputation`;
          const existing = get().eventMessage;
          const fullMsg = `[quest-chain-complete] ${summary}${rewardLine}`;
          set({ eventMessage: existing ? existing + '\n' + fullMsg : fullMsg, eventSource: 'weekly', phase: 'event' });
        }
      }

      // Check for guild rank promotion
      get().promoteGuildRank(playerId);

      // Check death
      get().checkDeath(playerId);
    },

    // ============================================================
    // B1-NL: Non-Linear Quest Chain actions
    // ============================================================

    takeNonLinearChain: (playerId: string, chainId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;
      if (!player.hasGuildPass) return;
      if (player.activeQuest) return;
      if (player.questCooldownWeeksLeft > 0) return;

      const chain = getNonLinearChain(chainId);
      if (!chain) return;

      const stepIndex = player.nlChainProgress[chainId] ?? 0;
      const step = getCurrentNonLinearStep(chainId, stepIndex);
      if (!step) return;
      if (player.nlChainCompleted.includes(chainId)) return;

      const canTake = canTakeNonLinearChainStep(chain, step, player.guildRank, player.education, player.dungeonFloorsCleared);
      if (!canTake.canTake) return;

      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, activeQuest: `nlchain:${chainId}` }
            : p
        ),
      }));
    },

    completeNonLinearChainStep: (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || !player.activeQuest) return;

      const chainId = player.activeQuest.replace('nlchain:', '');
      const chain = getNonLinearChain(chainId);
      if (!chain) return;

      const stepIndex = player.nlChainProgress[chainId] ?? 0;
      const step = getCurrentNonLinearStep(chainId, stepIndex);
      if (!step) return;

      // If step has choices, show choice modal instead of auto-completing
      if (step.choices && step.choices.length > 0) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, pendingNLChainChoice: { chainId, stepIndex } }
              : p
          ),
        }));
        return;
      }

      // No choices — auto-advance to next step or complete chain
      const isLastStep = stepIndex + 1 >= chain.steps.length;
      const reward = calculateQuestReward(
        step.baseGoldReward, step.baseHappinessReward, step.baseHealthRisk,
        player.dungeonFloorsCleared, player.guildReputation,
      );
      const bonusGold = isLastStep ? chain.completionBonusGold : 0;
      const bonusHappiness = isLastStep ? chain.completionBonusHappiness : 0;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          return {
            ...p,
            gold: p.gold + reward.finalGold + bonusGold,
            health: Math.max(0, p.health - reward.healthLoss),
            happiness: Math.min(100, p.happiness + reward.finalHappiness + bonusHappiness),
            timeRemaining: Math.max(0, p.timeRemaining - step.baseTimeRequired),
            completedQuests: p.completedQuests + (isLastStep ? 1 : 0),
            guildReputation: p.guildReputation + (isLastStep ? 3 : 1),
            activeQuest: null,
            nlChainProgress: { ...p.nlChainProgress, [chainId]: stepIndex + 1 },
            nlChainCompleted: isLastStep ? [...p.nlChainCompleted, chainId] : p.nlChainCompleted,
            gameStats: {
              ...p.gameStats,
              totalQuestsCompleted: (p.gameStats.totalQuestsCompleted || 0) + (isLastStep ? 1 : 0),
              totalGoldEarned: (p.gameStats.totalGoldEarned || 0) + reward.finalGold + bonusGold,
            },
          };
        }),
      }));

      get().promoteGuildRank(playerId);
      get().checkDeath(playerId);
    },

    makeNLChainChoice: (playerId: string, choiceId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || !player.pendingNLChainChoice) return;

      const { chainId, stepIndex } = player.pendingNLChainChoice;
      const chain = getNonLinearChain(chainId);
      if (!chain) return;

      const step = getCurrentNonLinearStep(chainId, stepIndex);
      if (!step || !step.choices) return;

      const choice = step.choices.find(c => c.id === choiceId);
      if (!choice) return;

      const rewards = calculateChoiceRewards(step, choice);
      const scaledReward = calculateQuestReward(
        rewards.gold, rewards.happiness, rewards.healthRisk,
        player.dungeonFloorsCleared, player.guildReputation,
      );

      const nextStepIndex = choice.nextStepIndex === 'complete' ? chain.steps.length : choice.nextStepIndex;
      const isComplete = nextStepIndex >= chain.steps.length;
      const bonusGold = isComplete ? chain.completionBonusGold : 0;
      const bonusHappiness = isComplete ? chain.completionBonusHappiness : 0;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          return {
            ...p,
            gold: p.gold + scaledReward.finalGold + bonusGold,
            health: Math.max(0, p.health - scaledReward.healthLoss),
            happiness: Math.min(100, p.happiness + scaledReward.finalHappiness + bonusHappiness),
            timeRemaining: Math.max(0, p.timeRemaining - rewards.time),
            completedQuests: p.completedQuests + (isComplete ? 1 : 0),
            guildReputation: p.guildReputation + (isComplete ? 3 : 1),
            activeQuest: null,
            pendingNLChainChoice: null,
            nlChainProgress: { ...p.nlChainProgress, [chainId]: nextStepIndex },
            nlChainCompleted: isComplete ? [...p.nlChainCompleted, chainId] : p.nlChainCompleted,
            gameStats: {
              ...p.gameStats,
              totalQuestsCompleted: (p.gameStats.totalQuestsCompleted || 0) + (isComplete ? 1 : 0),
              totalGoldEarned: (p.gameStats.totalGoldEarned || 0) + scaledReward.finalGold + bonusGold,
            },
          };
        }),
      }));

      // Show outcome text
      if (choice.outcomeText) {
        const completedPlayer = get().players.find(p => p.id === playerId);
        if (completedPlayer && !completedPlayer.isAI) {
          const prefix = isComplete ? `[quest-chain-complete] ${chain.name} — COMPLETE\n\n` : '';
          const rewardLine = isComplete
            ? `\n\n+${chain.completionBonusGold}g bonus | +${chain.completionBonusHappiness} happiness | +3 reputation`
            : '';
          const msg = `${prefix}${choice.outcomeText}${rewardLine}`;
          const existing = get().eventMessage;
          set({ eventMessage: existing ? existing + '\n' + msg : msg, eventSource: 'weekly', phase: 'event' });
        }
      }

      get().promoteGuildRank(playerId);
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
          const { finalGold, finalHappiness, healthLoss } = calculateQuestReward(
            bounty.goldReward, bounty.happinessReward, bounty.healthRisk,
            p.dungeonFloorsCleared, p.guildReputation, false, // bounties don't scale happiness
          );
          return {
            ...p,
            gold: p.gold + finalGold,
            health: Math.max(0, p.health - healthLoss),
            happiness: Math.min(100, p.happiness + finalHappiness),
            timeRemaining: Math.max(0, p.timeRemaining - bounty.timeRequired),
            guildReputation: p.guildReputation + 1,
            activeQuest: null,
            completedBountiesThisWeek: [...p.completedBountiesThisWeek, bountyId],
            gameStats: {
              ...p.gameStats,
              totalBountiesCompleted: (p.gameStats.totalBountiesCompleted || 0) + 1,
              totalGoldEarned: (p.gameStats.totalGoldEarned || 0) + finalGold,
            },
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
      if (player.health > 0) return false;

      const resolution = resolveDeathOutcome(player);

      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId ? {
            ...p,
            ...resolution.playerUpdate,
            gameStats: {
              ...p.gameStats,
              deathCount: (p.gameStats.deathCount || 0) + 1,
            },
          } : p
        ),
        deathEvent: player.isAI ? null : resolution.deathEvent,
        eventMessage: player.isAI ? resolution.aiMessage : null,
      }));

      return resolution.isPermadeath;
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
        // M8 FIX: Append promotion message to existing eventMessage instead of overwriting
        const existing = get().eventMessage;
        const promoMsg = `Congratulations! You have been promoted to ${newRank.charAt(0).toUpperCase() + newRank.slice(1)}!`;
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, guildRank: newRank }
              : p
          ),
          eventMessage: existing ? existing + '\n' + promoMsg : promoMsg,
        }));
      }
    },

    checkVictory: (playerId: string): boolean => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return false;

      const evaluation = evaluateGoals(player, state.goalSettings, state.stockPrices);

      // C6: Check achievements on every victory check (covers turn-end milestones)
      trackAchievements(player, evaluation, state.week, false);

      if (!evaluation.allMet) return false;

      // C6: Record victory achievement + stats
      trackAchievements(player, evaluation, state.week, true);

      // Delete autosave to prevent "Continue → instant re-victory" loop
      try { deleteSave(0); } catch { /* ignore */ }
      set({
        winner: playerId,
        phase: 'victory',
        eventMessage: `${player.name} has achieved all victory goals and wins the game!`,
      });
      return true;
    },
  };
}
