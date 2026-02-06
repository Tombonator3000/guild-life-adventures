import type { Player } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { Coins, Home, Lock } from 'lucide-react';
import { ActionButton } from './ActionButton';
import { HOUSING_DATA, HOUSING_TIERS } from '@/data/housing';
import { toast } from 'sonner';

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
  const baseRent = RENT_COSTS[player.housing];
  const marketRent = Math.round(baseRent * priceModifier);
  const effectiveRent = player.lockedRent > 0 ? player.lockedRent : marketRent;

  return (
    <div className="space-y-4">
      <div className="wood-frame p-3 text-parchment">
        <div className="flex justify-between mb-2">
          <span>Current Housing:</span>
          <span className="font-bold">{HOUSING_DATA[player.housing].name}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Weekly Rent:</span>
          <div className="text-right">
            <span className="font-bold">{effectiveRent}g</span>
            {player.lockedRent > 0 && (
              <span className="text-xs text-secondary ml-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>
        </div>
        {player.lockedRent > 0 && marketRent !== player.lockedRent && (
          <div className="flex justify-between mb-2 text-xs">
            <span>Market Rate:</span>
            <span className={marketRent > player.lockedRent ? 'text-secondary' : 'text-destructive'}>
              {marketRent}g {marketRent > player.lockedRent ? '(saving!)' : '(could be cheaper)'}
            </span>
          </div>
        )}
        <div className="flex justify-between mb-2">
          <span>Prepaid Weeks:</span>
          <span className="font-bold text-secondary">{player.rentPrepaidWeeks}</span>
        </div>
        <div className="flex justify-between">
          <span>Weeks Since Payment:</span>
          <span className={`font-bold ${player.weeksSinceRent >= 4 ? 'text-destructive' : ''}`}>
            {player.weeksSinceRent}
          </span>
        </div>
        {player.weeksSinceRent >= 4 && (
          <p className="text-destructive text-xs mt-2">⚠️ Eviction warning! Pay rent now!</p>
        )}
      </div>

      {/* Rent Payment Options */}
      {player.housing !== 'homeless' && (
        <>
          <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2">
            <Coins className="w-4 h-4" /> Pay Rent
          </h4>
          <div className="space-y-2">
            <ActionButton
              label={`Pay 1 Week (${effectiveRent}g)`}
              cost={effectiveRent}
              time={1}
              disabled={player.gold < effectiveRent || player.timeRemaining < 1}
              onClick={() => {
                prepayRent(player.id, 1, effectiveRent);
                spendTime(player.id, 1);
                toast.success('Rent paid for 1 week!');
              }}
            />
            <ActionButton
              label={`Pay 4 Weeks (${effectiveRent * 4}g)`}
              cost={effectiveRent * 4}
              time={1}
              disabled={player.gold < effectiveRent * 4 || player.timeRemaining < 1}
              onClick={() => {
                prepayRent(player.id, 4, effectiveRent * 4);
                spendTime(player.id, 1);
                toast.success('Rent prepaid for 4 weeks!');
              }}
            />
            <ActionButton
              label={`Pay 8 Weeks (${effectiveRent * 8}g)`}
              cost={effectiveRent * 8}
              time={1}
              disabled={player.gold < effectiveRent * 8 || player.timeRemaining < 1}
              onClick={() => {
                prepayRent(player.id, 8, effectiveRent * 8);
                spendTime(player.id, 1);
                toast.success('Rent prepaid for 8 weeks!');
              }}
            />
          </div>
        </>
      )}

      {/* Housing Options */}
      <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2">
        <Home className="w-4 h-4" /> Move to New Housing
      </h4>
      <p className="text-xs text-muted-foreground">
        Moving locks in the current market rent rate.
      </p>
      <div className="space-y-2">
        {HOUSING_TIERS.filter(t => t !== player.housing && t !== 'homeless').map(tier => {
          const housing = HOUSING_DATA[tier];
          const tierMarketRent = Math.round(housing.weeklyRent * priceModifier);
          const moveCost = tierMarketRent * 2; // First month + deposit
          const isCheaper = player.lockedRent > 0 && tierMarketRent < player.lockedRent;

          return (
            <div key={tier} className="wood-frame p-2 text-parchment">
              <div className="flex justify-between items-center mb-1">
                <span className="font-display font-semibold text-sm">{housing.name}</span>
                <span className="text-gold font-bold">{tierMarketRent}g/week</span>
              </div>
              <div className="text-xs text-parchment-dark mb-2">
                {housing.description}
                {tier === 'noble' && <span className="text-secondary ml-1">(Safe from Shadowfingers!)</span>}
                {isCheaper && <span className="text-secondary ml-1">(Cheaper than current!)</span>}
              </div>
              <button
                onClick={() => {
                  moveToHousing(player.id, tier, moveCost, tierMarketRent);
                  spendTime(player.id, 4);
                  toast.success(`Moved to ${housing.name}! Rent locked at ${tierMarketRent}g/week.`);
                }}
                disabled={player.gold < moveCost || player.timeRemaining < 4}
                className="w-full gold-button text-xs py-1 disabled:opacity-50"
              >
                Move In ({moveCost}g deposit, 4h)
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
