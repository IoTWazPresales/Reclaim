/**
 * Canonical guided set-completion semantics shared by in-app Done, phone SET_DONE,
 * and watch SET_DONE. Keeps rest duration, snapshot shape, and scheduling aligned.
 */

import type { TrainingSessionItemRow } from '@/lib/api';
import { getExerciseById } from '@/lib/training/engine';
import {
  buildGuidedActiveSessionSnapshot,
  type GuidedActiveSessionSnapshot,
} from '@/lib/training/guidedActiveSessionSnapshot';
import { resolveRestPeriodAfterCompletingSet } from '@/lib/training/guidedPhoneRestTransition';

export type PlannedSetLike = { setIndex: number; restSeconds?: number };

/**
 * Rest seconds after completing `completedSetIndex`, matching in-app
 * `resolveRestPeriodAfterCompletingSet` (RPE unknown on watch → normal autoreg only).
 */
export function computeRestSecondsAfterCompletingSet(
  plannedSets: PlannedSetLike[] | undefined,
  completedSetIndex: number,
  rpe?: number,
): number {
  const planned = plannedSets ?? [];
  const adj = resolveRestPeriodAfterCompletingSet(planned as Parameters<typeof resolveRestPeriodAfterCompletingSet>[0], completedSetIndex, rpe);
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

/**
 * After notification SET_DONE persisted the log, refresh guided snapshot so acceptance /
 * resume logic sees the upcoming work (next session item + set index), not stale focus.
 */
export function buildGuidedSnapshotAfterNotificationSetDone(args: {
  sessionId: string;
  items: TrainingSessionItemRow[];
  nextSessionItemId: string;
  nextExerciseId: string;
  nextSetIndex: number;
  restSecondsAfterCompleted: number;
}): GuidedActiveSessionSnapshot | null {
  const sorted = [...args.items].sort((a, b) => a.order_index - b.order_index);
  const uiIdx = sorted.findIndex((i) => i.id === args.nextSessionItemId);
  if (uiIdx < 0) return null;

  const meta = getExerciseById(args.nextExerciseId);
  const phase = args.restSecondsAfterCompleted > 0 ? 'rest' : 'work';
  const total = Math.max(0, args.restSecondsAfterCompleted);

  return buildGuidedActiveSessionSnapshot({
    sessionId: args.sessionId,
    currentItem: { id: args.nextSessionItemId, exercise_id: args.nextExerciseId },
    exerciseName: meta?.name ?? null,
    uiExerciseIndex: uiIdx,
    currentSetIndex: Math.max(1, args.nextSetIndex),
    phase,
    restTotalSeconds: phase === 'rest' ? total : null,
    restRemainingSeconds: phase === 'rest' ? total : null,
    restPaused: false,
  });
}
