// C:\Reclaim\app\src\hooks\useNotifications.ts
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as TaskManager from 'expo-task-manager';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';
import { logMedDose } from '@/data/repositories/MedsRepository';
import { navigateToHome, navigateToMeds, navigateToMood, navigateToSleep, safeNavigate } from '@/navigation/nav';
import { logger } from '@/lib/logger';
import { applyQuietHours, getNotificationPreferences } from '@/lib/notificationPreferences';
import { getUserSettings } from '@/lib/userSettings';
import {
  reconcileNotifications,
  ensureReclaimChannels,
  forceRescheduleNotifications,
} from '@/lib/notifications/NotificationScheduler';
import { clearBadge } from '@/lib/notifications/BadgeManager';
import { setIntent, clearIntent, clearIntentsByPrefix, hasIntent } from '@/lib/notifications/NotificationIntentStore';
import { queryClient } from '@/lib/queryClient';
import { wasActionProcessed, markActionProcessed } from '@/lib/notifications/ActionIdempotencyStore';
import { enqueueMedDose, syncMedDoseQueue } from '@/lib/notifications/MedDoseOfflineQueue';
import {
  scheduleTrainingRest,
  scheduleTrainingSet,
  scheduleTrainingSetImmediate,
  clearStaleTrainingIntentsIfNoActiveSession,
  type TrainingNotificationNext,
} from '@/lib/notifications/trainingNotificationScheduler';
import { logTrainingSet } from '@/data/TrainingRepository';
import { buildSetLogPayload, buildSetLogQueuePayload } from '@/lib/training/runtime/payloadBuilder';
import { enqueueOperation } from '@/lib/training/offlineQueue';

// --- DEBUG HELPERS ---
// Removed debugToast - no longer sending debug notifications
function d(...args: any[]) { logger.debug('[NOTIFS]', ...args); }

const TRAINING_NOTIFICATION_DEBUG_LOGS = true;
const TRAINING_NOTIFICATION_ACTION_TASK = 'RECLAIM_TRAINING_NOTIFICATION_ACTION_TASK';
type TaskManagerWithCheck = typeof TaskManager & { isTaskDefined?: (taskName: string) => boolean };
const taskManagerWithCheck = TaskManager as TaskManagerWithCheck;

function trainingNotifLog(message: string, payload?: Record<string, unknown>) {
  if (!TRAINING_NOTIFICATION_DEBUG_LOGS) return;
  logger.debug(`[training-notifications] ${message}`, payload ?? {});
}

type MedReminderData = {
  type: 'MED_REMINDER';
  medId: string;
  scheduledFor: string;
};

type MoodReminderData = { type: 'MOOD_REMINDER' };

// Sleep payload type (we use .type strings to route)
type SleepReminderData = { type: 'SLEEP_CONFIRM' | 'SLEEP_BEDTIME' };

type TrainingReminderData = { 
  type: 'TRAINING_REMINDER';
  sessionId?: string;
  programDayId?: string;
};

