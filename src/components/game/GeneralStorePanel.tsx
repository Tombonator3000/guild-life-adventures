import type { Player } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
} from './JonesStylePanel';
import { GENERAL_STORE_ITEMS, getItemPrice, getItem } from '@/data/items';
import { NEWSPAPER_COST, NEWSPAPER_TIME } from '@/data/newspaper';
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
  const { t } = useTranslation();
  const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);
  const lotteryPrice = Math.round(10 * priceModifier);

  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  const hasFrostChest = player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken;
  const maxFreshFood = hasFrostChest ? 12 : hasPreservationBox ? 6 : 0;

  return (
    <div>
      <JonesSectionHeader title={t('panelStore.food')} />
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
              modifyGold(player.id, -price);
              if (item.effect?.type === 'food') {
                modifyFood(player.id, item.effect.value);
              }
              toast.success(t('panelStore.purchased', { name: t(`items.${item.id}.name`) || item.name }));
            }}
          />
        );
      })}

      {/* Fresh Food Section - only show if player has Preservation Box */}
      {hasPreservationBox && (
        <>
          <JonesSectionHeader title={t('panelStore.freshFood')} />
          <JonesInfoRow label={t('panelStore.freshFoodStored')} value={`${player.freshFood}/${maxFreshFood}`} darkText largeText />
          {GENERAL_STORE_ITEMS.filter(item => item.isFreshFood).map(item => {
            const price = getItemPrice(item, priceModifier);
            const units = item.freshFoodUnits || 0;
            const spaceLeft = maxFreshFood - player.freshFood;
            const canAfford = player.gold >= price && spaceLeft > 0;
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
                  buyFreshFood(player.id, units, price);
                  toast.success(t('panelStore.storedFreshFood', { units: Math.min(units, spaceLeft) }));
                }}
              />
            );
          })}
          <div className="text-xs text-[#6b5a42] px-2 mb-1">
            {t('panelStore.preservationRequired')}
          </div>
        </>
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
