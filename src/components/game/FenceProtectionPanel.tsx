/**
 * Fence Protection & Tip-off Panel
 * Services: Protection Money (reduce robbery chance) and Tip-offs (see rival vulnerability).
 */

import { useState } from 'react';
import type { Player } from '@/types/game.types';
import { JonesMenuItem } from './JonesStylePanel';
import { toast } from 'sonner';
import { Shield, Eye } from 'lucide-react';
import { getRobberyVulnerability } from '@/data/shadowfingers';
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
  onBuyProtection: (weeks: number, cost: number) => void;
  onBuyTipOff: (cost: number) => void;
}

const PROTECTION_OPTIONS = [
  { weeks: 3, baseCost: 75, label: '3 Weeks' },
  { weeks: 6, baseCost: 130, label: '6 Weeks' },
  { weeks: 10, baseCost: 200, label: '10 Weeks' },
];

const TIP_OFF_BASE_COST = 40;

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-700',
  medium: 'text-yellow-700',
  high: 'text-orange-700',
  extreme: 'text-red-700',
};

export function FenceProtectionPanel({ player, rivals, priceModifier, onBuyProtection, onBuyTipOff }: FenceProtectionPanelProps) {
  const [tipOffTarget, setTipOffTarget] = useState<string>(rivals.length > 0 ? rivals[0].id : '');
  const [revealedTipOff, setRevealedTipOff] = useState<string | null>(null);

  const protectionActive = (player.protectionWeeksLeft ?? 0) > 0;
  const tipOffCost = Math.round(TIP_OFF_BASE_COST * priceModifier);

  const selectedRival = rivals.find(r => r.id === tipOffTarget);

  return (
    <div className="space-y-4">
      {/* Protection Money section */}
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
            const cost = Math.round(opt.baseCost * priceModifier);
            const canAfford = player.gold >= cost;
            return (
              <div key={opt.weeks}>
                <JonesMenuItem
                  label={`Protection — ${opt.label}`}
                  price={cost}
                  disabled={!canAfford}
                  darkText
                  largeText
                  onClick={() => {
                    onBuyProtection(opt.weeks, cost);
                    toast.success(`Bought ${opt.weeks} weeks of protection from Shadowfingers.`);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Tip-off section */}
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
            <Select value={tipOffTarget} onValueChange={(v) => { setTipOffTarget(v); setRevealedTipOff(null); }}>
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
                  label="Buy Tip-off"
                  price={tipOffCost}
                  disabled={player.gold < tipOffCost || revealedTipOff === tipOffTarget}
                  darkText
                  largeText
                  onClick={() => {
                    onBuyTipOff(tipOffCost);
                    setRevealedTipOff(tipOffTarget);
                    toast.success(`Received intel on ${selectedRival.name}.`);
                  }}
                />

                {revealedTipOff === tipOffTarget && selectedRival && (
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
