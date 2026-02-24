// Guild Life - Quest Panel Component
// Supports: regular quests, quest chains (B1), bounties (B2),
// difficulty scaling indicators (B3), cooldown display (B4), reputation (B5),
// non-linear quest chains (B1-NL)

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, X, Trophy, GitBranch, MapPin, Circle } from 'lucide-react';
import { playSFX } from '@/audio/sfxManager';
import type { Quest } from '@/data/quests';
import {
  QUEST_RANK_INFO,
  QUESTS,
  canTakeQuest,
  QUEST_CHAINS,
  canTakeChainStep,
  getWeeklyBounties,
  getScaledQuestGold,
  getScaledQuestHappiness,
  getReputationGoldMultiplier,
  getReputationMilestone,
  getNextReputationMilestone,
  pickQuestDescription,
  getQuestLocationObjectives,
  allLocationObjectivesDone,
} from '@/data/quests';
import {
  NON_LINEAR_QUEST_CHAINS,
  getCurrentNonLinearStep,
  canTakeNonLinearChainStep,
  calculateChoiceRewards,
} from '@/data/questChains';
import type { Player } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesButton,
} from './JonesStylePanel';
import { ChainChoiceModal } from './ChainChoiceModal';

interface QuestPanelProps {
  quests: Quest[];
  player: Player;
  week: number;
  onTakeQuest: (questId: string) => void;
  onCompleteQuest: () => void;
  onAbandonQuest: () => void;
  onTakeChainQuest: (chainId: string) => void;
  onTakeBounty: (bountyId: string) => void;
  onTakeNonLinearChain: (chainId: string) => void;
  onMakeNLChainChoice: (choiceId: string) => void;
}

export function ScaledRewardDisplay({ baseGold, baseHappiness, player }: { baseGold: number; baseHappiness: number; player: Player }) {
  const scaledGold = getScaledQuestGold(baseGold, player.dungeonFloorsCleared);
  const repMult = getReputationGoldMultiplier(player.guildReputation);
  const finalGold = Math.round(scaledGold * repMult);
  const scaledHappiness = getScaledQuestHappiness(baseHappiness, player.dungeonFloorsCleared);

  return (
    <>
      <span className="text-[#8b6914] font-bold">
        +{finalGold}g
        {finalGold > baseGold && <span className="text-green-600 text-xs ml-0.5">(+{finalGold - baseGold})</span>}
      </span>
      <span className="text-[#6b5a42]">
        +{scaledHappiness}hap
        {scaledHappiness > baseHappiness && <span className="text-green-600 text-xs ml-0.5">(+{scaledHappiness - baseHappiness})</span>}
      </span>
    </>
  );
}

export function ReputationBar({ player }: { player: Player }) {
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
    <div className="bg-[#e0d4b8] border border-red-400 p-2 rounded mb-2">
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <AlertTriangle className="w-4 h-4" />
        <span>Quest cooldown: {weeksLeft} week{weeksLeft > 1 ? 's' : ''} remaining</span>
      </div>
      <p className="text-xs text-[#6b5a42] mt-1">You abandoned a quest. Bounties are still available.</p>
    </div>
  );
}

/** Resolve active quest details (could be regular, chain, bounty, or non-linear chain) */
function resolveActiveQuest(player: Player, week: number): {
  type: 'quest' | 'chain' | 'bounty' | 'nlchain';
  name: string;
  rank: string;
  description: string;
  goldReward: number;
  timeRequired: number;
  healthRisk: number;
  happinessReward: number;
} | null {
  if (!player.activeQuest) return null;

  if (player.activeQuest.startsWith('nlchain:')) {
    const chainId = player.activeQuest.replace('nlchain:', '');
    const chain = NON_LINEAR_QUEST_CHAINS.find(c => c.id === chainId);
    if (!chain) return null;
    const stepIndex = player.nlChainProgress[chainId] ?? 0;
    const step = getCurrentNonLinearStep(chainId, stepIndex);
    if (!step) return null;
    return {
      type: 'nlchain',
      name: `${chain.name} — ${step.name}`,
      rank: step.rank,
      description: step.description + (step.choices && step.choices.length > 0 ? ' (Choices available on completion)' : ''),
      goldReward: step.baseGoldReward,
      timeRequired: step.baseTimeRequired,
      healthRisk: step.baseHealthRisk,
      happinessReward: step.baseHappinessReward,
    };
  }

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
    description: pickQuestDescription(quest),
    goldReward: quest.goldReward,
    timeRequired: quest.timeRequired,
    healthRisk: quest.healthRisk,
    happinessReward: quest.happinessReward,
  };
}

