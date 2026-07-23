// Guild Life - The Fence (Pawn Shop) Panel

import { Coins, ShoppingBag, Dices, Package, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { getItem, getAppliance, getPawnValue, getPawnSalePrice, getRedeemPrice, APPLIANCES } from '@/data/items';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

export type FenceSection = 'trade' | 'magical' | 'gambling';

interface PawnShopPanelProps {
  player: Player;
  priceModifier: number;
  week: number;
  onSellItem: (itemId: string, price: number) => void;
  section?: FenceSection;
}

const USED_ITEMS = [
  { id: 'used-sword', name: 'Used Sword', basePrice: 40, originalId: 'sword' },
  { id: 'used-clothes', name: 'Worn Clothes', basePrice: 30, effect: { type: 'clothing' as const, value: 50 } },
  { id: 'used-shield', name: 'Dented Shield', basePrice: 20, originalId: 'shield' },
  { id: 'used-blanket', name: 'Patched Blanket', basePrice: 12, effect: { type: 'happiness' as const, value: 3 } },
];

export function PawnShopPanel({ player, priceModifier, week, onSellItem, section }: PawnShopPanelProps) {
  const { t } = useTranslation();
  const purchaseAppliance = useGameStore(s => s.purchaseAppliance);
  const applianceServiceAction = useGameStore(s => s.useApplianceService);
  const gambleAtFence = useGameStore(s => s.gambleAtFence);
  const purchaseEquipmentItem = useGameStore(s => s.purchaseEquipmentItem);

  const getSellPrice = (itemId: string): number => {
    const item = getItem(itemId);
    if (!item) return 5;
    return Math.max(5, Math.round(item.basePrice * 0.5 * priceModifier));
  };

  const runGamble = (stake: number) => {
    const result = gambleAtFence(player.id, stake);
    if (result && !result.success) toast.error(result.message);
  };

  const renderSellItems = () => (
    player.inventory.length > 0 ? (
      <div>
        <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2 mb-2">
          <Package className="w-4 h-4" /> {t('panelFence.pawnItems')}
        </h4>
        <div className="space-y-2">
          {player.inventory.map((itemId, index) => {
            const item = getItem(itemId);
            const sellPrice = getSellPrice(itemId);
            return (
              <button
                key={`${itemId}-${index}`}
                onClick={() => onSellItem(itemId, sellPrice)}
                className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <span className="font-display font-semibold text-[#3d2a14]">{t(`items.${itemId}.name`) || item?.name || itemId}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#2a7a2a]">+{sellPrice}g</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ) : null
  );

  const renderUsedGoods = () => (
    <div>
      <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2 mb-2">
        <ShoppingBag className="w-4 h-4" /> {t('panelFence.itemsForSale')}
      </h4>
      <div className="space-y-2">
        {USED_ITEMS.map(item => {
          const price = Math.round(item.basePrice * priceModifier * 0.8);
          return (
            <button
              key={item.id}
              onClick={() => {
                const result = purchaseEquipmentItem(player.id, 'fence-used', item.id, 'primary');
                if (!result) return;
                if (result.success) toast.success(result.message);
                else toast.error(result.message);
              }}
              disabled={player.gold < price}
              className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span className="font-display font-semibold text-[#3d2a14]">{item.name}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[#8b6914]">-{price}g</span>
                <span className="text-[#6b5a42]">1h</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderPawnAppliances = () => (
    Object.keys(player.appliances).length > 0 ? (
      <div>
        <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" /> {t('panelFence.pawnItems')}
        </h4>
        <p className="text-xs text-[#6b5a42] mb-2">
          {t('panelFence.pawnValue')} 40% · Redeem within 6 weeks for 50%
        </p>
        <div className="space-y-2">
          {Object.entries(player.appliances).map(([applianceId, owned]) => {
            const appliance = getAppliance(applianceId);
            const pawnValue = getPawnValue(owned.originalPrice, priceModifier);
            return (
              <button
                key={applianceId}
                onClick={() => {
                  const result = applianceServiceAction(player.id, 'pawn', applianceId);
                  if (!result) return;
                  if (result.success) toast.success(result.message);
                  else toast.error(result.message);
                }}
                className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <span className="font-display font-semibold text-[#3d2a14]">
                  {t(`appliances.${applianceId}.name`) || appliance?.name || applianceId}
                  {owned.isBroken && <span className="text-destructive ml-1">({t('common.repair')})</span>}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#2a7a2a]">+{pawnValue}g</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ) : null
  );

  const renderRedeemAppliances = () => {
    const redeemable = (player.pawnedAppliances ?? []).filter(pa => week <= pa.expiresWeek);
    if (redeemable.length === 0) return null;

    return (
      <div>
        <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2 mb-2">
          <RotateCcw className="w-4 h-4" /> {t('panelFence.redeemItems')}
        </h4>
        <p className="text-xs text-[#6b5a42] mb-2">
          Recover your collateral — pay 50% of original price
        </p>
        <div className="space-y-2">
          {redeemable.map(pawned => {
            const appliance = getAppliance(pawned.applianceId);
            const redeemCost = getRedeemPrice(pawned.originalPrice);
            const weeksLeft = pawned.expiresWeek - week;
            const canAfford = player.gold >= redeemCost;

            return (
              <button
                key={pawned.applianceId}
                onClick={() => {
                  const result = applianceServiceAction(player.id, 'redeem', pawned.applianceId);
                  if (!result) return;
                  if (result.success) toast.success(result.message);
                  else toast.error(result.message);
                }}
                disabled={!canAfford}
                className="w-full p-2 bg-[#e8dfc8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#ddd0b0] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <span className="font-display font-semibold text-[#3d2a14]">
                  {t(`appliances.${pawned.applianceId}.name`) || appliance?.name || pawned.applianceId}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#6b5a42]">{weeksLeft}w left</span>
                  <span className="text-[#8b6914]">-{redeemCost}g</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBuyPawnedItems = () => (
    <div>
      <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4" /> {t('panelEnchanter.appliances')}
      </h4>
      <p className="text-xs text-[#6b5a42] flex items-center gap-1 mb-2">
        <AlertTriangle className="w-3 h-3 text-warning" />
        50% off, 1/36 break chance
      </p>
      <div className="space-y-2">
        {APPLIANCES.filter(a => a.enchanterPrice > 0).slice(0, 4).map(appliance => {
          const salePrice = getPawnSalePrice(appliance.enchanterPrice);
          const alreadyOwns = !!player.appliances[appliance.id];

          return (
            <button
              key={appliance.id}
              onClick={() => {
                const result = purchaseAppliance(player.id, 'fence', appliance.id);
                if (!result) return;
                if (result.success) toast.success(result.message);
                else toast.error(result.message);
              }}
              disabled={player.gold < salePrice || alreadyOwns}
              className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span className="font-display font-semibold text-[#3d2a14]">
                {t(`appliances.${appliance.id}.name`) || appliance.name}
                {alreadyOwns && <span className="text-secondary ml-1">({t('common.owned')})</span>}
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[#8b6914]">-{salePrice}g</span>
                <span className="text-[#6b5a42]">1h</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderGambling = () => (
    <div>
      <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2 mb-2">
        <Dices className="w-4 h-4" /> {t('panelFence.pawnShop')}
      </h4>
      <div className="space-y-2">
        <button
          onClick={() => runGamble(10)}
          disabled={player.gold < 10 || player.timeRemaining < 2}
          className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <div className="flex items-center gap-2">
            <Dices className="w-4 h-4 text-[#6b5a42]" />
            <span className="font-display font-semibold text-[#3d2a14]">10g</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#6b5a42]">40%: +25g</span>
            <span className="text-[#6b5a42]">2h</span>
          </div>
        </button>

        <button
          onClick={() => runGamble(50)}
          disabled={player.gold < 50 || player.timeRemaining < 2}
          className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <div className="flex items-center gap-2">
            <Dices className="w-4 h-4 text-[#6b5a42]" />
            <span className="font-display font-semibold text-[#3d2a14]">50g</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#6b5a42]">30%: +150g</span>
            <span className="text-[#6b5a42]">2h</span>
          </div>
        </button>

        <button
          onClick={() => runGamble(100)}
          disabled={player.gold < 100 || player.timeRemaining < 3}
          className="w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <div className="flex items-center gap-2">
            <Dices className="w-4 h-4 text-[#6b5a42]" />
            <span className="font-display font-semibold text-[#3d2a14]">100g</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#6b5a42]">20%: +400g</span>
            <span className="text-[#6b5a42]">3h</span>
          </div>
        </button>
      </div>
    </div>
  );

  if (section) {
    switch (section) {
      case 'trade':
        return <div className="space-y-4">{renderSellItems()}{renderUsedGoods()}</div>;
      case 'magical':
        return <div className="space-y-4">{renderPawnAppliances()}{renderRedeemAppliances()}{renderBuyPawnedItems()}</div>;
      case 'gambling':
        return <div className="space-y-4">{renderGambling()}</div>;
    }
  }

  return (
    <div className="space-y-4">
      {renderSellItems()}
      {renderUsedGoods()}
      {renderPawnAppliances()}
      {renderRedeemAppliances()}
      {renderBuyPawnedItems()}
      {renderGambling()}
    </div>
  );
}
