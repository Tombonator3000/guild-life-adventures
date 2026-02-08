import type { Player } from '@/types/game.types';
import {
  JonesMenuItem,
  JonesSectionHeader,
} from './JonesStylePanel';
import { TAVERN_ITEMS, getItemPrice } from '@/data/items';
import { toast } from 'sonner';

interface TavernPanelProps {
  player: Player;
  priceModifier: number;
  modifyGold: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
}

export function TavernPanel({
  player,
  priceModifier,
  modifyGold,
  spendTime,
  modifyFood,
  modifyHappiness,
}: TavernPanelProps) {
  return (
    <div>
      <div className="space-y-1">
        {TAVERN_ITEMS.map(item => {
          const price = getItemPrice(item, priceModifier);
          const canAfford = player.gold >= price && player.timeRemaining >= 1;
          return (
            <JonesMenuItem
              key={item.id}
              label={item.name}
              price={price}
              disabled={!canAfford}
              darkText
              largeText
              onClick={() => {
                modifyGold(player.id, -price);
                spendTime(player.id, 1);
                if (item.effect?.type === 'food') {
                  modifyFood(player.id, item.effect.value);
                }
                if (item.effect?.type === 'happiness') {
                  modifyHappiness(player.id, item.effect.value);
                }
                toast.success(`Purchased ${item.name}`);
              }}
            />
          );
        })}
      </div>
      <div className="mt-3 text-sm text-[#6b5a42] px-2">
        1 hour per purchase
      </div>
    </div>
  );
}
