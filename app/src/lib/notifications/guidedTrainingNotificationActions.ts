import * as Notifications from 'expo-notifications';
import { safeNavigate } from '@/navigation/nav';
import { logger } from '@/lib/logger';
import { setIntent, clearIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import { wasActionProcessed, markActionProcessed } from '@/lib/notifications/ActionIdempotencyStore';
import {
  scheduleTrainingRest,
  scheduleTrainingSet,
  scheduleTrainingSetImmediate,
  type TrainingNotificationNext,
} from '@/lib/notifications/trainingNotificationScheduler';
import { queryClient } from '@/lib/queryClient';
import {
  computeRestSecondsAfterCompletingSet,
  isSetAlreadyPerformedOnItem,
} from '@/lib/training/guidedSetCompletionCanonical';
import { logTrainingSet, getTrainingSessionItemById } from '@/data/TrainingRepository';
import { buildSetLogPayload, buildSetLogQueuePayload } from '@/lib/training/runtime/payloadBuilder';
import { enqueueOperation } from '@/lib/training/offlineQueue';
import { mergePerformedSetsIntoSessionItemFromDb } from '@/lib/training/trainingSetCompletionPersistence';
import { evaluateGuidedSetDoneAcceptance } from './guidedNotificationActionEvidence';
import type { GuidedTraceDelivery } from '@/lib/training/guidedTransitionTrace';
import { traceGuidedTransition } from '@/lib/training/guidedTransitionTrace';

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
  /** From useNotifications — distinguishes replay vs listener vs background task for traces */
  guidedDelivery?: GuidedTraceDelivery;
};

const TRAINING_SET_RETRY_ATTEMPTS = 3;
const TRAINING_SET_RETRY_DELAY_MS = 500;

/** @returns true if the row was written online; false if enqueued for offline sync */
async function logTrainingSetWithRetry(payload: {
  id: string;
  sessionItemId: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
}): Promise<boolean> {
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
        exerciseId: payload.exerciseId,
      });
      return true;
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
  return false;
}

