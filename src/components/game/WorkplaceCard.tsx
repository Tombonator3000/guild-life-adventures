import { useId } from 'react';
import { Briefcase, Hammer, Hourglass, Coins, Info } from 'lucide-react';
import { getJob } from '@/data/jobs';
import { useCurrentPlayer, useGameStore } from '@/store/gameStore';
import { MIN_SHIFTS_FOR_RAISE, MAX_WAGE_MULTIPLIER } from '@/store/helpers/workEducationHelpers';
import { playSFX } from '@/audio/sfxManager';
import { toast } from 'sonner';
import type { WorkInfo } from './LocationShell';

/** A readable preview of existing work services; no separate economic rules. */
export function WorkplaceCard({ work }: { work: WorkInfo }) {
  const player = useCurrentPlayer();
  const attemptRaise = useGameStore(s => s.attemptWorkplaceRaise);
  const outcomeId = useId();
  const raiseId = useId();
  if (!player) return null;
  const job = getJob(player.currentJob!);
  const raiseReason = job && player.currentWage >= Math.ceil(job.baseWage * MAX_WAGE_MULTIPLIER) ? 'You have reached the maximum wage for this position.'
    : player.raiseAttemptedThisTurn ? 'Already asked this turn. Try again next week.'
    : (player.shiftsWorkedSinceHire || 0) < MIN_SHIFTS_FOR_RAISE ? `Work ${MIN_SHIFTS_FOR_RAISE} shifts first (${player.shiftsWorkedSinceHire || 0}/${MIN_SHIFTS_FOR_RAISE}).`
    : player.timeRemaining < 1 ? 'You need 1 hour remaining.' : null;
  const Icon = job?.location === 'Forge' ? Hammer : Briefcase;
  return <div className="workplace-overview">
    <div className="workplace-intro"><span className="workplace-seal"><Icon aria-hidden="true" /></span><div><p>Your job: <strong>{work.jobName}</strong></p></div></div>
    <section className="location-work material-card" aria-label="Your work shift">
      <h3>{work.hoursPerShift < work.fullShiftHours ? 'Work a short shift' : 'Work one shift'}</h3>
      <div className="workplace-numbers"><span><Hourglass aria-hidden="true" />{work.hoursPerShift}<small>h</small></span><span><Coins aria-hidden="true" />+{work.earnings}<small>g</small></span></div>
      <p id={outcomeId} className={work.blockedReason ? 'location-work-warning' : 'location-work-outcome'}>{work.blockedReason ?? `After shift: ${work.preview.hoursAfter}h left · ${work.preview.goldAfter}g`}</p>
      <button className="location-work-button" data-ui-sound="work-complete" data-tutorial-target="work-shift" onClick={work.onWork} disabled={!work.canWork} aria-describedby={outcomeId}>Work {work.hoursPerShift} hours</button>
      <p className="workplace-wage">Wage: {work.wage}g/h · includes productivity bonus and active modifiers</p>
      <p className="workplace-consequence">{work.preview.happinessLoss > 0 ? `−${work.preview.happinessLoss} happiness per shift` : 'No happiness loss this shift'}{work.preview.deductions > 0 && ` · ${work.preview.deductions}g withheld for overdue payments`}</p>
      <button className="workplace-secondary" disabled={!!raiseReason} aria-describedby={raiseId} onClick={() => {
        const result = attemptRaise(player.id);
        if (!result) return;
        playSFX(result.success ? 'coin-gain' : 'error');
        if (result.success) toast.success(result.message); else toast.error(result.message);
      }}>Ask for a raise · 1 h</button>
      <p id={raiseId} className="workplace-help">{raiseReason ?? 'An attempt costs 1h, even if denied.'}</p>
    </section>
    <p className="workplace-tip"><Info aria-hidden="true" />Plan your remaining hours before starting another shift.</p>
  </div>;
}
