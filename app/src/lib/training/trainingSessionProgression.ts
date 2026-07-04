/**
 * Pure session progression from DB-shaped items — pending work, notification chain,
 * and in-memory simulation helpers for tests (no I/O).
 */

import type { TrainingSessionItemRow } from '@/lib/api';
import { getExerciseById } from '@/lib/training/engine';
import { getLoggedSetIndices, type ActiveWorkTarget } from '@/lib/training/sessionWorkAuthority';
import { mergePerformedSetSlices } from '@/lib/training/trainingSetCompletionMerge';

export type PendingWorkTarget = ActiveWorkTarget;

/** Display-ready description of a pending set, derived from DB items at read time. */
export type TrainingNotificationNext = {
  sessionItemId: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  suggestedWeight?: number;
  targetReps?: number;
  restSeconds?: number;
} | null;

export type NotificationWorkChain = {
  pending: PendingWorkTarget[];
  next: TrainingNotificationNext;
  sessionComplete: boolean;
};

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

export function buildNotificationWorkChain(items: TrainingSessionItemRow[]): NotificationWorkChain {
  const pending = listPendingWorkTargets(items);
  return {
    pending,
    next: workTargetToNotificationNext(items, pending[0]),
    sessionComplete: pending.length === 0,
  };
}

/** In-memory log set — returns new items array (test / simulation only). */
export function simulateLogSetOnItems(
  items: TrainingSessionItemRow[],
  sessionItemId: string,
  setIndex: number,
  weight: number,
  reps: number,
  completedAt = '2026-06-24T12:00:00.000Z',
): TrainingSessionItemRow[] {
  return items.map((item) => {
    if (item.id !== sessionItemId) return item;
    const merged = mergePerformedSetSlices(item.performed?.sets ?? [], [
      { setIndex, weight, reps, completedAt },
    ]);
    return { ...item, performed: { sets: merged } };
  });
}

/** In-memory skip set — zero-weight log (test / simulation only). */
export function simulateSkipSetOnItems(
  items: TrainingSessionItemRow[],
  sessionItemId: string,
  setIndex: number,
  completedAt = '2026-06-24T12:00:00.000Z',
): TrainingSessionItemRow[] {
  return simulateLogSetOnItems(items, sessionItemId, setIndex, 0, 0, completedAt);
}

/** Mark exercise skipped — removes its sets from pending chain. */
export function simulateSkipExerciseOnItems(
  items: TrainingSessionItemRow[],
  sessionItemId: string,
): TrainingSessionItemRow[] {
  return items.map((item) =>
    item.id === sessionItemId ? { ...item, skipped: true } : item,
  );
}
