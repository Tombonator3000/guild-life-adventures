import type { Player } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { Coins, Home, Lock } from 'lucide-react';
import { ActionButton } from './ActionButton';
import { HOUSING_DATA, HOUSING_TIERS } from '@/data/housing';
import { toast } from 'sonner';
import { playSFX } from '@/audio/sfxManager';
import { useTranslation } from '@/i18n';

interface LandlordPanelProps {
  player: Player;
  priceModifier: number;
  spendTime: (playerId: string, hours: number) => void;
  prepayRent: (playerId: string, weeks: number, cost: number) => void;
  moveToHousing: (playerId: string, tier: string, cost: number, lockedRent: number) => void;
}

export function LandlordPanel({
  player,
  priceModifier,
  spendTime,
  prepayRent,
  moveToHousing,
}: LandlordPanelProps) {
  const { t } = useTranslation();
  const baseRent = RENT_COSTS[player.housing];
  const marketRent = Math.round(baseRent * priceModifier);
  const effectiveRent = player.lockedRent > 0 ? player.lockedRent : marketRent;

  return (
    <div className="space-y-4">
      <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-3 text-[#3d2a14]">
        <div className="flex justify-between mb-2">
          <span>{t('panelLandlord.currentHousing')}</span>
          <span className="font-bold">{t(`housing.${player.housing}.name`) || HOUSING_DATA[player.housing].name}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>{t('panelLandlord.weeklyRent')}</span>
          <div className="text-right">
            <span className="font-bold">{effectiveRent}g</span>
            {player.lockedRent > 0 && (
              <span className="text-xs text-[#2a7a2a] ml-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> {t('common.owned')}
              </span>
            )}
          </div>
        </div>
        {player.lockedRent > 0 && marketRent !== player.lockedRent && (
          <div className="flex justify-between mb-2 text-xs">
            <span className="text-[#6b5a42]">{t('board.market')}:</span>
            <span className={marketRent > player.lockedRent ? 'text-[#2a7a2a]' : 'text-destructive'}>
              {marketRent}g
            </span>
          </div>
        )}
        <div className="flex justify-between mb-2">
          <span>{t('panelLandlord.rentDue')}:</span>
          <span className="font-bold text-[#2a7a2a]">{player.rentPrepaidWeeks}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('panelLandlord.weeksOverdue', { n: player.weeksSinceRent })}:</span>
          <span className={`font-bold ${player.weeksSinceRent >= 4 ? 'text-destructive' : 'text-[#8b6914]'}`}>
            {player.weeksSinceRent}
          </span>
        </div>
        {player.weeksSinceRent >= 4 && (
          <p className="text-destructive text-xs mt-2">{t('panelLandlord.evictionWarning')}</p>
        )}
      </div>

      {/* Rent Payment Options */}
      {player.housing !== 'homeless' && (
        <>
          <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2">
            <Coins className="w-4 h-4" /> {t('panelLandlord.payRent')}
          </h4>
          <div className="space-y-2">
            <ActionButton
              label={`${t('panelLandlord.payRent')} 1 (${effectiveRent}g)`}
              cost={effectiveRent}
              time={1}
              disabled={player.gold < effectiveRent || player.timeRemaining < 1}
              darkText
              sfx="rent-paid"
              onClick={() => {
                prepayRent(player.id, 1, effectiveRent);
                spendTime(player.id, 1);
                toast.success(t('panelLandlord.rentPaid'));
              }}
            />
            <ActionButton
              label={`${t('panelLandlord.payRent')} 4 (${effectiveRent * 4}g)`}
              cost={effectiveRent * 4}
              time={1}
              disabled={player.gold < effectiveRent * 4 || player.timeRemaining < 1}
              darkText
              sfx="rent-paid"
              onClick={() => {
                prepayRent(player.id, 4, effectiveRent * 4);
                spendTime(player.id, 1);
                toast.success(t('panelLandlord.rentPaid'));
              }}
            />
            <ActionButton
              label={`${t('panelLandlord.payRent')} 8 (${effectiveRent * 8}g)`}
              cost={effectiveRent * 8}
              time={1}
              disabled={player.gold < effectiveRent * 8 || player.timeRemaining < 1}
              darkText
              sfx="rent-paid"
              onClick={() => {
                prepayRent(player.id, 8, effectiveRent * 8);
                spendTime(player.id, 1);
                toast.success(t('panelLandlord.rentPaid'));
              }}
            />
          </div>
        </>
      )}

      {/* Housing Options */}
      <h4 className="font-display text-sm text-[#6b5a42] flex items-center gap-2">
        <Home className="w-4 h-4" /> {t('panelLandlord.changeHousing')}
      </h4>
      <p className="text-xs text-[#6b5a42]">
        {t('panelLandlord.housingOffice')}
      </p>
      <div className="space-y-2">
        {HOUSING_TIERS.filter(tier => tier !== player.housing && tier !== 'homeless' && tier !== 'modest').map(tier => {
          const housing = HOUSING_DATA[tier];
          const tierMarketRent = Math.round(housing.weeklyRent * priceModifier);
          const moveCost = tierMarketRent * 2; // First month + deposit

          return (
            <div key={tier} className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-display font-semibold text-sm text-[#3d2a14]">{t(`housing.${tier}.name`) || housing.name}</span>
                <span className="text-[#8b6914] font-bold">{tierMarketRent}g/{t('board.week').toLowerCase()}</span>
              </div>
              <div className="text-xs text-[#6b5a42] mb-2">
                {t(`housing.${tier}.description`) || housing.description}
              </div>
              <button
                onClick={() => {
                  playSFX('door-open');
                  moveToHousing(player.id, tier, moveCost, tierMarketRent);
                  spendTime(player.id, 4);
                  toast.success(t('panelLandlord.rentPaid'));
                }}
                disabled={player.gold < moveCost || player.timeRemaining < 4}
                className="w-full gold-button text-xs py-1 disabled:opacity-50"
              >
                {t('panelLandlord.moveIn')} ({moveCost}g, 4h)
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
