import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { createObservabilityLogger } from '@/lib/logger';
import { runOncePush, runOncePull } from '@/sync/SyncEngine';
import { logTelemetry } from '@/lib/telemetry';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import { queryClient } from '@/lib/queryClient';
import { invalidateSleepSessions30dQueries } from '@/lib/sleep/sleepSessionsQueryKeys';

const syncLog = createObservabilityLogger('SYNC_ENGINE');

export const BACKGROUND_HEALTH_SYNC_TASK = 'BACKGROUND_HEALTH_SYNC_TASK';
type TaskManagerWithCheck = typeof TaskManager & {
  isTaskDefined?: (taskName: string) => boolean;
};
const taskManagerWithCheck = TaskManager as TaskManagerWithCheck;
const isTaskDefined = (taskName: string) => {
  return typeof taskManagerWithCheck.isTaskDefined === 'function'
    ? taskManagerWithCheck.isTaskDefined(taskName)
    : false;
};

async function runBackgroundHealthSyncTask() {
  syncLog.debug('[SYNC_ENGINE] task run');
  try {
    const { runBackgroundHrNudgeCheck } = await import('@/lib/health/notificationTriggers');
    await runBackgroundHrNudgeCheck();
    syncLog.debug('[SYNC_ENGINE] HR nudge background check');
  } catch (e) {
    syncLog.debug('[SYNC_ENGINE] HR nudge check failed (non-blocking)', e);
  }
  const pushResult = await runOncePush();
  const pullResult = await runOncePull();
  const result = pushResult.ok && pullResult.ok ? pullResult : pushResult.ok ? pullResult : pushResult;
  if (result.ok && 'ran' in result && result.ran) {
    syncLog.debug('[SYNC_ENGINE] task success');
    await logTelemetry({ name: 'background_sync', properties: { status: 'success' } });
    try {
      await reconcileNotifications();
      syncLog.debug('[SYNC_ENGINE] reconcile after sync');
    } catch (e) {
      syncLog.debug('[SYNC_ENGINE] reconcile failed (non-blocking)', e);
    }
    // Invalidate key caches so the next app foreground shows fresh data
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard:lastSleep'] }),
        queryClient.invalidateQueries({ queryKey: ['sleep:last'] }),
        invalidateSleepSessions30dQueries(queryClient),
        queryClient.invalidateQueries({ queryKey: ['sleep:sessions:ring'] }),
        queryClient.invalidateQueries({ queryKey: ['meds'] }),
        queryClient.invalidateQueries({ queryKey: ['meds:logs:7d'] }),
        queryClient.invalidateQueries({ queryKey: ['mood:checkins:7d'] }),
        queryClient.invalidateQueries({ queryKey: ['mood:daily:supabase'] }),
        queryClient.invalidateQueries({ queryKey: ['mood:local'] }),
        queryClient.invalidateQueries({ queryKey: ['training:sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] }),
      ]);
      syncLog.debug('[SYNC_ENGINE] caches invalidated after background sync');
    } catch (e) {
      syncLog.debug('[SYNC_ENGINE] cache invalidation failed (non-blocking)', e);
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  }
  if (result.ok && 'skipped' in result && result.skipped) {
    syncLog.debug('[SYNC_ENGINE] task skipped', result.reason);
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }
  const msg = !result.ok ? result.error : 'unknown';
  syncLog.warn('[SYNC_ENGINE] task failure', msg);
  await logTelemetry({
    name: 'background_sync',
    severity: 'error',
    properties: { status: 'failed', message: msg },
  });
  return BackgroundFetch.BackgroundFetchResult.Failed;
}

// Define the task once - check if already defined before defining
if (Platform.OS !== 'web') {
  if (!isTaskDefined(BACKGROUND_HEALTH_SYNC_TASK)) {
    try {
      TaskManager.defineTask(BACKGROUND_HEALTH_SYNC_TASK, runBackgroundHealthSyncTask);
      syncLog.debug('task define');
    } catch (error) {
      // Task might already be defined - that's okay
      syncLog.debug('task define skipped (may already exist)', error);
    }
  } else {
    syncLog.debug('task already defined');
  }
}

export async function enableBackgroundHealthSync(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Background sync is not supported on the web.');
  }

  // Ensure task is defined before registering
  if (!isTaskDefined(BACKGROUND_HEALTH_SYNC_TASK)) {
    try {
      TaskManager.defineTask(BACKGROUND_HEALTH_SYNC_TASK, runBackgroundHealthSyncTask);
      syncLog.debug('task define');
    } catch (error) {
      syncLog.warn('task define failed', error);
      throw new Error('Failed to define background health sync task. Task may already be defined.');
    }
  }

  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    throw new Error('Background fetch is unavailable on this device.');
  }

  const tasks = (await TaskManager.getRegisteredTasksAsync()) as Array<{ taskName: string }>;
  const registered = tasks.some((task) => task.taskName === BACKGROUND_HEALTH_SYNC_TASK);
  if (!registered) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_HEALTH_SYNC_TASK, {
      minimumInterval: 24 * 60 * 60, // daily
      stopOnTerminate: false,
      startOnBoot: true,
    });
    syncLog.debug('register');
    await logTelemetry({ name: 'background_sync_registered' });
  } else {
    syncLog.debug('already registered');
  }
}

export async function disableBackgroundHealthSync(): Promise<void> {
  if (Platform.OS === 'web') return;
  const tasks = (await TaskManager.getRegisteredTasksAsync()) as Array<{ taskName: string }>;
  const registered = tasks.some((task) => task.taskName === BACKGROUND_HEALTH_SYNC_TASK);
  if (registered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_HEALTH_SYNC_TASK);
    syncLog.debug('unregister');
    await logTelemetry({ name: 'background_sync_unregistered' });
  }
}

export async function isBackgroundHealthSyncRegistered(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const tasks = (await TaskManager.getRegisteredTasksAsync()) as Array<{ taskName: string }>;
  return tasks.some((task) => task.taskName === BACKGROUND_HEALTH_SYNC_TASK);
}