export function QuestPanel({ quests, player, week, onTakeQuest, onCompleteQuest, onAbandonQuest, onTakeChainQuest, onTakeBounty, onTakeNonLinearChain, onMakeNLChainChoice }: QuestPanelProps) {
  const activeQuestData = resolveActiveQuest(player, week);

  // Pick stable random quest descriptions per quest set (avoids re-randomizing on every re-render)
  const questDescriptions = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of quests) {
      map[q.id] = pickQuestDescription(q);
    }
    return map;
  }, [quests]);

  // Bounties are handled by BountyBoardPanel — skip active bounty display here
  if (activeQuestData && activeQuestData.type !== 'bounty') {
    const rankInfo = QUEST_RANK_INFO[activeQuestData.rank as keyof typeof QUEST_RANK_INFO] || { name: activeQuestData.rank, color: 'text-muted-foreground' };

    // LOQ: Location objectives for regular quests, chain quests, and NL chains
    const locationObjectives = getQuestLocationObjectives(player.activeQuest, player.questChainProgress);
    const questProgress = player.questLocationProgress ?? [];
    const objectivesDone = allLocationObjectivesDone(player.activeQuest, questProgress, player.questChainProgress);

    return (
      <div className="space-y-2">
        <ReputationBar player={player} />

        <JonesSectionHeader title={`ACTIVE ${activeQuestData.type === 'chain' ? 'CHAIN QUEST' : activeQuestData.type === 'nlchain' ? 'BRANCHING QUEST' : 'QUEST'}`} />
        <div className="bg-[#e0d4b8] border border-[#c9a227] ring-1 ring-[#c9a227] p-2 rounded">
          <div className="flex justify-between items-baseline">
            <span className="font-mono text-sm text-[#3d2a14] font-bold">{activeQuestData.name}</span>
            <span className={`font-mono text-xs font-bold ${rankInfo.color}`}>
              {activeQuestData.type === 'chain' ? 'Chain' : activeQuestData.type === 'nlchain' ? 'Branching' : rankInfo.name}
            </span>
          </div>
          <p className="text-xs text-[#6b5a42] mt-1">{activeQuestData.description}</p>

          {/* LOQ: Location objectives checklist */}
          {locationObjectives.length > 0 && (
            <div className="mt-2 border border-amber-600/40 bg-amber-950/20 rounded p-1.5 space-y-1">
              <div className="flex items-center gap-1 text-xs text-amber-300 font-semibold">
                <MapPin className="w-3 h-3" />
                Objectives
              </div>
              {locationObjectives.map((obj) => {
                const done = questProgress.includes(obj.id);
                return (
                  <div key={obj.id} className={`flex items-center gap-1.5 text-xs ${done ? 'text-green-400' : 'text-amber-200'}`}>
                    {done
                      ? <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                      : <Circle className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                    <span className={done ? 'line-through opacity-60' : ''}>{obj.actionText}</span>
                    {!done && <span className="text-amber-400/70 ml-auto text-xs">→ {obj.locationId.replace(/-/g, ' ')}</span>}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 text-xs mt-2">
            <ScaledRewardDisplay baseGold={activeQuestData.goldReward} baseHappiness={activeQuestData.happinessReward} player={player} />
            <span className="text-[#6b5a42]">{activeQuestData.timeRequired}h</span>
            <span className="text-red-600">-{activeQuestData.healthRisk}HP</span>
          </div>

          <div className="flex justify-between items-center mt-2">
            {player.timeRemaining < activeQuestData.timeRequired && (
              <span className="text-red-600 text-xs">Not enough time!</span>
            )}
            {locationObjectives.length > 0 && !objectivesDone && (
              <span className="text-amber-600 text-xs">Complete all objectives first!</span>
            )}
            <div className="flex gap-2 ml-auto">
              <JonesButton
                label="Complete Quest"
                onClick={() => { playSFX('quest-complete'); onCompleteQuest(); }}
                disabled={player.timeRemaining < activeQuestData.timeRequired || !objectivesDone}
                variant="primary"
              />
              <button
                onClick={onAbandonQuest}
                className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors font-mono text-sm"
                title="Abandon: -2 happiness, -3 dependability, 2-week cooldown"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Pending NL Chain Choice Modal */}
        {player.pendingNLChainChoice && (() => {
          const { chainId, stepIndex } = player.pendingNLChainChoice;
          const step = getCurrentNonLinearStep(chainId, stepIndex);
          if (!step || !step.choices) return null;
          return (
            <ChainChoiceModal
              stepName={step.name}
              choices={step.choices}
              step={step}
              onChoice={(choiceId) => onMakeNLChainChoice(choiceId)}
              onCancel={() => {}} // Can't cancel — must choose
            />
          );
        })()}
      </div>
    );
  }

  // No active quest/chain — show chains and regular quests (bounties are in BountyBoardPanel)

  return (
    <div className="space-y-2">
      <ReputationBar player={player} />

      {player.questCooldownWeeksLeft > 0 && (
        <CooldownWarning weeksLeft={player.questCooldownWeeksLeft} />
      )}

      {/* Quest Chains */}
      <JonesSectionHeader title="QUEST CHAINS" />
      <div className="space-y-1">
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
            <div key={chain.id} className={`bg-[#e0d4b8] border p-2 rounded ${isComplete ? 'border-green-500' : 'border-[#8b7355]'}`}>
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-sm text-[#3d2a14]">{chain.name}</span>
                <span className="font-mono text-xs text-purple-700 font-bold">Chain ({stepsCompleted}/{chain.steps.length})</span>
              </div>
              <p className="text-xs text-[#6b5a42] mt-0.5">{chain.description}</p>

              {isComplete ? (
                <div className="flex items-center gap-1 text-xs text-green-600 font-mono font-bold mt-1">
                  <Check className="w-3 h-3" /> Chain Complete!
                </div>
              ) : nextStep && (
                <>
                  <div className="text-xs text-[#6b5a42] mt-1">
                    Step {stepsCompleted + 1}: <span className="text-[#3d2a14] font-bold">{nextStep.name}</span> — {nextStep.description}
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <ScaledRewardDisplay baseGold={nextStep.goldReward} baseHappiness={nextStep.happinessReward} player={player} />
                    <span className="text-[#6b5a42]">{nextStep.timeRequired}h</span>
                    {nextStep.healthRisk > 0 && <span className="text-red-600">-{nextStep.healthRisk}HP</span>}
                  </div>
                  {stepsCompleted + 1 >= chain.steps.length && (
                    <div className="text-xs text-[#8b6914] mt-1">
                      Chain Bonus: +{chain.completionBonusGold}g, +{chain.completionBonusHappiness}hap
                    </div>
                  )}
                  {!canStart.canTake && canStart.reason && (
                    <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                      <AlertTriangle className="w-3 h-3" /> {canStart.reason}
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-[#8b7355]">
                  {isComplete ? '' : `Requires ${chain.requiredGuildRank} rank`}
                </span>
                {!isComplete && (
                  <JonesButton
                    label={`Accept Step ${stepsCompleted + 1}`}
                    onClick={() => { playSFX('quest-accept'); onTakeChainQuest(chain.id); }}
                    disabled={isDisabled}
                    variant={canStart.canTake ? 'primary' : 'secondary'}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Non-Linear Quest Chains */}
      <JonesSectionHeader title="BRANCHING QUESTS" />
      <div className="space-y-1">
        {NON_LINEAR_QUEST_CHAINS.map(chain => {
          const stepIndex = player.nlChainProgress[chain.id] ?? 0;
          const isComplete = player.nlChainCompleted.includes(chain.id);
          const step = isComplete ? null : getCurrentNonLinearStep(chain.id, stepIndex);
          const canStart = step ? canTakeNonLinearChainStep(chain, step, player.guildRank, player.education, player.dungeonFloorsCleared) : { canTake: false };
          const hasActiveQuest = !!player.activeQuest;
          const hasCooldown = player.questCooldownWeeksLeft > 0;
          const hasTime = step ? player.timeRemaining >= step.baseTimeRequired : false;
          const isDisabled = isComplete || !canStart.canTake || hasActiveQuest || hasCooldown || !hasTime;

          return (
            <div key={chain.id} className={`bg-[#e0d4b8] border p-2 rounded ${isComplete ? 'border-green-500' : 'border-[#8b7355]'}`}>
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-sm text-[#3d2a14]">
                  <GitBranch className="w-3 h-3 inline mr-1 text-purple-600" />
                  {chain.name}
                </span>
                <span className="font-mono text-xs text-purple-700 font-bold">
                  Branching {isComplete ? '✓' : `(step ${stepIndex + 1})`}
                </span>
              </div>
              <p className="text-xs text-[#6b5a42] mt-0.5">{chain.description}</p>

              {isComplete ? (
                <div className="flex items-center gap-1 text-xs text-green-600 font-mono font-bold mt-1">
                  <Check className="w-3 h-3" /> Chain Complete!
                </div>
              ) : step && (
                <>
                  <div className="text-xs text-[#6b5a42] mt-1">
                    Next: <span className="text-[#3d2a14] font-bold">{step.name}</span> — {step.description}
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <ScaledRewardDisplay baseGold={step.baseGoldReward} baseHappiness={step.baseHappinessReward} player={player} />
                    <span className="text-[#6b5a42]">{step.baseTimeRequired}h</span>
                    {step.baseHealthRisk > 0 && <span className="text-red-600">-{step.baseHealthRisk}HP</span>}
                  </div>
                  {step.choices && step.choices.length > 0 && (
                    <div className="text-xs text-purple-600 mt-1 font-mono">
                      ⚑ {step.choices.length} choices available on completion
                    </div>
                  )}
                  {!canStart.canTake && canStart.reason && (
                    <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                      <AlertTriangle className="w-3 h-3" /> {canStart.reason}
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-[#8b7355]">
                  {isComplete ? '' : `Requires ${chain.requiredGuildRank} rank`}
                </span>
                {!isComplete && (
                  <JonesButton
                    label={stepIndex === 0 ? 'Begin Chain' : `Continue Step ${stepIndex + 1}`}
                    onClick={() => { playSFX('quest-accept'); onTakeNonLinearChain(chain.id); }}
                    disabled={isDisabled}
                    variant={canStart.canTake ? 'primary' : 'secondary'}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending NL Chain Choice Modal (when not on active quest) */}
      {player.pendingNLChainChoice && (() => {
        const { chainId, stepIndex } = player.pendingNLChainChoice;
        const step = getCurrentNonLinearStep(chainId, stepIndex);
        if (!step || !step.choices) return null;
        return (
          <ChainChoiceModal
            stepName={step.name}
            choices={step.choices}
            step={step}
            onChoice={(choiceId) => onMakeNLChainChoice(choiceId)}
            onCancel={() => {}}
          />
        );
      })()}

      {/* Regular Quests */}
      <JonesSectionHeader title="AVAILABLE QUESTS" />
      <div className="space-y-1">
        {quests.length === 0 ? (
          <p className="text-[#6b5a42] text-center py-4 text-sm font-mono">No quests available at your rank.</p>
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
              <div key={quest.id} className={`bg-[#e0d4b8] border p-2 rounded border-[#8b7355]`}>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-sm text-[#3d2a14]">{quest.name}</span>
                  <span className={`font-mono text-sm font-bold ${quest.rank === 'S' ? 'text-red-600' : quest.rank === 'A' ? 'text-orange-600' : quest.rank === 'B' ? 'text-yellow-700' : quest.rank === 'C' ? 'text-green-700' : quest.rank === 'D' ? 'text-blue-700' : 'text-[#6b5a42]'}`}>
                    {QUEST_RANK_INFO[quest.rank].name}
                  </span>
                </div>
                <p className="text-xs text-[#6b5a42] mt-0.5 line-clamp-1">{questDescriptions[quest.id] || quest.description}</p>

                <div className="flex items-center gap-2 text-xs mt-1">
                  <ScaledRewardDisplay baseGold={quest.goldReward} baseHappiness={quest.happinessReward} player={player} />
                  <span className="text-[#6b5a42]">{quest.timeRequired}h</span>
                  <span className="text-red-600">-{quest.healthRisk}HP</span>
                </div>

                {!canTake && reason && (
                  <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                    <AlertTriangle className="w-3 h-3" /> {reason}
                  </div>
                )}

                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-[#8b7355]">
                    {quest.requiredEducation ? `${quest.requiredEducation.path} lvl ${quest.requiredEducation.level}` : ''}
                    {quest.requiresDungeonFloor ? `Floor ${quest.requiresDungeonFloor}` : ''}
                    {quest.requiresAllDungeonFloors ? 'All floors' : ''}
                  </span>
                  <JonesButton
                    label="Accept Quest"
                    onClick={() => { playSFX('quest-accept'); onTakeQuest(quest.id); }}
                    disabled={isDisabled}
                    variant={canTake ? 'primary' : 'secondary'}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
