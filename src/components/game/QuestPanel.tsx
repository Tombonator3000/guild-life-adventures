// Guild Life - Quest Panel Component
// Supports: regular quests, quest chains (B1), bounties (B2),
// difficulty scaling indicators (B3), cooldown display (B4), reputation (B5)

import { Scroll, Clock, Heart, Coins, AlertTriangle, Check, X, Star, Shield, Trophy } from 'lucide-react';
import type { Quest, QuestChainStep, Bounty } from '@/data/quests';
import {
  QUEST_RANK_INFO,
  QUESTS,
  canTakeQuest,
  QUEST_CHAINS,
  getNextChainStep,
  canTakeChainStep,
  getWeeklyBounties,
  getScaledQuestGold,
  getScaledQuestHappiness,
  getReputationGoldMultiplier,
  getReputationMilestone,
  getNextReputationMilestone,
} from '@/data/quests';
import type { Player } from '@/types/game.types';

interface QuestPanelProps {
  quests: Quest[];
  player: Player;
  week: number;
  onTakeQuest: (questId: string) => void;
  onCompleteQuest: () => void;
  onAbandonQuest: () => void;
  onTakeChainQuest: (chainId: string) => void;
  onTakeBounty: (bountyId: string) => void;
}

function ScaledRewardDisplay({ baseGold, baseHappiness, player }: { baseGold: number; baseHappiness: number; player: Player }) {
  const scaledGold = getScaledQuestGold(baseGold, player.dungeonFloorsCleared);
  const repMult = getReputationGoldMultiplier(player.guildReputation);
  const finalGold = Math.round(scaledGold * repMult);
  const scaledHappiness = getScaledQuestHappiness(baseHappiness, player.dungeonFloorsCleared);
  const hasBonus = finalGold > baseGold || scaledHappiness > baseHappiness;

  return (
    <>
      <span className="text-gold">
        +{finalGold}g
        {finalGold > baseGold && <span className="text-green-400 text-xs ml-0.5">(+{finalGold - baseGold})</span>}
      </span>
      <span className="text-secondary">
        +{scaledHappiness}
        {scaledHappiness > baseHappiness && <span className="text-green-400 text-xs ml-0.5">(+{scaledHappiness - baseHappiness})</span>}
      </span>
    </>
  );
}

function ReputationBar({ player }: { player: Player }) {
  const current = getReputationMilestone(player.guildReputation);
  const next = getNextReputationMilestone(player.guildReputation);

  return (
    <div className="wood-frame p-2 text-parchment mb-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-xs font-bold">
          <Trophy className="w-3 h-3 text-gold" />
          Reputation: {player.guildReputation}
        </div>
        {current && (
          <span className="text-xs text-gold">{current.title} ({current.description})</span>
        )}
      </div>
      {next && (
        <div className="text-xs text-parchment-dark">
          Next: {next.title} at {next.threshold} ({next.description})
          <div className="w-full bg-black/30 rounded-full h-1.5 mt-1">
            <div
              className="bg-gold h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (player.guildReputation / next.threshold) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {!next && current && (
        <div className="text-xs text-gold">Maximum reputation reached!</div>
      )}
    </div>
  );
}

function CooldownWarning({ weeksLeft }: { weeksLeft: number }) {
  return (
    <div className="wood-frame p-2 text-parchment mb-2">
      <div className="flex items-center gap-2 text-destructive text-sm">
        <AlertTriangle className="w-4 h-4" />
        <span>Quest cooldown: {weeksLeft} week{weeksLeft > 1 ? 's' : ''} remaining</span>
      </div>
      <p className="text-xs text-parchment-dark mt-1">You abandoned a quest. Bounties are still available.</p>
    </div>
  );
}

/** Resolve active quest details (could be regular, chain, or bounty) */
function resolveActiveQuest(player: Player, week: number): {
  type: 'quest' | 'chain' | 'bounty';
  name: string;
  rank: string;
  description: string;
  goldReward: number;
  timeRequired: number;
  healthRisk: number;
  happinessReward: number;
} | null {
  if (!player.activeQuest) return null;

  if (player.activeQuest.startsWith('chain:')) {
    const chainId = player.activeQuest.replace('chain:', '');
    const chain = QUEST_CHAINS.find(c => c.id === chainId);
    if (!chain) return null;
    const stepsCompleted = player.questChainProgress[chainId] || 0;
    const step = chain.steps[stepsCompleted];
    if (!step) return null;
    const isLastStep = stepsCompleted + 1 >= chain.steps.length;
    return {
      type: 'chain',
      name: `${chain.name} - Step ${stepsCompleted + 1}: ${step.name}`,
      rank: step.rank,
      description: step.description + (isLastStep ? ` (Final step! Bonus: +${chain.completionBonusGold}g, +${chain.completionBonusHappiness} happiness)` : ''),
      goldReward: step.goldReward + (isLastStep ? chain.completionBonusGold : 0),
      timeRequired: step.timeRequired,
      healthRisk: step.healthRisk,
      happinessReward: step.happinessReward + (isLastStep ? chain.completionBonusHappiness : 0),
    };
  }

  if (player.activeQuest.startsWith('bounty:')) {
    const bountyId = player.activeQuest.replace('bounty:', '');
    const bounties = getWeeklyBounties(week);
    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) return null;
    return {
      type: 'bounty',
      name: bounty.name,
      rank: 'E',
      description: bounty.description,
      goldReward: bounty.goldReward,
      timeRequired: bounty.timeRequired,
      healthRisk: bounty.healthRisk,
      happinessReward: bounty.happinessReward,
    };
  }

  // Regular quest
  const quest = QUESTS.find(q => q.id === player.activeQuest);
  if (!quest) return null;
  return {
    type: 'quest',
    name: quest.name,
    rank: quest.rank,
    description: quest.description,
    goldReward: quest.goldReward,
    timeRequired: quest.timeRequired,
    healthRisk: quest.healthRisk,
    happinessReward: quest.happinessReward,
  };
}

