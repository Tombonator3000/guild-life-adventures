/**
 * Player Bounties / Sabotage Panel
 * Available at the Shadow Market — place hits on rival players.
 * Effects: time loss, gold theft, clothing damage.
 */

import type { Player } from '@/types/game.types';
import { JonesSectionHeader, JonesMenuItem, JonesInfoRow } from './JonesStylePanel';
import { toast } from 'sonner';
import { Skull } from 'lucide-react';

export interface SabotageOption {
  id: string;
  label: string;
  description: string;
  cost: number;
  timeCost: number;
  effect: {
    type: 'time-loss' | 'gold-theft' | 'clothing-damage';
    value: number;
  };
}

const SABOTAGE_OPTIONS: SabotageOption[] = [
  {
    id: 'pickpocket',
    label: 'Hire a Pickpocket',
    description: 'A street urchin lifts some gold from their purse.',
    cost: 50,
    timeCost: 1,
    effect: { type: 'gold-theft', value: 30 },
  },
  {
    id: 'distraction',
    label: 'Arrange a Distraction',
    description: 'Thugs waylay them, costing precious hours.',
    cost: 80,
    timeCost: 1,
    effect: { type: 'time-loss', value: 6 },
  },
  {
    id: 'mudslinger',
    label: 'Send the Mudslinger',
    description: 'Their clothes "accidentally" get ruined.',
    cost: 60,
    timeCost: 1,
    effect: { type: 'clothing-damage', value: 25 },
  },
];

interface SabotagePanelProps {
  player: Player;
  rivals: Player[];
  priceModifier: number;
  onSabotage: (targetId: string, option: SabotageOption) => void;
  spendTime: (playerId: string, hours: number) => void;
}

export function SabotagePanel({ player, rivals, priceModifier, onSabotage, spendTime }: SabotagePanelProps) {
  const aliveRivals = rivals.filter(r => !r.isGameOver && r.id !== player.id);

  if (aliveRivals.length === 0) {
    return (
      <div className="text-sm text-[#6b5a42] px-2 py-4 italic">
        No rivals to target. How... peaceful.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-[#8b6914] px-2 flex items-center gap-1">
        <Skull className="w-3 h-3" />
        Hire shady operatives to sabotage your rivals. Results take effect at their next turn.
      </div>

      {aliveRivals.map(rival => (
        <div key={rival.id} className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
          <JonesSectionHeader title={rival.name} />
          <div className="space-y-1">
            {SABOTAGE_OPTIONS.map(option => {
              const adjustedCost = Math.round(option.cost * priceModifier);
              const canAfford = player.gold >= adjustedCost;
              const hasTime = player.timeRemaining >= option.timeCost;

              return (
                <JonesMenuItem
                  key={option.id}
                  label={`${option.label} (${option.timeCost}h)`}
                  price={adjustedCost}
                  disabled={!canAfford || !hasTime}
                  darkText
                  largeText
                  onClick={() => {
                    onSabotage(rival.id, { ...option, cost: adjustedCost });
                    spendTime(player.id, option.timeCost);
                    toast.success(`Sabotage arranged against ${rival.name}!`);
                  }}
                />
              );
            })}
          </div>
          <div className="text-xs text-[#6b5a42] italic mt-1 px-1">
            {option_descriptions(rival)}
          </div>
        </div>
      ))}
    </div>
  );
}

function option_descriptions(rival: Player): string {
  return `Gold: ${rival.gold}g | Clothing: ${rival.clothingCondition}%`;
}