type TrainingSetActionData = {
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

type TrainingRestData = {
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

type HealthTriggerData = {
  type: 'HEALTH_TRIGGER';
  reason?: string;
  intervention?: string;
  url?: string;
};

// --- Permission helpers ---
export async function ensureNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

/**
 * Exported helper for onboarding:
 * import { useNotifications, requestPermission } from '@/hooks/useNotifications'
 */
export async function requestPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** ---------- Trigger helpers (version-proof) ---------- */
function intervalTrigger(
  seconds: number,
  repeats = false,
  channelId = 'default'
): Notifications.TimeIntervalTriggerInput {
  const typeEnum =
    // @ts-ignore – older SDKs
    (Notifications as any).SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval';
  const base = { seconds: Math.max(1, Math.floor(seconds)), repeats, channelId };
  return ({ type: typeEnum, ...base } as unknown) as Notifications.TimeIntervalTriggerInput;
}

function calendarTrigger(
  date: Date,
  channelId = 'default'
): Notifications.CalendarTriggerInput {
  const typeEnum =
    // @ts-ignore – older SDKs
    (Notifications as any).SchedulableTriggerInputTypes?.CALENDAR ?? 'calendar';
  const base = { date, channelId };
  return ({ type: typeEnum, ...base } as unknown) as Notifications.CalendarTriggerInput;
}

function secondsUntil(when: Date) {
  return Math.max(1, Math.floor((when.getTime() - Date.now()) / 1000));
}
/** ----------------------------------------------------- */

type ReminderChannelConfig = {
  channelId: string;
  sound?: Notifications.NotificationContent['sound'];
};

async function getReminderChannelConfig(): Promise<ReminderChannelConfig> {
  const settings = await getUserSettings();
  const enabled = settings.notificationChimeEnabled ?? true;
  const channelId = enabled ? 'reminder-chime' : 'reminder-silent';
  const sound: Notifications.NotificationContent['sound'] | undefined = enabled ? 'default' : undefined;
  return { channelId, sound };
}

// De-dupe: is a med+time already scheduled?
export async function isAlreadyScheduled(medId: string, doseTimeISO: string) {
  const target = Date.parse(doseTimeISO);
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.some((req) => {
    const d = req.content?.data as any;
    if (d?.type !== 'MED_REMINDER' || d?.medId !== medId || !d?.scheduledFor) return false;
    const ts = Date.parse(d.scheduledFor);
    return Number.isFinite(ts) && ts === target;
  });
}

// Cancel all reminders for a specific med (native + intents)
export async function cancelRemindersForMed(medId: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const matches = all.filter((req) => {
    const d = req.content?.data as any;
    return d?.type === 'MED_REMINDER' && d?.medId === medId;
  });
  for (const m of matches) {
    await Notifications.cancelScheduledNotificationAsync(m.identifier);
  }
  await clearIntentsByPrefix(`med:${medId}:`);
  await reconcileNotifications();
}

/** ========= PROCESS RESPONSES (tap/actions) ========= */
async function processNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  const identifier = response.notification.request.identifier;
  const key = identifier + '::' + response.actionIdentifier;
  if (await wasActionProcessed(key)) {
    try {
      await Notifications.dismissNotificationAsync(identifier);
    } catch {
      /* non-blocking */
    }
    return;
  }
  await markActionProcessed(key);
  // Dismiss the notification immediately so it disappears on first action tap
  try { await Notifications.dismissNotificationAsync(identifier); } catch { /* non-blocking */ }

  const action = response.actionIdentifier;
  const data = response.notification.request.content.data as
    | MedReminderData
    | MoodReminderData
    | SleepReminderData
    | TrainingReminderData
    | TrainingSetActionData
    | TrainingRestData
    | HealthTriggerData
    | (Record<string, any> & { url?: string; dest?: string })
    | undefined;

  logger.debug('[NOTIF_ACTION] response', {
    platform: Platform.OS,
    action,
    type: (data as any)?.type,
    identifier,
    appTag: (data as any)?.appTag,
  });

  try {
  // BODY TAP → open deep-link first (if provided), else route by type/dest
  if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    const rawData = response.notification.request.content.data as any;
    const url: string | undefined = rawData?.url;

    if (url) {
      await Linking.openURL(url);
      return;
    }

    // Meds
    if ((data as any)?.type === 'MED_REMINDER') {
      const medData = data as MedReminderData;
      safeNavigate('App', {
        screen: 'Meds',
        params: {
          screen: 'MedsHome',
          params: { focusMedId: medData.medId, focusScheduledFor: medData.scheduledFor },
        },
      });
      return;
    }

    // Mood
    if ((data as any)?.type === 'MOOD_REMINDER') {
      navigateToMood();
      return;
    }

    // Sleep
    if ((data as any)?.type === 'SLEEP_CONFIRM' || (data as any)?.type === 'SLEEP_BEDTIME') {
      navigateToSleep();
      return;
    }

    // Training
    if (
      (data as any)?.type === 'TRAINING_REMINDER' ||
      (data as any)?.type === 'TRAINING_SET' ||
      (data as any)?.type === 'TRAINING_REST'
    ) {
      safeNavigate('App', {
        screen: 'Training',
      });
      return;
    }

    // Fallback: generic destination key
    const dest = rawData?.dest;
    if (dest === 'Home') { navigateToHome(); return; }
    if (dest === 'Mood') { navigateToMood(); return; }
    if (dest === 'Sleep') { navigateToSleep(); return; }
    if (dest === 'Meds') { navigateToMeds(); return; }
    if ((data as any)?.type === 'MED_REFILL') { navigateToMeds(); return; }
  }

  // ACTION BUTTONS (Taken / Snooze 10m) — meds only
  if (!data || (data as any).type !== 'MED_REMINDER') {
    // Handle training actions
    if ((data as any)?.type === 'TRAINING_REMINDER') {
      if (action === 'START_SESSION') {
        safeNavigate('App', {
          screen: 'Training',
        });
        return;
      }
      if (action === 'SNOOZE_15') {
        // [NOTIF_CUTOVER] Intent + reconcile instead of direct schedule
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
        } catch (err) {
          logger.warn('Failed to snooze training notification:', err);
        }
        return;
      }
    }
    if ((data as any)?.type === 'TRAINING_SET') {
      const trainingData = data as TrainingSetActionData;
      if (action === 'EDIT_SET') {
        safeNavigate('App', {
          screen: 'Training',
          params: {
            notification: {
              action: 'edit_set',
              sessionId: trainingData.sessionId,
              exerciseId: trainingData.exerciseId,
              setIndex: trainingData.setIndex,
            },
          },
        });
        return;
      }
      if (action === 'SET_DONE') {
        try {
          const sessionId = trainingData.sessionId;
          trainingNotifLog('onAction', {
            action: 'SET_DONE',
            sessionId,
            exerciseId: trainingData.exerciseId,
            setIndex: trainingData.setIndex,
          });
          const sessionItemId = trainingData.sessionItemId ?? trainingData.sessionId;
          const exerciseId = trainingData.exerciseId;
          const setIndex = trainingData.setIndex ?? 1;
          const weight = trainingData.suggestedWeight ?? 0;
          const reps = trainingData.targetReps ?? 10;
          if (!sessionId || !sessionItemId || !exerciseId) {
            logger.warn('[NOTIF_ACTION] SET_DONE missing required fields', trainingData);
            safeNavigate('App', { screen: 'Training' });
            return;
          }

          // Guard: if the intent for this set no longer exists the session has ended
          // (or the notification is stale from a ghost session). Skip silently.
          const setIntentKey = `training_set:${sessionId}:${exerciseId}:${setIndex}`;
          const firstIntentKey = `training_first:${sessionId}:${exerciseId}:1`;
          const intentActive =
            await hasIntent(setIntentKey) ||
            (setIndex === 1 && await hasIntent(firstIntentKey));
          if (!intentActive) {
            logger.debug('[NOTIF_ACTION] SET_DONE: no matching intent (stale notification), skipping');
            return;
          }

          const idempotencyKey = `set_done:${sessionId}:${exerciseId}:${setIndex}`;
          if (await wasActionProcessed(idempotencyKey)) {
            logger.debug('[NOTIF_ACTION] SET_DONE already processed, skipping', { setIndex, exerciseId });
            queryClient.invalidateQueries({ queryKey: ['training'] });
            return;
          }
          await markActionProcessed(idempotencyKey);

          // ── FAST PATH: clear intent + schedule next notifications BEFORE DB write ──
          // The watch is waiting for a response. Any await here costs precious seconds.
          await clearIntent(setIntentKey);
          if (setIndex === 1) {
            await clearIntent(firstIntentKey);
          }

          if (!trainingData.sessionComplete && trainingData.nextSessionItemId && trainingData.nextExerciseId != null && trainingData.nextSetIndex != null) {
            const next: TrainingNotificationNext = {
              sessionItemId: trainingData.nextSessionItemId,
              exerciseId: trainingData.nextExerciseId,
              exerciseName: trainingData.nextExerciseName ?? 'Exercise',
              setIndex: trainingData.nextSetIndex,
              suggestedWeight: trainingData.nextSetWeight,
              targetReps: trainingData.nextSetReps,
              restSeconds: trainingData.nextRestSeconds ?? 90,
            };
            let nextAfter: TrainingNotificationNext = null;
            if (
              trainingData.nextAfterSessionItemId &&
              trainingData.nextAfterExerciseId != null &&
              trainingData.nextAfterSetIndex != null
            ) {
              nextAfter = {
                sessionItemId: trainingData.nextAfterSessionItemId,
                exerciseId: trainingData.nextAfterExerciseId,
                exerciseName: trainingData.nextAfterExerciseName ?? 'Exercise',
                setIndex: trainingData.nextAfterSetIndex,
                suggestedWeight: trainingData.nextAfterSetWeight,
                targetReps: trainingData.nextAfterSetReps,
                restSeconds: trainingData.nextAfterRestSeconds ?? 90,
              };
            }
            let nextNextAfter: TrainingNotificationNext = null;
            if (
              trainingData.nextNextAfterSessionItemId &&
              trainingData.nextNextAfterExerciseId != null &&
              trainingData.nextNextAfterSetIndex != null
            ) {
              nextNextAfter = {
                sessionItemId: trainingData.nextNextAfterSessionItemId,
                exerciseId: trainingData.nextNextAfterExerciseId,
                exerciseName: trainingData.nextNextAfterExerciseName ?? 'Exercise',
                setIndex: trainingData.nextNextAfterSetIndex,
                suggestedWeight: trainingData.nextNextAfterSetWeight,
                targetReps: trainingData.nextNextAfterSetReps,
                restSeconds: trainingData.nextNextAfterRestSeconds ?? 90,
              };
            }
            // Batch both intent writes then a single reconcile — avoids the mutex drop bug
            await scheduleTrainingRest({
              sessionId,
              sessionItemId: trainingData.nextSessionItemId,
              exerciseId: trainingData.nextExerciseId,
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
              sessionItemId: trainingData.nextSessionItemId,
              exerciseId: trainingData.nextExerciseId,
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
          // Single reconcile after both intents are written
          await reconcileNotifications();

          logger.debug('[NOTIF_ACTION] SET_DONE notifications scheduled', { setIndex, exerciseId });

          // ── BACKGROUND: DB write — don't block the watch response ──
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
            queryClient.invalidateQueries({ queryKey: ['training:session', sessionId] });
            logger.debug('[NOTIF_ACTION] SET_DONE DB write complete', { setIndex, exerciseId });
          }).catch((err: any) => {
            logger.warn('[NOTIF_ACTION] SET_DONE background DB write failed', err);
          });

        } catch (err: any) {
          logger.warn('[NOTIF_ACTION] SET_DONE failed', err);
          safeNavigate('App', { screen: 'Training' });
        }
        return;
      }
      if (action === 'SKIP_SET') {
        try {
          const sessionId = trainingData.sessionId;
          const sessionItemId = trainingData.sessionItemId ?? trainingData.sessionId;
          const exerciseId = trainingData.exerciseId;
          const setIndex = trainingData.setIndex ?? 1;
          if (!sessionId || !sessionItemId || !exerciseId) {
            logger.warn('[NOTIF_ACTION] SKIP_SET missing required fields', trainingData);
            safeNavigate('App', { screen: 'Training' });
            return;
          }
          await clearIntent(`training_set:${sessionId}:${exerciseId}:${setIndex}`);
          if (setIndex === 1) {
            await clearIntent(`training_first:${sessionId}:${exerciseId}:${setIndex}`);
          }
          await reconcileNotifications();
          if (!trainingData.sessionComplete && trainingData.nextSessionItemId && trainingData.nextExerciseId != null && trainingData.nextSetIndex != null) {
            const next: TrainingNotificationNext = {
              sessionItemId: trainingData.nextSessionItemId,
              exerciseId: trainingData.nextExerciseId,
              exerciseName: trainingData.nextExerciseName ?? 'Exercise',
              setIndex: trainingData.nextSetIndex,
              suggestedWeight: trainingData.nextSetWeight,
              targetReps: trainingData.nextSetReps,
              restSeconds: trainingData.nextRestSeconds ?? 90,
            };
            let nextAfter: TrainingNotificationNext = null;
            if (
              trainingData.nextAfterSessionItemId &&
              trainingData.nextAfterExerciseId != null &&
              trainingData.nextAfterSetIndex != null
            ) {
              nextAfter = {
                sessionItemId: trainingData.nextAfterSessionItemId,
                exerciseId: trainingData.nextAfterExerciseId,
                exerciseName: trainingData.nextAfterExerciseName ?? 'Exercise',
                setIndex: trainingData.nextAfterSetIndex,
                suggestedWeight: trainingData.nextAfterSetWeight,
                targetReps: trainingData.nextAfterSetReps,
                restSeconds: trainingData.nextAfterRestSeconds ?? 90,
              };
            }
            let nextNextAfter: TrainingNotificationNext = null;
            if (
              trainingData.nextNextAfterSessionItemId &&
              trainingData.nextNextAfterExerciseId != null &&
              trainingData.nextNextAfterSetIndex != null
            ) {
              nextNextAfter = {
                sessionItemId: trainingData.nextNextAfterSessionItemId,
                exerciseId: trainingData.nextNextAfterExerciseId,
                exerciseName: trainingData.nextNextAfterExerciseName ?? 'Exercise',
                setIndex: trainingData.nextNextAfterSetIndex,
                suggestedWeight: trainingData.nextNextAfterSetWeight,
                targetReps: trainingData.nextNextAfterSetReps,
                restSeconds: trainingData.nextNextAfterRestSeconds ?? 90,
              };
            }
            await scheduleTrainingRest({
              sessionId,
              sessionItemId: trainingData.nextSessionItemId,
              exerciseId: trainingData.nextExerciseId,
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
              sessionItemId: trainingData.nextSessionItemId,
              exerciseId: trainingData.nextExerciseId,
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
          queryClient.invalidateQueries({ queryKey: ['training'] });
          queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
          queryClient.invalidateQueries({ queryKey: ['training:session', sessionId] });
        } catch (err: any) {
          logger.warn('[NOTIF_ACTION] SKIP_SET failed', err);
          safeNavigate('App', { screen: 'Training' });
        }
        return;
      }
    }
    if ((data as any)?.type === 'TRAINING_REST' && action === 'NEXT_SET') {
      const restData = data as TrainingRestData;
      try {
        trainingNotifLog('onAction', {
          action: 'NEXT_SET',
          sessionId: restData.sessionId,
          exerciseId: restData.nextExerciseId,
          setIndex: restData.nextSetIndex,
        });
        if (
          restData.nextSessionItemId &&
          restData.nextExerciseId != null &&
          restData.nextSetIndex != null
        ) {
          const idempotencyKey = `next_set:${restData.sessionId}:${restData.nextExerciseId}:${restData.nextSetIndex}`;
          if (await wasActionProcessed(idempotencyKey)) {
            logger.debug('[NOTIF_ACTION] NEXT_SET already processed, skipping', { setIndex: restData.nextSetIndex });
            queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
            if (restData.sessionId) {
              queryClient.invalidateQueries({ queryKey: ['training:session', restData.sessionId] });
            }
            return;
          }
          const next: TrainingNotificationNext = {
            sessionItemId: restData.nextSessionItemId,
            exerciseId: restData.nextExerciseId,
            exerciseName: restData.nextExerciseName ?? 'Exercise',
            setIndex: restData.nextSetIndex,
            suggestedWeight: restData.nextSetWeight,
            targetReps: restData.nextSetReps,
            restSeconds: restData.nextRestSeconds ?? 90,
          };
          let nextAfter: TrainingNotificationNext = null;
          if (
            restData.nextAfterSessionItemId &&
            restData.nextAfterExerciseId != null &&
            restData.nextAfterSetIndex != null
          ) {
            nextAfter = {
              sessionItemId: restData.nextAfterSessionItemId,
              exerciseId: restData.nextAfterExerciseId,
              exerciseName: restData.nextAfterExerciseName ?? 'Exercise',
              setIndex: restData.nextAfterSetIndex,
              suggestedWeight: restData.nextAfterSetWeight,
              targetReps: restData.nextAfterSetReps,
              restSeconds: restData.nextAfterRestSeconds ?? 90,
            };
          }
          let nextNextAfter: TrainingNotificationNext = null;
          if (
            restData.nextNextAfterSessionItemId &&
            restData.nextNextAfterExerciseId != null &&
            restData.nextNextAfterSetIndex != null
          ) {
            nextNextAfter = {
              sessionItemId: restData.nextNextAfterSessionItemId,
              exerciseId: restData.nextNextAfterExerciseId,
              exerciseName: restData.nextNextAfterExerciseName ?? 'Exercise',
              setIndex: restData.nextNextAfterSetIndex,
              suggestedWeight: restData.nextNextAfterSetWeight,
              targetReps: restData.nextNextAfterSetReps,
              restSeconds: restData.nextNextAfterRestSeconds ?? 90,
            };
          }
          await clearIntent(`training_rest:${restData.sessionId}:${restData.nextExerciseId}:${restData.nextSetIndex ?? 'n/a'}`);
          await clearIntent(`training_set:${restData.sessionId}:${restData.nextExerciseId}:${restData.nextSetIndex}`);
          await scheduleTrainingSetImmediate({
            sessionId: restData.sessionId!,
            sessionItemId: restData.nextSessionItemId,
            exerciseId: restData.nextExerciseId,
            exerciseName: next.exerciseName,
            setIndex: restData.nextSetIndex,
            suggestedWeight: restData.nextSetWeight,
            targetReps: restData.nextSetReps,
            next: nextAfter,
            nextAfter: nextNextAfter ?? undefined,
            sessionComplete: !nextAfter,
          });
          await markActionProcessed(idempotencyKey);
          logger.debug('[NOTIF_ACTION] NEXT_SET scheduled', { setIndex: restData.nextSetIndex });
          queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
          if (restData.sessionId) {
            queryClient.invalidateQueries({ queryKey: ['training:session', restData.sessionId] });
          }
        } else {
          safeNavigate('App', { screen: 'Training' });
        }
      } catch (err: any) {
        logger.warn('[NOTIF_ACTION] NEXT_SET failed', err);
        safeNavigate('App', { screen: 'Training' });
      }
      return;
    }
    // HEALTH_TRIGGER / MINDFULNESS_REMINDER: Start opens app, Snooze reschedules
    if ((data as any)?.type === 'HEALTH_TRIGGER') {
      const healthData = data as HealthTriggerData;
      if (action === 'START') {
        const url = healthData.url ?? `reclaim://mindfulness?autoStart=true`;
        await Linking.openURL(url);
        return;
      }
      if (action === 'SNOOZE_15') {
        try {
          const triggerDate = new Date(Date.now() + 15 * 60 * 1000);
          const content = response.notification.request.content;
          const reason = healthData.reason ?? 'mindfulness';
          const snoozeKey = `health_trigger_snooze:${reason}`;
          await setIntent(snoozeKey, {
            type: 'HEALTH_TRIGGER',
            reason,
            intervention: healthData.intervention,
            url: healthData.url ?? `reclaim://mindfulness?intervention=${encodeURIComponent(healthData.intervention ?? '')}&autoStart=true`,
            triggerDate: triggerDate.toISOString(),
            title: content.title ?? 'Mindfulness Suggestion',
            body: content.body ?? 'Take a moment to breathe.',
            channelId: 'mindfulness-health',
          });
          logger.debug('[NOTIF_ACTION] mindfulness snooze 15m → intent + reconcile');
          await reconcileNotifications();
        } catch (err) {
          logger.warn('Failed to snooze mindfulness notification:', err);
        }
        return;
      }
    }
    return;
  }
  await handleMedReminderAction(action, data as MedReminderData, response);
  } finally {
    try {
      await Notifications.dismissNotificationAsync(identifier);
    } catch {
      // Non-blocking: dismiss may fail on some platforms/configs
    }
  }
}
/** ==================================================== */

if (!taskManagerWithCheck.isTaskDefined?.(TRAINING_NOTIFICATION_ACTION_TASK)) {
  TaskManager.defineTask(TRAINING_NOTIFICATION_ACTION_TASK, async ({ data, error }) => {
    if (error) {
      logger.warn('[training-notifications] background task error', error);
      return;
    }
    const actionData = (data as any) ?? {};
    const actionIdentifier = actionData.actionIdentifier;
    const notification = actionData.notification;
    if (!actionIdentifier || !notification) return;
    try {
      trainingNotifLog('backgroundAction', {
        action: actionIdentifier,
        type: notification?.request?.content?.data?.type,
        sessionId: notification?.request?.content?.data?.sessionId,
        setIndex: notification?.request?.content?.data?.setIndex,
      });
      await processNotificationResponse({
        actionIdentifier,
        notification,
      } as Notifications.NotificationResponse);
    } catch (taskErr) {
      logger.warn('[training-notifications] background action processing failed', taskErr);
    }
  });
}

export function useNotifications() {
  const appState = useRef(AppState.currentState);
  const lastPermissionDenied = useRef(false);
  const lastReconcileAtMs = useRef(0);

  useEffect(() => {
    const RECONCILE_COOLDOWN_MS = 5_000;
    const reconcileWithCooldown = async (reason: string, force = false) => {
      const now = Date.now();
      if (!force && now - lastReconcileAtMs.current < RECONCILE_COOLDOWN_MS) {
        logger.debug(`[NOTIF_RECON] skip (${reason}) due to cooldown`);
        return;
      }
      lastReconcileAtMs.current = now;
      logger.debug(`[NOTIF_RECON] ${reason}`);
      await clearStaleTrainingIntentsIfNoActiveSession().catch((e) => { if (__DEV__) logger.debug('[NOTIF_RECON] clearStaleTraining failed', e); });
      await reconcileNotifications().catch((e) => { if (__DEV__) logger.debug('[NOTIF_RECON] reconcile failed', e); });
    };

    (async () => {
      const granted = await ensureNotificationPermission();
      lastPermissionDenied.current = !granted;
      if (!granted) {
        logger.warn('[NOTIF_RECON] Permission not granted; channels/categories will be ready for when user enables');
      }

      // Clear badge on app open (no-op if no permission)
      await clearBadge();

      // Always ensure channels exist (needed before any scheduling; safe without permission)
      await ensureReclaimChannels();

      // Med action buttons (do not foreground app)
      await Notifications.setNotificationCategoryAsync('MED_REMINDER', [
        { identifier: 'TAKE',      buttonTitle: 'Taken',      options: { opensAppToForeground: false } },
        { identifier: 'SNOOZE_10', buttonTitle: 'Snooze 10m', options: { opensAppToForeground: false } },
        { identifier: 'SKIP',      buttonTitle: 'Skip',       options: { opensAppToForeground: false } },
      ]);

      // Expo requires at least one action per category; simple "Open" for reminder-only categories
      const openAction = { identifier: 'VIEW', buttonTitle: 'Open', options: { opensAppToForeground: true } };
      await Notifications.setNotificationCategoryAsync('MOOD_REMINDER', [openAction]);
      await Notifications.setNotificationCategoryAsync('SLEEP_REMINDER', [openAction]);

      // Training reminder category with actions (watch-ready)
      await Notifications.setNotificationCategoryAsync('TRAINING_REMINDER', [
        {
          identifier: 'START_SESSION',
          buttonTitle: 'Start session',
          options: { opensAppToForeground: true }
        },
        {
          identifier: 'SNOOZE_15',
          buttonTitle: 'Snooze 15m',
          options: { opensAppToForeground: false }
        },
      ]);
      // Training set actions: Done logs set, Skip advances without logging, Edit opens app
      await Notifications.setNotificationCategoryAsync('TRAINING_SET', [
        {
          identifier: 'SET_DONE',
          buttonTitle: 'Done',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'SKIP_SET',
          buttonTitle: 'Skip',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'EDIT_SET',
          buttonTitle: 'Edit',
          options: { opensAppToForeground: true },
        },
      ]);
      // Rest notifications: "Next set" skips the rest timer and starts the set immediately.
      await Notifications.setNotificationCategoryAsync('TRAINING_REST', [
        {
          identifier: 'NEXT_SET',
          buttonTitle: 'Next set',
          options: { opensAppToForeground: false },
        },
      ]);

      // Mindfulness / health-trigger notifications: Start opens app, Snooze reschedules (watch-mirrorable)
      await Notifications.setNotificationCategoryAsync('MINDFULNESS_REMINDER', [
        { identifier: 'START', buttonTitle: 'Start', options: { opensAppToForeground: true } },
        { identifier: 'SNOOZE_15', buttonTitle: 'Snooze 15m', options: { opensAppToForeground: false } },
      ]);

      // Cleanup past-due notifications before reconcile to prevent duplicate/old notifications
      await cleanupPastNotifications();

      // Reconcile notification schedule (idempotent; bails if permission denied)
      await reconcileWithCooldown('startup reconcile', true);

      try {
        await Notifications.registerTaskAsync(TRAINING_NOTIFICATION_ACTION_TASK);
        trainingNotifLog('registeredBackgroundTask', { task: TRAINING_NOTIFICATION_ACTION_TASK });
      } catch (taskError) {
        trainingNotifLog('registerBackgroundTaskSkipped', {
          task: TRAINING_NOTIFICATION_ACTION_TASK,
          error: (taskError as Error)?.message,
        });
      }

      // Replay any queued med doses (from TAKE/SKIP failures)
      const medSync = await syncMedDoseQueue(logMedDose);
      if (medSync.synced > 0) logger.debug('[MED_DOSE_QUEUE] Synced on start', medSync);
      // Replay training offline queue (from SET_DONE failures)
      const { syncOfflineQueue } = await import('@/lib/training/offlineSync');
      const trainSync = await syncOfflineQueue();
      if (trainSync.success > 0) logger.debug('[TRAINING_QUEUE] Synced on start', trainSync);
    })();

    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        trainingNotifLog('response', {
          action: response.actionIdentifier,
          type: (response.notification.request.content.data as any)?.type,
          sessionId: (response.notification.request.content.data as any)?.sessionId,
          setIndex: (response.notification.request.content.data as any)?.setIndex,
        });
        await processNotificationResponse(response);
      } catch (err) {
        logger.warn('Notification action handling failed:', err);
      }
    });

    (async () => {
      try {
        const initial = await Notifications.getLastNotificationResponseAsync();
        if (initial) {
          await processNotificationResponse(initial);
          // Clear immediately after processing so the same response is never
          // replayed on the next cold start (body-tap has no idempotency guard).
          await Notifications.clearLastNotificationResponseAsync().catch((e) => { if (__DEV__) logger.debug('[useNotifications]', e); });
        }
      } catch (err) {
        logger.warn('Failed to process initial notification response:', err);
      }
    })();

    // App state listener: process queued notification responses, clear badge, reconcile
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Re-check permission when returning (e.g. user granted in Settings)
        (async () => {
          const { status } = await Notifications.getPermissionsAsync();
          const nowGranted = status === 'granted';
          if (lastPermissionDenied.current && nowGranted) {
            logger.debug('[NOTIF_RECON] Permission just granted, forcing full reschedule');
            lastPermissionDenied.current = false;
            await forceRescheduleNotifications();
            lastReconcileAtMs.current = Date.now();
          } else if (nowGranted) {
            lastPermissionDenied.current = false;
          } else {
            lastPermissionDenied.current = true;
          }
        })().catch((e) => { if (__DEV__) logger.debug('[useNotifications]', e); });
        // Process any notification response queued while app was backgrounded (e.g. from Wear OS)
        (async () => {
          try {
            const pending = await Notifications.getLastNotificationResponseAsync();
            if (pending) {
              logger.debug('[NOTIF_ACTION] processing queued response on foreground');
              try {
                await processNotificationResponse(pending);
              } finally {
                try {
                  await Notifications.clearLastNotificationResponseAsync();
                } catch {
                  /* non-blocking */
                }
              }
            }
          } catch (err) {
            logger.warn('[NOTIF_ACTION] Failed to process queued response', err);
          }
        })();
        clearBadge().catch((e) => { if (__DEV__) logger.debug('[useNotifications]', e); });
        reconcileWithCooldown('foreground reconcile').catch((e) => { if (__DEV__) logger.debug('[useNotifications]', e); });
        syncMedDoseQueue(logMedDose).then((r) => {
          if (r.synced > 0) logger.debug('[MED_DOSE_QUEUE] Synced on foreground', r);
        }).catch((e) => { if (__DEV__) logger.debug('[useNotifications]', e); });
        import('@/lib/training/offlineSync').then(({ syncOfflineQueue }) =>
          syncOfflineQueue().then((r) => {
            if (r.success > 0) logger.debug('[TRAINING_QUEUE] Synced on foreground', r);
          })
        ).catch((e) => { if (__DEV__) logger.debug('[useNotifications]', e); });
      }
      appState.current = nextAppState;
    });

    return () => {
      sub.remove();
      appStateSubscription.remove();
    };
  }, []);
}

