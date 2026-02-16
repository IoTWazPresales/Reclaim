/**
 * Shared training notification scheduling for watch-driven flow.
 * Used by TrainingSessionView and notification handler to schedule TRAINING_REST and TRAINING_SET
 * with full payloads for SET_DONE/NEXT_SET execution without opening the app.
 */
import { setIntent, clearIntentsByPrefix } from './NotificationIntentStore';
import { reconcileNotifications } from './NotificationScheduler';
import { logger } from '@/lib/logger';

/**
 * Clear stale training intents when no session is in progress.
 * Call on app foreground to prevent "Rest complete" / "Session started" notifications
 * after user abandoned a session (force-closed, navigated away).
 * On listTrainingSessions failure (e.g. offline), clears intents as safe default.
 */
export async function clearStaleTrainingIntentsIfNoActiveSession(): Promise<void> {
  let inProgress = false;
  try {
    const { listTrainingSessions } = await import('@/lib/api');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('listTrainingSessions timeout')), 5000)
    );
    const sessions = await Promise.race([listTrainingSessions(10), timeoutPromise]);
    inProgress = (sessions ?? []).some((s: any) => s?.started_at && !s?.ended_at);
  } catch (e) {
    logger.debug('[TRAINING_NOTIF] listTrainingSessions failed, clearing intents (safe default):', (e as Error)?.message);
  }
  if (inProgress) return;

  try {
    await clearIntentsByPrefix('training_rest:');
    await clearIntentsByPrefix('training_set:');
    await clearIntentsByPrefix('training_first:');
    logger.debug('[TRAINING_NOTIF] Cleared stale intents (no active session)');
  } catch (e) {
    logger.debug('[TRAINING_NOTIF] clearIntents failed:', (e as Error)?.message);
  }
}

export type TrainingNotificationNext = {
  sessionItemId: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  suggestedWeight?: number;
  targetReps?: number;
  restSeconds?: number;
} | null;

export type ScheduleRestParams = {
  sessionId: string;
  sessionItemId: string;
  exerciseId: string;
  exerciseName: string;
  nextSetIndex?: number;
  nextSetReps?: number;
  nextSetWeight?: number;
  totalSets?: number;
  /** Next set/exercise to schedule when user taps NEXT_SET */
  next: TrainingNotificationNext;
  /** After that set, what to schedule when user taps SET_DONE (for embedded TRAINING_SET) */
  nextAfter?: TrainingNotificationNext | null;
  /** Seconds for rest timer (for TRAINING_REST body display) */
  restSecondsTotal: number;
};

type ScheduleOptions = {
  deferReconcile?: boolean;
};

export type ScheduleSetParams = {
  sessionId: string;
  sessionItemId: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  suggestedWeight?: number;
  targetReps?: number;
  /** Seconds until this notification fires (rest duration) */
  seconds: number;
  /** Next set/exercise to schedule when user taps SET_DONE */
  next: TrainingNotificationNext;
  /** After that set, what to schedule on its SET_DONE (for chaining) */
  nextAfter?: TrainingNotificationNext | null;
  /** Session has no more sets after this one */
  sessionComplete?: boolean;
};

/**
 * Schedule TRAINING_REST notification (immediate - "Rest started")
 */
