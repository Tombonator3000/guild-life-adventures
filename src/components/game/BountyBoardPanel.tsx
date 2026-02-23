// BountyBoardPanel - Separate tab for weekly bounties + Guild Pass purchase
// Bounties are free (no Guild Pass required). Quests and chains require Guild Pass.

import { Check, X, Scroll, MapPin } from 'lucide-react';
import { playSFX } from '@/audio/sfxManager';
import {
  getWeeklyBounties,
  getScaledQuestGold,
  getScaledQuestHappiness,
  getReputationGoldMultiplier,
  getQuestLocationObjectives,
  allLocationObjectivesDone,
} from '@/data/quests';
import type { Player } from '@/types/game.types';
import { GUILD_PASS_COST } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesButton,
} from './JonesStylePanel';
import { ReputationBar, ScaledRewardDisplay } from './QuestPanel';
import { useTranslation } from '@/i18n';

interface BountyBoardPanelProps {
  player: Player;
  week: number;
  onTakeBounty: (bountyId: string) => void;
  onCompleteQuest: () => void;
  onAbandonQuest: () => void;
  onBuyGuildPass: () => void;
}

function resolveActiveBounty(player: Player, week: number) {
  if (!player.activeQuest) return null;
  if (!player.activeQuest.startsWith('bounty:')) return null;

  const bountyId = player.activeQuest.replace('bounty:', '');
  const bounties = getWeeklyBounties(week);
  const bounty = bounties.find(b => b.id === bountyId);
  if (!bounty) return null;

  return {
    id: bountyId,
    name: bounty.name,
    description: bounty.description,
    goldReward: bounty.goldReward,
    timeRequired: bounty.timeRequired,
    healthRisk: bounty.healthRisk,
    happinessReward: bounty.happinessReward,
  };
}

