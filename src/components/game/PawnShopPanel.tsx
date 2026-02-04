// Guild Life - The Fence (Pawn Shop) Panel

import { Coins, ShoppingBag, Dices, Package } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { getItem } from '@/data/items';

interface PawnShopPanelProps {
  player: Player;
  priceModifier: number;
  onSellItem: (itemId: string, price: number) => void;
  onBuyUsedItem: (itemId: string, price: number) => void;
  onGamble: (stake: number) => void;
}

// Used items available at the pawn shop (discounted)
const USED_ITEMS = [
  { id: 'used-sword', name: 'Used Sword', basePrice: 40, originalId: 'sword' },
  { id: 'used-clothes', name: 'Worn Clothes', basePrice: 30, effect: { type: 'clothing' as const, value: 50 } },
  { id: 'used-shield', name: 'Dented Shield', basePrice: 20, originalId: 'shield' },
  { id: 'used-blanket', name: 'Patched Blanket', basePrice: 12, effect: { type: 'happiness' as const, value: 3 } },
];

export function PawnShopPanel({ player, priceModifier, onSellItem, onBuyUsedItem, onGamble }: PawnShopPanelProps) {
  // Calculate sell prices (50% of original value)
  const getSellPrice = (itemId: string): number => {
    const item = getItem(itemId);
    if (!item) return 5; // Minimum sell price
    return Math.max(5, Math.round(item.basePrice * 0.5 * priceModifier));
  };

  return (
    <div className="space-y-4">
      {/* Sell Items Section */}
      {player.inventory.length > 0 && (
        <div>
          <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
            <Package className="w-4 h-4" /> Sell Your Items
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {player.inventory.map((itemId, index) => {
              const item = getItem(itemId);
              const sellPrice = getSellPrice(itemId);
              return (
                <button
                  key={`${itemId}-${index}`}
                  onClick={() => onSellItem(itemId, sellPrice)}
                  disabled={player.timeRemaining < 1}
                  className="w-full p-2 wood-frame text-card flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <span className="font-display font-semibold">{item?.name || itemId}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-secondary">+{sellPrice}g</span>
                    <span className="text-time">1h</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Buy Used Items Section */}
      <div>
        <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
          <ShoppingBag className="w-4 h-4" /> Used Goods
        </h4>
        <div className="space-y-2">
          {USED_ITEMS.map(item => {
            const price = Math.round(item.basePrice * priceModifier * 0.8); // Extra discount at pawn shop
            return (
              <button
                key={item.id}
                onClick={() => onBuyUsedItem(item.id, price)}
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
      </div>

      {/* Gambling Section */}
      <div>
        <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
          <Dices className="w-4 h-4" /> Games of Chance
        </h4>
        <div className="space-y-2">
          <button
            onClick={() => onGamble(10)}
            disabled={player.gold < 10 || player.timeRemaining < 2}
            className="w-full p-2 wood-frame text-card flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <div className="flex items-center gap-2">
              <Dices className="w-4 h-4" />
              <span className="font-display font-semibold">Low Stakes (10g)</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">40% win: +25g</span>
              <span className="text-time">2h</span>
            </div>
          </button>

          <button
            onClick={() => onGamble(50)}
            disabled={player.gold < 50 || player.timeRemaining < 2}
            className="w-full p-2 wood-frame text-card flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <div className="flex items-center gap-2">
              <Dices className="w-4 h-4" />
              <span className="font-display font-semibold">High Stakes (50g)</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">30% win: +150g</span>
              <span className="text-time">2h</span>
            </div>
          </button>

          <button
            onClick={() => onGamble(100)}
            disabled={player.gold < 100 || player.timeRemaining < 3}
            className="w-full p-2 wood-frame text-card flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <div className="flex items-center gap-2">
              <Dices className="w-4 h-4" />
              <span className="font-display font-semibold">All or Nothing (100g)</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">20% win: +400g</span>
              <span className="text-time">3h</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