export async function scheduleTrainingRest(
  params: ScheduleRestParams,
  options?: ScheduleOptions,
): Promise<void> {
  const key = `training_rest:${params.sessionId}:${params.exerciseId}:${params.nextSetIndex ?? 'n/a'}`;
  const mins = Math.floor(params.restSecondsTotal / 60);
  const secs = Math.max(0, params.restSecondsTotal % 60);
  const restClock = `${mins}:${secs.toString().padStart(2, '0')}`;
  const payload: Record<string, any> = {
    type: 'TRAINING_REST',
    sessionId: params.sessionId,
    sessionItemId: params.sessionItemId,
    exerciseId: params.exerciseId,
    exerciseName: params.exerciseName,
    setIndex: params.nextSetIndex,
    title: 'Rest started',
    body: `${params.exerciseName} • ${restClock} rest`,
  };
  if (params.next) {
    payload.nextSessionItemId = params.next.sessionItemId;
    payload.nextExerciseId = params.next.exerciseId;
    payload.nextExerciseName = params.next.exerciseName;
    payload.nextSetIndex = params.next.setIndex;
    payload.nextSetWeight = params.next.suggestedWeight;
    payload.nextSetReps = params.next.targetReps;
    payload.nextRestSeconds = params.next.restSeconds;
    if (params.nextAfter) {
      payload.nextAfterSessionItemId = params.nextAfter.sessionItemId;
      payload.nextAfterExerciseId = params.nextAfter.exerciseId;
      payload.nextAfterExerciseName = params.nextAfter.exerciseName;
      payload.nextAfterSetIndex = params.nextAfter.setIndex;
      payload.nextAfterSetWeight = params.nextAfter.suggestedWeight;
      payload.nextAfterSetReps = params.nextAfter.targetReps;
      payload.nextAfterRestSeconds = params.nextAfter.restSeconds;
    } else {
      payload.sessionComplete = true;
    }
  } else {
    payload.sessionComplete = true;
  }
  await setIntent(key, payload);
  logger.debug('[TRAINING_NOTIF] Rest intent set', { key });
  if (!options?.deferReconcile) {
    await reconcileNotifications();
  }
}

/**
 * Schedule TRAINING_SET notification (delayed - "Rest complete, do set N")
 */
export async function scheduleTrainingSet(
  params: ScheduleSetParams,
  options?: ScheduleOptions,
): Promise<string> {
  const key = `training_set:${params.sessionId}:${params.exerciseId}:${params.setIndex}`;
  const bodyParts = [`${params.exerciseName} • Set ${params.setIndex}`];
  if (params.suggestedWeight !== undefined && params.targetReps !== undefined) {
    bodyParts.push(`• ${params.suggestedWeight}kg × ${params.targetReps}`);
  }
  const payload: Record<string, any> = {
    type: 'TRAINING_SET',
    sessionId: params.sessionId,
    sessionItemId: params.sessionItemId,
    exerciseId: params.exerciseId,
    exerciseName: params.exerciseName,
    setIndex: params.setIndex,
    suggestedWeight: params.suggestedWeight ?? 0,
    targetReps: params.targetReps ?? 10,
    seconds: Math.max(1, Math.floor(params.seconds)),
    title: 'Rest complete',
    body: bodyParts.join(' '),
  };
  if (params.next) {
    payload.nextSessionItemId = params.next.sessionItemId;
    payload.nextExerciseId = params.next.exerciseId;
    payload.nextExerciseName = params.next.exerciseName;
    payload.nextSetIndex = params.next.setIndex;
    payload.nextSetWeight = params.next.suggestedWeight;
    payload.nextSetReps = params.next.targetReps;
    payload.nextRestSeconds = params.next.restSeconds;
    if (params.nextAfter) {
      payload.nextAfterSessionItemId = params.nextAfter.sessionItemId;
      payload.nextAfterExerciseId = params.nextAfter.exerciseId;
      payload.nextAfterExerciseName = params.nextAfter.exerciseName;
      payload.nextAfterSetIndex = params.nextAfter.setIndex;
      payload.nextAfterSetWeight = params.nextAfter.suggestedWeight;
      payload.nextAfterSetReps = params.nextAfter.targetReps;
      payload.nextAfterRestSeconds = params.nextAfter.restSeconds;
    }
  } else {
    payload.sessionComplete = true;
  }
  await setIntent(key, payload);
  logger.debug('[TRAINING_NOTIF] Set intent set', { key, seconds: params.seconds });
  if (!options?.deferReconcile) {
    await reconcileNotifications();
  }
  return key;
}

/**
 * Schedule immediate "Session started" notification for first set.
 * Fires when guided session begins (after prep period) so the cue goes to watch/phone
 * depending on which device is active.
 */