/**
 * Clean up past-due notifications (older than 24 hours)
 * This prevents notification backlog from accumulating
 */
export async function cleanupPastNotifications() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    for (const notif of all) {
      const trigger = notif.trigger as any;
      let notificationTime: number | null = null;
      
      // Extract notification time based on trigger type
      if (trigger?.date) {
        notificationTime = new Date(trigger.date).getTime();
      } else if (trigger?.seconds) {
        notificationTime = now + (trigger.seconds * 1000);
      } else if (trigger?.hour !== undefined && trigger?.minute !== undefined) {
        // Calendar trigger - check if it's in the past for non-repeating
        if (!trigger.repeats) {
          const triggerDate = new Date();
          triggerDate.setHours(trigger.hour, trigger.minute, 0, 0);
          if (triggerDate.getTime() < now) {
            notificationTime = triggerDate.getTime();
          }
        }
      }
      
      // Cancel notifications that are past due (more than 24 hours old) and non-repeating
      if (notificationTime && notificationTime < oneDayAgo && !trigger?.repeats) {
        const data = notif.content?.data as any;
        // Only cancel medication reminders that are past due
        if (data?.type === 'MED_REMINDER') {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
          d('Cleaned up past notification', notif.identifier);
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to cleanup past notifications:', error);
  }
}

/**
 * Actionable med reminder (Taken / Snooze 10m / Skip).
 */
export async function scheduleMedReminderActionable(params: {
  medId: string;
  medName: string;
  doseTimeISO: string;
  title?: string;
  body?: string;
}) {
  const granted = await ensureNotificationPermission();
  if (granted === false) throw new Error('Notifications are disabled');

  const { medId, medName, doseTimeISO, title, body } = params;
  const when = new Date(doseTimeISO);
  
  // Don't schedule notifications in the past (more than 1 hour ago)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (when.getTime() < oneHourAgo) {
    d('Skipping past notification', { medId, doseTimeISO });
    return null;
  }
  
  const prefs = await getNotificationPreferences();
  let scheduledFor = applyQuietHours(when, prefs);
  // Ensure notification is at least 1 second in the future
  if (scheduledFor.getTime() <= Date.now()) {
    scheduledFor = new Date(Math.max(Date.now() + 1000, scheduledFor.getTime()));
  }
  const { channelId, sound } = await getReminderChannelConfig();
  const content: Notifications.NotificationContentInput = {
    title: title ?? `Time to take ${medName}`,
    body: body ?? medName,
    categoryIdentifier: 'MED_REMINDER',
    data: {
      type: 'MED_REMINDER',
      medId,
      scheduledFor: doseTimeISO,
    } as MedReminderData,
    ...(sound ? { sound } : {}),
  };
  const logicalKey = `med:${medId}:${doseTimeISO}`;
  if (await isAlreadyScheduled(medId, doseTimeISO)) return null;

  const titleStr = title ?? `Time to take ${medName}`;
  const bodyStr = body ?? medName;
  await setIntent(logicalKey, {
    type: 'MED_REMINDER',
    medId,
    scheduledFor: doseTimeISO,
    title: titleStr,
    body: bodyStr,
    channelId,
  });
  logger.debug('[NOTIF_CUTOVER] med reminder → intent + reconcile');
  await reconcileNotifications();
  return logicalKey;
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** ===== MOOD: Daily repeating reminders (08:00 & 20:00) ===== */
export async function scheduleMoodCheckinReminders() {
  const granted = await ensureNotificationPermission();
  if (!granted) throw new Error('Notifications permission not granted');

  const { channelId } = await getReminderChannelConfig();
  const times = [
    { hour: 8, minute: 0, title: 'Morning check-in', body: 'How are you feeling? Tap to log.' },
    { hour: 20, minute: 0, title: 'Evening check-in', body: 'Take a moment to reflect. Tap to log.' },
  ];

  for (const t of times) {
    const logicalKey = t.hour === 8 ? 'mood_morning' : 'mood_evening';
    await setIntent(logicalKey, {
      type: 'MOOD_REMINDER',
      hour: t.hour,
      minute: t.minute,
      title: t.title,
      body: t.body,
      channelId,
    });
  }
  logger.debug('[NOTIF_CUTOVER] mood reminders → intent + reconcile');
  await reconcileNotifications();
}

export async function cancelMoodCheckinReminders() {
  await clearIntent('mood_morning');
  await clearIntent('mood_evening');
  logger.debug('[NOTIF_CUTOVER] mood reminders cancelled via intent clear');
  await reconcileNotifications();
}

/** ===== SLEEP: Bedtime & Morning confirm ===== */
export async function scheduleBedtimeSuggestion(typicalWakeHHMM: string, targetMinutes = 480) {
  const { channelId } = await getReminderChannelConfig();
  await setIntent('sleep_bedtime', {
    type: 'SLEEP_BEDTIME',
    typicalWakeHHMM,
    targetMinutes,
    title: 'Wind down?',
    body: 'Aim for your target sleep tonight.',
    channelId,
  });
  logger.debug('[NOTIF_CUTOVER] sleep bedtime → intent + reconcile');
  await reconcileNotifications();
}

export async function scheduleMorningConfirm(typicalWakeHHMM: string) {
  const { channelId } = await getReminderChannelConfig();
  await setIntent('sleep_confirm', {
    type: 'SLEEP_CONFIRM',
    typicalWakeHHMM,
    title: 'Good morning ☀️',
    body: "Confirm last night's sleep?",
    channelId,
  });
  logger.debug('[NOTIF_CUTOVER] sleep confirm → intent + reconcile');
  await reconcileNotifications();
}

const MED_DOSE_RETRY_ATTEMPTS = 3;
const MED_DOSE_RETRY_DELAY_MS = 500;
const TRAINING_SET_RETRY_ATTEMPTS = 3;
const TRAINING_SET_RETRY_DELAY_MS = 500;

async function logMedDoseWithRetry(payload: {
  med_id: string;
  status: 'taken' | 'skipped';
  taken_at?: string;
  scheduled_for?: string;
}): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MED_DOSE_RETRY_ATTEMPTS; attempt++) {
    try {
      await logMedDose(payload);
      return;
    } catch (e) {
      lastError = e;
      if (attempt < MED_DOSE_RETRY_ATTEMPTS - 1) {
        logger.debug('[NOTIF_ACTION] logMedDose retry', { attempt: attempt + 1, med_id: payload.med_id });
        await new Promise((r) => setTimeout(r, MED_DOSE_RETRY_DELAY_MS));
      }
    }
  }
  await enqueueMedDose(payload);
  logger.warn('[NOTIF_ACTION] logMedDose failed, enqueued for sync', { med_id: payload.med_id, error: lastError });
}

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

