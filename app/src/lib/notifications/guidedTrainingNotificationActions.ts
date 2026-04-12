import * as Notifications from 'expo-notifications';
import { safeNavigate } from '@/navigation/nav';
import { logger } from '@/lib/logger';
import { setIntent, clearIntent, hasIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import { wasActionProcessed, markActionProcessed } from '@/lib/notifications/ActionIdempotencyStore';
import {
  scheduleTrainingRest,
  scheduleTrainingSet,
  scheduleTrainingSetImmediate,
  type TrainingNotificationNext,
} from '@/lib/notifications/trainingNotificationScheduler';
import { queryClient } from '@/lib/queryClient';
import { logTrainingSet } from '@/data/TrainingRepository';
import { buildSetLogPayload, buildSetLogQueuePayload } from '@/lib/training/runtime/payloadBuilder';
import { enqueueOperation } from '@/lib/training/offlineQueue';

export type TrainingReminderData = {
  type: 'TRAINING_REMINDER';
  sessionId?: string;
  programDayId?: string;
};

export type TrainingSetActionData = {
  type: 'TRAINING_SET';
  sessionId?: string;
  sessionItemId?: string;
  exerciseId?: string;
  exerciseName?: string;
  setIndex?: number;
  suggestedWeight?: number;
  targetReps?: number;
  sessionComplete?: boolean;
  nextSessionItemId?: string;
  nextExerciseId?: string;
  nextExerciseName?: string;
  nextSetIndex?: number;
  nextSetWeight?: number;
  nextSetReps?: number;
  nextRestSeconds?: number;
  nextAfterSessionItemId?: string;
  nextAfterExerciseId?: string;
  nextAfterExerciseName?: string;
  nextAfterSetIndex?: number;
  nextAfterSetWeight?: number;
  nextAfterSetReps?: number;
  nextAfterRestSeconds?: number;
  nextNextAfterSessionItemId?: string;
  nextNextAfterExerciseId?: string;
  nextNextAfterExerciseName?: string;
  nextNextAfterSetIndex?: number;
  nextNextAfterSetWeight?: number;
  nextNextAfterSetReps?: number;
  nextNextAfterRestSeconds?: number;
};

export type TrainingRestData = {
  type: 'TRAINING_REST';
  sessionId?: string;
  sessionItemId?: string;
  exerciseId?: string;
  exerciseName?: string;
  setIndex?: number;
  nextSessionItemId?: string;
  nextExerciseId?: string;
  nextExerciseName?: string;
  nextSetIndex?: number;
  nextSetWeight?: number;
  nextSetReps?: number;
  nextRestSeconds?: number;
  nextAfterSessionItemId?: string;
  nextAfterExerciseId?: string;
  nextAfterExerciseName?: string;
  nextAfterSetIndex?: number;
  nextAfterSetWeight?: number;
  nextAfterSetReps?: number;
  nextAfterRestSeconds?: number;
  nextNextAfterSessionItemId?: string;
  nextNextAfterExerciseId?: string;
  nextNextAfterExerciseName?: string;
  nextNextAfterSetIndex?: number;
  nextNextAfterSetWeight?: number;
  nextNextAfterSetReps?: number;
  nextNextAfterRestSeconds?: number;
  sessionComplete?: boolean;
};

export type TrainingNotificationData =
  | TrainingReminderData
  | TrainingSetActionData
  | TrainingRestData;

type HandleTrainingActionParams = {
  action: string;
  key: string;
  response: Notifications.NotificationResponse;
  data: TrainingNotificationData;
  trainingNotifLog?: (message: string, payload?: Record<string, unknown>) => void;
};

const TRAINING_SET_RETRY_ATTEMPTS = 3;
const TRAINING_SET_RETRY_DELAY_MS = 500;

async function logTrainingSetWithRetry(payload: {
  id: string;
  sessionItemId: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
}): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < TRAINING_SET_RETRY_ATTEMPTS; attempt++) {
    try {
      await logTrainingSet({
        id: payload.id,
        sessionItemId: payload.sessionItemId,
        setIndex: payload.setIndex,
        weight: payload.weight,
        reps: payload.reps,
        rpe: payload.rpe,
        completedAt: payload.completedAt,
      });
      return;
    } catch (e) {
      lastError = e;
      if (attempt < TRAINING_SET_RETRY_ATTEMPTS - 1) {
        logger.debug('[NOTIF_ACTION] logTrainingSet retry', { attempt: attempt + 1, sessionItemId: payload.sessionItemId });
        await new Promise((r) => setTimeout(r, TRAINING_SET_RETRY_DELAY_MS));
      }
    }
  }
  const queuePayload = buildSetLogQueuePayload(
    payload.sessionItemId,
    payload.exerciseId,
    payload.setIndex,
    payload.weight,
    payload.reps,
    payload.rpe ?? null,
  );
  await enqueueOperation({ ...queuePayload, id: payload.id } as any);
  logger.warn('[NOTIF_ACTION] logTrainingSet failed, enqueued for sync', { sessionItemId: payload.sessionItemId, error: lastError });
}