export async function scheduleTrainingFirstSet(params: {
  sessionId: string;
  sessionItemId: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  suggestedWeight?: number;
  targetReps?: number;
  next: TrainingNotificationNext;
  nextAfter?: TrainingNotificationNext | null;
  sessionComplete?: boolean;
}, options?: ScheduleOptions): Promise<void> {
  const key = `training_first:${params.sessionId}:${params.exerciseId}:${params.setIndex}`;
  const bodyParts = [`${params.exerciseName} • Set ${params.setIndex}`];
  if (params.suggestedWeight !== undefined && params.targetReps !== undefined) {
    bodyParts.push(`• ${params.suggestedWeight}kg × ${params.targetReps}`);
  }
  const payload: Record<string, any> = {
    type: 'TRAINING_SET',
    sessionId: params.sessionId,
    sessionItemId: params.sessionItemId,
    exerciseId: params.exerciseId,
    exerciseName: params.exerciseName,
    setIndex: params.setIndex,
    suggestedWeight: params.suggestedWeight ?? 0,
    targetReps: params.targetReps ?? 10,
    seconds: 0,
    title: 'Session started',
    body: bodyParts.join(' '),
  };
  if (params.next) {
    payload.nextSessionItemId = params.next.sessionItemId;
    payload.nextExerciseId = params.next.exerciseId;
    payload.nextExerciseName = params.next.exerciseName;
    payload.nextSetIndex = params.next.setIndex;
    payload.nextSetWeight = params.next.suggestedWeight;
    payload.nextSetReps = params.next.targetReps;
    payload.nextRestSeconds = params.next.restSeconds;
    if (params.nextAfter) {
      payload.nextAfterSessionItemId = params.nextAfter.sessionItemId;
      payload.nextAfterExerciseId = params.nextAfter.exerciseId;
      payload.nextAfterExerciseName = params.nextAfter.exerciseName;
      payload.nextAfterSetIndex = params.nextAfter.setIndex;
      payload.nextAfterSetWeight = params.nextAfter.suggestedWeight;
      payload.nextAfterSetReps = params.nextAfter.targetReps;
      payload.nextAfterRestSeconds = params.nextAfter.restSeconds;
    }
  } else {
    payload.sessionComplete = true;
  }
  await setIntent(key, payload);
  logger.debug('[TRAINING_NOTIF] First set intent set', { key });
  if (!options?.deferReconcile) {
    await reconcileNotifications();
  }
}

/**
 * Schedule immediate TRAINING_SET (for NEXT_SET tap - "Do set N now")
 */
export async function scheduleTrainingSetImmediate(
  params: Omit<ScheduleSetParams, 'seconds'> & { seconds?: number },
  options?: ScheduleOptions,
): Promise<void> {
  const key = `training_set:${params.sessionId}:${params.exerciseId}:${params.setIndex}:immediate`;
  const payload: Record<string, any> = {
    type: 'TRAINING_SET',
    sessionId: params.sessionId,
    sessionItemId: params.sessionItemId,
    exerciseId: params.exerciseId,
    exerciseName: params.exerciseName,
    setIndex: params.setIndex,
    suggestedWeight: params.suggestedWeight ?? 0,
    targetReps: params.targetReps ?? 10,
    seconds: 0, // immediate
    title: 'Next set',
    body: `${params.exerciseName} • Set ${params.setIndex}`,
  };
  if (params.next) {
    payload.nextSessionItemId = params.next.sessionItemId;
    payload.nextExerciseId = params.next.exerciseId;
    payload.nextExerciseName = params.next.exerciseName;
    payload.nextSetIndex = params.next.setIndex;
    payload.nextSetWeight = params.next.suggestedWeight;
    payload.nextSetReps = params.next.targetReps;
    payload.nextRestSeconds = params.next.restSeconds;
    if (params.nextAfter) {
      payload.nextAfterSessionItemId = params.nextAfter.sessionItemId;
      payload.nextAfterExerciseId = params.nextAfter.exerciseId;
      payload.nextAfterExerciseName = params.nextAfter.exerciseName;
      payload.nextAfterSetIndex = params.nextAfter.setIndex;
      payload.nextAfterSetWeight = params.nextAfter.suggestedWeight;
      payload.nextAfterSetReps = params.nextAfter.targetReps;
      payload.nextAfterRestSeconds = params.nextAfter.restSeconds;
    }
  } else {
    payload.sessionComplete = true;
  }
  await setIntent(key, payload);
  logger.debug('[TRAINING_NOTIF] Set immediate intent', { key });
  if (!options?.deferReconcile) {
    await reconcileNotifications();
  }
}
