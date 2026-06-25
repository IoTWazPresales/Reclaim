/**
 * After a set is persisted, load session from DB and schedule rest/set notifications
 * from derived pending work — not stale notification payload lookahead.
 */

import { getTrainingSession } from '@/lib/api';
import { computeRestSecondsAfterCompletingSet } from '@/lib/training/guidedSetCompletionCanonical';
import {
  scheduleTrainingRest,
  scheduleTrainingSet,
  scheduleTrainingSetImmediate,
} from '@/lib/notifications/trainingNotificationScheduler';
import { buildNotificationWorkChain } from '@/lib/training/trainingNotificationWorkPlan';
import { logger } from '@/lib/logger';

export type ScheduleGuidedTrainingAfterSetPersistInput = {
  sessionId: string;
  completedSessionItemId: string;
  completedSetIndex: number;
  rpe?: number;
};

export type ScheduleGuidedTrainingAfterSetPersistResult = {
  restSecondsAfterCompleted: number;
  sessionComplete: boolean;
  nextSetIndex: number | null;
  nextExerciseId: string | null;
  nextSessionItemId: string | null;
};

export async function scheduleGuidedTrainingAfterSetPersist(
  input: ScheduleGuidedTrainingAfterSetPersistInput,
  options?: { deferReconcile?: boolean },
): Promise<ScheduleGuidedTrainingAfterSetPersistResult> {
  const { session, items } = await getTrainingSession(input.sessionId);
  void session;

  const completedItem = items.find((i) => i.id === input.completedSessionItemId);
  const chain = buildNotificationWorkChain(items);

  const restSecondsAfterCompleted = chain.sessionComplete
    ? 0
    : computeRestSecondsAfterCompletingSet(
        completedItem?.planned?.sets,
        input.completedSetIndex,
        input.rpe,
      );

  if (chain.sessionComplete || !chain.next) {
    logger.debug('[GUIDED_SCHEDULE] session complete after persist — no next notifications', {
      sessionId: input.sessionId,
      completedSetIndex: input.completedSetIndex,
    });
    return {
      restSecondsAfterCompleted: 0,
      sessionComplete: true,
      nextSetIndex: null,
      nextExerciseId: null,
      nextSessionItemId: null,
    };
  }

  const scheduleOpts = { deferReconcile: options?.deferReconcile ?? true };

  if (restSecondsAfterCompleted > 0) {
    await scheduleTrainingRest(
      {
        sessionId: input.sessionId,
        sessionItemId: chain.next.sessionItemId,
        exerciseId: chain.next.exerciseId,
        exerciseName: chain.next.exerciseName,
        nextSetIndex: chain.next.setIndex,
        nextSetReps: chain.next.targetReps,
        nextSetWeight: chain.next.suggestedWeight,
        next: chain.next,
        nextAfter: chain.nextAfter,
        nextNextAfter: chain.nextNextAfter,
        restSecondsTotal: restSecondsAfterCompleted,
      },
      scheduleOpts,
    );
    await scheduleTrainingSet(
      {
        sessionId: input.sessionId,
        sessionItemId: chain.next.sessionItemId,
        exerciseId: chain.next.exerciseId,
        exerciseName: chain.next.exerciseName,
        setIndex: chain.next.setIndex,
        suggestedWeight: chain.next.suggestedWeight,
        targetReps: chain.next.targetReps,
        seconds: restSecondsAfterCompleted,
        next: chain.nextAfter,
        nextAfter: chain.nextNextAfter ?? undefined,
        sessionComplete: !chain.nextAfter,
      },
      scheduleOpts,
    );
  } else {
    await scheduleTrainingSetImmediate({
      sessionId: input.sessionId,
      sessionItemId: chain.next.sessionItemId,
      exerciseId: chain.next.exerciseId,
      exerciseName: chain.next.exerciseName,
      setIndex: chain.next.setIndex,
      suggestedWeight: chain.next.suggestedWeight,
      targetReps: chain.next.targetReps,
      next: chain.nextAfter,
      nextAfter: chain.nextNextAfter ?? undefined,
      sessionComplete: !chain.nextAfter,
    });
  }

  return {
    restSecondsAfterCompleted,
    sessionComplete: false,
    nextSetIndex: chain.next.setIndex,
    nextExerciseId: chain.next.exerciseId,
    nextSessionItemId: chain.next.sessionItemId,
  };
}