export async function handleGuidedTrainingNotificationAction({
  action,
  key,
  response,
  data,
  trainingNotifLog,
  guidedDelivery,
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
          await markActionProcessed(key);
          safeNavigate('App', { screen: 'Training' });
          return true;
        }

        const setIntentKey = `training_set:${sessionId}:${exerciseId}:${setIndex}`;
        const firstIntentKey = `training_first:${sessionId}:${exerciseId}:1`;

        const acceptance = await evaluateGuidedSetDoneAcceptance({
          sessionId,
          sessionItemId,
          exerciseId,
          setIndex,
        });
        logger.debug('[GUIDED_NOTIF_ACTION]', {
          phase: 'set_done_gate',
          action: 'SET_DONE',
          actionKey: key,
          decision: acceptance.accept ? 'accept' : 'reject',
          reason: acceptance.reason,
          evidence: acceptance.evidence,
          ...acceptance.detail,
        });

        if (!acceptance.accept) {
          logger.debug('[GUIDED_NOTIF_ACTION] SET_DONE rejected — no intent and state mismatch', {
            reason: acceptance.reason,
            sessionId,
            sessionItemId,
            exerciseId,
            setIndex,
          });
          traceGuidedTransition({
            delivery: guidedDelivery,
            action: 'SET_DONE',
            rejectionReason: acceptance.reason,
            sessionId,
            sessionItemId,
            exerciseId,
            setIndex,
            note: 'evaluateGuidedSetDoneAcceptance',
          });
          await markActionProcessed(key);
          return true;
        }

        const idempotencyKey = `set_done:${sessionId}:${exerciseId}:${setIndex}`;
        if (await wasActionProcessed(idempotencyKey)) {
          logger.debug('[GUIDED_NOTIF_ACTION]', {
            phase: 'set_done_idempotency',
            decision: 'duplicate_skip',
            idempotencyKey,
            setIndex,
            exerciseId,
          });
          traceGuidedTransition({
            delivery: guidedDelivery,
            action: 'SET_DONE',
            acceptanceReason: 'idempotent_duplicate',
            sessionId,
            sessionItemId,
            exerciseId,
            setIndex,
            note: 'ActionIdempotencyStore',
          });
          await markActionProcessed(key);
          queryClient.invalidateQueries({ queryKey: ['training'] });
          return true;
        }

        /** Stale notification payload (e.g. old watch tile still showing set 1) — do not double-log or move backward */
        try {
          const latestBeforeWrite = await getTrainingSessionItemById(sessionItemId);
          if (isSetAlreadyPerformedOnItem(latestBeforeWrite, setIndex)) {
            logger.debug('[GUIDED_NOTIF_ACTION] SET_DONE skipped — set already in performed (stale notification)', {
              sessionItemId,
              setIndex,
            });
            traceGuidedTransition({
              delivery: guidedDelivery,
              action: 'SET_DONE',
              rejectionReason: 'stale_already_performed',
              sessionId,
              sessionItemId,
              exerciseId,
              setIndex,
              note: 'backward_safe_skip',
            });
            await clearIntent(setIntentKey);
            if (setIndex === 1) await clearIntent(firstIntentKey);
            await markActionProcessed(idempotencyKey);
            await markActionProcessed(key);
            queryClient.invalidateQueries({ queryKey: ['training'] });
            queryClient.invalidateQueries({ queryKey: ['training:session', sessionId] });
            await reconcileNotifications();
            return true;
          }
        } catch (staleErr: unknown) {
          logger.warn('[NOTIF_ACTION] stale-set check failed', staleErr);
        }

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
        const wroteOnline = await logTrainingSetWithRetry({
          id: payload.id,
          sessionItemId: payload.sessionItemId,
          exerciseId,
          setIndex: payload.setIndex,
          weight: payload.weight,
          reps: payload.reps,
          rpe: payload.rpe ?? undefined,
          completedAt: payload.completedAt,
        });
        logger.debug('[GUIDED_NOTIF_ACTION]', {
          phase: 'set_done_persist',
          persistPath: wroteOnline ? 'supabase' : 'offline_queue',
          sessionItemId,
          setIndex,
          exerciseId,
        });
        if (wroteOnline) {
          try {
            await mergePerformedSetsIntoSessionItemFromDb(sessionItemId, [
              {
                setIndex: payload.setIndex,
                weight: payload.weight,
                reps: payload.reps,
                completedAt: payload.completedAt,
              },
            ]);
          } catch (mergeErr: any) {
            logger.warn('[NOTIF_ACTION] SET_DONE performed merge failed', mergeErr);
          }
        }

        queryClient.invalidateQueries({ queryKey: ['training'] });
        queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
        queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
        queryClient.invalidateQueries({ queryKey: ['training:session', sessionId] });
        queryClient.invalidateQueries({ queryKey: ['training:set_logs'] });
        logger.debug('[NOTIF_ACTION] SET_DONE DB write + performed sync complete', { setIndex, exerciseId });

        traceGuidedTransition({
          delivery: guidedDelivery,
          action: 'QUERY_INVALIDATION',
          sessionId,
          sessionItemId,
          exerciseId,
          setIndex,
          queryInvalidation: true,
          writeOnline: wroteOnline,
          note: 'training:* after SET_DONE',
        });

        await clearIntent(setIntentKey);
        if (setIndex === 1) {
          await clearIntent(firstIntentKey);
        }

        traceGuidedTransition({
          delivery: guidedDelivery,
          action: 'CLEAR_NOTIFICATION',
          sessionId,
          intentKeysCleared: [setIntentKey, ...(setIndex === 1 ? [firstIntentKey] : [])],
          note: 'completed_set_intents',
        });

        const completedItemForRest = await getTrainingSessionItemById(sessionItemId);
        const hasNextWork =
          !data.sessionComplete &&
          !!data.nextSessionItemId &&
          data.nextExerciseId != null &&
          data.nextSetIndex != null;

        /** Matches in-app Done: rest after the completed set row (not the lookahead next set's restSeconds field). */
        const restSecondsAfterCompleted = hasNextWork
          ? computeRestSecondsAfterCompletingSet(completedItemForRest?.planned?.sets, setIndex, undefined)
          : 0;

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

          if (restSecondsAfterCompleted > 0) {
            await scheduleTrainingRest(
              {
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
                restSecondsTotal: restSecondsAfterCompleted,
              },
              { deferReconcile: true },
            );
            await scheduleTrainingSet(
              {
                sessionId,
                sessionItemId: data.nextSessionItemId,
                exerciseId: data.nextExerciseId,
                exerciseName: next.exerciseName,
                setIndex: next.setIndex,
                suggestedWeight: next.suggestedWeight,
                targetReps: next.targetReps,
                seconds: restSecondsAfterCompleted,
                next: nextAfter,
                nextAfter: nextNextAfter ?? undefined,
                sessionComplete: !nextAfter,
              },
              { deferReconcile: true },
            );
          } else {
            await scheduleTrainingSetImmediate({
              sessionId,
              sessionItemId: data.nextSessionItemId,
              exerciseId: data.nextExerciseId,
              exerciseName: next.exerciseName,
              setIndex: next.setIndex,
              suggestedWeight: next.suggestedWeight,
              targetReps: next.targetReps,
              next: nextAfter,
              nextAfter: nextNextAfter ?? undefined,
              sessionComplete: !nextAfter,
            });
          }
        }

        const scheduledKeys: string[] =
          hasNextWork && data.nextExerciseId != null && data.nextSetIndex != null
            ? restSecondsAfterCompleted > 0
              ? [
                  `training_rest:${sessionId}:${data.nextExerciseId}:${data.nextSetIndex ?? 'n/a'}`,
                  `training_set:${sessionId}:${data.nextExerciseId}:${data.nextSetIndex}`,
                ]
              : [`training_set:${sessionId}:${data.nextExerciseId}:${data.nextSetIndex}`]
            : [];

        traceGuidedTransition({
          delivery: guidedDelivery,
          action: 'SCHEDULE_NOTIFICATION',
          sessionId,
          exerciseId,
          setIndex,
          restSeconds: restSecondsAfterCompleted,
          intentKeysScheduled: scheduledKeys,
          nextCurrentSetIndex: data.nextSetIndex ?? null,
          note: restSecondsAfterCompleted > 0 ? 'rest_chain' : 'immediate_next_set',
        });

        await reconcileNotifications();
        await markActionProcessed(idempotencyKey);
        await markActionProcessed(key);

        logger.debug('[GUIDED_NOTIF_ACTION]', {
          phase: 'set_done_schedule',
          reconciled: true,
          hasNext: data.nextExerciseId != null && data.nextSetIndex != null,
          sessionComplete: !!data.sessionComplete,
          setIndex,
          exerciseId,
          restSecondsAfterCompleted,
        });

        traceGuidedTransition({
          delivery: guidedDelivery,
          action: 'SET_DONE',
          acceptanceReason: 'accepted',
          sessionId,
          sessionItemId,
          exerciseId,
          setIndex,
          writeOnline: wroteOnline,
          restSeconds: restSecondsAfterCompleted,
          nextCurrentSetIndex: data.nextSetIndex ?? null,
          overlaySuppressReason: 'suppressDuplicateCompletionOverlay_navigate',
        });

        if (data.nextExerciseId != null && data.nextSetIndex != null) {
          /**
           * Phone/watch SET_DONE is authoritative — TrainingSessionView applies rest/runtime only (no duplicate Done overlay).
           * restSecondsAfterCompleted matches computeRestSecondsAfterCompletingSet(completed set row).
           */
          safeNavigate('App', {
            screen: 'Training',
            params: {
              notification: {
                action: 'set_done',
                sessionId,
                exerciseId: data.nextExerciseId,
                setIndex: data.nextSetIndex,
                guidedExternalSetDone: {
                  completedSessionItemId: sessionItemId,
                  completedExerciseId: exerciseId,
                  completedSetIndex: setIndex,
                  weight: payload.weight,
                  reps: payload.reps,
                  completedAtIso: completedAt,
                  restSecondsAfterCompleted,
                  nextSessionItemId: data.nextSessionItemId!,
                  nextExerciseId: data.nextExerciseId,
                  nextSetIndex: data.nextSetIndex,
                  idempotencyKey,
                  sourceActionAtMs: Date.now(),
                  suppressDuplicateCompletionOverlay: true,
                },
              },
            },
          });
        }
      } catch (err: any) {
        logger.warn('[NOTIF_ACTION] SET_DONE failed', err);
        await markActionProcessed(key);
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
          await markActionProcessed(key);
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
        logger.debug('[NOTIF_ACTION] SKIP_SET advanced', { setIndex, exerciseId });
        await markActionProcessed(key);
        queryClient.invalidateQueries({ queryKey: ['training'] });
        queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
        queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
        queryClient.invalidateQueries({ queryKey: ['training:session', sessionId] });
      } catch (err: any) {
        logger.warn('[NOTIF_ACTION] SKIP_SET failed', err);
        await markActionProcessed(key);
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
        traceGuidedTransition({
          delivery: guidedDelivery,
          action: 'NEXT_SET',
          sessionId: data.sessionId,
          sessionItemId: data.nextSessionItemId,
          exerciseId: data.nextExerciseId,
          setIndex: data.nextSetIndex,
          note: 'clears_rest_and_set_intents_then_immediate_set',
        });
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
        safeNavigate('App', {
          screen: 'Training',
          params: {
            notification: {
              action: 'next_set',
              sessionId: data.sessionId,
              exerciseId: data.nextExerciseId,
              setIndex: data.nextSetIndex,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
        queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
        if (data.sessionId) {
          queryClient.invalidateQueries({ queryKey: ['training:session', data.sessionId] });
        }
      } else {
        await markActionProcessed(key);
        safeNavigate('App', { screen: 'Training' });
      }
    } catch (err: any) {
      logger.warn('[NOTIF_ACTION] NEXT_SET failed', err);
      await markActionProcessed(key);
      safeNavigate('App', { screen: 'Training' });
    }
    return true;
  }

  return false;
}
