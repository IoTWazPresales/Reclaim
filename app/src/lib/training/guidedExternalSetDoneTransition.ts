/**
 * Watch / notification SET_DONE → in-app WORK → REST → NEXT WORK alignment.
 * Pure evaluation + rest notification context construction (testable without RN).
 */

import type { TrainingSessionItemRow } from '@/lib/api';
import { getFirstPendingSetIndexOnItem } from '@/lib/training/sessionWorkAuthority';
import { getExerciseById } from '@/lib/training/engine';
import type { TrainingNotificationNext } from '@/lib/notifications/trainingNotificationScheduler';

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

export type RestNotificationContextShape = {
  sessionId: string;
  sessionItemId: string;
  exerciseId: string;
  exerciseName: string;
  nextSetIndex?: number;
  nextSetReps?: number;
  nextSetWeight?: number;
  totalSets?: number;
  next: TrainingNotificationNext;
  nextAfter: TrainingNotificationNext;
  nextNextAfter: TrainingNotificationNext;
  restSeconds: number;
};

type ItemLike = {
  id: string;
  exercise_id: string;
  skipped?: boolean;
  planned?: { sets?: Array<{ setIndex: number; suggestedWeight?: number; targetReps?: number; restSeconds?: number }> };
};

export function buildGuidedRestNotificationContextAfterCompletedSet(args: {
  sessionId: string;
  items: ItemLike[];
  completedSessionItemId: string;
  completedExerciseId: string;
  completedSetIndex: number;
  restSeconds: number;
}): RestNotificationContextShape | null {
  const {
    sessionId,
    items,
    completedSessionItemId,
    completedExerciseId,
    completedSetIndex,
    restSeconds,
  } = args;

  const currentItem = items.find((i) => i.id === completedSessionItemId);
  if (!currentItem || currentItem.exercise_id !== completedExerciseId) return null;

  const plannedSets = currentItem.planned?.sets || [];
  const exerciseMeta = getExerciseById(currentItem.exercise_id);
  const currentIdx = items.findIndex((item) => item.id === currentItem.id);

  const nextSet = plannedSets.find((s) => s.setIndex === completedSetIndex + 1);
  let next: TrainingNotificationNext = null;
  let nextAfter: TrainingNotificationNext = null;
  let nextNextAfter: TrainingNotificationNext = null;

  if (nextSet) {
    next = {
      sessionItemId: currentItem.id,
      exerciseId: currentItem.exercise_id,
      exerciseName: exerciseMeta?.name ?? 'Exercise',
      setIndex: nextSet.setIndex,
      suggestedWeight: nextSet.suggestedWeight,
      targetReps: nextSet.targetReps,
      restSeconds: nextSet.restSeconds ?? 90,
    };
    const setAfterNext = plannedSets.find((s) => s.setIndex === completedSetIndex + 2);
    if (setAfterNext) {
      nextAfter = {
        sessionItemId: currentItem.id,
        exerciseId: currentItem.exercise_id,
        exerciseName: exerciseMeta?.name ?? 'Exercise',
        setIndex: setAfterNext.setIndex,
        suggestedWeight: setAfterNext.suggestedWeight,
        targetReps: setAfterNext.targetReps,
        restSeconds: setAfterNext.restSeconds ?? 90,
      };
      const setThreeAhead = plannedSets.find((s) => s.setIndex === completedSetIndex + 3);
      if (setThreeAhead) {
        nextNextAfter = {
          sessionItemId: currentItem.id,
          exerciseId: currentItem.exercise_id,
          exerciseName: exerciseMeta?.name ?? 'Exercise',
          setIndex: setThreeAhead.setIndex,
          suggestedWeight: setThreeAhead.suggestedWeight,
          targetReps: setThreeAhead.targetReps,
          restSeconds: setThreeAhead.restSeconds ?? 90,
        };
      } else {
        const nextItem = items[currentIdx + 1];
        if (nextItem && !nextItem.skipped) {
          const nextExMeta = getExerciseById(nextItem.exercise_id);
          const firstSet = nextItem.planned?.sets?.[0];
          if (firstSet) {
            nextNextAfter = {
              sessionItemId: nextItem.id,
              exerciseId: nextItem.exercise_id,
              exerciseName: nextExMeta?.name ?? 'Exercise',
              setIndex: firstSet.setIndex ?? 1,
              suggestedWeight: firstSet.suggestedWeight,
              targetReps: firstSet.targetReps,
              restSeconds: firstSet.restSeconds ?? 90,
            };
          }
        }
      }
    } else {
      const nextItem = items[currentIdx + 1];
      if (nextItem && !nextItem.skipped) {
        const nextExMeta = getExerciseById(nextItem.exercise_id);
        const firstSet = nextItem.planned?.sets?.[0];
        nextAfter = {
          sessionItemId: nextItem.id,
          exerciseId: nextItem.exercise_id,
          exerciseName: nextExMeta?.name ?? 'Exercise',
          setIndex: firstSet?.setIndex ?? 1,
          suggestedWeight: firstSet?.suggestedWeight,
          targetReps: firstSet?.targetReps,
          restSeconds: firstSet?.restSeconds ?? 90,
        };
        const secondSet = nextItem.planned?.sets?.[1];
        if (secondSet) {
          nextNextAfter = {
            sessionItemId: nextItem.id,
            exerciseId: nextItem.exercise_id,
            exerciseName: nextExMeta?.name ?? 'Exercise',
            setIndex: secondSet.setIndex,
            suggestedWeight: secondSet.suggestedWeight,
            targetReps: secondSet.targetReps,
            restSeconds: secondSet.restSeconds ?? 90,
          };
        }
      }
    }
  } else {
    const nextItem = items[currentIdx + 1];
    if (nextItem && !nextItem.skipped) {
      const nextExMeta = getExerciseById(nextItem.exercise_id);
      const firstSet = nextItem.planned?.sets?.[0];
      next = {
        sessionItemId: nextItem.id,
        exerciseId: nextItem.exercise_id,
        exerciseName: nextExMeta?.name ?? 'Exercise',
        setIndex: firstSet?.setIndex ?? 1,
        suggestedWeight: firstSet?.suggestedWeight,
        targetReps: firstSet?.targetReps,
        restSeconds: firstSet?.restSeconds ?? 90,
      };
      const secondSet = nextItem.planned?.sets?.[1];
      if (secondSet) {
        nextAfter = {
          sessionItemId: nextItem.id,
          exerciseId: nextItem.exercise_id,
          exerciseName: nextExMeta?.name ?? 'Exercise',
          setIndex: secondSet.setIndex,
          suggestedWeight: secondSet.suggestedWeight,
          targetReps: secondSet.targetReps,
          restSeconds: secondSet.restSeconds ?? 90,
        };
        const thirdSet = nextItem.planned?.sets?.[2];
        if (thirdSet) {
          nextNextAfter = {
            sessionItemId: nextItem.id,
            exerciseId: nextItem.exercise_id,
            exerciseName: nextExMeta?.name ?? 'Exercise',
            setIndex: thirdSet.setIndex,
            suggestedWeight: thirdSet.suggestedWeight,
            targetReps: thirdSet.targetReps,
            restSeconds: thirdSet.restSeconds ?? 90,
          };
        } else {
          const nextNextItem = items[currentIdx + 2];
          if (nextNextItem && !nextNextItem.skipped) {
            const nextNextExMeta = getExerciseById(nextNextItem.exercise_id);
            const firstSetNN = nextNextItem.planned?.sets?.[0];
            if (firstSetNN) {
              nextNextAfter = {
                sessionItemId: nextNextItem.id,
                exerciseId: nextNextItem.exercise_id,
                exerciseName: nextNextExMeta?.name ?? 'Exercise',
                setIndex: firstSetNN.setIndex ?? 1,
                suggestedWeight: firstSetNN.suggestedWeight,
                targetReps: firstSetNN.targetReps,
                restSeconds: firstSetNN.restSeconds ?? 90,
              };
            }
          }
        }
      }
    }
  }

  if (!next) {
    return null;
  }

  return {
    sessionId,
    sessionItemId: currentItem.id,
    exerciseId: currentItem.exercise_id,
    exerciseName: exerciseMeta?.name ?? 'Exercise',
    nextSetIndex: next?.setIndex,
    nextSetReps: next?.targetReps,
    nextSetWeight: next?.suggestedWeight,
    totalSets: plannedSets.length,
    next,
    nextAfter,
    nextNextAfter,
    restSeconds,
  };
}
