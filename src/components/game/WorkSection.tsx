import type { Player } from '@/types/game.types';
import { getJob } from '@/data/jobs';
import { Briefcase } from 'lucide-react';
import {
  JonesSectionHeader,
  JonesButton,
} from './JonesStylePanel';
import { ActionButton } from './ActionButton';
import { toast } from 'sonner';

interface WorkSectionProps {
  player: Player;
  locationName: string;
  workShift: (playerId: string, hours: number, wage: number) => void;
  variant: 'jones' | 'wood-frame';
}

export function WorkSection({ player, locationName, workShift, variant }: WorkSectionProps) {
  const jobData = player.currentJob ? getJob(player.currentJob) : null;
  const canWork = jobData && jobData.location === locationName;

  if (!canWork || !jobData) return null;

  // Use 1.15 bonus multiplier to match actual workShift calculation in workEducationHelpers
  const bonusHours = jobData.hoursPerShift >= 6 ? Math.ceil(jobData.hoursPerShift * 1.15) : jobData.hoursPerShift;
  const earnings = bonusHours * player.currentWage;

  if (variant === 'jones') {
    return (
      <div className="mt-4 pt-3 border-t border-[#5a4a3a]">
        <JonesSectionHeader title="WORK" />
        <div className="px-2 py-1 text-xs text-[#8b7355]">
          Current Job: {jobData.name} ({player.currentWage}g/hr)
        </div>
        <JonesButton
          label={`Work Shift (+${earnings}g)`}
          onClick={() => {
            workShift(player.id, jobData.hoursPerShift, player.currentWage);
            toast.success(`Worked a shift at ${jobData.name}!`);
          }}
          disabled={player.timeRemaining < jobData.hoursPerShift}
          variant="primary"
          className="w-full"
        />
        <div className="text-xs text-[#8b7355] px-2 mt-1">
          {jobData.hoursPerShift} hours per shift
        </div>
      </div>
    );
  }

  // wood-frame variant
  return (
    <div className="wood-frame p-3 text-card">
      <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
        <Briefcase className="w-4 h-4" /> Work
      </h4>
      <div className="text-xs text-muted-foreground mb-2">
        Current Job: {jobData.name} ({player.currentWage}g/hr)
      </div>
      <ActionButton
        label={`Work Shift (+${earnings}g)`}
        cost={0}
        time={jobData.hoursPerShift}
        disabled={player.timeRemaining < jobData.hoursPerShift}
        onClick={() => {
          workShift(player.id, jobData.hoursPerShift, player.currentWage);
          toast.success(`Worked a shift at ${jobData.name}!`);
        }}
      />
    </div>
  );
}
