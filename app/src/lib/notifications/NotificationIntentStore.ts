/**
 * NotificationIntentStore - AsyncStorage-backed store for notification scheduling intents.
 * Single-JS-runtime serialized authority for notification scheduling intents.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createObservabilityLogger } from '@/lib/logger';

const intentLog = createObservabilityLogger('NOTIF_INTENT');
const dualLog = createObservabilityLogger('NOTIF_DUAL');

const INTENTS_KEY = '@reclaim/notifications/intents';
const DEFAULT_TTL_MINUTES = 60 * 24 * 7; // 7 days

export type NotificationIntent = {
  logicalKey: string;
  data: Record<string, any>;
  createdAt: string;
  ttlMinutes?: number;
  /** Opaque write identity, not a security credential. Legacy rows may lack it. */
  revision?: string;
};

const writerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
let nextRevision = 0;
let pending: Promise<unknown> = Promise.resolve();

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  // Keep the queue usable after a failure; the original result still rejects.
  pending = result.then(() => undefined, () => undefined);
  return result;
}

async function loadIntents(): Promise<NotificationIntent[]> {
  try {
    const raw = await AsyncStorage.getItem(INTENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid notification intent document');
    return parsed;
  } catch (error) {
    intentLog.warn('Failed to load intents', error);
    throw error;
  }
}

async function saveIntents(intents: NotificationIntent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INTENTS_KEY, JSON.stringify(intents));
  } catch (e) {
    intentLog.warn('Failed to save intents', e);
    throw e;
  }
}

/**
 * Set an intent (dedupe by logicalKey - overwrites existing)
 */
export async function setIntent(
  logicalKey: string,
  data: Record<string, any>,
  options?: { ttlMinutes?: number }
): Promise<void> {
  const intent: NotificationIntent = {
    logicalKey,
    data: JSON.parse(JSON.stringify(data)),
    createdAt: new Date().toISOString(),
    ttlMinutes: options?.ttlMinutes ?? DEFAULT_TTL_MINUTES,
    revision: `${writerId}:${++nextRevision}`,
  };
  return serialized(async () => {
    const intents = await loadIntents();
    const idx = intents.findIndex((i) => i.logicalKey === logicalKey);
    if (idx >= 0) intents[idx] = intent;
    else intents.push(intent);
    await saveIntents(intents);
    intentLog.debug('[INTENT_LIFECYCLE] setIntent', { key: logicalKey, totalIntents: intents.length });
  });
}

/**
 * Get all intents (for diagnostics). Expired intents are filtered out.
 */
export async function getIntents(): Promise<NotificationIntent[]> {
  return serialized(async () => {
    const intents = await loadIntents();
    const now = Date.now();
    const valid = intents.filter((i) => {
      const ttlMs = (i.ttlMinutes ?? DEFAULT_TTL_MINUTES) * 60 * 1000;
      const created = new Date(i.createdAt).getTime();
      return now - created < ttlMs;
    });
    if (valid.length !== intents.length) {
      await saveIntents(valid);
    }
    return valid;
  });
}

/**
 * Clear a single intent by logicalKey
 */
export async function clearIntent(logicalKey: string): Promise<void> {
  return serialized(async () => {
    const intents = await loadIntents();
    const filtered = intents.filter((i) => i.logicalKey !== logicalKey);
    if (filtered.length !== intents.length) {
      await saveIntents(filtered);
      intentLog.debug('[INTENT_LIFECYCLE] clearIntent', { key: logicalKey, remainingIntents: filtered.length });
    }
  });
}

/**
 * Check whether an intent exists (for stale-notification guards).
 * Does NOT filter by TTL — caller decides how to interpret.
 */
export async function hasIntent(logicalKey: string): Promise<boolean> {
  return serialized(async () => {
    const intents = await loadIntents();
    return intents.some((i) => i.logicalKey === logicalKey);
  });
}

/** Single intent by key, or null. */
export async function getIntent(logicalKey: string): Promise<NotificationIntent | null> {
  const intents = await getIntents();
  return intents.find((i) => i.logicalKey === logicalKey) ?? null;
}

