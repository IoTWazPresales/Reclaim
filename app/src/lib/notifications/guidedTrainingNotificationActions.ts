/**
 * Guided training notification action handlers.
 *
 * Notifications are dumb triggers: the payload carries `sessionId` + an
 * action-verb context + display strings only. On any action tap we read the DB
 * and derive the work target via the session work authority
 * (`deriveActiveWorkTarget` through `buildNotificationWorkChain`) — fire-time
 * derivation, never payload snapshots.
 */
import * as Notifications from 'expo-notifications';
import { safeNavigate } from '@/navigation/nav';
import { logger } from '@/lib/logger';
import { setIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import { wasActionProcessed, markActionProcessed } from '@/lib/notifications/ActionIdempotencyStore';
import { queryClient } from '@/lib/queryClient';
import { applySetCompletion, applySetSkip } from '@/lib/training/applySetCompletion';
import { patchSessionItemPerformedInCache } from '@/lib/training/sessionQueryPatch';
import { clearTrainingIntentsForSession } from '@/lib/notifications/trainingNotificationScheduler';
import {
  loadGuidedTrainingNotificationWorkChain,
  scheduleGuidedTrainingAfterSetPersist,
  scheduleGuidedTrainingNextSetFromDb,
} from '@/lib/training/scheduleGuidedTrainingAfterSetPersist';
import { traceGuidedTransition, type GuidedTraceDelivery } from '@/lib/training/guidedTransitionTrace';

export type TrainingReminderData = {
  type: 'TRAINING_REMINDER';
  sessionId?: string;
  programDayId?: string;
};

/** Dumb trigger payload: sessionId + action-verb context + display strings only. */
export type TrainingSetActionData = {
  type: 'TRAINING_SET';
  sessionId?: string;
  issuedAt?: string;
};

export type TrainingRestData = {
  type: 'TRAINING_REST';
  sessionId?: string;
  issuedAt?: string;
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

function invalidateTrainingSessionQueries(sessionId: string): void {
  queryClient.invalidateQueries({ queryKey: ['training'] });
  queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
  queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
  queryClient.invalidateQueries({ queryKey: ['training:session', sessionId] });
  queryClient.invalidateQueries({ queryKey: ['training:set_logs'] });
}

/**
 * Same-runtime double-delivery guard (listener + background task + replay can
 * race before AsyncStorage marks land). Keyed by the response action key.
 */
const inFlightActionKeys = new Set<string>();

/**
 * Claim an action key: marks it processed immediately so a duplicate delivery
 * of the same response can never derive a *newer* work target and double-log.
 * Returns false when the key was already claimed or processed.
 */
async function claimActionKey(key: string): Promise<boolean> {
  if (inFlightActionKeys.has(key)) return false;
  inFlightActionKeys.add(key);
  if (await wasActionProcessed(key)) {
    inFlightActionKeys.delete(key);
    return false;
  }
  await markActionProcessed(key);
  return true;
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
    const sessionId = data.sessionId;
    if (!sessionId) {
      logger.warn('[NOTIF_ACTION] training set action missing sessionId', data);
      await markActionProcessed(key);
      safeNavigate('App', { screen: 'Training' });
      return true;
    }

    if (action === 'EDIT_SET') {
      await markActionProcessed(key);
      // Derive the active set from the DB — the payload carries no set identity.
      let editExerciseId: string | undefined;
      let editSetIndex: number | undefined;
      try {
        const chain = await loadGuidedTrainingNotificationWorkChain(sessionId);
        editExerciseId = chain.next?.exerciseId;
        editSetIndex = chain.next?.setIndex;
      } catch (err) {
        logger.debug('[NOTIF_ACTION] EDIT_SET derive failed — opening session', err);
      }
      safeNavigate('App', {
        screen: 'Training',
        params: {
          notification: {
            action: 'edit_set',
            sessionId,
            exerciseId: editExerciseId,
            setIndex: editSetIndex,
          },
        },
      });
      return true;
    }

    if (action === 'SET_DONE' || action === 'SKIP_SET') {
      const verb = action === 'SET_DONE' ? 'SET_DONE' : 'SKIP_SET';
      let claimed = false;
      try {
        trainingNotifLog?.('onAction', { action: verb, sessionId });

        claimed = await claimActionKey(key);
        if (!claimed) {
          logger.debug('[GUIDED_NOTIF_ACTION] duplicate delivery skipped', { action: verb, key });
          return true;
        }

        // Fire-time derivation: the DB decides which set this action applies to.
        const chain = await loadGuidedTrainingNotificationWorkChain(sessionId);
        if (chain.sessionComplete || !chain.next) {
          logger.debug('[GUIDED_NOTIF_ACTION] no pending work in DB — clearing prompts', {
            action: verb,
            sessionId,
          });
          await clearTrainingIntentsForSession(sessionId);
          await reconcileNotifications();
          safeNavigate('App', { screen: 'Training' });
          return true;
        }

        const target = chain.next;
        const { sessionItemId, exerciseId, setIndex } = target;

        traceGuidedTransition({
          delivery: guidedDelivery,
          action: verb,
          sessionId,
          sessionItemId,
          exerciseId,
          setIndex,
          note: 'db_derived_at_fire_time',
        });

        const weight = verb === 'SET_DONE' ? (target.suggestedWeight ?? 0) : 0;
        const reps = verb === 'SET_DONE' ? (target.targetReps ?? 10) : 0;

        const persist =
          verb === 'SET_DONE'
            ? await applySetCompletion({ sessionId, sessionItemId, exerciseId, setIndex, weight, reps })
            : await applySetSkip({ sessionId, sessionItemId, exerciseId, setIndex });
        const { wroteOnline, completedAt } = persist;

        patchSessionItemPerformedInCache(queryClient, sessionId, sessionItemId, {
          setIndex,
          weight,
          reps,
          completedAt,
        });
        logger.debug('[GUIDED_NOTIF_ACTION]', {
          phase: verb === 'SET_DONE' ? 'set_done_persist' : 'skip_set_persist',
          persistPath: wroteOnline ? 'supabase' : 'offline_queue',
          sessionItemId,
          setIndex,
          exerciseId,
        });

        invalidateTrainingSessionQueries(sessionId);

        traceGuidedTransition({
          delivery: guidedDelivery,
          action: 'QUERY_INVALIDATION',
          sessionId,
          sessionItemId,
          exerciseId,
          setIndex,
          queryInvalidation: true,
          writeOnline: wroteOnline,
          note: `training:* after ${verb}`,
        });

        const scheduleResult = await scheduleGuidedTrainingAfterSetPersist(
          {
            sessionId,
            completedSessionItemId: sessionItemId,
            completedSetIndex: setIndex,
          },
          { deferReconcile: true },
        );
        await reconcileNotifications();

        const { restSecondsAfterCompleted } = scheduleResult;
        traceGuidedTransition({
          delivery: guidedDelivery,
          action: verb,
          acceptanceReason: 'accepted',
          sessionId,
          sessionItemId,
          exerciseId,
          setIndex,
          writeOnline: wroteOnline,
          restSeconds: restSecondsAfterCompleted,
          nextCurrentSetIndex: scheduleResult.nextSetIndex,
        });

        if (
          verb === 'SET_DONE' &&
          !scheduleResult.sessionComplete &&
          scheduleResult.nextExerciseId != null &&
          scheduleResult.nextSetIndex != null &&
          scheduleResult.nextSessionItemId != null
        ) {
          safeNavigate('App', {
            screen: 'Training',
            params: {
              notification: {
                action: 'set_done',
                sessionId,
                exerciseId: scheduleResult.nextExerciseId,
                setIndex: scheduleResult.nextSetIndex,
                guidedExternalSetDone: {
                  completedSessionItemId: sessionItemId,
                  completedExerciseId: exerciseId,
                  completedSetIndex: setIndex,
                  weight,
                  reps,
                  completedAtIso: completedAt,
                  restSecondsAfterCompleted,
                  nextSessionItemId: scheduleResult.nextSessionItemId,
                  nextExerciseId: scheduleResult.nextExerciseId,
                  nextSetIndex: scheduleResult.nextSetIndex,
                  idempotencyKey: `set_done:${sessionId}:${exerciseId}:${setIndex}`,
                  sourceActionAtMs: Date.now(),
                  suppressDuplicateCompletionOverlay: true,
                },
              },
            },
          });
        }
      } catch (err: any) {
        logger.warn(`[NOTIF_ACTION] ${verb} failed`, err);
        safeNavigate('App', { screen: 'Training' });
      } finally {
        if (claimed) inFlightActionKeys.delete(key);
      }
      return true;
    }

    return false;
  }

  if (data.type === 'TRAINING_REST' && action === 'NEXT_SET') {
    let claimed = false;
    try {
      const sessionId = data.sessionId;
      trainingNotifLog?.('onAction', { action: 'NEXT_SET', sessionId });
      if (!sessionId) {
        await markActionProcessed(key);
        safeNavigate('App', { screen: 'Training' });
        return true;
      }

      claimed = await claimActionKey(key);
      if (!claimed) {
        logger.debug('[GUIDED_NOTIF_ACTION] duplicate NEXT_SET delivery skipped', { key });
        return true;
      }

      const chain = await loadGuidedTrainingNotificationWorkChain(sessionId);
      if (chain.sessionComplete || !chain.next) {
        logger.debug('[NOTIF_ACTION] NEXT_SET — no pending work in DB', { sessionId });
        await clearTrainingIntentsForSession(sessionId);
        await reconcileNotifications();
        safeNavigate('App', { screen: 'Training' });
        return true;
      }

      traceGuidedTransition({
        delivery: guidedDelivery,
        action: 'NEXT_SET',
        sessionId,
        sessionItemId: chain.next.sessionItemId,
        exerciseId: chain.next.exerciseId,
        setIndex: chain.next.setIndex,
        note: 'db_derived_immediate_set_prompt',
      });

      const scheduleResult = await scheduleGuidedTrainingNextSetFromDb(sessionId, {
        deferReconcile: true,
        chain,
      });
      await reconcileNotifications();

      logger.debug('[NOTIF_ACTION] NEXT_SET scheduled from DB', {
        setIndex: scheduleResult.nextSetIndex,
        exerciseId: scheduleResult.nextExerciseId,
      });

      if (
        !scheduleResult.sessionComplete &&
        scheduleResult.nextExerciseId != null &&
        scheduleResult.nextSetIndex != null
      ) {
        safeNavigate('App', {
          screen: 'Training',
          params: {
            notification: {
              action: 'next_set',
              sessionId,
              exerciseId: scheduleResult.nextExerciseId,
              setIndex: scheduleResult.nextSetIndex,
            },
          },
        });
      } else {
        safeNavigate('App', { screen: 'Training' });
      }

      queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
      queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
      queryClient.invalidateQueries({ queryKey: ['training:session', data.sessionId] });
    } catch (err: any) {
      logger.warn('[NOTIF_ACTION] NEXT_SET failed', err);
      safeNavigate('App', { screen: 'Training' });
    } finally {
      if (claimed) inFlightActionKeys.delete(key);
    }
    return true;
  }

  return false;
}
