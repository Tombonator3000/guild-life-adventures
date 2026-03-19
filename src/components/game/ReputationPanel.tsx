/**
 * ReputationPanel — Shows available reputation-locked services at a location.
 * Displayed as a tab in locations that have reputation unlocks.
 */

import type { Player } from '@/types/game.types';
import { getReputationUnlocks, getReputationTier, getTierLabel, type ReputationUnlock } from '@/data/reputation';
import { JonesMenuItem, JonesSectionHeader } from './JonesStylePanel';
import { toast } from 'sonner';
import { Star, Skull, Award, Lock } from 'lucide-react';

interface ReputationPanelProps {
  player: Player;
  locationId: string;
  priceModifier: number;
  onPurchase: (unlockId: string, cost: number, effectType: string, effectValue: number, timeCost: number) => void;
  spendTime?: (playerId: string, hours: number) => void;
}

export function ReputationPanel({ player, locationId, priceModifier, onPurchase }: ReputationPanelProps) {
  const fame = player.fame ?? 0;
  const infamy = player.infamy ?? 0;
  const fameTier = getReputationTier(fame);
  const infamyTier = getReputationTier(infamy);
  const availableUnlocks = getReputationUnlocks(
    locationId, fame, infamy, player.purchasedReputationUnlocks ?? []
  );

  return (
    <div className="space-y-3">
      {/* Reputation summary */}
      <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-[#4a3520]">Fame</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-amber-700">{fame}</span>
            <span className="text-xs text-[#6b5a42] ml-1">({getTierLabel(fameTier)})</span>
          </div>
        </div>
        <div className="w-full bg-[#c9b896] rounded-full h-2 mb-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
            style={{ width: `${fame}%` }}
          />
        </div>

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Skull className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-[#4a3520]">Infamy</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-purple-700">{infamy}</span>
            <span className="text-xs text-[#6b5a42] ml-1">({getTierLabel(infamyTier)})</span>
          </div>
        </div>
        <div className="w-full bg-[#c9b896] rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-700 transition-all"
            style={{ width: `${infamy}%` }}
          />
        </div>
      </div>

      {/* Available reputation services */}
      {availableUnlocks.length > 0 ? (
        <div>
          <JonesSectionHeader title="Exclusive Services" />
          <div className="space-y-1">
            {availableUnlocks.map(unlock => {
              const adjustedCost = Math.round(unlock.cost * priceModifier);
              const canAfford = player.gold >= adjustedCost;
              const hasTime = player.timeRemaining >= unlock.timeCost;

              return (
                <div key={unlock.id}>
                  <JonesMenuItem
                    label={`${unlock.name} (${unlock.timeCost}h)`}
                    price={adjustedCost}
                    disabled={!canAfford || !hasTime}
                    darkText
                    largeText
                    onClick={() => {
                      onPurchase(
                        unlock.id,
                        adjustedCost,
                        unlock.effect.type,
                        unlock.effect.value,
                        unlock.timeCost
                      );
                      toast.success(`${unlock.name} acquired!`);
                    }}
                  />
                  <div className="flex items-center gap-1 text-xs text-[#6b5a42] italic px-1 -mt-0.5 mb-1">
                    <Award className="w-3 h-3 flex-shrink-0" />
                    {unlock.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-sm text-[#6b5a42] px-2 py-2 italic flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" />
          Build your reputation to unlock exclusive services here.
        </div>
      )}
    </div>
  );
}
