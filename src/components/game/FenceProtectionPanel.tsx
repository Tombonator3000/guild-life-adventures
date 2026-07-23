/**
 * Fence Protection & Tip-off Panel
 * Services: Protection Money (reduce robbery chance) and Tip-offs (see rival vulnerability).
 */

import { useEffect, useRef, useState } from 'react';
import type { Player } from '@/types/game.types';
import { JonesMenuItem } from './JonesStylePanel';
import { toast } from 'sonner';
import { Shield, Eye } from 'lucide-react';
import { getRobberyVulnerability } from '@/data/shadowfingers';
import { PROTECTION_OPTIONS, TIP_OFF_BASE_COST, computePrice } from '@/data/sabotage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FenceProtectionPanelProps {
  player: Player;
  rivals: Player[];
  priceModifier: number;
  onBuyProtection: (weeks: number) => void;
  onBuyTipOff: (targetId: string) => void;
}

type PendingService =
  | { type: 'protection'; weeks: number; previousWeeks: number; previousGold: number; previousTime: number }
  | { type: 'tipoff'; targetId: string; targetName: string; previousGold: number; previousTime: number };

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-700',
  medium: 'text-yellow-700',
  high: 'text-orange-700',
  extreme: 'text-red-700',
};

export function FenceProtectionPanel({ player, rivals, priceModifier, onBuyProtection, onBuyTipOff }: FenceProtectionPanelProps) {
  const [tipOffTarget, setTipOffTarget] = useState<string>(rivals.length > 0 ? rivals[0].id : '');
  const [revealedTipOff, setRevealedTipOff] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingService | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const protectionActive = (player.protectionWeeksLeft ?? 0) > 0;
  const tipOffCost = computePrice(TIP_OFF_BASE_COST, priceModifier);
  const selectedRival = rivals.find(r => r.id === tipOffTarget);

  useEffect(() => {
    if (!pending) return;
    if (pending.type === 'protection') {
      if ((player.protectionWeeksLeft ?? 0) > pending.previousWeeks) {
        toast.success(`Bought ${pending.weeks} weeks of protection from Shadowfingers.`);
        setPending(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
      return;
    }

    const confirmed = player.gold < pending.previousGold || player.timeRemaining < pending.previousTime;
    if (confirmed) {
      setRevealedTipOff(pending.targetId);
      toast.success(`Received intel on ${pending.targetName}.`);
      setPending(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [pending, player.gold, player.timeRemaining, player.protectionWeeksLeft]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const startTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setPending(null), 10000);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 px-2 mb-1.5">
          <Shield className="w-3.5 h-3.5 text-[#8b6914]" />
          <span className="text-xs font-bold text-[#4a3520] uppercase tracking-wide">Protection Money</span>
        </div>
        <p className="text-xs text-[#6b5a42] italic px-2 mb-2">
          Pay the Fence to keep Shadowfingers away. Reduces robbery chance by 80%.
        </p>
        {protectionActive && (
          <div className="mx-2 mb-2 bg-green-900/20 border border-green-800/40 rounded px-2 py-1.5 text-xs text-green-800 font-display font-semibold">
            ✓ Protection active — {player.protectionWeeksLeft} week{(player.protectionWeeksLeft ?? 0) !== 1 ? 's' : ''} remaining
          </div>
        )}
        <div className="space-y-1 px-1">
          {PROTECTION_OPTIONS.map(opt => {
            const cost = computePrice(opt.baseCost, priceModifier);
            const canAfford = player.gold >= cost;
            const isPending = pending?.type === 'protection' && pending.weeks === opt.weeks;
            return (
              <div key={opt.weeks}>
                <JonesMenuItem
                  label={isPending ? 'Waiting for host…' : `Protection — ${opt.label}`}
                  price={cost}
                  disabled={!canAfford || player.timeRemaining < 1 || !!pending}
                  darkText
                  largeText
                  onClick={() => {
                    if (pending) return;
                    setPending({
                      type: 'protection',
                      weeks: opt.weeks,
                      previousWeeks: player.protectionWeeksLeft ?? 0,
                      previousGold: player.gold,
                      previousTime: player.timeRemaining,
                    });
                    onBuyProtection(opt.weeks);
                    startTimeout();
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 px-2 mb-1.5">
          <Eye className="w-3.5 h-3.5 text-[#8b6914]" />
          <span className="text-xs font-bold text-[#4a3520] uppercase tracking-wide">Tip-off</span>
        </div>
        <p className="text-xs text-[#6b5a42] italic px-2 mb-2">
          Pay for intelligence on a rival's robbery vulnerability.
        </p>

        {rivals.length > 0 && (
          <div className="px-2 space-y-2">
            <Select
              value={tipOffTarget}
              disabled={!!pending}
              onValueChange={(v) => { setTipOffTarget(v); setRevealedTipOff(null); }}
            >
              <SelectTrigger className="bg-[#e8dcc4] border-[#8b7355] text-[#4a3520] font-display">
                <SelectValue placeholder="Select rival..." />
              </SelectTrigger>
              <SelectContent className="bg-[#e8dcc4] border-[#8b7355]">
                {rivals.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-[#4a3520] font-display focus:bg-[#d4c4a0] focus:text-[#4a3520]">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedRival && (
              <>
                <JonesMenuItem
                  label={pending?.type === 'tipoff' ? 'Waiting for host…' : 'Buy Tip-off'}
                  price={tipOffCost}
                  disabled={player.gold < tipOffCost || player.timeRemaining < 1 || revealedTipOff === tipOffTarget || !!pending}
                  darkText
                  largeText
                  onClick={() => {
                    if (pending) return;
                    setPending({
                      type: 'tipoff',
                      targetId: tipOffTarget,
                      targetName: selectedRival.name,
                      previousGold: player.gold,
                      previousTime: player.timeRemaining,
                    });
                    onBuyTipOff(tipOffTarget);
                    startTimeout();
                  }}
                />

                {revealedTipOff === tipOffTarget && (
                  <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2 space-y-1">
                    {(() => {
                      const vuln = getRobberyVulnerability(selectedRival);
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#4a3520]">{selectedRival.name}</span>
                            <span className={`text-xs font-bold uppercase ${RISK_COLORS[vuln.riskLevel]}`}>
                              {vuln.riskLevel} risk
                            </span>
                          </div>
                          {vuln.factors.length > 0 ? (
                            <ul className="text-xs text-[#6b5a42] space-y-0.5 pl-3 list-disc">
                              {vuln.factors.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          ) : (
                            <p className="text-xs text-[#6b5a42] italic">No notable vulnerabilities.</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {rivals.length === 0 && (
          <p className="text-xs text-[#6b5a42] italic px-2">No rivals to investigate.</p>
        )}
      </div>
    </div>
  );
}
