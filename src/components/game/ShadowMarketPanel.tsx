// Shadow Market Panel - Z-Mart equivalent
// Sells used/cheaper appliances with higher break chance

import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getMarketAppliances, getAppliance, SHADOW_MARKET_ITEMS, getItemPrice } from '@/data/items';
import { ShoppingBag, Sparkles, AlertTriangle } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { toast } from 'sonner';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
} from './JonesStylePanel';

interface ShadowMarketPanelProps {
  player: Player;
  priceModifier: number;
  onSpendTime: (hours: number) => void;
  onModifyGold: (amount: number) => void;
  onModifyHappiness: (amount: number) => void;
  onModifyFood: (amount: number) => void;
}

export function ShadowMarketPanel({
  player,
  priceModifier,
  onSpendTime,
  onModifyGold,
  onModifyHappiness,
  onModifyFood,
}: ShadowMarketPanelProps) {
  const { buyAppliance } = useGameStore();
  const appliances = getMarketAppliances();

  const handleBuyAppliance = (applianceId: string, price: number) => {
    const happinessGain = buyAppliance(player.id, applianceId, price, 'market');
    onSpendTime(1);
    const appliance = getAppliance(applianceId);
    if (happinessGain > 0) {
      toast.success(`Purchased ${appliance?.name}! +${happinessGain} Happiness`);
    } else {
      toast.success(`Purchased ${appliance?.name}!`);
    }
  };

  const handleBuyItem = (item: typeof SHADOW_MARKET_ITEMS[0], price: number) => {
    onModifyGold(-price);
    onSpendTime(1);

    if (item.id === 'lottery-ticket') {
      // 10% chance to win big
      if (Math.random() < 0.1) {
        onModifyGold(200);
        onModifyHappiness(20);
        toast.success('JACKPOT! You won 200 gold!');
      } else if (Math.random() < 0.3) {
        onModifyGold(20);
        onModifyHappiness(5);
        toast.success('Small win! You got 20 gold back.');
      } else {
        toast.error('Better luck next time...');
      }
    } else {
      if (item.effect?.type === 'food') {
        onModifyFood(item.effect.value);
      }
      if (item.effect?.type === 'happiness') {
        onModifyHappiness(item.effect.value);
      }
      toast.success(`Purchased ${item.name}!`);
    }
  };

  return (
    <JonesPanel>
      <JonesPanelHeader title="Shadow Market" subtitle="Discount Goods" />
      <JonesPanelContent>
        <JonesSectionHeader title="BLACK MARKET GOODS" />
        {SHADOW_MARKET_ITEMS.map(item => {
          const price = Math.round(getItemPrice(item, priceModifier * 0.7)); // 30% cheaper
          const canAfford = player.gold >= price && player.timeRemaining >= 1;
          return (
            <JonesMenuItem
              key={item.id}
              label={item.name}
              price={price}
              disabled={!canAfford}
              onClick={() => handleBuyItem(item, price)}
            />
          );
        })}

        <JonesSectionHeader title="USED MAGICAL ITEMS" />
        <div className="text-xs text-[#a09080] px-2 mb-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Higher break chance (1/36)
        </div>
        {appliances.map(appliance => {
          const price = Math.round((appliance.marketPrice || 0) * priceModifier);
          const alreadyOwns = !!player.appliances[appliance.id];
          const canAfford = player.gold >= price && player.timeRemaining >= 1;
          const isFirstPurchase = !player.applianceHistory.includes(appliance.id);
          const happinessNote = isFirstPurchase && appliance.happinessMarket > 0
            ? ` (+${appliance.happinessMarket} Hap)`
            : '';

          return (
            <JonesMenuItem
              key={appliance.id}
              label={`${appliance.name}${happinessNote}`}
              price={price}
              disabled={!canAfford || alreadyOwns}
              highlight={alreadyOwns}
              onClick={() => handleBuyAppliance(appliance.id, price)}
            />
          );
        })}
        <div className="mt-2 text-xs text-[#8b7355] px-2">
          1 hour per purchase
        </div>
      </JonesPanelContent>
    </JonesPanel>
  );
}
