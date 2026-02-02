/**
 * ActionIdempotencyStore - Persisted idempotency for notification action handlers.
 * Ensures duplicate action delivery (e.g. from watch + phone) or restart-after-crash
 * does not double-execute (e.g. double logMedDose).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

const STORE_KEY = '@reclaim/notifications/actionProcessed';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type ProcessedEntry = { key: string; processedAt: string };

async function loadProcessed(): Promise<ProcessedEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveProcessed(entries: ProcessedEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(entries));
  } catch (e) {
    logger.warn('[NOTIF_ACTION] Failed to save processed keys', e);
  }
}

/**
 * Check if this action was already processed (idempotent guard).
 * Returns true if already processed (caller should skip), false if first time.
 */
export async function wasActionProcessed(key: string): Promise<boolean> {
  const entries = await loadProcessed();
  const now = Date.now();
  const valid = entries.filter((e) => now - new Date(e.processedAt).getTime() < TTL_MS);
  const found = valid.some((e) => e.key === key);
  if (valid.length !== entries.length) {
    await saveProcessed(valid);
  }
  return found;
}

/**
 * Mark this action as processed. Call after successfully handling.
 */
export async function markActionProcessed(key: string): Promise<void> {
  const entries = await loadProcessed();
  const now = Date.now();
  const valid = entries.filter((e) => now - new Date(e.processedAt).getTime() < TTL_MS);
  if (valid.some((e) => e.key === key)) return; // already present
  valid.push({ key, processedAt: new Date().toISOString() });
  await saveProcessed(valid);
}
