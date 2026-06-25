/**
 * Watch / notification SET_DONE → in-app WORK → REST → NEXT WORK alignment.
 * Pure evaluation + rest notification context construction (testable without RN).
 */

import type { TrainingSessionItemRow } from '@/lib/api';
import { getFirstPendingSetIndexOnItem } from '@/lib/training/sessionWorkAuthority';

export type GuidedExternalSetDonePayload = {
  completedSessionItemId: string;
  completedExerciseId: string;
  completedSetIndex: number;
  weight: number;
  reps: number;
  completedAtIso: string;
  restSecondsAfterCompleted: number;
  nextSessionItemId: string;
  nextExerciseId: string;
  nextSetIndex: number;
  idempotencyKey: string;
  sourceActionAtMs: number;
  suppressDuplicateCompletionOverlay?: boolean;
};

export type EvaluateGuidedExternalRestResult =
  | { accept: true }
  | { accept: false; reason: string };

export function evaluateGuidedExternalRestTransition(args: {
  items: TrainingSessionItemRow[];
  payload: GuidedExternalSetDonePayload;
}): EvaluateGuidedExternalRestResult {
  const { items, payload } = args;

  const completedItem = items.find((i) => i.id === payload.completedSessionItemId);
  const nextItem = items.find((i) => i.id === payload.nextSessionItemId);
  if (!completedItem || !nextItem) {
    return { accept: false, reason: 'missing_item' };
  }
  if (payload.completedExerciseId !== completedItem.exercise_id) {
    return { accept: false, reason: 'completed_exercise_mismatch' };
  }
  if (payload.nextExerciseId !== nextItem.exercise_id) {
    return { accept: false, reason: 'next_exercise_mismatch' };
  }

  const nextPending = getFirstPendingSetIndexOnItem(nextItem);
  if (nextPending === null) {
    return { accept: false, reason: 'next_exercise_complete' };
  }

  if (nextPending > payload.nextSetIndex) {
    return { accept: false, reason: 'ahead_of_payload' };
  }

  if (nextPending === payload.nextSetIndex) {
    return { accept: true };
  }

  const sameExercise = payload.completedSessionItemId === payload.nextSessionItemId;
  if (
    sameExercise &&
    nextPending === payload.completedSetIndex &&
    payload.nextSetIndex === payload.completedSetIndex + 1
  ) {
    return { accept: true };
  }

  return { accept: false, reason: 'next_mismatch' };
}
