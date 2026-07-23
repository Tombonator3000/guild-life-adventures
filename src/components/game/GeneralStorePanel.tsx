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
import { useGameStore } from '@/store/gameStore';

interface GeneralStorePanelProps {
  player: Player;
  priceModifier: number;
}

export function GeneralStorePanel({
  player,
  priceModifier,
}: GeneralStorePanelProps) {
  const { t } = useTranslation();
  const purchaseNewspaper = useGameStore(s => s.purchaseNewspaper);
  const purchaseVendorItem = useGameStore(s => s.purchaseVendorItem);
  const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);
  const lotteryPrice = Math.round(10 * priceModifier);

  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  const hasFrostChest = player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken;
  const maxFreshFood = hasFrostChest ? 12 : 6;

  const handlePurchase = (itemId: string, successMessage: string) => {
    const result = purchaseVendorItem(player.id, 'general-store', itemId);
    if (!result) return;
    if (result.success) toast.success(successMessage);
    else toast.error(result.message);
  };

  return (
    <div>
      <JonesSectionHeader title={t('panelStore.food')} />
      {GENERAL_STORE_ITEMS.filter(item => item.effect?.type === 'food' && !item.isFreshFood).map(item => {
        const price = getItemPrice(item, priceModifier);
        const canAfford = player.gold >= price;
        const itemName = t(`items.${item.id}.name`) || item.name;
        return (
          <JonesMenuItem
            key={item.id}
            label={itemName}
            price={price}
            disabled={!canAfford}
            darkText
            largeText
            previewData={itemToPreview(item)}
            onClick={() => handlePurchase(
              item.id,
              t('panelStore.purchased', { name: itemName }),
            )}
          />
        );
      })}

      <JonesSectionHeader title={t('panelStore.freshFood')} />
      {hasPreservationBox && (
        <JonesInfoRow label={t('panelStore.freshFoodStored')} value={`${player.freshFood}/${maxFreshFood}`} darkText largeText />
      )}
      {GENERAL_STORE_ITEMS.filter(item => item.isFreshFood).map(item => {
        const price = getItemPrice(item, priceModifier);
        const units = item.freshFoodUnits || 0;
        const spaceLeft = maxFreshFood - player.freshFood;
        const canAfford = player.gold >= price && spaceLeft > 0;
        const itemName = t(`items.${item.id}.name`) || item.name;
        return (
          <JonesMenuItem
            key={item.id}
            label={`${itemName} (+${units})`}
            price={price}
            disabled={!canAfford}
            darkText
            largeText
            previewData={itemToPreview(item)}
            onClick={() => handlePurchase(
              item.id,
              t('panelStore.storedFreshFood', { units: Math.min(units, spaceLeft) }),
            )}
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
        label={t('panelStore.newspaper')}
        price={newspaperPrice}
        disabled={player.gold < newspaperPrice || player.hasNewspaper}
        darkText
        largeText
        previewData={{
          name: 'The Guildholm Herald',
          description: 'The latest news, job listings, and town gossip. Essential reading for the ambitious adventurer.',
          category: 'Information',
          tags: ['News'],
          effect: player.hasNewspaper ? 'Already purchased this week' : 'View personalized weekly headlines',
        }}
        onClick={() => {
          const result = purchaseNewspaper(player.id, 'general-store');
          if (result?.success) {
            toast.success(t('panelStore.purchased', { name: t('panelStore.newspaper') }));
          } else if (result && !result.success) {
            toast.error(result.message);
          }
        }}
      />
      <JonesMenuItem
        label={t('items.lottery-ticket.name') || "Fortune's Wheel Ticket"}
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
        onClick={() => handlePurchase(
          'lottery-ticket',
          t('panelStore.purchased', { name: t('items.lottery-ticket.name') }),
        )}
      />
      {player.lotteryTickets > 0 && (
        <JonesInfoRow label={t('panelShadowMarket.lotteryTickets') + ':'} value={`${player.lotteryTickets}`} darkText largeText />
      )}
    </div>
  );
}
