import { useEffect, useRef, useState } from 'react';
import { useCurrentPlayer } from '@/store/gameStore';
import { getJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import { playSFX } from '@/audio/sfxManager';

/** Observed achievements only; changing player or loading a view never creates an award. */
export function MilestoneNotice() {
  const player = useCurrentPlayer();
  const previous = useRef(player);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const before = previous.current;
    previous.current = player;
    if (!player || before?.id !== player.id) { setNotice(''); return; }
    const degree = player.completedDegrees.find(id => !before.completedDegrees.includes(id));
    // Observe the committed result, including host acknowledgements for guests.
    // Rejected actions and switching players must never celebrate a graduation.
    if (degree && !player.isAI) playSFX('graduation');
    const job = player.currentJob && getJob(player.currentJob);
    const oldJob = before.currentJob && getJob(before.currentJob);
    const message = degree ? `Diploma earned: ${DEGREES[degree]?.name ?? degree}`
      : job && before.currentJob !== player.currentJob && job.careerLevel > (oldJob ? oldJob.careerLevel : 0) ? `New position: ${job.name}` : '';
    if (message) setNotice(message);
  }, [player]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  return notice ? <div className="milestone-notice" data-fx-protect role="status">{notice}</div> : null;
}