/**
 * Clear all intents whose logicalKey starts with the given prefix.
 * Used to clear training intents when a session ends or is cancelled.
 */
export async function clearIntentsByPrefix(prefix: string): Promise<void> {
  return serialized(async () => {
    const intents = await loadIntents();
    const filtered = intents.filter((i) => !i.logicalKey.startsWith(prefix));
    if (filtered.length !== intents.length) {
      const clearedCount = intents.length - filtered.length;
      await saveIntents(filtered);
      intentLog.debug('[INTENT_LIFECYCLE] clearIntentsByPrefix', { prefix, clearedCount, remainingIntents: filtered.length });
    }
  });
}

/**
 * Clear every stored intent whose key matches, in one serialized write.
 * Used so a reminder wipe cannot drop a live guidance key that arrives mid-loop.
 */
export async function clearIntentsWhere(
  shouldClear: (logicalKey: string) => boolean,
): Promise<number> {
  return serialized(async () => {
    const intents = await loadIntents();
    const filtered = intents.filter((intent) => !shouldClear(intent.logicalKey));
    if (filtered.length === intents.length) return 0;
    const clearedCount = intents.length - filtered.length;
    await saveIntents(filtered);
    intentLog.debug('[INTENT_LIFECYCLE] clearIntentsWhere', {
      clearedCount,
      remainingIntents: filtered.length,
    });
    return clearedCount;
  });
}

/** Account-delete / full wipe: empty the intent store, then caller must reconcileNotifications(). */
export async function clearAllIntents(): Promise<void> {
  return serialized(async () => {
    const intents = await loadIntents();
    if (intents.length === 0) return;
    await saveIntents([]);
    intentLog.debug('[INTENT_LIFECYCLE] clearAllIntents', { clearedCount: intents.length });
  });
}

/**
 * Replace one intent only when it is still the snapshot the caller read.
 * A cleared or replaced row is left untouched, so a late writer cannot
 * recreate a cleared prompt or overwrite a newer one.
 */
export async function setIntentIfCurrent(
  expected: NotificationIntent,
  data: Record<string, any>,
  options?: { ttlMinutes?: number },
): Promise<boolean> {
  const next: NotificationIntent = {
    logicalKey: expected.logicalKey,
    data: JSON.parse(JSON.stringify(data)),
    createdAt: new Date().toISOString(),
    ttlMinutes: options?.ttlMinutes ?? expected.ttlMinutes ?? DEFAULT_TTL_MINUTES,
    revision: `${writerId}:${++nextRevision}`,
  };
  return serialized(async () => {
    const intents = await loadIntents();
    const index = intents.findIndex((intent) => intent.logicalKey === expected.logicalKey);
    if (index < 0) return false;
    const current = intents[index];
    const matches = expected.revision !== undefined
      ? current.revision === expected.revision
      : current.revision === undefined
        && current.createdAt === expected.createdAt
        && JSON.stringify(current.data) === JSON.stringify(expected.data);
    if (!matches) return false;
    intents[index] = next;
    await saveIntents(intents);
    intentLog.debug('[INTENT_LIFECYCLE] setIntentIfCurrent', { key: expected.logicalKey });
    return true;
  });
}

/** A delivered snapshot may acknowledge only itself, never a replacement. */
export async function acknowledgeIntentDelivery(expected: NotificationIntent): Promise<boolean> {
  return serialized(async () => {
    const intents = await loadIntents();
    const current = intents.find(intent => intent.logicalKey === expected.logicalKey);
    if (!current || current.data.firedAt) return false;
    const matches = expected.revision !== undefined
      ? current.revision === expected.revision
      : current.revision === undefined && JSON.stringify(current) === JSON.stringify(expected);
    if (!matches) return false;
    current.data = { ...current.data, firedAt: new Date().toISOString() };
    await saveIntents(intents);
    return true;
  });
}

/**
 * Log that both intent write and scheduleNotificationAsync were performed (dual path)
 */
export function logDualPath(logicalKey: string, context?: string): void {
  dualLog.debug('dual path', logicalKey, context ?? '');
}
