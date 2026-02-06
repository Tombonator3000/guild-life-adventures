// Guild Life - Quest Panel Component

import { Scroll, Clock, Heart, Coins, AlertTriangle, Check, X } from 'lucide-react';
import type { Quest } from '@/data/quests';
import { QUEST_RANK_INFO, canTakeQuest } from '@/data/quests';
import type { Player } from '@/types/game.types';

interface QuestPanelProps {
  quests: Quest[];
  player: Player;
  onTakeQuest: (questId: string) => void;
  onCompleteQuest: () => void;
  onAbandonQuest: () => void;
}

export function QuestPanel({ quests, player, onTakeQuest, onCompleteQuest, onAbandonQuest }: QuestPanelProps) {
  const activeQuest = player.activeQuest ? quests.find(q => q.id === player.activeQuest) : null;

  if (activeQuest) {
    return (
      <div className="space-y-3">
        <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
          <Scroll className="w-4 h-4" /> Active Quest
        </h4>
        <div className="wood-frame p-3 text-card">
          <div className="flex items-center justify-between mb-2">
            <span className={`font-display font-bold ${QUEST_RANK_INFO[activeQuest.rank].color}`}>
              {QUEST_RANK_INFO[activeQuest.rank].name}
            </span>
            <span className="font-display font-semibold">{activeQuest.name}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{activeQuest.description}</p>
          
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-gold" />
              <span>+{activeQuest.goldReward}g</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-time" />
              <span>{activeQuest.timeRequired}h</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-destructive" />
              <span>-{activeQuest.healthRisk} HP risk</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-secondary">+{activeQuest.happinessReward} 😊</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCompleteQuest}
              disabled={player.timeRemaining < activeQuest.timeRequired}
              className="flex-1 gold-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" /> Complete Quest
            </button>
            <button
              onClick={onAbandonQuest}
              className="px-3 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {player.timeRemaining < activeQuest.timeRequired && (
            <p className="text-destructive text-xs mt-2 text-center">Not enough time to complete!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
        <Scroll className="w-4 h-4" /> Available Quests
      </h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
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
            const isDisabled = !canTake || !hasTime || !hasHealth;

            return (
              <div key={quest.id} className="wood-frame p-2 text-card">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${QUEST_RANK_INFO[quest.rank].color}`}>
                    {QUEST_RANK_INFO[quest.rank].name}
                  </span>
                  <span className="font-display font-semibold text-sm">{quest.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{quest.description}</p>
                
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gold">+{quest.goldReward}g</span>
                    <span className="text-time">{quest.timeRequired}h</span>
                    <span className="text-destructive">-{quest.healthRisk}HP</span>
                  </div>
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
