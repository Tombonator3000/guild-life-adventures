// Enchanter's Workshop Panel - Socket City equivalent
// Sells magical appliances at premium prices with lower break chance

import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getEnchanterAppliances, getAppliance, getItemPrice } from '@/data/items';
import { applianceToPreview, useItemPreview } from './ItemPreview';
import { Sparkles, Wrench, ShoppingBag } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

interface EnchanterPanelProps {
  player: Player;
  priceModifier: number;
  onSpendTime: (hours: number) => void;
}

export function EnchanterPanel({ player, priceModifier, onSpendTime }: EnchanterPanelProps) {
  const { t } = useTranslation();
  const { setPreview } = useItemPreview();
  const { buyAppliance, repairAppliance } = useGameStore();
  const appliances = getEnchanterAppliances();

  // Get owned appliances that need repair
  const brokenAppliances = Object.entries(player.appliances)
    .filter(([_, owned]) => owned.isBroken)
    .map(([id, owned]) => ({ id, ...owned, appliance: getAppliance(id) }))
    .filter(item => item.appliance);

  const handleBuyAppliance = (applianceId: string, price: number) => {
    const happinessGain = buyAppliance(player.id, applianceId, price, 'enchanter');
    const appliance = getAppliance(applianceId);
    const name = t(`appliances.${applianceId}.name`) || appliance?.name;
    if (happinessGain > 0) {
      toast.success(t('panelStore.purchased', { name: name || '' }) + ` +${happinessGain} ${t('stats.happiness')}`);
    } else {
      toast.success(t('panelStore.purchased', { name: name || '' }));
    }
  };

  const handleRepair = (applianceId: string) => {
    const cost = repairAppliance(player.id, applianceId);
    onSpendTime(2);
    const name = t(`appliances.${applianceId}.name`) || getAppliance(applianceId)?.name;
    toast.success(t('panelEnchanter.repaired', { name: name || '' }));
  };

  return (
    <div className="space-y-4">
      {/* Repair Section */}
      {brokenAppliances.length > 0 && (
        <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-3">
          <h4 className="font-display text-sm text-destructive flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4" /> {t('panelEnchanter.appliances')}
          </h4>
          <p className="text-xs text-[#6b5a42] mb-2">
            {t('panelEnchanter.repairCost')}
          </p>
          <div className="space-y-2">
            {brokenAppliances.map(item => {
              const estimatedCost = Math.floor(item.originalPrice / 10); // Rough estimate
              return (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="text-sm text-[#3d2a14]">{t(`appliances.${item.id}.name`) || item.appliance?.name}</span>
                  <button
                    onClick={() => handleRepair(item.id)}
                    disabled={player.gold < estimatedCost || player.timeRemaining < 2}
                    className="gold-button text-xs py-1 px-2 disabled:opacity-50"
                  >
                    Repair (~{estimatedCost}g, 2h)
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shop Section */}
      <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2">
        <Sparkles className="w-4 h-4" /> {t('panelEnchanter.magicItems')}
      </h4>
      <p className="text-xs text-[#6b5a42]">
        Premium enchanted items. Higher price, but lower chance to break (1/51 per turn).
      </p>

      <div className="space-y-2">
        {appliances.map(appliance => {
          const price = Math.round(appliance.enchanterPrice * priceModifier);
          const alreadyOwns = !!player.appliances[appliance.id];
          const isFirstPurchase = !player.applianceHistory.includes(appliance.id);

          return (
            <div
              key={appliance.id}
              className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2"
              onMouseEnter={() => setPreview(applianceToPreview(appliance, 'enchanter'))}
              onMouseLeave={() => setPreview(null)}
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="font-display font-semibold text-sm text-[#3d2a14]">{t(`appliances.${appliance.id}.name`) || appliance.name}</span>
                  {alreadyOwns && (
                    <span className="ml-2 text-xs text-secondary">(Owned)</span>
                  )}
                </div>
                <span className="text-[#8b6914] font-bold">{price}g</span>
              </div>
              <p className="text-xs text-[#6b5a42] mb-2">{t(`appliances.${appliance.id}.description`) || appliance.description}</p>
              <div className="flex justify-between items-center">
                <div className="text-xs">
                  {isFirstPurchase && appliance.happinessEnchanter > 0 && (
                    <span className="text-secondary">+{appliance.happinessEnchanter} {t('stats.happiness')}</span>
                  )}
                  {appliance.givesPerTurnBonus && (
                    <span className="text-secondary ml-2">+1/turn</span>
                  )}
                  {appliance.canGenerateIncome && (
                    <span className="text-[#8b6914] ml-2">Income chance</span>
                  )}
                </div>
                <button
                  onClick={() => handleBuyAppliance(appliance.id, price)}
                  disabled={player.gold < price || alreadyOwns}
                  className="gold-button text-xs py-1 px-2 disabled:opacity-50"
                >
                  {alreadyOwns ? 'Owned' : 'Buy'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