export function QuestPanel({ quests, player, week, onTakeQuest, onCompleteQuest, onAbandonQuest, onTakeChainQuest, onTakeBounty }: QuestPanelProps) {
  const activeQuestData = resolveActiveQuest(player, week);

  if (activeQuestData) {
    const rankInfo = QUEST_RANK_INFO[activeQuestData.rank as keyof typeof QUEST_RANK_INFO] || { name: activeQuestData.rank, color: 'text-muted-foreground' };

    return (
      <div className="space-y-3">
        <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
          <Scroll className="w-4 h-4" /> Active {activeQuestData.type === 'bounty' ? 'Bounty' : activeQuestData.type === 'chain' ? 'Chain Quest' : 'Quest'}
        </h4>
        <ReputationBar player={player} />
        <div className="wood-frame p-3 text-parchment">
          <div className="flex items-center justify-between mb-2">
            <span className={`font-display font-bold ${rankInfo.color}`}>
              {activeQuestData.type === 'bounty' ? 'Bounty' : activeQuestData.type === 'chain' ? 'Chain' : rankInfo.name}
            </span>
            <span className="font-display font-semibold text-sm">{activeQuestData.name}</span>
          </div>
          <p className="text-sm text-parchment-dark mb-3">{activeQuestData.description}</p>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-gold" />
              <ScaledRewardDisplay baseGold={activeQuestData.goldReward} baseHappiness={activeQuestData.happinessReward} player={player} />
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-time" />
              <span>{activeQuestData.timeRequired}h</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-destructive" />
              <span>-{activeQuestData.healthRisk} HP risk</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCompleteQuest}
              disabled={player.timeRemaining < activeQuestData.timeRequired}
              className="flex-1 gold-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" /> Complete {activeQuestData.type === 'bounty' ? 'Bounty' : 'Quest'}
            </button>
            <button
              onClick={onAbandonQuest}
              className="px-3 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg transition-colors"
              title="Abandon: -2 happiness, -3 dependability, 2-week cooldown"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {player.timeRemaining < activeQuestData.timeRequired && (
            <p className="text-destructive text-xs mt-2 text-center">Not enough time to complete!</p>
          )}
        </div>
      </div>
    );
  }

  // No active quest — show bounties, chains, and regular quests
  const bounties = getWeeklyBounties(week);

  return (
    <div className="space-y-3">
      <ReputationBar player={player} />

      {player.questCooldownWeeksLeft > 0 && (
        <CooldownWarning weeksLeft={player.questCooldownWeeksLeft} />
      )}

      {/* Bounty Board — available without Guild Pass */}
      <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2">
        <Shield className="w-4 h-4" /> Bounty Board (Weekly)
      </h4>
      <div className="space-y-2">
        {bounties.map(bounty => {
          const alreadyDone = player.completedBountiesThisWeek.includes(bounty.id);
          const hasActiveQuest = !!player.activeQuest;
          const hasTime = player.timeRemaining >= bounty.timeRequired;
          const hasHealth = player.health > bounty.healthRisk;
          const isDisabled = alreadyDone || hasActiveQuest || !hasTime || !hasHealth;

          return (
            <div key={bounty.id} className="wood-frame p-2 text-parchment">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-400">Bounty</span>
                <span className="font-display font-semibold text-sm">{bounty.name}</span>
              </div>
              <p className="text-xs text-parchment-dark mb-2 line-clamp-1">{bounty.description}</p>
              <div className="flex items-center gap-2 text-xs mb-2">
                <ScaledRewardDisplay baseGold={bounty.goldReward} baseHappiness={bounty.happinessReward} player={player} />
                <span className="text-time">{bounty.timeRequired}h</span>
                {bounty.healthRisk > 0 && <span className="text-destructive">-{bounty.healthRisk}HP</span>}
              </div>
              {alreadyDone && (
                <div className="flex items-center gap-1 text-xs text-green-400 mb-2">
                  <Check className="w-3 h-3" /> Completed this week
                </div>
              )}
              <button
                onClick={() => onTakeBounty(bounty.id)}
                disabled={isDisabled}
                className="w-full py-1 gold-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {alreadyDone ? 'Done' : 'Accept Bounty'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quest Chains — requires Guild Pass */}
      {player.hasGuildPass && (
        <>
          <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mt-3">
            <Star className="w-4 h-4" /> Quest Chains
          </h4>
          <div className="space-y-2">
            {QUEST_CHAINS.map(chain => {
              const stepsCompleted = player.questChainProgress[chain.id] || 0;
              const isComplete = stepsCompleted >= chain.steps.length;
              const nextStep = isComplete ? null : chain.steps[stepsCompleted];
              const canStart = nextStep ? canTakeChainStep(chain, nextStep, player.guildRank, player.education, player.dungeonFloorsCleared) : { canTake: false };
              const hasActiveQuest = !!player.activeQuest;
              const hasCooldown = player.questCooldownWeeksLeft > 0;
              const hasTime = nextStep ? player.timeRemaining >= nextStep.timeRequired : false;
              const isDisabled = isComplete || !canStart.canTake || hasActiveQuest || hasCooldown || !hasTime;

              return (
                <div key={chain.id} className="wood-frame p-2 text-parchment">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-400">Chain ({stepsCompleted}/{chain.steps.length})</span>
                    <span className="font-display font-semibold text-sm">{chain.name}</span>
                  </div>
                  <p className="text-xs text-parchment-dark mb-1">{chain.description}</p>

                  {isComplete ? (
                    <div className="flex items-center gap-1 text-xs text-green-400 mb-1">
                      <Check className="w-3 h-3" /> Chain Complete!
                    </div>
                  ) : nextStep && (
                    <>
                      <div className="text-xs text-parchment-dark mb-1">
                        Step {stepsCompleted + 1}: <span className="text-parchment font-semibold">{nextStep.name}</span> — {nextStep.description}
                      </div>
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <ScaledRewardDisplay baseGold={nextStep.goldReward} baseHappiness={nextStep.happinessReward} player={player} />
                        <span className="text-time">{nextStep.timeRequired}h</span>
                        {nextStep.healthRisk > 0 && <span className="text-destructive">-{nextStep.healthRisk}HP</span>}
                      </div>
                      {stepsCompleted + 1 >= chain.steps.length && (
                        <div className="text-xs text-gold mb-1">
                          Chain Bonus: +{chain.completionBonusGold}g, +{chain.completionBonusHappiness} happiness
                        </div>
                      )}
                      {!canStart.canTake && canStart.reason && (
                        <div className="flex items-center gap-1 text-xs text-destructive mb-2">
                          <AlertTriangle className="w-3 h-3" /> {canStart.reason}
                        </div>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => onTakeChainQuest(chain.id)}
                    disabled={isDisabled}
                    className="w-full py-1 gold-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isComplete ? 'Completed' : `Accept Step ${stepsCompleted + 1}`}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Regular Quests */}
      <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mt-3">
        <Scroll className="w-4 h-4" /> Available Quests
      </h4>
      <div className="space-y-2">
        {quests.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No quests available at your rank.</p>
        ) : (
          quests.map(quest => {
            const { canTake, reason } = canTakeQuest(
              quest,
              player.guildRank,
              player.education,
              player.inventory,
              player.dungeonFloorsCleared
            );
            const hasTime = player.timeRemaining >= quest.timeRequired;
            const hasHealth = player.health > quest.healthRisk;
            const hasCooldown = player.questCooldownWeeksLeft > 0;
            const hasActiveQuest = !!player.activeQuest;
            const isDisabled = !canTake || !hasTime || !hasHealth || hasCooldown || hasActiveQuest;

            return (
              <div key={quest.id} className="wood-frame p-2 text-parchment">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${QUEST_RANK_INFO[quest.rank].color}`}>
                    {QUEST_RANK_INFO[quest.rank].name}
                  </span>
                  <span className="font-display font-semibold text-sm">{quest.name}</span>
                </div>
                <p className="text-xs text-parchment-dark mb-2 line-clamp-1">{quest.description}</p>

                <div className="flex items-center gap-2 text-xs mb-2">
                  <ScaledRewardDisplay baseGold={quest.goldReward} baseHappiness={quest.happinessReward} player={player} />
                  <span className="text-time">{quest.timeRequired}h</span>
                  <span className="text-destructive">-{quest.healthRisk}HP</span>
                </div>

                {!canTake && reason && (
                  <div className="flex items-center gap-1 text-xs text-destructive mb-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{reason}</span>
                  </div>
                )}

                <button
                  onClick={() => onTakeQuest(quest.id)}
                  disabled={isDisabled}
                  className="w-full py-1 gold-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Accept Quest
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
