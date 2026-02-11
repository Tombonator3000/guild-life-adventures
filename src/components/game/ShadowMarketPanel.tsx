// Shadow Market Panel - Z-Mart equivalent
// Sells used/cheaper appliances with higher break chance
// Also sells lottery tickets (Fortune's Wheel) and weekend event tickets

import { useGameStore } from '@/store/gameStore';
import { getMarketAppliances, getAppliance, SHADOW_MARKET_ITEMS, ACADEMY_ITEMS, getItemPrice } from '@/data/items';
import { AlertTriangle, BookOpen } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { toast } from 'sonner';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
} from './JonesStylePanel';
import { useTranslation } from '@/i18n';

export type ShadowMarketSection = 'goods' | 'lottery' | 'tickets' | 'appliances' | 'scholar';

interface ShadowMarketPanelProps {
  player: Player;
  priceModifier: number;
  onSpendTime: (hours: number) => void;
  onModifyGold: (amount: number) => void;
  onModifyHappiness: (amount: number) => void;
  onModifyFood: (amount: number) => void;
  buyLotteryTicket: (playerId: string, cost: number) => void;
  buyTicket: (playerId: string, ticketType: string, cost: number) => void;
  section?: ShadowMarketSection;
}

export function ShadowMarketPanel({
  player,
  priceModifier,
  onSpendTime,
  onModifyGold,
  onModifyHappiness,
  onModifyFood,
  buyLotteryTicket,
  buyTicket,
  section,
}: ShadowMarketPanelProps) {
  const { t } = useTranslation();
  const { buyAppliance, buyDurable } = useGameStore();
  const appliances = getMarketAppliances();

  const handleBuyAppliance = (applianceId: string, price: number) => {
    const happinessGain = buyAppliance(player.id, applianceId, price, 'market');
    const appliance = getAppliance(applianceId);
    const applianceName = t(`appliances.${applianceId}.name`) || appliance?.name;
    if (happinessGain > 0) {
      toast.success(t('panelStore.purchased', { name: applianceName }) + ` +${happinessGain} Happiness`);
    } else {
      toast.success(t('panelStore.purchased', { name: applianceName }));
    }
  };

  const handleBuyItem = (item: typeof SHADOW_MARKET_ITEMS[0], price: number) => {
    const itemName = t(`items.${item.id}.name`) || item.name;

    if (item.isLotteryTicket) {
      buyLotteryTicket(player.id, price);
      toast.success(t('panelStore.purchased', { name: itemName }) + ` (${player.lotteryTickets + 1} tickets for this week)`);
      return;
    }

    if (item.isTicket && item.ticketType) {
      if (player.tickets.includes(item.ticketType)) {
        toast.error('You already have this ticket!');
        return;
      }
      buyTicket(player.id, item.ticketType, price);
      toast.success(t('panelStore.purchased', { name: itemName }));
      return;
    }

    onModifyGold(-price);

    if (item.effect?.type === 'food') {
      onModifyFood(item.effect.value);
    }
    if (item.effect?.type === 'happiness') {
      onModifyHappiness(item.effect.value);
    }
    toast.success(t('panelStore.purchased', { name: itemName }));
  };

  // Separate items by type for better organization
  const regularItems = SHADOW_MARKET_ITEMS.filter(i => !i.isLotteryTicket && !i.isTicket);
  const lotteryItems = SHADOW_MARKET_ITEMS.filter(i => i.isLotteryTicket);
  const ticketItems = SHADOW_MARKET_ITEMS.filter(i => i.isTicket);

  // In tabbed mode, use dark text on light parchment background
  const darkText = !!section;
  const largeText = !!section;

  const footerNote = null;

  const renderGoods = () => (
    <>
      {regularItems.map(item => {
        const price = Math.round(getItemPrice(item, priceModifier * 0.7));
        const canAfford = player.gold >= price;
        return (
          <JonesMenuItem
            key={item.id}
            label={t(`items.${item.id}.name`) || item.name}
            price={price}
            disabled={!canAfford}
            onClick={() => handleBuyItem(item, price)}
            darkText={darkText}
            largeText={largeText}
          />
        );
      })}
    </>
  );

  const renderLottery = () => (
    <>
      {player.lotteryTickets > 0 && (
        <JonesInfoRow label={t('panelShadowMarket.lotteryTickets') + ':'} value={`${player.lotteryTickets}`} darkText={darkText} largeText={largeText} />
      )}
      {lotteryItems.map(item => {
        const price = Math.round(getItemPrice(item, priceModifier * 0.7));
        const canAfford = player.gold >= price;
        return (
          <JonesMenuItem
            key={item.id}
            label={t(`items.${item.id}.name`) || item.name}
            price={price}
            disabled={!canAfford}
            onClick={() => handleBuyItem(item, price)}
            darkText={darkText}
            largeText={largeText}
          />
        );
      })}
      <div className={`text-xs ${darkText ? 'text-[#6b5a42]' : 'text-[#8b7355]'} px-2 mb-1`}>
        Drawing at week end. Grand prize: 5,000g!
      </div>
    </>
  );

  const renderTickets = () => (
    <>
      {ticketItems.map(item => {
        const price = Math.round(getItemPrice(item, priceModifier * 0.7));
        const canAfford = player.gold >= price;
        const alreadyOwns = item.ticketType ? player.tickets.includes(item.ticketType) : false;
        return (
          <JonesMenuItem
            key={item.id}
            label={t(`items.${item.id}.name`) || item.name}
            price={price}
            disabled={!canAfford || alreadyOwns}
            highlight={alreadyOwns}
            onClick={() => handleBuyItem(item, price)}
            darkText={darkText}
            largeText={largeText}
          />
        );
      })}
    </>
  );

  const renderScholarItems = () => (
    <>
      <div className={`text-xs ${darkText ? 'text-[#6b5a42]' : 'text-[#8b7355]'} px-2 mb-1 flex items-center gap-1`}>
        <BookOpen className="w-3 h-3" />
        Own all 3 to reduce study sessions by 1
      </div>
      {ACADEMY_ITEMS.map(item => {
        const price = Math.round(getItemPrice(item, priceModifier * 0.85));
        const alreadyOwns = !!player.durables[item.id];
        const canAfford = player.gold >= price;
        const itemName = t(`items.${item.id}.name`) || item.name;
        return (
          <JonesMenuItem
            key={item.id}
            label={itemName}
            price={price}
            disabled={!canAfford || alreadyOwns}
            highlight={alreadyOwns}
            onClick={() => {
              buyDurable(player.id, item.id, price);
              toast.success(t('panelStore.purchased', { name: itemName }));
            }}
            darkText={darkText}
            largeText={largeText}
          />
        );
      })}
    </>
  );

  const renderAppliances = () => (
    <>
      <div className={`text-xs ${darkText ? 'text-[#8b6914]' : 'text-[#a09080]'} px-2 mb-1 flex items-center gap-1`}>
        <AlertTriangle className="w-3 h-3" />
        Higher break chance (1/36)
      </div>
      {appliances.map(appliance => {
        const price = Math.round((appliance.marketPrice || 0) * priceModifier);
        const alreadyOwns = !!player.appliances[appliance.id];
        const canAfford = player.gold >= price;
        const isFirstPurchase = !player.applianceHistory.includes(appliance.id);
        const applianceName = t(`appliances.${appliance.id}.name`) || appliance.name;
        const happinessNote = isFirstPurchase && appliance.happinessMarket > 0
          ? ` (+${appliance.happinessMarket} Hap)`
          : '';

        return (
          <JonesMenuItem
            key={appliance.id}
            label={`${applianceName}${happinessNote}`}
            price={price}
            disabled={!canAfford || alreadyOwns}
            highlight={alreadyOwns}
            onClick={() => handleBuyAppliance(appliance.id, price)}
            darkText={darkText}
            largeText={largeText}
          />
        );
      })}
    </>
  );

  // Tabbed mode: render only the specified section
  if (section) {
    switch (section) {
      case 'goods':
        return <div>{renderGoods()}{footerNote}</div>;
      case 'lottery':
        return <div>{renderLottery()}{footerNote}</div>;
      case 'tickets':
        return <div>{renderTickets()}{footerNote}</div>;
      case 'appliances':
        return <div>{renderAppliances()}{footerNote}</div>;
      case 'scholar':
        return <div>{renderScholarItems()}{footerNote}</div>;
    }
  }

  // Full mode (legacy): render all sections
  return (
    <JonesPanel>
      <JonesPanelHeader title={t('locations.shadowMarket')} subtitle="Discount Goods" />
      <JonesPanelContent>
        <JonesSectionHeader title={t('panelShadowMarket.blackMarketGoods')} />
        {renderGoods()}

        <JonesSectionHeader title={t('panelShadowMarket.lotteryTickets')} />
        {renderLottery()}

        <JonesSectionHeader title={t('panelShadowMarket.weekendTickets')} />
        {renderTickets()}

        <JonesSectionHeader title={t('panelShadowMarket.scholarlyTexts')} />
        {renderScholarItems()}

        <JonesSectionHeader title={t('panelEnchanter.appliances')} />
        {renderAppliances()}
        {footerNote}
      </JonesPanelContent>
    </JonesPanel>
  );
}