export async function handleGuidedTrainingNotificationAction({
  action,
  key,
  response,
  data,
  trainingNotifLog,
}: HandleTrainingActionParams): Promise<boolean> {
  if (data.type === 'TRAINING_REMINDER') {
    if (action === 'START_SESSION') {
      await markActionProcessed(key);
      safeNavigate('App', {
        screen: 'Training',
      });
      return true;
    }
    if (action === 'SNOOZE_15') {
      try {
        const triggerDate = new Date(Date.now() + 15 * 60 * 1000);
        const content = response.notification.request.content;
        const trainingSnoozeKey = `training_snooze:${response.notification.request.identifier}`;
        await setIntent(trainingSnoozeKey, {
          type: 'TRAINING_REMINDER',
          action: 'snooze_15',
          triggerDate: triggerDate.toISOString(),
          title: content.title ?? 'Training Reminder',
          body: content.body ?? '',
          data: content.data,
          channelId: 'default',
        });
        logger.debug('[NOTIF_CUTOVER] training snooze 15m → intent + reconcile');
        await reconcileNotifications();
        await markActionProcessed(key);
      } catch (err) {
        logger.warn('Failed to snooze training notification:', err);
      }
      return true;
    }
    return false;
  }

  if (data.type === 'TRAINING_SET') {
    if (action === 'EDIT_SET') {
      await markActionProcessed(key);
      safeNavigate('App', {
        screen: 'Training',
        params: {
          notification: {
            action: 'edit_set',
            sessionId: data.sessionId,
            exerciseId: data.exerciseId,
            setIndex: data.setIndex,
          },
        },
      });
      return true;
    }

    if (action === 'SET_DONE') {
      try {
        const sessionId = data.sessionId;
        trainingNotifLog?.('onAction', {
          action: 'SET_DONE',
          sessionId,
          exerciseId: data.exerciseId,
          setIndex: data.setIndex,
        });
        const sessionItemId = data.sessionItemId ?? data.sessionId;
        const exerciseId = data.exerciseId;
        const setIndex = data.setIndex ?? 1;
        const weight = data.suggestedWeight ?? 0;
        const reps = data.targetReps ?? 10;
        if (!sessionId || !sessionItemId || !exerciseId) {
          logger.warn('[NOTIF_ACTION] SET_DONE missing required fields', data);
          safeNavigate('App', { screen: 'Training' });
          return true;
        }

        const setIntentKey = `training_set:${sessionId}:${exerciseId}:${setIndex}`;
        const firstIntentKey = `training_first:${sessionId}:${exerciseId}:1`;
        const intentActive =
          await hasIntent(setIntentKey) ||
          (setIndex === 1 && await hasIntent(firstIntentKey));
        if (__DEV__) {
          logger.debug('[NOTIF_ACTION] SET_DONE intent check', {
            sessionId,
            exerciseId,
            setIndex,
            setIntentKey,
            firstIntentKey,
            intentActive,
          });
        }
        if (!intentActive) {
          logger.debug('[NOTIF_ACTION] SET_DONE: no matching intent (stale notification), skipping');
          return true;
        }

        const idempotencyKey = `set_done:${sessionId}:${exerciseId}:${setIndex}`;
        if (await wasActionProcessed(idempotencyKey)) {
          logger.debug('[NOTIF_ACTION] SET_DONE already processed, skipping', { setIndex, exerciseId });
          await markActionProcessed(key);
          queryClient.invalidateQueries({ queryKey: ['training'] });
          return true;
        }

        await clearIntent(setIntentKey);
        if (setIndex === 1) {
          await clearIntent(firstIntentKey);
        }

        if (!data.sessionComplete && data.nextSessionItemId && data.nextExerciseId != null && data.nextSetIndex != null) {
          const next: TrainingNotificationNext = {
            sessionItemId: data.nextSessionItemId,
            exerciseId: data.nextExerciseId,
            exerciseName: data.nextExerciseName ?? 'Exercise',
            setIndex: data.nextSetIndex,
            suggestedWeight: data.nextSetWeight,
            targetReps: data.nextSetReps,
            restSeconds: data.nextRestSeconds ?? 90,
          };
          let nextAfter: TrainingNotificationNext = null;
          if (
            data.nextAfterSessionItemId &&
            data.nextAfterExerciseId != null &&
            data.nextAfterSetIndex != null
          ) {
            nextAfter = {
              sessionItemId: data.nextAfterSessionItemId,
              exerciseId: data.nextAfterExerciseId,
              exerciseName: data.nextAfterExerciseName ?? 'Exercise',
              setIndex: data.nextAfterSetIndex,
              suggestedWeight: data.nextAfterSetWeight,
              targetReps: data.nextAfterSetReps,
              restSeconds: data.nextAfterRestSeconds ?? 90,
            };
          }
          let nextNextAfter: TrainingNotificationNext = null;
          if (
            data.nextNextAfterSessionItemId &&
            data.nextNextAfterExerciseId != null &&
            data.nextNextAfterSetIndex != null
          ) {
            nextNextAfter = {
              sessionItemId: data.nextNextAfterSessionItemId,
              exerciseId: data.nextNextAfterExerciseId,
              exerciseName: data.nextNextAfterExerciseName ?? 'Exercise',
              setIndex: data.nextNextAfterSetIndex,
              suggestedWeight: data.nextNextAfterSetWeight,
              targetReps: data.nextNextAfterSetReps,
              restSeconds: data.nextNextAfterRestSeconds ?? 90,
            };
          }
          await scheduleTrainingRest({
            sessionId,
            sessionItemId: data.nextSessionItemId,
            exerciseId: data.nextExerciseId,
            exerciseName: next.exerciseName,
            nextSetIndex: next.setIndex,
            nextSetReps: next.targetReps,
            nextSetWeight: next.suggestedWeight,
            next,
            nextAfter,
            nextNextAfter,
            restSecondsTotal: next.restSeconds ?? 90,
          }, { deferReconcile: true });
          await scheduleTrainingSet({
            sessionId,
            sessionItemId: data.nextSessionItemId,
            exerciseId: data.nextExerciseId,
            exerciseName: next.exerciseName,
            setIndex: next.setIndex,
            suggestedWeight: next.suggestedWeight,
            targetReps: next.targetReps,
            seconds: next.restSeconds ?? 90,
            next: nextAfter,
            nextAfter: nextNextAfter ?? undefined,
            sessionComplete: !nextAfter,
          }, { deferReconcile: true });
        }
        await reconcileNotifications();
        await markActionProcessed(idempotencyKey);
        await markActionProcessed(key);

        logger.debug('[NOTIF_ACTION] SET_DONE notifications scheduled', { setIndex, exerciseId });

        const completedAt = new Date().toISOString();
        const payload = buildSetLogPayload(
          sessionItemId,
          sessionId,
          exerciseId,
          setIndex,
          weight,
          reps,
          null,
          completedAt,
        );
        logTrainingSetWithRetry({
          id: payload.id,
          sessionItemId: payload.sessionItemId,
          exerciseId,
          setIndex: payload.setIndex,
          weight: payload.weight,
          reps: payload.reps,
          rpe: payload.rpe ?? undefined,
          completedAt: payload.completedAt,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['training'] });
          queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
          queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
          queryClient.invalidateQueries({ queryKey: ['training:session', sessionId] });
          logger.debug('[NOTIF_ACTION] SET_DONE DB write complete', { setIndex, exerciseId });
        }).catch((err: any) => {
          logger.warn('[NOTIF_ACTION] SET_DONE background DB write failed', err);
        });
      } catch (err: any) {
        logger.warn('[NOTIF_ACTION] SET_DONE failed', err);
        safeNavigate('App', { screen: 'Training' });
      }
      return true;
    }

    if (action === 'SKIP_SET') {
      try {
        const sessionId = data.sessionId;
        const sessionItemId = data.sessionItemId ?? data.sessionId;
        const exerciseId = data.exerciseId;
        const setIndex = data.setIndex ?? 1;
        if (!sessionId || !sessionItemId || !exerciseId) {
          logger.warn('[NOTIF_ACTION] SKIP_SET missing required fields', data);
          safeNavigate('App', { screen: 'Training' });
          return true;
        }
        if (__DEV__) {
          logger.debug('[NOTIF_ACTION] SKIP_SET processing', {
            sessionId,
            exerciseId,
            setIndex,
            sessionComplete: data.sessionComplete,
          });
        }
        await clearIntent(`training_set:${sessionId}:${exerciseId}:${setIndex}`);
        if (setIndex === 1) {
          await clearIntent(`training_first:${sessionId}:${exerciseId}:${setIndex}`);
        }
        await reconcileNotifications();
        if (!data.sessionComplete && data.nextSessionItemId && data.nextExerciseId != null && data.nextSetIndex != null) {
          const next: TrainingNotificationNext = {
            sessionItemId: data.nextSessionItemId,
            exerciseId: data.nextExerciseId,
            exerciseName: data.nextExerciseName ?? 'Exercise',
            setIndex: data.nextSetIndex,
            suggestedWeight: data.nextSetWeight,
            targetReps: data.nextSetReps,
            restSeconds: data.nextRestSeconds ?? 90,
          };
          let nextAfter: TrainingNotificationNext = null;
          if (
            data.nextAfterSessionItemId &&
            data.nextAfterExerciseId != null &&
            data.nextAfterSetIndex != null
          ) {
            nextAfter = {
              sessionItemId: data.nextAfterSessionItemId,
              exerciseId: data.nextAfterExerciseId,
              exerciseName: data.nextAfterExerciseName ?? 'Exercise',
              setIndex: data.nextAfterSetIndex,
              suggestedWeight: data.nextAfterSetWeight,
              targetReps: data.nextAfterSetReps,
              restSeconds: data.nextAfterRestSeconds ?? 90,
            };
          }
          let nextNextAfter: TrainingNotificationNext = null;
          if (
            data.nextNextAfterSessionItemId &&
            data.nextNextAfterExerciseId != null &&
            data.nextNextAfterSetIndex != null
          ) {
            nextNextAfter = {
              sessionItemId: data.nextNextAfterSessionItemId,
              exerciseId: data.nextNextAfterExerciseId,
              exerciseName: data.nextNextAfterExerciseName ?? 'Exercise',
              setIndex: data.nextNextAfterSetIndex,
              suggestedWeight: data.nextNextAfterSetWeight,
              targetReps: data.nextNextAfterSetReps,
              restSeconds: data.nextNextAfterRestSeconds ?? 90,
            };
          }
          await scheduleTrainingRest({
            sessionId,
            sessionItemId: data.nextSessionItemId,
            exerciseId: data.nextExerciseId,
            exerciseName: next.exerciseName,
            nextSetIndex: next.setIndex,
            nextSetReps: next.targetReps,
            nextSetWeight: next.suggestedWeight,
            next,
            nextAfter,
            nextNextAfter,
            restSecondsTotal: next.restSeconds ?? 90,
          });
          await scheduleTrainingSet({
            sessionId,
            sessionItemId: data.nextSessionItemId,
            exerciseId: data.nextExerciseId,
            exerciseName: next.exerciseName,
            setIndex: next.setIndex,
            suggestedWeight: next.suggestedWeight,
            targetReps: next.targetReps,
            seconds: next.restSeconds ?? 90,
            next: nextAfter,
            nextAfter: nextNextAfter ?? undefined,
            sessionComplete: !nextAfter,
          });
        }
        logger.debug('[NOTIF_ACTION] SKIP_SET advanced', { setIndex, exerciseId });
        await markActionProcessed(key);
        queryClient.invalidateQueries({ queryKey: ['training'] });
        queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
        queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
        queryClient.invalidateQueries({ queryKey: ['training:session', sessionId] });
      } catch (err: any) {
        logger.warn('[NOTIF_ACTION] SKIP_SET failed', err);
        safeNavigate('App', { screen: 'Training' });
      }
      return true;
    }

    return false;
  }

  if (data.type === 'TRAINING_REST' && action === 'NEXT_SET') {
    try {
      trainingNotifLog?.('onAction', {
        action: 'NEXT_SET',
        sessionId: data.sessionId,
        exerciseId: data.nextExerciseId,
        setIndex: data.nextSetIndex,
      });
      if (__DEV__) {
        logger.debug('[NOTIF_ACTION] NEXT_SET processing', {
          sessionId: data.sessionId,
          exerciseId: data.nextExerciseId,
          setIndex: data.nextSetIndex,
        });
      }
      if (
        data.nextSessionItemId &&
        data.nextExerciseId != null &&
        data.nextSetIndex != null
      ) {
        const idempotencyKey = `next_set:${data.sessionId}:${data.nextExerciseId}:${data.nextSetIndex}`;
        if (await wasActionProcessed(idempotencyKey)) {
          logger.debug('[NOTIF_ACTION] NEXT_SET already processed, skipping', { setIndex: data.nextSetIndex });
          await markActionProcessed(key);
          queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
          queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
          if (data.sessionId) {
            queryClient.invalidateQueries({ queryKey: ['training:session', data.sessionId] });
          }
          return true;
        }
        const next: TrainingNotificationNext = {
          sessionItemId: data.nextSessionItemId,
          exerciseId: data.nextExerciseId,
          exerciseName: data.nextExerciseName ?? 'Exercise',
          setIndex: data.nextSetIndex,
          suggestedWeight: data.nextSetWeight,
          targetReps: data.nextSetReps,
          restSeconds: data.nextRestSeconds ?? 90,
        };
        let nextAfter: TrainingNotificationNext = null;
        if (
          data.nextAfterSessionItemId &&
          data.nextAfterExerciseId != null &&
          data.nextAfterSetIndex != null
        ) {
          nextAfter = {
            sessionItemId: data.nextAfterSessionItemId,
            exerciseId: data.nextAfterExerciseId,
            exerciseName: data.nextAfterExerciseName ?? 'Exercise',
            setIndex: data.nextAfterSetIndex,
            suggestedWeight: data.nextAfterSetWeight,
            targetReps: data.nextAfterSetReps,
            restSeconds: data.nextAfterRestSeconds ?? 90,
          };
        }
        let nextNextAfter: TrainingNotificationNext = null;
        if (
          data.nextNextAfterSessionItemId &&
          data.nextNextAfterExerciseId != null &&
          data.nextNextAfterSetIndex != null
        ) {
          nextNextAfter = {
            sessionItemId: data.nextNextAfterSessionItemId,
            exerciseId: data.nextNextAfterExerciseId,
            exerciseName: data.nextNextAfterExerciseName ?? 'Exercise',
            setIndex: data.nextNextAfterSetIndex,
            suggestedWeight: data.nextNextAfterSetWeight,
            targetReps: data.nextNextAfterSetReps,
            restSeconds: data.nextNextAfterRestSeconds ?? 90,
          };
        }
        await clearIntent(`training_rest:${data.sessionId}:${data.nextExerciseId}:${data.nextSetIndex ?? 'n/a'}`);
        await clearIntent(`training_set:${data.sessionId}:${data.nextExerciseId}:${data.nextSetIndex}`);
        await scheduleTrainingSetImmediate({
          sessionId: data.sessionId!,
          sessionItemId: data.nextSessionItemId,
          exerciseId: data.nextExerciseId,
          exerciseName: next.exerciseName,
          setIndex: data.nextSetIndex,
          suggestedWeight: data.nextSetWeight,
          targetReps: data.nextSetReps,
          next: nextAfter,
          nextAfter: nextNextAfter ?? undefined,
          sessionComplete: !nextAfter,
        });
        await markActionProcessed(idempotencyKey);
        await markActionProcessed(key);
        logger.debug('[NOTIF_ACTION] NEXT_SET scheduled', { setIndex: data.nextSetIndex });
        queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
        queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
        if (data.sessionId) {
          queryClient.invalidateQueries({ queryKey: ['training:session', data.sessionId] });
        }
      } else {
        safeNavigate('App', { screen: 'Training' });
      }
    } catch (err: any) {
      logger.warn('[NOTIF_ACTION] NEXT_SET failed', err);
      safeNavigate('App', { screen: 'Training' });
    }
    return true;
  }

  return false;
}
