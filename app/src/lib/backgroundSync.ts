import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { logger } from '@/lib/logger';
import { syncHealthData } from '@/lib/sync';
import { logTelemetry } from '@/lib/telemetry';

export const BACKGROUND_HEALTH_SYNC_TASK = 'BACKGROUND_HEALTH_SYNC_TASK';

// Define the task once.
TaskManager.defineTask(BACKGROUND_HEALTH_SYNC_TASK, async () => {
  try {
    logger.debug('Background health sync triggered');
    await syncHealthData();
    await logTelemetry({ name: 'background_sync', properties: { status: 'success' } });
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    logger.warn('Background health sync failed', error);
    await logTelemetry({
      name: 'background_sync',
      severity: 'error',
      properties: { status: 'failed', message: (error as Error)?.message ?? String(error) },
    });
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function enableBackgroundHealthSync(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Background sync is not supported on the web.');
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
      minimumInterval: 60 * 60, // one hour
      stopOnTerminate: false,
      startOnBoot: true,
    });
    logger.debug('Background health sync registered');
    await logTelemetry({ name: 'background_sync_registered' });
  } else {
    logger.debug('Background health sync already registered');
  }
}

export async function disableBackgroundHealthSync(): Promise<void> {
  if (Platform.OS === 'web') return;
  const tasks = (await TaskManager.getRegisteredTasksAsync()) as Array<{ taskName: string }>;
  const registered = tasks.some((task) => task.taskName === BACKGROUND_HEALTH_SYNC_TASK);
  if (registered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_HEALTH_SYNC_TASK);
    logger.debug('Background health sync unregistered');
    await logTelemetry({ name: 'background_sync_unregistered' });
  }
}

export async function isBackgroundHealthSyncRegistered(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const tasks = (await TaskManager.getRegisteredTasksAsync()) as Array<{ taskName: string }>;
  return tasks.some((task) => task.taskName === BACKGROUND_HEALTH_SYNC_TASK);
}