export function BountyBoardPanel({ player, week, onTakeBounty, onCompleteQuest, onAbandonQuest, onBuyGuildPass }: BountyBoardPanelProps) {
  const { t } = useTranslation();
  const activeBounty = resolveActiveBounty(player, week);
  const bounties = getWeeklyBounties(week);

  return (
    <div className="space-y-2">
      {/* Guild Pass purchase prompt */}
      {!player.hasGuildPass && (
        <div className="space-y-2 mb-3">
          <div className="text-center text-xs text-[#6b5a42]">
            <span className="text-[#c9a227] font-bold">{t('panelGuild.requiresGuildPass')}</span>
          </div>
          <div className="text-center bg-[#e0d4b8] p-2 rounded border border-[#8b7355]">
            <span className="text-xs text-[#6b5a42]">{t('common.cost')}:</span>
            <span className="font-bold text-[#c9a227] ml-2">{GUILD_PASS_COST}g</span>
          </div>
          <button
            onClick={onBuyGuildPass}
            disabled={player.gold < GUILD_PASS_COST}
            className="w-full gold-button py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {player.gold < GUILD_PASS_COST
              ? `${GUILD_PASS_COST - player.gold}g`
              : `${t('panelGuild.buyGuildPass')} (${GUILD_PASS_COST}g)`}
          </button>
        </div>
      )}

      <ReputationBar player={player} />

      {/* Active bounty completion UI */}
      {activeBounty && (() => {
        const loqDone = allLocationObjectivesDone(player.activeQuest, player.questLocationProgress ?? []);
        const objectives = getQuestLocationObjectives(player.activeQuest);
        const progress = player.questLocationProgress ?? [];
        return (
        <>
          <JonesSectionHeader title={t('panelBounty.weeklyBounties')} />
          <div className="bg-[#e0d4b8] border border-[#c9a227] ring-1 ring-[#c9a227] p-2 rounded">
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-sm text-[#3d2a14] font-bold">{t(`bounties.${activeBounty.id}.name`) || activeBounty.name}</span>
              <span className="font-mono text-xs font-bold text-[#8b6914]">{t('panelBounty.bountyBoard')}</span>
            </div>
            <p className="text-xs text-[#6b5a42] mt-1">{t(`bounties.${activeBounty.id}.description`) || activeBounty.description}</p>
            {/* LOQ progress */}
            {objectives.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {objectives.map(obj => {
                  const done = progress.includes(obj.id);
                  return (
                    <div key={obj.id} className={`flex items-center gap-1.5 text-xs ${done ? 'text-green-700' : 'text-[#6b5a42]'}`}>
                      {done ? <Check className="w-3 h-3 text-green-600" /> : <MapPin className="w-3 h-3 text-amber-600" />}
                      <span className={done ? 'line-through' : ''}>{obj.description}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-3 text-xs mt-2">
              <ScaledRewardDisplay baseGold={activeBounty.goldReward} baseHappiness={activeBounty.happinessReward} player={player} />
              <span className="text-[#6b5a42]">{activeBounty.timeRequired}h</span>
              {activeBounty.healthRisk > 0 && <span className="text-red-600">-{activeBounty.healthRisk}HP</span>}
            </div>
            <div className="flex justify-between items-center mt-2">
              {!loqDone && (
                <span className="text-amber-600 text-xs">{t('panelQuest.visitLocations') || 'Visit required locations first'}</span>
              )}
              {loqDone && player.timeRemaining < activeBounty.timeRequired && (
                <span className="text-red-600 text-xs">{t('board.notEnoughTime')}</span>
              )}
              <div className="flex gap-2 ml-auto">
                <JonesButton
                  label={t('panelBounty.completeBounty')}
                  onClick={() => { playSFX('quest-complete'); onCompleteQuest(); }}
                  disabled={!loqDone || player.timeRemaining < activeBounty.timeRequired}
                  variant="primary"
                />
                <button
                  onClick={onAbandonQuest}
                  className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors font-mono text-sm"
                  title={t('common.cancel')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
        );
      })()}

      {/* Bounty Board */}
      <JonesSectionHeader title={t('panelBounty.weeklyBounties')} />
      <div className="space-y-1">
        {bounties.map(bounty => {
          const alreadyDone = player.completedBountiesThisWeek.includes(bounty.id);
          const hasActiveQuest = !!player.activeQuest;
          const hasTime = player.timeRemaining >= bounty.timeRequired;
          const hasHealth = player.health > bounty.healthRisk;
          const isDisabled = alreadyDone || hasActiveQuest || !hasTime || !hasHealth;

          return (
            <div key={bounty.id} className={`bg-[#e0d4b8] border p-2 rounded ${alreadyDone ? 'border-green-500' : 'border-[#8b7355]'}`}>
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-sm text-[#3d2a14]">{t(`bounties.${bounty.id}.name`) || bounty.name}</span>
                <span className="font-mono text-sm text-[#8b6914] font-bold">+{getScaledQuestGold(bounty.goldReward, player.dungeonFloorsCleared)}g</span>
              </div>
              <p className="text-xs text-[#6b5a42] mt-0.5 line-clamp-1">{t(`bounties.${bounty.id}.description`) || bounty.description}</p>
              <div className="flex items-center gap-2 text-xs text-[#6b5a42] mt-1">
                <span>{bounty.timeRequired}h</span>
                {bounty.healthRisk > 0 && <span className="text-red-600">-{bounty.healthRisk}HP</span>}
                <span>+{bounty.happinessReward} {t('stats.happiness').toLowerCase().slice(0, 3)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-[#8b7355]">{t('panelBounty.bountyBoard')}</span>
                {alreadyDone ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-mono font-bold">
                    <Check className="w-3 h-3" /> {t('common.done')}
                  </span>
                ) : (
                  <JonesButton
                    label={t('panelBounty.takeBounty')}
                    onClick={() => { playSFX('quest-accept'); onTakeBounty(bounty.id); }}
                    disabled={isDisabled}
                    variant="secondary"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
