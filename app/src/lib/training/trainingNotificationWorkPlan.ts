/**
 * Derive guided-training notification lookahead from persisted session items (DB SSOT).
 */

import type { TrainingSessionItemRow } from '@/lib/api';
import { getExerciseById } from '@/lib/training/engine';
import {
  getLoggedSetIndices,
  type ActiveWorkTarget,
} from '@/lib/training/sessionWorkAuthority';
import type { TrainingNotificationNext } from '@/lib/notifications/trainingNotificationScheduler';

export type PendingWorkTarget = ActiveWorkTarget;

/** All pending sets in session order (skipped exercises omitted). */
export function listPendingWorkTargets(items: TrainingSessionItemRow[]): PendingWorkTarget[] {
  const targets: PendingWorkTarget[] = [];
  for (let exerciseIndex = 0; exerciseIndex < items.length; exerciseIndex++) {
    const item = items[exerciseIndex];
    if (item.skipped) continue;
    const planned = [...(item.planned?.sets ?? [])].sort((a, b) => a.setIndex - b.setIndex);
    const done = new Set(getLoggedSetIndices(item));
    for (const p of planned) {
      if (!done.has(p.setIndex)) {
        targets.push({
          exerciseIndex,
          sessionItemId: item.id,
          exerciseId: item.exercise_id,
          setIndex: p.setIndex,
        });
      }
    }
  }
  return targets;
}

export function workTargetToNotificationNext(
  items: TrainingSessionItemRow[],
  target: PendingWorkTarget | undefined,
): TrainingNotificationNext {
  if (!target) return null;
  const item = items[target.exerciseIndex];
  if (!item) return null;
  const planned = item.planned?.sets?.find((s) => s.setIndex === target.setIndex);
  if (!planned) return null;
  const meta = getExerciseById(target.exerciseId);
  return {
    sessionItemId: target.sessionItemId,
    exerciseId: target.exerciseId,
    exerciseName: meta?.name ?? 'Exercise',
    setIndex: target.setIndex,
    suggestedWeight: planned.suggestedWeight,
    targetReps: planned.targetReps,
    restSeconds: planned.restSeconds ?? 90,
  };
}

export type NotificationWorkChain = {
  pending: PendingWorkTarget[];
  next: TrainingNotificationNext;
  nextAfter: TrainingNotificationNext;
  nextNextAfter: TrainingNotificationNext;
  sessionComplete: boolean;
};

export function buildNotificationWorkChain(items: TrainingSessionItemRow[]): NotificationWorkChain {
  const pending = listPendingWorkTargets(items);
  return {
    pending,
    next: workTargetToNotificationNext(items, pending[0]),
    nextAfter: workTargetToNotificationNext(items, pending[1]),
    nextNextAfter: workTargetToNotificationNext(items, pending[2]),
    sessionComplete: pending.length === 0,
  };
}
