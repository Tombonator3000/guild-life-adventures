import type { Player } from '@/types/game.types';
import { getJob } from '@/data/jobs';
import { CLOTHING_THRESHOLDS, CLOTHING_TIER_LABELS, getClothingTier } from '@/data/items';
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

  // Bankruptcy Barrel: no clothes = can't work
  const isNaked = player.clothingCondition <= 0;

  // Clothing quality check: job requires a certain clothing tier
  const requiredThreshold = CLOTHING_THRESHOLDS[jobData.requiredClothing as keyof typeof CLOTHING_THRESHOLDS] ?? 0;
  const clothingTooLow = !isNaked && player.clothingCondition < requiredThreshold;

  const clothingBlockMessage = isNaked
    ? 'You have no clothes! Buy clothing at the General Store or Armory before you can work.'
    : clothingTooLow
      ? `Your clothing is too worn for this job! It requires ${CLOTHING_TIER_LABELS[jobData.requiredClothing as keyof typeof CLOTHING_TIER_LABELS] ?? jobData.requiredClothing} quality (you have: ${CLOTHING_TIER_LABELS[getClothingTier(player.clothingCondition)]}). Buy better clothes to continue working.`
      : null;

  if (clothingBlockMessage) {
    if (variant === 'jones') {
      return (
        <div className="mt-4 pt-3 border-t border-[#5a4a3a]">
          <JonesSectionHeader title="WORK" />
          <div className="px-2 py-2 text-xs text-red-400 font-bold">
            {clothingBlockMessage}
          </div>
        </div>
      );
    }
    return (
      <div className="wood-frame p-3 text-parchment">
        <h4 className="font-display text-sm text-parchment-dark flex items-center gap-2 mb-2">
          <Briefcase className="w-4 h-4" /> Work
        </h4>
        <div className="text-xs text-red-400 font-bold">
          {clothingBlockMessage}
        </div>
      </div>
    );
  }

  // Match actual workShift calculation: flat 15% bonus on earnings for all shifts
  const earnings = Math.floor(jobData.hoursPerShift * player.currentWage * 1.15);

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
    <div className="wood-frame p-3 text-parchment">
      <h4 className="font-display text-sm text-parchment-dark flex items-center gap-2 mb-2">
        <Briefcase className="w-4 h-4" /> Work
      </h4>
      <div className="text-xs text-parchment-dark mb-2">
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
