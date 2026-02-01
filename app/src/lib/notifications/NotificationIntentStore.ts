/**
 * NotificationIntentStore - AsyncStorage-backed store for notification scheduling intents.
 * Phase 5.1: Dual-path writes (intent + existing schedule). Used for diagnostics; no behavior change yet.
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
};

async function loadIntents(): Promise<NotificationIntent[]> {
  try {
    const raw = await AsyncStorage.getItem(INTENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveIntents(intents: NotificationIntent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INTENTS_KEY, JSON.stringify(intents));
  } catch (e) {
    intentLog.warn('Failed to save intents', e);
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
    data,
    createdAt: new Date().toISOString(),
    ttlMinutes: options?.ttlMinutes ?? DEFAULT_TTL_MINUTES,
  };
  const intents = await loadIntents();
  const idx = intents.findIndex((i) => i.logicalKey === logicalKey);
  if (idx >= 0) intents[idx] = intent;
  else intents.push(intent);
  await saveIntents(intents);
  intentLog.debug('setIntent', logicalKey);
}

/**
 * Get all intents (for diagnostics). Expired intents are filtered out.
 */
export async function getIntents(): Promise<NotificationIntent[]> {
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
}

/**
 * Clear a single intent by logicalKey
 */
export async function clearIntent(logicalKey: string): Promise<void> {
  const intents = await loadIntents();
  const filtered = intents.filter((i) => i.logicalKey !== logicalKey);
  if (filtered.length !== intents.length) {
    await saveIntents(filtered);
    intentLog.debug('clearIntent', logicalKey);
  }
}

/**
 * Log that both intent write and scheduleNotificationAsync were performed (dual path)
 */
export function logDualPath(logicalKey: string, context?: string): void {
  dualLog.debug('dual path', logicalKey, context ?? '');
}
