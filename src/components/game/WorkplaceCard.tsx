import { useId } from 'react';
import { Briefcase, Hammer, Hourglass, Coins } from 'lucide-react';
import { getJob } from '@/data/jobs';
import { useCurrentPlayer } from '@/store/gameStore';
import type { WorkInfo } from './LocationShell';

/** A readable preview of existing work services; no separate economic rules. */
export function WorkplaceCard({ work }: { work: WorkInfo }) {
  const player = useCurrentPlayer();
  const outcomeId = useId();
  if (!player) return null;
  const job = player.currentJob ? getJob(player.currentJob) : undefined;
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
    </section>
  </div>;
}
