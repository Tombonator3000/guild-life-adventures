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
          time={4}
          disabled={player.timeRemaining < 4}
          onClick={() => {
            spendTime(player.id, 4);
            // Random exploration outcome
            const roll = Math.random();
            if (roll < 0.3) {
              // Found treasure!
              const goldFound = Math.floor(Math.random() * 50) + 20;
              modifyGold(player.id, goldFound);
              modifyHappiness(player.id, 10);
              toast.success(`You found ${goldFound} gold in the cave!`);
            } else if (roll < 0.5) {
              // Found a hidden spring
              modifyHealth(player.id, 15);
              modifyHappiness(player.id, 5);
              toast.success('You found a healing spring deep in the cave!');
            } else if (roll < 0.7) {
              // Got lost
              modifyHappiness(player.id, -5);
              toast.info('You wandered around but found nothing of interest.');
            } else {
              // Encountered danger
              const damage = Math.floor(Math.random() * 10) + 5;
              modifyHealth(player.id, -damage);
              modifyHappiness(player.id, -10);
              toast.error(`You encountered a creature and took ${damage} damage!`);
            }
          }}
        />
        <ActionButton
          label="Rest in the Cave"
          cost={0}
          time={6}
          disabled={player.timeRemaining < 6 || player.health >= player.maxHealth}
          onClick={() => {
            spendTime(player.id, 6);
            const healAmount = Math.min(20, player.maxHealth - player.health);
            modifyHealth(player.id, healAmount);
            modifyHappiness(player.id, 3);
            toast.success(`You rested and recovered ${healAmount} health.`);
          }}
        />
      </div>
    </div>
  );
}
