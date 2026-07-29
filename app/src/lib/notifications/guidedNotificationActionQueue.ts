/**
 * Durable FIFO queue for background notification actions (guided training + med reminders).
 *
 * Why: getLastNotificationResponseAsync only returns the *latest* response.
 * Multiple Wear taps while the process was asleep otherwise collapse to one tap.
 * Med Taken uses the same channel as guided Done (`opensAppToForeground: false`) and
 * needs the same durable enqueue + drain so dismiss-without-log cannot win.
 *
 * Store serializable fields only; rehydrate into NotificationResponse shape for processNotificationResponse.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationResponse } from 'expo-notifications';
import { logger } from '@/lib/logger';

const STORAGE_KEY = 'reclaim:guided_notif_action_queue_v1';
const MAX_QUEUE = 32;

/** Serialize concurrent drains so newly enqueued items still get a pass. */
let drainChain: Promise<void> = Promise.resolve();

export type QueuedGuidedNotificationAction = {
  /** Stable id = notificationId::action::issuedAt (same salt as processNotificationResponse). */
  queueId: string;
  enqueuedAt: string;
  actionIdentifier: string;
  notificationIdentifier: string;
  issuedAt?: string;
  data: Record<string, unknown>;
  title?: string | null;
  body?: string | null;
};

function buildQueueId(
  notificationIdentifier: string,
  actionIdentifier: string,
  issuedAt?: string,
): string {
  return (
    notificationIdentifier +
    '::' +
    actionIdentifier +
    (issuedAt ? `::${issuedAt}` : '')
  );
}

export function isGuidedTrainingActionData(data: unknown): boolean {
  const type = (data as { type?: string } | null)?.type;
  return type === 'TRAINING_SET' || type === 'TRAINING_REST' || type === 'TRAINING_REMINDER';
}

export function isMedReminderActionData(data: unknown): boolean {
  return (data as { type?: string } | null)?.type === 'MED_REMINDER';
}

export function isMindfulnessDurableActionData(data: unknown): boolean {
  const type = (data as { type?: string } | null)?.type;
  return type === 'HEALTH_TRIGGER' || type === 'MINDFULNESS_SESSION';
}

export function isMeditationDurableActionData(data: unknown): boolean {
  const type = (data as { type?: string } | null)?.type;
  return (
    type === 'MEDITATION_FIXED' ||
    type === 'MEDITATION_AFTER_WAKE' ||
    type === 'MEDITATION_SESSION'
  );
}

/** Guided training, med reminder, mindfulness, or meditation lock-screen actions. */
export function isDurableBackgroundActionData(data: unknown): boolean {
  return (
    isGuidedTrainingActionData(data) ||
    isMedReminderActionData(data) ||
    isMindfulnessDurableActionData(data) ||
    isMeditationDurableActionData(data)
  );
}

export function serializeGuidedNotificationResponse(
  response: NotificationResponse,
): QueuedGuidedNotificationAction | null {
  const actionIdentifier = response.actionIdentifier;
  const notificationIdentifier = response.notification?.request?.identifier;
  if (!actionIdentifier || !notificationIdentifier) return null;

  const content = response.notification.request.content;
  const data = (content?.data ?? {}) as Record<string, unknown>;
  if (!isDurableBackgroundActionData(data)) return null;

  // Body taps that only open the app — do not queue as set completions / dose logs.
  if (actionIdentifier === 'expo.modules.notifications.actions.DEFAULT' || actionIdentifier === 'DEFAULT') {
    return null;
  }

  // Med reminders: only queue explicit action buttons (not unknown ids).
  if (isMedReminderActionData(data)) {
    if (actionIdentifier !== 'TAKE' && actionIdentifier !== 'SKIP' && actionIdentifier !== 'SNOOZE_10') {
      return null;
    }
  }

  // Mindfulness / meditation: Start + Done (not snooze — snooze still works inline).
  if (isMindfulnessDurableActionData(data) || isMeditationDurableActionData(data)) {
    if (actionIdentifier !== 'START' && actionIdentifier !== 'DONE' && actionIdentifier !== 'COMPLETE') {
      return null;
    }
  }

  const issuedAt =
    typeof data.issuedAt === 'string'
      ? data.issuedAt
      : typeof data.scheduledFor === 'string'
        ? data.scheduledFor
        : undefined;
  return {
    queueId: buildQueueId(notificationIdentifier, actionIdentifier, issuedAt),
    enqueuedAt: new Date().toISOString(),
    actionIdentifier,
    notificationIdentifier,
    issuedAt,
    data,
    title: content?.title ?? null,
    body: content?.body ?? null,
  };
}

export function queuedActionToNotificationResponse(
  item: QueuedGuidedNotificationAction,
): NotificationResponse {
  return {
    actionIdentifier: item.actionIdentifier,
    notification: {
      date: Date.parse(item.enqueuedAt) || Date.now(),
      request: {
        identifier: item.notificationIdentifier,
        content: {
          title: item.title ?? undefined,
          body: item.body ?? undefined,
          data: item.data,
          sound: null,
        },
        trigger: null,
      },
    },
  } as NotificationResponse;
}

async function readQueue(): Promise<QueuedGuidedNotificationAction[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedGuidedNotificationAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedGuidedNotificationAction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
}

/** Enqueue if guided training action; returns queueId or null if skipped. */
export async function enqueueGuidedNotificationAction(
  response: NotificationResponse,
): Promise<string | null> {
  const item = serializeGuidedNotificationResponse(response);
  if (!item) return null;

  const queue = await readQueue();
  if (queue.some((q) => q.queueId === item.queueId)) {
    logger.debug('[GUIDED_ACTION_QUEUE] duplicate skip', { queueId: item.queueId });
    return item.queueId;
  }
  queue.push(item);
  await writeQueue(queue);
  logger.debug('[GUIDED_ACTION_QUEUE] enqueued', {
    queueId: item.queueId,
    action: item.actionIdentifier,
    type: item.data?.type,
    depth: queue.length,
  });
  return item.queueId;
}

export async function peekGuidedNotificationActionQueue(): Promise<QueuedGuidedNotificationAction[]> {
  return readQueue();
}

/**
 * Drain FIFO. `processOne` should run the full handler (idempotent).
 * Removes an item only after processOne resolves (success or handled duplicate).
 * Concurrent drains chain so newly enqueued items still get a pass.
 */
export async function drainGuidedNotificationActionQueue(
  processOne: (response: NotificationResponse) => Promise<void>,
): Promise<{ processed: number; failed: number }> {
  const tallies = { processed: 0, failed: 0 };

  const run = async () => {
    for (;;) {
      const queue = await readQueue();
      if (queue.length === 0) break;

      const next = queue[0]!;
      try {
        await processOne(queuedActionToNotificationResponse(next));
        tallies.processed += 1;
      } catch (e) {
        tallies.failed += 1;
        logger.warn('[GUIDED_ACTION_QUEUE] process failed — leaving head for retry', {
          queueId: next.queueId,
          error: e,
        });
        break;
      }

      const after = await readQueue();
      const remaining = after.filter((q) => q.queueId !== next.queueId);
      await writeQueue(remaining);
    }

    if (tallies.processed > 0 || tallies.failed > 0) {
      logger.debug('[GUIDED_ACTION_QUEUE] drain done', { ...tallies });
    }
  };

  const next = drainChain.then(run, run);
  drainChain = next.then(
    () => undefined,
    () => undefined,
  );
  await next;
  return tallies;
}

/** Test / recovery helper. */
export async function clearGuidedNotificationActionQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
