// Guild Life - The Graveyard Panel
// Cemetery zone where dead players resurrect. Also offers prayer (happiness)
// and mourning/meditation (relaxation) services.

import { Heart, Sparkles, Cross, Skull } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { useTranslation } from '@/i18n';

interface GraveyardPanelProps {
  player: Player;
  priceModifier: number;
  onPray: (cost: number, happinessGain: number, time: number) => void;
  onMourn: (cost: number, relaxationGain: number, time: number) => void;
  onBlessMaxHealth: (cost: number, maxHealthGain: number, time: number) => void;
}

export function GraveyardPanel({ player, priceModifier, onPray, onMourn, onBlessMaxHealth }: GraveyardPanelProps) {
  const { t } = useTranslation();
  const prayerCost = Math.round(10 * priceModifier);
  const meditationCost = Math.round(15 * priceModifier);
  const blessingCost = Math.round(200 * priceModifier);

  return (
    <div className="space-y-4">
      {/* Resurrection info box */}
      <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-3">
        <div className="flex items-center gap-2 text-[#3d2a14] mb-2">
          <Skull className="w-4 h-4 text-[#6b5a42]" />
          <span className="font-display font-semibold">{t('panelGraveyard.restingPlace')}</span>
        </div>
        <p className="text-xs text-[#6b5a42]">
          {t('panelGraveyard.noBusinessHere')}
        </p>
        {player.wasResurrectedThisWeek && (
          <div className="mt-2 p-2 bg-[#d4c4a8] rounded border border-[#a89070] text-xs text-[#6b5a42]">
            <Sparkles className="w-3 h-3 inline mr-1" />
            {t('death.spiritsRestored')}
          </div>
        )}
      </div>

      {/* Health display */}
      <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-3">
        <div className="flex items-center justify-between text-[#3d2a14]">
          <span>{t('stats.health')}:</span>
          <span className="font-bold">{player.health}/{player.maxHealth}</span>
        </div>
        <div className="w-full bg-[#c8b898] rounded-full h-2 mt-2">
          <div
            className="bg-destructive h-2 rounded-full transition-all"
            style={{ width: `${player.maxHealth > 0 ? (player.health / player.maxHealth) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Prayer - happiness boost */}
      <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2">
        <Cross className="w-4 h-4" /> {t('locations.graveyard')}
      </h4>

      <div className="space-y-2">
        <button
          onClick={() => onPray(prayerCost, 5, 2)}
          disabled={player.gold < prayerCost || player.timeRemaining < 2}
          className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <div className="flex items-center gap-2">
            <Cross className="w-4 h-4 text-[#6b5a42]" />
            <span className="font-display font-semibold text-[#3d2a14]">{t('common.rest')}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#2a7a2a]">+5 {t('stats.happiness')}</span>
            <span className="text-[#8b6914]">-{prayerCost}g</span>
            <span className="text-[#6b5a42]">2h</span>
          </div>
        </button>

        <button
          onClick={() => onMourn(meditationCost, 5, 3)}
          disabled={player.gold < meditationCost || player.timeRemaining < 3}
          className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#6b5a42]" />
            <span className="font-display font-semibold text-[#3d2a14]">{t('stats.relaxation')}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#2a7a2a]">+5 {t('stats.relaxation')}</span>
            <span className="text-[#8b6914]">-{meditationCost}g</span>
            <span className="text-[#6b5a42]">3h</span>
          </div>
        </button>

        <button
          onClick={() => onBlessMaxHealth(blessingCost, 5, 4)}
          disabled={player.gold < blessingCost || player.timeRemaining < 4}
          className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#9575cd]" />
            <span className="font-display font-semibold text-[#3d2a14]">+5 {t('stats.maxHealth')}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#2a7a2a]">+5 {t('stats.maxHealth')}</span>
            <span className="text-[#8b6914]">-{blessingCost}g</span>
            <span className="text-[#6b5a42]">4h</span>
          </div>
        </button>
      </div>
    </div>
  );
}
