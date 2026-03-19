/**
 * Player Bounties / Sabotage Panel
 * Available at the Shadow Market — pick a rival from a dropdown, then choose a dirty trick.
 */

import { useState } from 'react';
import type { Player } from '@/types/game.types';
import { JonesMenuItem } from './JonesStylePanel';
import { toast } from 'sonner';
import { Skull, Target } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [selectedRivalId, setSelectedRivalId] = useState<string>(
    aliveRivals.length > 0 ? aliveRivals[0].id : ''
  );

  if (aliveRivals.length === 0) {
    return (
      <div className="text-sm text-[#6b5a42] px-2 py-4 italic">
        No rivals to target. How... peaceful.
      </div>
    );
  }

  const selectedRival = aliveRivals.find(r => r.id === selectedRivalId);

  return (
    <div className="space-y-3">
      <div className="text-xs text-[#8b6914] px-2 flex items-center gap-1">
        <Skull className="w-3 h-3" />
        Hire shady operatives to sabotage a rival. Results take effect at their next turn.
      </div>

      {/* Target selector */}
      <div className="px-2">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-3.5 h-3.5 text-[#8b6914]" />
          <span className="text-xs font-bold text-[#4a3520] uppercase tracking-wide">Choose Target</span>
        </div>
        <Select value={selectedRivalId} onValueChange={setSelectedRivalId}>
          <SelectTrigger className="bg-[#e8dcc4] border-[#8b7355] text-[#4a3520] font-display">
            <SelectValue placeholder="Select a rival..." />
          </SelectTrigger>
          <SelectContent className="bg-[#e8dcc4] border-[#8b7355]">
            {aliveRivals.map(rival => (
              <SelectItem
                key={rival.id}
                value={rival.id}
                className="text-[#4a3520] font-display focus:bg-[#d4c4a0] focus:text-[#4a3520]"
              >
                {rival.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sabotage options for selected rival */}
      {selectedRival && (
        <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
          <div className="text-xs text-[#6b5a42] italic mb-2 px-1">
            Gold: {selectedRival.gold}g | Clothing: {selectedRival.clothingCondition}%
          </div>
          <div className="space-y-1">
            {SABOTAGE_OPTIONS.map(option => {
              const adjustedCost = Math.round(option.cost * priceModifier);
              const canAfford = player.gold >= adjustedCost;
              const hasTime = player.timeRemaining >= option.timeCost;

              return (
                <div key={option.id}>
                  <JonesMenuItem
                    label={`${option.label} (${option.timeCost}h)`}
                    price={adjustedCost}
                    disabled={!canAfford || !hasTime}
                    darkText
                    largeText
                    onClick={() => {
                      onSabotage(selectedRival.id, { ...option, cost: adjustedCost });
                      spendTime(player.id, option.timeCost);
                      toast.success(`Sabotage arranged against ${selectedRival.name}!`);
                    }}
                  />
                  <div className="text-xs text-[#6b5a42] italic px-1 -mt-0.5 mb-1">
                    {option.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
