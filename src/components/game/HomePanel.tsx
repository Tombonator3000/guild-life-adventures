import type { Player } from '@/types/game.types';
import { Home } from 'lucide-react';
import { ActionButton } from './ActionButton';
import { HOUSING_DATA } from '@/data/housing';

interface HomePanelProps {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
}

export function HomePanel({
  player,
  spendTime,
  modifyHappiness,
  modifyHealth,
}: HomePanelProps) {
  if (player.housing === 'homeless') {
    return (
      <p className="text-muted-foreground text-center py-4">
        You need to rent a place first. Visit the Landlord's Office.
      </p>
    );
  }

  const housingData = HOUSING_DATA[player.housing];

  return (
    <div className="space-y-2">
      <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
        <Home className="w-4 h-4" /> Rest and Relaxation
      </h4>
      <ActionButton
        label="Rest (Restore Happiness)"
        cost={0}
        time={housingData.relaxationRate}
        disabled={player.timeRemaining < housingData.relaxationRate || housingData.relaxationRate === 0}
        onClick={() => {
          spendTime(player.id, housingData.relaxationRate);
          modifyHappiness(player.id, 10);
        }}
      />
      <ActionButton
        label="Sleep Well (Full Rest)"
        cost={0}
        time={8}
        disabled={player.timeRemaining < 8}
        onClick={() => {
          spendTime(player.id, 8);
          modifyHappiness(player.id, 20);
          modifyHealth(player.id, 10);
        }}
      />
    </div>
  );
}
