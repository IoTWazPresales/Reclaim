/**
 * Single source of truth for in-session work position: DB `performed.sets` on items
 * and `training_sessions.current_exercise_index`. No parallel optimistic maps.
 */

import type { TrainingSessionItemRow, TrainingSessionRow } from '@/lib/api';

export type PerformedSetSlice = {
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
};

export type ActiveWorkTarget = {
  exerciseIndex: number;
  sessionItemId: string;
  exerciseId: string;
  setIndex: number;
};

export function getPerformedSetsFromItem(item: TrainingSessionItemRow): PerformedSetSlice[] {
  const sets = item.performed?.sets ?? [];
  return [...sets]
    .map((s) => ({
      setIndex: s.setIndex,
      weight: s.weight ?? 0,
      reps: s.reps,
      rpe: s.rpe,
      completedAt: s.completedAt,
    }))
    .sort((a, b) => a.setIndex - b.setIndex);
}

export function getLoggedSetIndices(item: TrainingSessionItemRow): number[] {
  return getPerformedSetsFromItem(item).map((s) => s.setIndex);
}

export function isSetPerformedOnItem(item: TrainingSessionItemRow, setIndex: number): boolean {
  return getPerformedSetsFromItem(item).some((s) => s.setIndex === setIndex);
}

export function getFirstPendingSetIndexOnItem(item: TrainingSessionItemRow): number | null {
  if (item.skipped) return null;
  const planned = item.planned?.sets ?? [];
  const done = new Set(getLoggedSetIndices(item));
  const pending = planned.find((p) => !done.has(p.setIndex));
  return pending?.setIndex ?? null;
}

export function isExerciseFullyLoggedOnItem(item: TrainingSessionItemRow): boolean {
  const total = item.planned?.sets?.length ?? 0;
  if (total === 0) return true;
  return getLoggedSetIndices(item).length >= total;
}

/** Clamp DB session cursor to a valid item row index. */
export function resolveExerciseIndexFromSession(
  items: TrainingSessionItemRow[],
  session: Pick<TrainingSessionRow, 'current_exercise_index'> | { current_exercise_index?: number },
): number {
  if (items.length === 0) return 0;
  const raw = session.current_exercise_index ?? 0;
  return Math.min(Math.max(0, raw), items.length - 1);
}

/**
 * First pending set starting at `startExerciseIndex`, scanning forward.
 * Falls back to scanning from 0 if cursor item has no pending work.
 */
export function deriveActiveWorkTarget(
  items: TrainingSessionItemRow[],
  startExerciseIndex: number,
): ActiveWorkTarget | null {
  if (items.length === 0) return null;

  const tryFrom = (from: number): ActiveWorkTarget | null => {
    for (let i = from; i < items.length; i++) {
      const item = items[i];
      if (item.skipped) continue;
      const setIndex = getFirstPendingSetIndexOnItem(item);
      if (setIndex != null) {
        return {
          exerciseIndex: i,
          sessionItemId: item.id,
          exerciseId: item.exercise_id,
          setIndex,
        };
      }
    }
    return null;
  };

  const atCursor = tryFrom(Math.min(Math.max(0, startExerciseIndex), items.length - 1));
  if (atCursor) return atCursor;
  return tryFrom(0);
}

export type NotificationWorkHint = {
  exerciseId?: string;
  sessionItemId?: string;
  setIndex?: number;
};

export type NotificationPresentation = {
  /** Canonical work target from session data. */
  work: ActiveWorkTarget | null;
  /** Notification referenced a set behind DB pending (stale tile). */
  staleHint: boolean;
  /** Exercise index to align cursor when opening from notification. */
  cursorExerciseIndex: number;
};

/**
 * Notifications are commands/hints only — UI position comes from `deriveActiveWorkTarget`.
 */
export function resolveNotificationPresentation(
  items: TrainingSessionItemRow[],
  cursorExerciseIndex: number,
  hint?: NotificationWorkHint,
): NotificationPresentation {
  let cursor = resolveExerciseIndexFromSession(items, { current_exercise_index: cursorExerciseIndex });

  if (hint?.exerciseId) {
    const idx = items.findIndex((i) => i.exercise_id === hint.exerciseId);
    if (idx >= 0) cursor = idx;
  } else if (hint?.sessionItemId) {
    const idx = items.findIndex((i) => i.id === hint.sessionItemId);
    if (idx >= 0) cursor = idx;
  }

  const work = deriveActiveWorkTarget(items, cursor);
  let staleHint = false;

  if (work && hint?.setIndex != null && hint.setIndex !== work.setIndex) {
    const hintItem =
      hint.sessionItemId != null
        ? items.find((i) => i.id === hint.sessionItemId)
        : hint.exerciseId != null
          ? items.find((i) => i.exercise_id === hint.exerciseId)
          : items[work.exerciseIndex];

    if (hintItem) {
      const pendingOnHintItem = getFirstPendingSetIndexOnItem(hintItem);
      if (pendingOnHintItem != null && hint.setIndex < pendingOnHintItem) {
        staleHint = true;
      } else if (isSetPerformedOnItem(hintItem, hint.setIndex) && hint.setIndex !== work.setIndex) {
        staleHint = true;
      }
    }
  }

  return { work, staleHint, cursorExerciseIndex: work?.exerciseIndex ?? cursor };
}
