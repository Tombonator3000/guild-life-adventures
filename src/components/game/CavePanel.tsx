import type { Player } from '@/types/game.types';
import { Sparkles } from 'lucide-react';
import { ActionButton } from './ActionButton';
import { toast } from 'sonner';

interface CavePanelProps {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  modifyGold: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
}

export function CavePanel({
  player,
  spendTime,
  modifyGold,
  modifyHealth,
  modifyHappiness,
}: CavePanelProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-display text-lg text-muted-foreground flex items-center gap-2">
        <Sparkles className="w-5 h-5" /> Mysterious Cave
      </h4>
      <p className="text-sm text-muted-foreground">
        A dark cave entrance beckons. Who knows what treasures... or dangers... await within?
      </p>
      <div className="space-y-2">
        <ActionButton
          label="Explore the Cave"
          cost={0}
          time={6}
          disabled={player.timeRemaining < 6}
          onClick={() => {
            spendTime(player.id, 6);
            // Random exploration outcome - balanced: less gold, more risk
            const roll = Math.random();
            if (roll < 0.2) {
              // Found treasure! (20% chance, down from 30%; 10-35g, down from 20-70g)
              const goldFound = Math.floor(Math.random() * 25) + 10;
              modifyGold(player.id, goldFound);
              modifyHappiness(player.id, 3);
              toast.success(`You found ${goldFound} gold in the cave!`);
            } else if (roll < 0.35) {
              // Found a hidden spring (15% chance)
              modifyHealth(player.id, 10);
              modifyHappiness(player.id, 2);
              toast.success('You found a healing spring deep in the cave!');
            } else if (roll < 0.6) {
              // Got lost (25% chance)
              modifyHappiness(player.id, -3);
              toast.info('You wandered around but found nothing of interest.');
            } else {
              // Encountered danger (40% chance, up from 30%)
              const damage = Math.floor(Math.random() * 15) + 8;
              modifyHealth(player.id, -damage);
              modifyHappiness(player.id, -5);
              toast.error(`You encountered a creature and took ${damage} damage!`);
            }
          }}
        />
        <ActionButton
          label="Rest in the Cave"
          cost={0}
          time={8}
          disabled={player.timeRemaining < 8 || player.health >= player.maxHealth}
          onClick={() => {
            spendTime(player.id, 8);
            const healAmount = Math.min(15, player.maxHealth - player.health);
            modifyHealth(player.id, healAmount);
            modifyHappiness(player.id, 1);
            toast.success(`You rested and recovered ${healAmount} health.`);
          }}
        />
      </div>
    </div>
  );
}
