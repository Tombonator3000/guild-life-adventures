import { useEffect, useMemo, useRef, useState } from 'react';
import type { Player, PlayerNewsEventData } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
} from './JonesStylePanel';
import { GENERAL_STORE_ITEMS, getItemPrice } from '@/data/items';
import { NEWSPAPER_COST, generateNewspaper } from '@/data/newspaper';
import type { Newspaper } from '@/data/newspaper';
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

const newspaperCache = new Map<string, Newspaper>();

function getWeeklyNewspaper(
  playerId: string,
  week: number,
  priceModifier: number,
  economyTrend: number,
  weeklyNewsEvents: PlayerNewsEventData[],
): Newspaper {
  const eventKey = JSON.stringify(weeklyNewsEvents);
  const key = `${playerId}:${week}:${priceModifier.toFixed(4)}:${economyTrend}:${eventKey}`;
  const cached = newspaperCache.get(key);
  if (cached) return cached;
  const generated = generateNewspaper(week, priceModifier, economyTrend, weeklyNewsEvents);
  newspaperCache.set(key, generated);
  return generated;
}

export function GeneralStorePanel({ player, priceModifier }: GeneralStorePanelProps) {
  const { t } = useTranslation();
  const purchaseNewspaper = useGameStore(state => state.purchaseNewspaper);
  const purchaseVendorItem = useGameStore(state => state.purchaseVendorItem);
  const week = useGameStore(state => state.week);
  const economyTrend = useGameStore(state => state.economyTrend);
  const weeklyNewsEvents = useGameStore(state => state.weeklyNewsEvents);
  const [showNewspaper, setShowNewspaper] = useState(false);
  const previousHasNewspaper = useRef(player.hasNewspaper);
  const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);
  const lotteryPrice = Math.round(10 * priceModifier);

  const newspaper = useMemo(
    () => getWeeklyNewspaper(player.id, week, priceModifier, economyTrend, weeklyNewsEvents),
    [player.id, week, priceModifier, economyTrend, weeklyNewsEvents],
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
          return <JonesMenuItem key={item.id} label={itemName} price={price} disabled={player.gold < price} darkText largeText previewData={itemToPreview(item)} onClick={() => handlePurchase(item.id, t('panelStore.purchased', { name: itemName }))} />;
        })}

        <JonesSectionHeader title={t('panelStore.freshFood')} />
        {hasPreservationBox && <JonesInfoRow label={t('panelStore.freshFoodStored')} value={`${player.freshFood}/${maxFreshFood}`} darkText largeText />}
        {GENERAL_STORE_ITEMS.filter(item => item.isFreshFood).map(item => {
          const price = getItemPrice(item, priceModifier);
          const units = item.freshFoodUnits || 0;
          const spaceLeft = maxFreshFood - player.freshFood;
          const itemName = t(`items.${item.id}.name`) || item.name;
          return <JonesMenuItem key={item.id} label={`${itemName} (+${units})`} price={price} disabled={player.gold < price || spaceLeft <= 0} darkText largeText previewData={itemToPreview(item)} onClick={() => handlePurchase(item.id, t('panelStore.storedFreshFood', { units: Math.min(units, spaceLeft) }))} />;
        })}
        {!hasPreservationBox && <div className="text-xs text-[#6b5a42] px-2 mb-1">Fresh food requires a working Preservation Box.</div>}

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
