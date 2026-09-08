import { useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
} from './JonesStylePanel';
import { GENERAL_STORE_ITEMS, getItemPrice } from '@/data/items';
import { NEWSPAPER_COST, generateNewspaper } from '@/data/newspaper';
import { PLAYER_RULE_TEXT, PLAYER_RULE_VALUES } from '@/data/playerFacingRules';
import { itemToPreview } from './ItemPreview';
import { NewspaperModal } from './NewspaperModal';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { useGameStore } from '@/store/gameStore';

interface GeneralStorePanelProps {
  player: Player;
  priceModifier: number;
}

export function GeneralStorePanel({ player, priceModifier }: GeneralStorePanelProps) {
  const { t } = useTranslation();
  const purchaseNewspaper = useGameStore(state => state.purchaseNewspaper);
  const purchaseVendorItem = useGameStore(state => state.purchaseVendorItem);
  const week = useGameStore(state => state.week);
  const economyTrend = useGameStore(state => state.economyTrend);
  const weeklyNewsEvents = useGameStore(state => state.weeklyNewsEvents);
  const players = useGameStore(state => state.players);
  const weather = useGameStore(state => state.weather);
  const activeFestival = useGameStore(state => state.activeFestival);
  const [showNewspaper, setShowNewspaper] = useState(false);
  const previousHasNewspaper = useRef(player.hasNewspaper);
  const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);
  const lotteryPrice = Math.round(10 * priceModifier);

  const newspaper = useMemo(
    () => generateNewspaper(week, priceModifier, economyTrend, weeklyNewsEvents, {players,weather,activeFestival}),
    [week, priceModifier, economyTrend, weeklyNewsEvents, players, weather, activeFestival],
  );

  useEffect(() => {
    const newlyOwned = !previousHasNewspaper.current && player.hasNewspaper;
    previousHasNewspaper.current = player.hasNewspaper;
    if (newlyOwned) setShowNewspaper(true);
  }, [player.hasNewspaper]);

  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  const hasFrostChest = player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken;
  const maxFreshFood = hasFrostChest ? PLAYER_RULE_VALUES.frostChestCapacity : PLAYER_RULE_VALUES.freshFoodCapacity;

  const handlePurchase = (itemId: string, successMessage: string) => {
    const result = purchaseVendorItem(player.id, 'general-store', itemId);
    if (!result) return;
    if (result.success) toast.success(successMessage);
    else toast.error(result.message);
  };

  const handleNewspaper = () => {
    if (player.hasNewspaper) {
      setShowNewspaper(true);
      return;
    }
    const result = purchaseNewspaper(player.id, 'general-store');
    if (result?.success) toast.success(t('panelStore.purchased', { name: t('panelStore.newspaper') }));
    else if (result && !result.success) toast.error(result.message);
  };

  return (
    <>
      <div>
        <JonesSectionHeader title={t('panelStore.food')} />
        {GENERAL_STORE_ITEMS.filter(item => item.effect?.type === 'food' && !item.isFreshFood).map(item => {
          const price = getItemPrice(item, priceModifier);
          const itemName = t(`items.${item.id}.name`) || item.name;
          return <JonesMenuItem key={item.id} label={itemName} price={price} disabled={player.gold < price} darkText largeText previewData={itemToPreview(item)} actionPreview={{ hours: 0, goldAfter: player.gold - price, effect: item.isFreshFood ? `${Math.min(maxFreshFood, player.freshFood + (item.freshFoodUnits ?? 0))}/${maxFreshFood} supplies` : `Food ${Math.min(100, player.foodLevel + (item.effect?.value ?? 0))}%`, blockedReason: player.gold < price ? `Needs ${price}g; you have ${player.gold}g.` : item.isFreshFood && player.freshFood >= maxFreshFood ? 'Fresh-food storage is full.' : undefined }} onClick={() => handlePurchase(item.id, t('panelStore.purchased', { name: itemName }))} />;
        })}

        <JonesSectionHeader title={t('panelStore.freshFood')} />
        {hasPreservationBox && <JonesInfoRow label={t('panelStore.freshFoodStored')} value={`${player.freshFood}/${maxFreshFood}`} darkText largeText />}
        {GENERAL_STORE_ITEMS.filter(item => item.isFreshFood).map(item => {
          const price = getItemPrice(item, priceModifier);
          const units = item.freshFoodUnits || 0;
          const spaceLeft = maxFreshFood - player.freshFood;
          const itemName = t(`items.${item.id}.name`) || item.name;
          return <JonesMenuItem key={item.id} label={`${itemName} (+${units})`} price={price} disabled={player.gold < price || spaceLeft <= 0} darkText largeText previewData={itemToPreview(item)} actionPreview={{ hours: 0, goldAfter: player.gold - price, effect: item.isFreshFood ? `${Math.min(maxFreshFood, player.freshFood + (item.freshFoodUnits ?? 0))}/${maxFreshFood} supplies` : `Food ${Math.min(100, player.foodLevel + (item.effect?.value ?? 0))}%`, blockedReason: player.gold < price ? `Needs ${price}g; you have ${player.gold}g.` : item.isFreshFood && player.freshFood >= maxFreshFood ? 'Fresh-food storage is full.' : undefined }} onClick={() => handlePurchase(item.id, t('panelStore.storedFreshFood', { units: Math.min(units, spaceLeft) }))} />;
        })}
        {!hasPreservationBox && <div className="text-xs text-[#6b5a42] px-2 mb-1">Without a working Preservation Box, fresh food may spoil at turn end.</div>}

        <JonesSectionHeader title={t('panelStore.durables')} />
        <JonesMenuItem
          label={player.hasNewspaper ? 'Read The Guildholm Herald' : t('panelStore.newspaper')}
          price={player.hasNewspaper ? undefined : newspaperPrice}
          disabled={!player.hasNewspaper && player.gold < newspaperPrice}
          darkText
          largeText
          previewData={{
            name: 'The Guildholm Herald',
            description: PLAYER_RULE_TEXT.newspaper,
            category: 'Information',
            tags: ['News'],
            effect: player.hasNewspaper ? 'Read again at no additional cost' : 'Purchase and open this week’s personalized edition',
          }}
          onClick={handleNewspaper}
        />
        <JonesMenuItem
          label={t('items.lottery-ticket.name') || "Fortune's Wheel Ticket"}
          price={lotteryPrice}
          disabled={player.gold < lotteryPrice}
          darkText
          largeText
          previewData={{
            name: "Fortune's Wheel Ticket",
            description: PLAYER_RULE_TEXT.lottery,
            category: 'Lottery',
            tags: ['Lottery'],
            effect: `Grand prize: ${PLAYER_RULE_VALUES.lotteryGrandPrize}g`,
          }}
          onClick={() => handlePurchase('lottery-ticket', t('panelStore.purchased', { name: t('items.lottery-ticket.name') }))}
        />
        {player.lotteryTickets > 0 && <JonesInfoRow label={t('panelShadowMarket.lotteryTickets') + ':'} value={`${player.lotteryTickets}`} darkText largeText />}
      </div>
      <NewspaperModal newspaper={showNewspaper ? newspaper : null} onClose={() => setShowNewspaper(false)} />
    </>
  );
}
