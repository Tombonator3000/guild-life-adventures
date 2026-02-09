import type { Player } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
} from './JonesStylePanel';
import { GENERAL_STORE_ITEMS, getItemPrice } from '@/data/items';
import { NEWSPAPER_COST, NEWSPAPER_TIME } from '@/data/newspaper';
import { toast } from 'sonner';

interface GeneralStorePanelProps {
  player: Player;
  priceModifier: number;
  modifyGold: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  onBuyNewspaper: () => void;
  buyFreshFood: (playerId: string, units: number, cost: number) => void;
  buyLotteryTicket: (playerId: string, cost: number) => void;
}

export function GeneralStorePanel({
  player,
  priceModifier,
  modifyGold,
  spendTime,
  modifyFood,
  modifyHappiness,
  onBuyNewspaper,
  buyFreshFood,
  buyLotteryTicket,
}: GeneralStorePanelProps) {
  const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);
  const lotteryPrice = Math.round(10 * priceModifier);

  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  const hasFrostChest = player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken;
  const maxFreshFood = hasFrostChest ? 12 : hasPreservationBox ? 6 : 0;

  return (
    <div>
      <JonesSectionHeader title="FOOD & PROVISIONS" />
      {GENERAL_STORE_ITEMS.filter(item => item.effect?.type === 'food' && !item.isFreshFood).map(item => {
        const price = getItemPrice(item, priceModifier);
        const canAfford = player.gold >= price;
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
              if (item.effect?.type === 'food') {
                modifyFood(player.id, item.effect.value);
              }
              toast.success(`Purchased ${item.name}`);
            }}
          />
        );
      })}

      {/* Fresh Food Section - only show if player has Preservation Box */}
      {hasPreservationBox && (
        <>
          <JonesSectionHeader title="FRESH FOOD (STORED)" />
          <JonesInfoRow label="Stored:" value={`${player.freshFood}/${maxFreshFood} units`} darkText largeText />
          {GENERAL_STORE_ITEMS.filter(item => item.isFreshFood).map(item => {
            const price = getItemPrice(item, priceModifier);
            const units = item.freshFoodUnits || 0;
            const spaceLeft = maxFreshFood - player.freshFood;
            const canAfford = player.gold >= price && spaceLeft > 0;
            return (
              <JonesMenuItem
                key={item.id}
                label={`${item.name} (+${units} units)`}
                price={price}
                disabled={!canAfford}
                darkText
                largeText
                onClick={() => {
                  buyFreshFood(player.id, units, price);
                  toast.success(`Stored ${Math.min(units, spaceLeft)} fresh food units!`);
                }}
              />
            );
          })}
          <div className="text-xs text-[#6b5a42] px-2 mb-1">
            Fresh food prevents starvation when regular food runs out. Spoils if Preservation Box breaks.
          </div>
        </>
      )}

      <JonesSectionHeader title="OTHER GOODS" />
      <JonesMenuItem
        label="Newspaper"
        price={newspaperPrice}
        disabled={player.gold < newspaperPrice}
        darkText
        largeText
        onClick={onBuyNewspaper}
      />
      <JonesMenuItem
        label="Fortune's Wheel Ticket"
        price={lotteryPrice}
        disabled={player.gold < lotteryPrice}
        darkText
        largeText
        onClick={() => {
          buyLotteryTicket(player.id, lotteryPrice);
          toast.success(`Bought Fortune's Wheel ticket! (${player.lotteryTickets + 1} tickets this week)`);
        }}
      />
      {player.lotteryTickets > 0 && (
        <JonesInfoRow label="Tickets this week:" value={`${player.lotteryTickets}`} darkText largeText />
      )}
    </div>
  );
}