/** ===== INTERNAL: Med action handler ===== */
async function handleMedReminderAction(
  action: string,
  data: MedReminderData,
  response: Notifications.NotificationResponse
) {
  const nowIso = new Date().toISOString();

  if (action === 'TAKE') {
    d('TAKE logging', data);
    const logicalKey = (data as any).logicalKey;
    if (logicalKey) await clearIntent(logicalKey);
    await logMedDoseWithRetry({
      med_id: data.medId,
      status: 'taken',
      taken_at: nowIso,
      scheduled_for: data.scheduledFor,
    });
    await reconcileNotifications();
    return;
  }

  if (action === 'SNOOZE_10') {
    d('SNOOZE scheduling +10m', data);
    const prefs = await getNotificationPreferences();
    const snoozeMinutes = Math.max(1, prefs.snoozeMinutes);
    const snoozeTarget = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    let scheduledFor = applyQuietHours(snoozeTarget, prefs);
    if (scheduledFor.getTime() <= Date.now()) {
      scheduledFor = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    }
    const { channelId } = await getReminderChannelConfig();
    // Clear original intent to prevent duplicate notifications (original + snoozed)
    const originalLogicalKey = `med:${data.medId}:${data.scheduledFor}`;
    await clearIntent(originalLogicalKey);
    const snoozeLogicalKey = `med:${data.medId}:${data.scheduledFor}:snooze`;
    await setIntent(snoozeLogicalKey, {
      type: 'MED_REMINDER',
      medId: data.medId,
      scheduledFor: scheduledFor.toISOString(),
      title: 'Medication Reminder (Snoozed)',
      body: response.notification.request.content.body ?? 'Time to take your medication.',
      channelId,
      snoozed: true,
    });
    logger.debug('[NOTIF_CUTOVER] med snooze 10m → intent + reconcile');
    await reconcileNotifications();
    return;
  }

  if (action === 'SKIP') {
    d('SKIP logging', data);
    const logicalKey = (data as any).logicalKey;
    if (logicalKey) await clearIntent(logicalKey);
    await logMedDoseWithRetry({
      med_id: data.medId,
      status: 'skipped',
      scheduled_for: data.scheduledFor,
    });
    await reconcileNotifications();
    return;
  }
}
