// Shadow Market Panel - Z-Mart equivalent
// Sells used/cheaper appliances with higher break chance
// Also sells lottery tickets (Fortune's Wheel) and weekend event tickets

import { useGameStore } from '@/store/gameStore';
import { getMarketAppliances, getAppliance, SHADOW_MARKET_ITEMS, getItemPrice } from '@/data/items';
import { AlertTriangle } from 'lucide-react';
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

export type ShadowMarketSection = 'goods' | 'lottery' | 'tickets' | 'appliances';

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
    if (item.isLotteryTicket) {
      buyLotteryTicket(player.id, price);
      onSpendTime(1);
      toast.success(`Bought Fortune's Wheel ticket! (${player.lotteryTickets + 1} tickets for this week)`);
      return;
    }

    if (item.isTicket && item.ticketType) {
      if (player.tickets.includes(item.ticketType)) {
        toast.error('You already have this ticket!');
        return;
      }
      buyTicket(player.id, item.ticketType, price);
      onSpendTime(1);
      toast.success(`Bought ${item.name}! Use it this weekend.`);
      return;
    }

    onModifyGold(-price);
    onSpendTime(1);

    if (item.effect?.type === 'food') {
      onModifyFood(item.effect.value);
    }
    if (item.effect?.type === 'happiness') {
      onModifyHappiness(item.effect.value);
    }
    toast.success(`Purchased ${item.name}!`);
  };

  // Separate items by type for better organization
  const regularItems = SHADOW_MARKET_ITEMS.filter(i => !i.isLotteryTicket && !i.isTicket);
  const lotteryItems = SHADOW_MARKET_ITEMS.filter(i => i.isLotteryTicket);
  const ticketItems = SHADOW_MARKET_ITEMS.filter(i => i.isTicket);

  // In tabbed mode, use dark text on light parchment background
  const darkText = !!section;
  const largeText = !!section;

  const footerNote = (
    <div className={`mt-2 text-xs ${darkText ? 'text-[#6b5a42]' : 'text-[#8b7355]'} px-2`}>
      1 hour per purchase
    </div>
  );

  const renderGoods = () => (
    <>
      {regularItems.map(item => {
        const price = Math.round(getItemPrice(item, priceModifier * 0.7));
        const canAfford = player.gold >= price && player.timeRemaining >= 1;
        return (
          <JonesMenuItem
            key={item.id}
            label={item.name}
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
        <JonesInfoRow label="Tickets this week:" value={`${player.lotteryTickets}`} darkText={darkText} largeText={largeText} />
      )}
      {lotteryItems.map(item => {
        const price = Math.round(getItemPrice(item, priceModifier * 0.7));
        const canAfford = player.gold >= price && player.timeRemaining >= 1;
        return (
          <JonesMenuItem
            key={item.id}
            label={item.name}
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
        const canAfford = player.gold >= price && player.timeRemaining >= 1;
        const alreadyOwns = item.ticketType ? player.tickets.includes(item.ticketType) : false;
        return (
          <JonesMenuItem
            key={item.id}
            label={item.name}
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

  const renderAppliances = () => (
    <>
      <div className={`text-xs ${darkText ? 'text-[#8b6914]' : 'text-[#a09080]'} px-2 mb-1 flex items-center gap-1`}>
        <AlertTriangle className="w-3 h-3" />
        Higher break chance (1/36)
      </div>
      {appliances.map(appliance => {
        const price = Math.round((appliance.marketPrice || 0) * priceModifier);
        const alreadyOwns = !!player.appliances[appliance.id];
        const canAfford = player.gold >= price && player.timeRemaining >= 1;
        const isFirstPurchase = !player.applianceHistory.includes(appliance.id);
        const happinessNote = isFirstPurchase && appliance.happinessMarket > 0
          ? ` (+${appliance.happinessMarket} Hap)`
          : '';

        return (
          <JonesMenuItem
            key={appliance.id}
            label={`${appliance.name}${happinessNote}`}
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
    }
  }

  // Full mode (legacy): render all sections
  return (
    <JonesPanel>
      <JonesPanelHeader title="Shadow Market" subtitle="Discount Goods" />
      <JonesPanelContent>
        <JonesSectionHeader title="BLACK MARKET GOODS" />
        {renderGoods()}

        <JonesSectionHeader title="FORTUNE'S WHEEL" />
        {renderLottery()}

        <JonesSectionHeader title="WEEKEND TICKETS" />
        {renderTickets()}

        <JonesSectionHeader title="USED MAGICAL ITEMS" />
        {renderAppliances()}
        {footerNote}
      </JonesPanelContent>
    </JonesPanel>
  );
}
