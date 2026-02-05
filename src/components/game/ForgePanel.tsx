import type { Player, DegreeId } from '@/types/game.types';
import { Hammer } from 'lucide-react';
import { getJobOffers, FORGE_JOBS } from '@/data/jobs';

interface ForgePanelProps {
  player: Player;
  priceModifier: number;
  setJob: (playerId: string, jobId: string, wage: number) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
}

export function ForgePanel({
  player,
  priceModifier,
  setJob,
  workShift,
  modifyHappiness,
}: ForgePanelProps) {
  const forgeJobOffers = getJobOffers(
    player.completedDegrees as DegreeId[],
    player.clothingCondition,
    player.experience,
    player.dependability,
    priceModifier
  ).filter(j => FORGE_JOBS.some(fj => fj.id === j.id));

  return (
    <div className="space-y-2">
      <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
        <Hammer className="w-4 h-4" /> Forge Work
      </h4>
      <p className="text-xs text-muted-foreground mb-2">
        Apply for forge jobs or work your current shift
      </p>
      {forgeJobOffers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No forge positions available. Need Trade Guild or Combat Training certificates.
        </p>
      ) : (
        forgeJobOffers.map(offer => {
          const earnings = Math.ceil(offer.hoursPerShift * 1.33 * offer.offeredWage);
          return (
            <div key={offer.id} className="wood-frame p-2 text-card">
              <div className="flex justify-between items-center">
                <span className="font-display font-semibold text-sm">{offer.name}</span>
                <span className="text-gold font-bold">{offer.offeredWage}g/h</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-muted-foreground">
                  {offer.hoursPerShift}h shift → {earnings}g
                </span>
                <button
                  onClick={() => {
                    setJob(player.id, offer.id, offer.offeredWage);
                    workShift(player.id, offer.hoursPerShift, offer.offeredWage);
                    modifyHappiness(player.id, -3); // Forge work is hard
                  }}
                  disabled={player.timeRemaining < offer.hoursPerShift}
                  className="gold-button text-xs py-1 px-2 disabled:opacity-50"
                >
                  Work
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
