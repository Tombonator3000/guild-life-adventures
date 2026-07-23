// Enchanter's Workshop Panel - Socket City equivalent
// Sells magical appliances at premium prices with lower break chance

import { useGameStore } from '@/store/gameStore';
import { getEnchanterAppliances, getAppliance } from '@/data/items';
import { applianceToPreview, useItemPreview } from './ItemPreview';
import { Sparkles, Wrench } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

interface EnchanterPanelProps {
  player: Player;
  priceModifier: number;
}

export function EnchanterPanel({ player, priceModifier }: EnchanterPanelProps) {
  const { t } = useTranslation();
  const { setPreview } = useItemPreview();
  const purchaseAppliance = useGameStore(s => s.purchaseAppliance);
  const useApplianceService = useGameStore(s => s.useApplianceService);
  const appliances = getEnchanterAppliances();

  const brokenAppliances = Object.entries(player.appliances)
    .filter(([, owned]) => owned.isBroken)
    .map(([id, owned]) => ({ id, ...owned, appliance: getAppliance(id) }))
    .filter(item => item.appliance);

  const handleBuyAppliance = (applianceId: string) => {
    const result = purchaseAppliance(player.id, 'enchanter', applianceId);
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  const handleRepair = (applianceId: string) => {
    const result = useApplianceService(player.id, 'repair-enchanter', applianceId);
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <div className="space-y-4">
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
              const estimatedCost = Math.floor(item.originalPrice / 10);
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

      <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2">
        <Sparkles className="w-4 h-4" /> {t('panelEnchanter.magicItems')}
      </h4>
      <p className="text-xs text-[#6b5a42]">
        Premium enchanted items. Higher price, but lower chance to break (1/51 per turn).
      </p>

      <div className="space-y-2">
        {appliances.map(appliance => {
          const price = Math.round(appliance.enchanterPrice * priceModifier);
          const ownedAppliance = player.appliances[appliance.id];
          const alreadyOwns = !!ownedAppliance;
          const isBroken = alreadyOwns && ownedAppliance.isBroken;
          const isFirstPurchase = !player.applianceHistory.includes(appliance.id);

          return (
            <div
              key={appliance.id}
              className={`bg-[#e0d4b8] border rounded p-2 ${isBroken ? 'border-destructive/60' : 'border-[#8b7355]'}`}
              onMouseEnter={() => setPreview(applianceToPreview(appliance, 'enchanter'))}
              onMouseLeave={() => setPreview(null)}
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="font-display font-semibold text-sm text-[#3d2a14]">{t(`appliances.${appliance.id}.name`) || appliance.name}</span>
                  {alreadyOwns && !isBroken && <span className="ml-2 text-xs text-secondary">(Owned)</span>}
                  {isBroken && <span className="ml-2 text-xs text-destructive font-semibold">(Broken — repair above)</span>}
                </div>
                <span className="text-[#8b6914] font-bold">{price}g</span>
              </div>
              <p className="text-xs text-[#6b5a42] mb-2">{t(`appliances.${appliance.id}.description`) || appliance.description}</p>
              <div className="flex justify-between items-center">
                <div className="text-xs">
                  {isFirstPurchase && appliance.happinessEnchanter > 0 && (
                    <span className="text-secondary">+{appliance.happinessEnchanter} {t('stats.happiness')}</span>
                  )}
                  {appliance.givesPerTurnBonus && <span className="text-secondary ml-2">+3 Food/turn</span>}
                  {appliance.canGenerateIncome && <span className="text-[#8b6914] ml-2">Income chance</span>}
                </div>
                <button
                  onClick={() => handleBuyAppliance(appliance.id)}
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
