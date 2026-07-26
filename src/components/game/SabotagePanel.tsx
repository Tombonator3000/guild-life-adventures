/**
 * Player Bounties / Sabotage Panel
 * Available at the Shadow Market — hire Shadowfingers to sabotage a rival.
 */

import { useEffect, useRef, useState } from 'react';
import type { Player } from '@/types/game.types';
import { JonesMenuItem } from './JonesStylePanel';
import { toast } from 'sonner';
import { Skull, Target } from 'lucide-react';
import { SABOTAGE_OPTIONS as CANON_SABOTAGE_OPTIONS, computePrice } from '@/data/sabotage';
import type { SabotageOption as CanonSabotageOption } from '@/data/sabotage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { subscribeActionResult } from '@/network/NetworkActionProxy';

/** Re-export the canonical option shape so external callers stay type-safe. */
export type SabotageOption = CanonSabotageOption;

interface SabotagePanelProps {
  player: Player;
  rivals: Player[];
  priceModifier: number;
  onSabotage: (targetId: string, option: SabotageOption) => void;
}

interface PendingSabotage {
  targetId: string;
  targetName: string;
  optionId: string;
  previousGold: number;
  previousTime: number;
}

export function SabotagePanel({ player, rivals, priceModifier, onSabotage }: SabotagePanelProps) {
  const aliveRivals = rivals.filter(r => !r.isGameOver && r.id !== player.id);
  const [selectedRivalId, setSelectedRivalId] = useState<string>(
    aliveRivals.length > 0 ? aliveRivals[0].id : ''
  );
  const [pending, setPending] = useState<PendingSabotage | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pending) return;
    const confirmed = player.gold < pending.previousGold || player.timeRemaining < pending.previousTime;
    if (confirmed) {
      toast.success(`Shadowfingers dispatched against ${pending.targetName}!`);
      setPending(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [pending, player.gold, player.timeRemaining]);

  // Clear the pending lock immediately if the host rejects this exact sabotage
  // request. Prevents the panel from staying disabled for the full 10s fallback
  // timeout when we already know the action failed.
  useEffect(() => {
    if (!pending) return;
    const unsub = subscribeActionResult(event => {
      if (event.actionName !== 'sabotagePlayer') return;
      const [, targetId, optionId] = event.args as [string, string, string];
      if (targetId !== pending.targetId || optionId !== pending.optionId) return;
      if (event.success) return;
      setPending(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    });
    return unsub;
  }, [pending]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  if (aliveRivals.length === 0) {
    return (
      <div className="text-sm text-[#6b5a42] px-2 py-4 italic">
        No rivals to target. How... peaceful.
      </div>
    );
  }

  const selectedRival = aliveRivals.find(r => r.id === selectedRivalId);

  const beginSabotage = (target: Player, option: SabotageOption) => {
    if (pending) return;
    setPending({
      targetId: target.id,
      targetName: target.name,
      optionId: option.id,
      previousGold: player.gold,
      previousTime: player.timeRemaining,
    });
    onSabotage(target.id, option);
    timeoutRef.current = setTimeout(() => setPending(null), 10000);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-[#8b6914] px-2 flex items-center gap-1">
        <Skull className="w-3 h-3" />
        Hire Shadowfingers to sabotage a rival. Results take effect immediately.
      </div>

      <div className="px-2">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-3.5 h-3.5 text-[#8b6914]" />
          <span className="text-xs font-bold text-[#4a3520] uppercase tracking-wide">Choose Target</span>
        </div>
        <Select value={selectedRivalId} onValueChange={setSelectedRivalId} disabled={!!pending}>
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

      {selectedRival && (
        <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
          <div className="text-xs text-[#6b5a42] italic mb-2 px-1">
            Gold: {selectedRival.gold}g | Clothing: {selectedRival.clothingCondition}%
          </div>
          <div className="space-y-1">
            {CANON_SABOTAGE_OPTIONS.map(option => {
              const adjustedCost = computePrice(option.baseCost, priceModifier);
              const canAfford = player.gold >= adjustedCost;
              const hasTime = player.timeRemaining >= option.timeCost;
              const isPending = pending?.optionId === option.id && pending.targetId === selectedRival.id;

              return (
                <div key={option.id}>
                  <JonesMenuItem
                    label={isPending ? 'Waiting for host…' : `${option.label} (${option.timeCost}h)`}
                    price={adjustedCost}
                    disabled={!canAfford || !hasTime || !!pending}
                    darkText
                    largeText
                    onClick={() => beginSabotage(selectedRival, option)}
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
