// Shadow Market Panel - Z-Mart equivalent
// Sells used/cheaper appliances with higher break chance
// Also sells lottery tickets (Fortune's Wheel) and weekend event tickets

import { useGameStore } from '@/store/gameStore';
import { getMarketAppliances, SHADOW_MARKET_ITEMS, ACADEMY_ITEMS, getItemPrice } from '@/data/items';
import { PLAYER_RULE_TEXT, PLAYER_RULE_VALUES } from '@/data/playerFacingRules';
import { itemToPreview, applianceToPreview } from './ItemPreview';
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
  section?: ShadowMarketSection;
}

export function ShadowMarketPanel({ player, priceModifier, section }: ShadowMarketPanelProps) {
  const { t } = useTranslation();
  const purchaseAppliance = useGameStore(s => s.purchaseAppliance);
  const purchaseVendorItem = useGameStore(s => s.purchaseVendorItem);
  const appliances = getMarketAppliances();

  const handleBuyAppliance = (applianceId: string) => {
    const result = purchaseAppliance(player.id, 'shadow-market', applianceId);
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  const handleBuyItem = (item: typeof SHADOW_MARKET_ITEMS[0]) => {
    const itemName = t(`items.${item.id}.name`) || item.name;
    const result = purchaseVendorItem(player.id, 'shadow-market', item.id);
    if (!result) return;
    if (result.success) {
      const ticketNote = item.isLotteryTicket ? ` (${player.lotteryTickets + 1} tickets for this week)` : '';
      toast.success(t('panelStore.purchased', { name: itemName }) + ticketNote);
    } else {
      toast.error(result.message);
    }
  };

  const regularItems = SHADOW_MARKET_ITEMS.filter(i => !i.isLotteryTicket && !i.isTicket);
  const lotteryItems = SHADOW_MARKET_ITEMS.filter(i => i.isLotteryTicket);
  const ticketItems = SHADOW_MARKET_ITEMS.filter(i => i.isTicket);
  const darkText = !!section;
  const largeText = !!section;
  const footerNote = null;

  const renderGoods = () => (
    <>
      {regularItems.map(item => {
        const price = Math.round(getItemPrice(item, priceModifier * 0.7));
        return (
          <JonesMenuItem
            key={item.id}
            label={t(`items.${item.id}.name`) || item.name}
            price={price}
            disabled={player.gold < price}
            onClick={() => handleBuyItem(item)}
            darkText={darkText}
            largeText={largeText}
            previewData={itemToPreview(item)}
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
        const basePreview = itemToPreview(item);
        return (
          <JonesMenuItem
            key={item.id}
            label={t(`items.${item.id}.name`) || item.name}
            price={price}
            disabled={player.gold < price}
            onClick={() => handleBuyItem(item)}
            darkText={darkText}
            largeText={largeText}
            previewData={{
              ...basePreview,
              description: PLAYER_RULE_TEXT.lottery,
              effect: `Grand prize: ${PLAYER_RULE_VALUES.lotteryGrandPrize}g`,
            }}
          />
        );
      })}
      <div className={`text-xs ${darkText ? 'text-[#6b5a42]' : 'text-[#8b7355]'} px-2 mb-1`}>
        Drawing at week end. Grand prize: {PLAYER_RULE_VALUES.lotteryGrandPrize}g.
      </div>
    </>
  );

  const renderTickets = () => (
    <>
      {ticketItems.map(item => {
        const price = Math.round(getItemPrice(item, priceModifier * 0.7));
        const alreadyOwns = item.ticketType ? player.tickets.includes(item.ticketType) : false;
        return (
          <JonesMenuItem
            key={item.id}
            label={t(`items.${item.id}.name`) || item.name}
            price={price}
            disabled={player.gold < price || alreadyOwns}
            highlight={alreadyOwns}
            onClick={() => handleBuyItem(item)}
            darkText={darkText}
            largeText={largeText}
            previewData={itemToPreview(item)}
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
        const itemName = t(`items.${item.id}.name`) || item.name;
        return (
          <JonesMenuItem
            key={item.id}
            label={itemName}
            price={price}
            disabled={player.gold < price || alreadyOwns}
            highlight={alreadyOwns}
            onClick={() => {
              const result = purchaseVendorItem(player.id, 'shadow-market', item.id);
              if (!result) return;
              if (result.success) toast.success(t('panelStore.purchased', { name: itemName }));
              else toast.error(result.message);
            }}
            darkText={darkText}
            largeText={largeText}
            previewData={itemToPreview(item)}
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
        const isFirstPurchase = !player.applianceHistory.includes(appliance.id);
        const applianceName = t(`appliances.${appliance.id}.name`) || appliance.name;
        const happinessNote = isFirstPurchase && appliance.happinessMarket > 0 ? ` (+${appliance.happinessMarket} Hap)` : '';

        return (
          <JonesMenuItem
            key={appliance.id}
            label={`${applianceName}${happinessNote}`}
            price={price}
            disabled={player.gold < price || alreadyOwns}
            highlight={alreadyOwns}
            onClick={() => handleBuyAppliance(appliance.id)}
            darkText={darkText}
            largeText={largeText}
            previewData={applianceToPreview(appliance, 'market')}
          />
        );
      })}
    </>
  );

  if (section) {
    switch (section) {
      case 'goods': return <div>{renderGoods()}{footerNote}</div>;
      case 'lottery': return <div>{renderLottery()}{footerNote}</div>;
      case 'tickets': return <div>{renderTickets()}{footerNote}</div>;
      case 'appliances': return <div>{renderAppliances()}{footerNote}</div>;
      case 'scholar': return <div>{renderScholarItems()}{footerNote}</div>;
    }
  }

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
