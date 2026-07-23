// Graveyard Dark Magic Panel — Dark rituals for hex system
// Offers: Dark Ritual (random hex scroll), Curse Reflection, Curse Cleansing

import { useGameStore } from '@/store/gameStore';
import { getGameOption } from '@/data/gameOptions';
import type { Player } from '@/types/game.types';
import { getHexById } from '@/data/hexes';
import { Skull, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface GraveyardHexPanelProps {
  player: Player;
  priceModifier: number;
}

export function GraveyardHexPanel({ player, priceModifier }: GraveyardHexPanelProps) {
  const performGraveyardHexService = useGameStore(state => state.useGraveyardHexService);

  if (!getGameOption('enableHexesCurses')) return null;

  const ritualCost = Math.round(200 * priceModifier);
  const reflectionCost = Math.round(150 * priceModifier);
  const cleanseCost = Math.round(300 * priceModifier);

  const runService = (service: 'ritual' | 'reflect' | 'cleanse') => {
    const result = performGraveyardHexService(player.id, service);
    if (!result) return;
    if (result.success && !result.backfired) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <div className="space-y-3">
      <h4 className="font-display text-sm text-purple-900 flex items-center gap-2">
        <Skull className="w-4 h-4" /> Dark Magic
      </h4>

      {(player.activeCurses?.length ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-300 rounded p-2">
          <h5 className="text-xs font-bold text-red-800 mb-1">Active Afflictions</h5>
          {player.activeCurses?.map((curse, index) => {
            const hex = getHexById(curse.hexId);
            return (
              <div key={`${curse.hexId}-${index}`} className="text-xs text-red-700 flex justify-between">
                <span>{hex?.name || 'Unknown Curse'} (by {curse.casterName})</span>
                <span>{curse.weeksRemaining}w left</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-[#2a1a2e] border border-purple-700 rounded p-2">
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-2">
            <span className="font-display text-xs font-bold text-purple-300">Dark Ritual</span>
            <p className="text-xs text-purple-400">
              Commune with the dead. Receive a random hex scroll. 15% chance the ritual backfires!
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-purple-300">{ritualCost}g</span>
            <br />
            <button
              onClick={() => runService('ritual')}
              disabled={player.gold < ritualCost || player.timeRemaining < 4}
              className="bg-purple-800 hover:bg-purple-700 text-purple-100 text-xs py-0.5 px-2 rounded disabled:opacity-50 mt-0.5"
            >
              Ritual (4h)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#2a1a2e] border border-purple-700 rounded p-2">
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-2">
            <span className="font-display text-xs font-bold text-purple-300 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Curse Reflection
            </span>
            <p className="text-xs text-purple-400">
              Attempt to reflect a curse back to its caster. 35% reflect, 25% remove, 40% fail.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-purple-300">{reflectionCost}g</span>
            <br />
            <button
              onClick={() => runService('reflect')}
              disabled={player.gold < reflectionCost || player.timeRemaining < 3 || (player.activeCurses?.length ?? 0) === 0}
              className="bg-purple-800 hover:bg-purple-700 text-purple-100 text-xs py-0.5 px-2 rounded disabled:opacity-50 mt-0.5"
            >
              Reflect (3h)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#2a1a2e] border border-purple-700 rounded p-2">
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-2">
            <span className="font-display text-xs font-bold text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Purification
            </span>
            <p className="text-xs text-purple-400">
              Remove one active curse. Guaranteed to work (no risk).
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-purple-300">{cleanseCost}g</span>
            <br />
            <button
              onClick={() => runService('cleanse')}
              disabled={player.gold < cleanseCost || player.timeRemaining < 3 || (player.activeCurses?.length ?? 0) === 0}
              className="bg-purple-800 hover:bg-purple-700 text-purple-100 text-xs py-0.5 px-2 rounded disabled:opacity-50 mt-0.5"
            >
              Cleanse (3h)
            </button>
          </div>
        </div>
      </div>

      {player.hasProtectiveAmulet && (
        <div className="bg-green-50 border border-green-300 rounded p-2 text-xs text-green-800">
          <span className="font-bold">Protective Amulet Active</span> — Next hex cast on you will be absorbed.
        </div>
      )}
    </div>
  );
}
