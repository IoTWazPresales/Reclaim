/**
 * After a set is persisted, load session from DB and schedule rest/set notifications
 * from derived pending work — not stale notification payload lookahead.
 */

import { getTrainingSession, type TrainingSessionItemRow } from '@/lib/api';
import { computeRestSecondsAfterCompletingSet } from '@/lib/training/guidedSetCompletionCanonical';
import {
  scheduleTrainingFirstSet,
  scheduleTrainingRest,
  scheduleTrainingSet,
  scheduleTrainingSetImmediate,
} from '@/lib/notifications/trainingNotificationScheduler';
import { logger } from '@/lib/logger';
import { clearIntent, hasIntent } from '@/lib/notifications/NotificationIntentStore';
import {
  buildNotificationWorkChain,
  listPendingWorkTargets,
  workTargetToNotificationNext,
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

export type ScheduleGuidedTrainingSessionStartResult = {
  scheduled: boolean;
  sessionComplete: boolean;
  firstSetIndex: number | null;
  firstExerciseId: string | null;
};

/**
 * Schedule first-set notification from DB session items — not plan walk or synthetic IDs.
 */
export async function scheduleGuidedTrainingSessionStart(
  sessionId: string,
  options?: {
    deferReconcile?: boolean;
    delaySeconds?: number;
    chain?: NotificationWorkChain;
    items?: TrainingSessionItemRow[];
    skipIfIntentExists?: boolean;
  },
): Promise<ScheduleGuidedTrainingSessionStartResult> {
  let items = options?.items;
  let chain = options?.chain;
  if (!items || !chain) {
    const loaded = await getTrainingSession(sessionId);
    items = loaded.items;
    chain = buildNotificationWorkChain(items);
  }

  if (chain.sessionComplete || !chain.next) {
    logger.debug('[GUIDED_SCHEDULE] session start — no pending work', { sessionId });
    return {
      scheduled: false,
      sessionComplete: true,
      firstSetIndex: null,
      firstExerciseId: null,
    };
  }

  const first = chain.next;

  if (options?.skipIfIntentExists !== false) {
    const firstIntentKey = `training_first:${sessionId}:${first.exerciseId}:${first.setIndex}`;
    const setIntentKey = `training_set:${sessionId}:${first.exerciseId}:${first.setIndex}`;
    try {
      if ((await hasIntent(firstIntentKey)) || (await hasIntent(setIntentKey))) {
        logger.debug('[GUIDED_SCHEDULE] session start skipped — intent already exists', {
          sessionId,
          exerciseId: first.exerciseId,
          setIndex: first.setIndex,
        });
        return {
          scheduled: false,
          sessionComplete: false,
          firstSetIndex: first.setIndex,
          firstExerciseId: first.exerciseId,
        };
      }
    } catch {
      // non-blocking — proceed to schedule
    }
  }

  const pending = listPendingWorkTargets(items);
  const nextNextAfter = workTargetToNotificationNext(items, pending[3]);

  await scheduleTrainingFirstSet(
    {
      sessionId,
      sessionItemId: first.sessionItemId,
      exerciseId: first.exerciseId,
      exerciseName: first.exerciseName,
      setIndex: first.setIndex,
      suggestedWeight: first.suggestedWeight,
      targetReps: first.targetReps,
      next: chain.nextAfter,
      nextAfter: chain.nextNextAfter,
      nextNextAfter,
      sessionComplete: pending.length <= 1,
      delaySeconds: options?.delaySeconds,
    },
    { deferReconcile: options?.deferReconcile ?? true },
  );

  logger.debug('[GUIDED_SCHEDULE] session start first set from DB', {
    sessionId,
    exerciseId: first.exerciseId,
    setIndex: first.setIndex,
    delaySeconds: options?.delaySeconds,
  });

  return {
    scheduled: true,
    sessionComplete: false,
    firstSetIndex: first.setIndex,
    firstExerciseId: first.exerciseId,
  };
}
