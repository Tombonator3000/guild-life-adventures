import type { Player } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
} from './JonesStylePanel';
import { GENERAL_STORE_ITEMS, getItemPrice } from '@/data/items';
import { NEWSPAPER_COST } from '@/data/newspaper';
import { itemToPreview } from './ItemPreview';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

interface GeneralStorePanelProps {
  player: Player;
  priceModifier: number;
  modifyGold: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  onBuyNewspaper: () => void;
  buyFreshFood: (playerId: string, units: number, cost: number) => boolean;
  buyFoodWithSpoilage: (playerId: string, foodValue: number, cost: number) => boolean;
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
  buyFoodWithSpoilage,
  buyLotteryTicket,
}: GeneralStorePanelProps) {
  const { t } = useTranslation();
  const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);
  const lotteryPrice = Math.round(10 * priceModifier);

  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  const hasFrostChest = player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken;
  const maxFreshFood = hasFrostChest ? 12 : hasPreservationBox ? 6 : 6;

  return (
    <div>
      <JonesSectionHeader title={t('panelStore.food')} />
      {!hasPreservationBox && (
        <div className="text-xs text-red-800 bg-red-100/80 px-2 py-1 mb-1 rounded border border-red-200">
          ⚠ Without a Preservation Box, food has an 80% chance of spoiling!
        </div>
      )}
      {GENERAL_STORE_ITEMS.filter(item => item.effect?.type === 'food' && !item.isFreshFood).map(item => {
        const price = getItemPrice(item, priceModifier);
        const canAfford = player.gold >= price;
        return (
          <JonesMenuItem
            key={item.id}
            label={t(`items.${item.id}.name`) || item.name}
            price={price}
            disabled={!canAfford}
            darkText
            largeText
            previewData={itemToPreview(item)}
            onClick={() => {
              const spoiled = buyFoodWithSpoilage(player.id, item.effect!.value, price);
              if (spoiled) {
                toast.error(`${t(`items.${item.id}.name`) || item.name} spoiled! ${price}g wasted. Get a Preservation Box!`);
              } else {
                toast.success(t('panelStore.purchased', { name: t(`items.${item.id}.name`) || item.name }));
              }
            }}
          />
        );
      })}

      {/* Fresh Food Section - always shown, with spoilage warning when no box */}
      <JonesSectionHeader title={t('panelStore.freshFood')} />
      {hasPreservationBox ? (
        <JonesInfoRow label={t('panelStore.freshFoodStored')} value={`${player.freshFood}/${maxFreshFood}`} darkText largeText />
      ) : (
        <div className="text-xs text-red-800 bg-red-100/80 px-2 py-1 mb-1 rounded border border-red-200">
          ⚠ No Preservation Box! Fresh food will almost certainly spoil (80% on purchase + spoils at turn start).
        </div>
      )}
      {GENERAL_STORE_ITEMS.filter(item => item.isFreshFood).map(item => {
        const price = getItemPrice(item, priceModifier);
        const units = item.freshFoodUnits || 0;
        const spaceLeft = maxFreshFood - player.freshFood;
        const canAfford = player.gold >= price && (hasPreservationBox ? spaceLeft > 0 : true);
        return (
          <JonesMenuItem
            key={item.id}
            label={`${t(`items.${item.id}.name`) || item.name} (+${units})`}
            price={price}
            disabled={!canAfford}
            darkText
            largeText
            previewData={itemToPreview(item)}
            onClick={() => {
              const spoiled = buyFreshFood(player.id, units, price);
              if (spoiled) {
                toast.error(`Fresh food spoiled immediately! ${price}g wasted. Get a Preservation Box!`);
              } else {
                toast.success(t('panelStore.storedFreshFood', { units: Math.min(units, spaceLeft) }));
              }
            }}
          />
        );
      })}
      {hasPreservationBox && (
        <div className="text-xs text-[#6b5a42] px-2 mb-1">
          {t('panelStore.preservationRequired')}
        </div>
      )}

      <JonesSectionHeader title={t('panelStore.durables')} />
      <JonesMenuItem
        label={t(`items.lottery-ticket.name`) || "Fortune's Wheel Ticket"}
        price={lotteryPrice}
        disabled={player.gold < lotteryPrice}
        darkText
        largeText
        previewData={{
          name: "Fortune's Wheel Ticket",
          description: 'Weekly lottery drawing. More tickets = better odds! Grand prize: 5,000g.',
          category: 'Lottery',
          tags: ['Lottery'],
          effect: 'Grand Prize: 5,000g',
        }}
        onClick={() => {
          buyLotteryTicket(player.id, lotteryPrice);
          toast.success(t('panelStore.purchased', { name: t(`items.lottery-ticket.name`) }));
        }}
      />
      {player.lotteryTickets > 0 && (
        <JonesInfoRow label={t('panelShadowMarket.lotteryTickets') + ':'} value={`${player.lotteryTickets}`} darkText largeText />
      )}
    </div>
  );
}
