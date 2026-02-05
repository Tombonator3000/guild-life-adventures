// Shadow Market Panel - Z-Mart equivalent
// Sells used/cheaper appliances with higher break chance

import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getMarketAppliances, getAppliance, SHADOW_MARKET_ITEMS, getItemPrice } from '@/data/items';
import { ShoppingBag, Sparkles, AlertTriangle } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { toast } from 'sonner';

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
    <div className="space-y-4">
      {/* Black Market Goods */}
      <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2">
        <ShoppingBag className="w-4 h-4" /> Black Market Goods
      </h4>
      <div className="space-y-2">
        {SHADOW_MARKET_ITEMS.map(item => {
          const price = Math.round(getItemPrice(item, priceModifier * 0.7)); // 30% cheaper
          return (
            <button
              key={item.id}
              onClick={() => handleBuyItem(item, price)}
              disabled={player.gold < price || player.timeRemaining < 1}
              className="w-full p-2 wood-frame text-card flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span className="font-display font-semibold">{item.name}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gold">-{price}g</span>
                <span className="text-time">1h</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Used Appliances */}
      <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mt-4">
        <Sparkles className="w-4 h-4" /> Used Magical Items
      </h4>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-warning" />
        Cheaper, but higher break chance (1/36 per turn)
      </p>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {appliances.map(appliance => {
          const price = Math.round((appliance.marketPrice || 0) * priceModifier);
          const alreadyOwns = !!player.appliances[appliance.id];
          const isFirstPurchase = !player.applianceHistory.includes(appliance.id);
          const enchanterPrice = Math.round(appliance.enchanterPrice * priceModifier);
          const savings = enchanterPrice > 0 ? enchanterPrice - price : 0;

          return (
            <div key={appliance.id} className="wood-frame p-2 text-card">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="font-display font-semibold text-sm">{appliance.name}</span>
                  {alreadyOwns && (
                    <span className="ml-2 text-xs text-secondary">(Owned)</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-gold font-bold">{price}g</span>
                  {savings > 0 && (
                    <div className="text-xs text-secondary">Save {savings}g!</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs">
                  {isFirstPurchase && appliance.happinessMarket > 0 && (
                    <span className="text-secondary">+{appliance.happinessMarket} Happiness</span>
                  )}
                </div>
                <button
                  onClick={() => handleBuyAppliance(appliance.id, price)}
                  disabled={player.gold < price || player.timeRemaining < 1 || alreadyOwns}
                  className="gold-button text-xs py-1 px-2 disabled:opacity-50"
                >
                  {alreadyOwns ? 'Owned' : 'Buy (1h)'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
