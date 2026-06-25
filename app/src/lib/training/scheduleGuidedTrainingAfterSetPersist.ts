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
import { logger } from '@/lib/logger';
import { clearIntent } from '@/lib/notifications/NotificationIntentStore';
import {
  buildNotificationWorkChain,
  type NotificationWorkChain,
} from '@/lib/training/trainingNotificationWorkPlan';

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

/** Load pending work chain from persisted session (DB SSOT). */
export async function loadGuidedTrainingNotificationWorkChain(
  sessionId: string,
): Promise<NotificationWorkChain> {
  const { items } = await getTrainingSession(sessionId);
  return buildNotificationWorkChain(items);
}

/**
 * After rest completes (NEXT_SET), schedule immediate set notification from DB-derived
 * pending work — not frozen TRAINING_REST payload lookahead.
 */
export async function scheduleGuidedTrainingNextSetFromDb(
  sessionId: string,
  options?: { deferReconcile?: boolean; chain?: NotificationWorkChain },
): Promise<ScheduleGuidedTrainingAfterSetPersistResult> {
  const chain = options?.chain ?? (await loadGuidedTrainingNotificationWorkChain(sessionId));

  if (chain.sessionComplete || !chain.next) {
    logger.debug('[GUIDED_SCHEDULE] NEXT_SET — session complete, no pending set', { sessionId });
    return {
      restSecondsAfterCompleted: 0,
      sessionComplete: true,
      nextSetIndex: null,
      nextExerciseId: null,
      nextSessionItemId: null,
    };
  }

  const { sessionItemId, exerciseId, setIndex, exerciseName, suggestedWeight, targetReps } =
    chain.next;

  await clearIntent(`training_rest:${sessionId}:${exerciseId}:${setIndex}`);
  await clearIntent(`training_set:${sessionId}:${exerciseId}:${setIndex}`);

  const scheduleOpts = { deferReconcile: options?.deferReconcile ?? true };

  await scheduleTrainingSetImmediate(
    {
      sessionId,
      sessionItemId,
      exerciseId,
      exerciseName,
      setIndex,
      suggestedWeight,
      targetReps,
      next: chain.nextAfter,
      nextAfter: chain.nextNextAfter ?? undefined,
      sessionComplete: !chain.nextAfter,
    },
    scheduleOpts,
  );

  logger.debug('[GUIDED_SCHEDULE] NEXT_SET immediate set from DB chain', {
    sessionId,
    exerciseId,
    setIndex,
  });

  return {
    restSecondsAfterCompleted: 0,
    sessionComplete: false,
    nextSetIndex: setIndex,
    nextExerciseId: exerciseId,
    nextSessionItemId: sessionItemId,
  };
}

/** Reschedule delayed set notification after in-app rest extend (DB-derived chain). */
export async function rescheduleGuidedTrainingPendingSetNotification(
  sessionId: string,
  remainingSeconds: number,
  options?: { deferReconcile?: boolean; chain?: NotificationWorkChain },
): Promise<string | null> {
  const chain = options?.chain ?? (await loadGuidedTrainingNotificationWorkChain(sessionId));
  if (chain.sessionComplete || !chain.next) return null;

  const { sessionItemId, exerciseId, exerciseName, setIndex, suggestedWeight, targetReps } =
    chain.next;

  await clearIntent(`training_set:${sessionId}:${exerciseId}:${setIndex}`);

  const key = await scheduleTrainingSet(
    {
      sessionId,
      sessionItemId,
      exerciseId,
      exerciseName,
      setIndex,
      suggestedWeight,
      targetReps,
      seconds: Math.max(1, Math.floor(remainingSeconds)),
      next: chain.nextAfter,
      nextAfter: chain.nextNextAfter ?? undefined,
      sessionComplete: !chain.nextAfter,
    },
    { deferReconcile: options?.deferReconcile ?? true },
  );

  logger.debug('[GUIDED_SCHEDULE] rescheduled pending set notification', {
    sessionId,
    exerciseId,
    setIndex,
    remainingSeconds,
  });

  return key;
}
