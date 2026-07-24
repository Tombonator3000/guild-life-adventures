/**
 * AI Action Handlers — Employment & Education
 *
 * Decision generators choose what to do. These handlers now send only semantic
 * intent; the store resolves canonical location, wage, price, time and progress.
 */

import type { Player, DegreeId } from '@/types/game.types';
import { getJob, canWorkJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';

import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

export function handleWork(player: Player, _action: AIAction, store: StoreActions): boolean {
  const result = store.performWorkShift(player.id, 'full');
  return result?.success ?? false;
}

export function handleApplyJob(player: Player, action: AIAction, store: StoreActions): boolean {
  const jobId = action.details?.jobId as string;
  if (!jobId) return false;
  const job = getJob(jobId);
  if (!job) return false;
  if (!canWorkJob(job, player.completedDegrees, player.clothingCondition, player.experience, player.dependability)) {
    return false;
  }
  const result = store.acceptJobOffer(player.id, jobId);
  return result?.success ?? false;
}

export function handleRequestRaise(player: Player, _action: AIAction, store: StoreActions): boolean {
  const result = store.attemptWorkplaceRaise(player.id);
  return result?.success ?? false;
}

export function handleStudy(player: Player, action: AIAction, store: StoreActions): boolean {
  const degreeId = action.details?.degreeId as DegreeId;
  if (!degreeId) return false;
  const result = store.attendDegreeSession(player.id, degreeId, 'standard');
  return result?.success ?? false;
}

export function handleGraduate(player: Player, action: AIAction, store: StoreActions): boolean {
  const degreeId = action.details?.degreeId as DegreeId;
  if (!degreeId || !DEGREES[degreeId]) return false;
  const result = store.graduateDegree(player.id, degreeId);
  return result?.success ?? false;
}
