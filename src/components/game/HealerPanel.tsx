// Guild Life - Healer's Sanctuary Panel

import { Heart, Sparkles, Shield } from 'lucide-react';
import { playSFX } from '@/audio/sfxManager';
import type { Player } from '@/types/game.types';

interface HealerPanelProps {
  player: Player;
  priceModifier: number;
  onHeal: (cost: number, healthGain: number, time: number) => void;
  onCureSickness: (cost: number, time: number) => void;
  onBlessHealth: (cost: number, time: number) => void;
}

const HEALING_OPTIONS = [
  { id: 'minor', name: 'Minor Healing', baseCost: 25, healthGain: 25, time: 1 },
  { id: 'moderate', name: 'Moderate Healing', baseCost: 50, healthGain: 50, time: 2 },
  { id: 'full', name: 'Full Restoration', baseCost: 100, healthGain: 100, time: 4 },
];

export function HealerPanel({ player, priceModifier, onHeal, onCureSickness, onBlessHealth }: HealerPanelProps) {
  return (
    <div className="space-y-4">
      <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-3">
        <div className="flex items-center justify-between text-[#3d2a14]">
          <span>Current Health:</span>
          <span className="font-bold">{player.health}/{player.maxHealth}</span>
        </div>
        <div className="w-full bg-[#c8b898] rounded-full h-2 mt-2">
          <div
            className="bg-destructive h-2 rounded-full transition-all"
            style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
          />
        </div>
      </div>

      <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2 mb-2">
        <Heart className="w-4 h-4" /> Healing Services
      </h4>
      
      <div className="space-y-2">
        {HEALING_OPTIONS.map(option => {
          const cost = Math.round(option.baseCost * priceModifier);
          const effectiveHeal = Math.min(option.healthGain, player.maxHealth - player.health);
          const isDisabled = player.gold < cost || 
                            player.timeRemaining < option.time || 
                            player.health >= player.maxHealth;
          
          return (
            <button
              key={option.id}
              onClick={() => { playSFX('heal'); onHeal(cost, option.healthGain, option.time); }}
              disabled={isDisabled}
              className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive" />
                <span className="font-display font-semibold text-[#3d2a14]">{option.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-secondary">+{effectiveHeal} HP</span>
                <span className="text-[#8b6914]">-{cost}g</span>
                <span className="text-[#6b5a42]">{option.time}h</span>
              </div>
            </button>
          );
        })}
      </div>

      <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2 mb-2 mt-4">
        <Sparkles className="w-4 h-4" /> Special Services
      </h4>

      <div className="space-y-2">
        <button
          onClick={() => { playSFX('heal'); onCureSickness(75, 2); }}
          disabled={player.gold < 75 || player.timeRemaining < 2}
          className="w-full p-2 wood-frame text-parchment flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-[#3d2a14]">Cure Ailments</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#8b6914]">-75g</span>
            <span className="text-[#6b5a42]">2h</span>
          </div>
        </button>

        <button
          onClick={() => { playSFX('heal'); onBlessHealth(150, 4); }}
          disabled={player.gold < 150 || player.timeRemaining < 4}
          className="w-full p-2 wood-frame text-parchment flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-secondary" />
            <span className="font-display font-semibold text-[#3d2a14]">Health Blessing (+10 Max HP)</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#8b6914]">-150g</span>
            <span className="text-[#6b5a42]">4h</span>
          </div>
        </button>
      </div>
    </div>
  );
}
