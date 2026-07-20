/**
 * Canonical guided set-completion semantics shared by in-app Done, phone SET_DONE,
 * and watch SET_DONE. Keeps rest duration, snapshot shape, and scheduling aligned.
 */

import type { TrainingSessionItemRow } from '@/lib/api';
import { resolveRestPeriodAfterCompletingSet } from '@/lib/training/guidedPhoneRestTransition';

export type PlannedSetLike = { setIndex: number; restSeconds?: number };

/**
 * Rest seconds after completing `completedSetIndex`, matching in-app
 * `resolveRestPeriodAfterCompletingSet` (RPE unknown on watch → normal autoreg only).
 * Pass `hasNextExercise` so between-exercise rest matches phone Done.
 */
export function computeRestSecondsAfterCompletingSet(
  plannedSets: PlannedSetLike[] | undefined,
  completedSetIndex: number,
  rpe?: number,
  options?: { hasNextExercise?: boolean; betweenExerciseRestSeconds?: number },
): number {
  const planned = plannedSets ?? [];
  const adj = resolveRestPeriodAfterCompletingSet(
    planned as Parameters<typeof resolveRestPeriodAfterCompletingSet>[0],
    completedSetIndex,
    rpe,
    options,
  );
  return adj ? adj.restSeconds : 0;
}

/**
 * True if this set is already present in performed data (stale notification / duplicate tap).
 */
export function isSetAlreadyPerformedOnItem(
  item: TrainingSessionItemRow | null | undefined,
  setIndex: number,
): boolean {
  if (!item?.performed?.sets?.length) return false;
  return item.performed.sets.some((s: { setIndex: number }) => s.setIndex === setIndex);
}

