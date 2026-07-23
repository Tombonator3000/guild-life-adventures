/**
 * AI Action Handlers — Employment & Education
 *
 * Handles: work, apply-job, request-raise, study, graduate
 */

import type { Player, DegreeId } from '@/types/game.types';
import { getJob, canWorkJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import { CLOTHING_THRESHOLDS } from '@/data/items';

import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

// ─── Employment ─────────────────────────────────────────────────────────

export function handleWork(player: Player, action: AIAction, store: StoreActions): boolean {
  const hours = (action.details?.hours as number) || 6;
  const wage = (action.details?.wage as number) || player.currentWage;
  if (player.timeRemaining < hours) return false;
  if (player.clothingCondition <= 0) return false; // Bankruptcy Barrel
  // Clothing quality check: can't work if clothes don't meet job tier
  if (player.currentJob) {
    const job = getJob(player.currentJob);
    if (job) {
      const threshold = CLOTHING_THRESHOLDS[job.requiredClothing as keyof typeof CLOTHING_THRESHOLDS] ?? 0;
      if (player.clothingCondition < threshold) return false;
    }
  }
  store.workShift(player.id, hours, wage);
  return true;
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
  if (!player.currentJob) return false;
  const result = store.requestRaise(player.id);
  store.spendTime(player.id, 1);
  return result.success;
}

// ─── Education ──────────────────────────────────────────────────────────

export function handleStudy(player: Player, action: AIAction, store: StoreActions): boolean {
  const degreeId = action.details?.degreeId as DegreeId;
  const cost = (action.details?.cost as number) || 5;
  const hours = (action.details?.hours as number) || 6;
  if (!degreeId || player.gold < cost || player.timeRemaining < hours) return false;
  store.studyDegree(player.id, degreeId, cost, hours);
  return true;
}

export function handleGraduate(player: Player, action: AIAction, store: StoreActions): boolean {
  const degreeId = action.details?.degreeId as DegreeId;
  if (!degreeId) return false;
  const degree = DEGREES[degreeId];
  const progress = player.degreeProgress[degreeId] || 0;
  if (progress < degree.sessionsRequired) return false;
  store.completeDegree(player.id, degreeId);
  return true;
}
