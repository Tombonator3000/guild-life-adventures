import type { Player } from '@/types/game.types';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
} from './JonesStylePanel';
import { WorkSection } from './WorkSection';
import { toast } from 'sonner';

interface BankPanelProps {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  depositToBank: (playerId: string, amount: number) => void;
  withdrawFromBank: (playerId: string, amount: number) => void;
  invest: (playerId: string, amount: number) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
}

export function BankPanel({
  player,
  spendTime,
  depositToBank,
  withdrawFromBank,
  invest,
  workShift,
}: BankPanelProps) {
  return (
    <JonesPanel>
      <JonesPanelHeader title="Bank" subtitle="Financial Services" />
      <JonesPanelContent>
        <JonesInfoRow label="Savings:" value={`${player.savings}g`} />
        <JonesInfoRow label="Investments:" value={`${player.investments}g`} />

        <JonesSectionHeader title="BANKING SERVICES" />
        <JonesMenuItem
          label="Deposit 50 Gold"
          price={50}
          disabled={player.gold < 50 || player.timeRemaining < 1}
          onClick={() => {
            depositToBank(player.id, 50);
            spendTime(player.id, 1);
            toast.success('Deposited 50 gold!');
          }}
        />
        <JonesMenuItem
          label="Withdraw 50 Gold"
          disabled={player.savings < 50 || player.timeRemaining < 1}
          onClick={() => {
            withdrawFromBank(player.id, 50);
            spendTime(player.id, 1);
            toast.success('Withdrew 50 gold!');
          }}
        />
        <JonesMenuItem
          label="Invest 100 Gold"
          price={100}
          disabled={player.gold < 100 || player.timeRemaining < 1}
          onClick={() => {
            invest(player.id, 100);
            spendTime(player.id, 1);
            toast.success('Invested 100 gold!');
          }}
        />
        <div className="mt-2 text-xs text-[#8b7355] px-2">
          1 hour per transaction
        </div>

        {/* Work button for bank employees */}
        <WorkSection
          player={player}
          locationName="Bank"
          workShift={workShift}
          variant="jones"
        />
      </JonesPanelContent>
    </JonesPanel>
  );
}
