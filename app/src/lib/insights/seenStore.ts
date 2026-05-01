// C:\Reclaim\app\src\lib\insights\seenStore.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '@reclaim/insights:seen:v1';

type SeenMap = Record<string, number>; // `${screen}:${insightId}` -> timestamp (ms)

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId || 'anon'}`;
}

/**
 * Mark an insight as seen for a specific screen.
 * Non-blocking: catches errors silently.
 */
export async function markInsightSeen({
  userId,
  screen,
  insightId,
  ts,
}: {
  userId: string | null | undefined;
  screen: string;
  insightId: string;
  ts: number;
}): Promise<void> {
  try {
    const key = getStorageKey(userId || 'anon');
    const raw = await AsyncStorage.getItem(key);
    const seen: SeenMap = raw ? JSON.parse(raw) : {};

    const entryKey = `${screen}:${insightId}`;
    seen[entryKey] = ts;

    // Prune old entries while saving (keep storage small)
    const ttlMs = 24 * 60 * 60 * 1000; // 24 hours
    const pruned = pruneOldSeenEntriesSync(seen, ts, ttlMs);

    await AsyncStorage.setItem(key, JSON.stringify(pruned));
  } catch (error) {
    // Non-blocking: don't fail if storage fails
    if (__DEV__) {
      console.warn('[seenStore] markInsightSeen failed', error);
    }
  }
}

/**
 * Check if an insight was seen recently on a specific screen.
 * Returns true if seen within TTL, false otherwise.
 */
export async function wasInsightSeenRecently({
  userId,
  screen,
  insightId,
  nowTs,
  ttlMs = 24 * 60 * 60 * 1000, // 24 hours default
}: {
  userId: string | null | undefined;
  screen: string;
  insightId: string;
  nowTs: number;
  ttlMs?: number;
}): Promise<boolean> {
  try {
    const key = getStorageKey(userId || 'anon');
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return false;

    const seen: SeenMap = JSON.parse(raw);
    const entryKey = `${screen}:${insightId}`;
    const lastSeen = seen[entryKey];

    if (!lastSeen || typeof lastSeen !== 'number') return false;

    const ageMs = nowTs - lastSeen;
    return ageMs >= 0 && ageMs < ttlMs;
  } catch (error) {
    // On error, assume not seen (safe fallback)
    if (__DEV__) {
      console.warn('[seenStore] wasInsightSeenRecently failed', error);
    }
    return false;
  }
}

/**
 * Prune entries older than TTL from a seen map (synchronous helper).
 */
export function pruneOldSeenEntriesSync(seen: SeenMap, nowTs: number, ttlMs: number): SeenMap {
  const pruned: SeenMap = {};
  const cutoff = nowTs - ttlMs;

  for (const [key, timestamp] of Object.entries(seen)) {
    if (typeof timestamp === 'number' && timestamp >= cutoff) {
      pruned[key] = timestamp;
    }
  }

  return pruned;
}

/**
 * Prune old entries from storage (async).
 */
export async function pruneOldSeenEntries({
  userId,
  nowTs,
  ttlMs = 24 * 60 * 60 * 1000,
}: {
  userId: string | null | undefined;
  nowTs: number;
  ttlMs?: number;
}): Promise<void> {
  try {
    const key = getStorageKey(userId || 'anon');
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;

    const seen: SeenMap = JSON.parse(raw);
    const pruned = pruneOldSeenEntriesSync(seen, nowTs, ttlMs);

    await AsyncStorage.setItem(key, JSON.stringify(pruned));
  } catch (error) {
    // Non-blocking
    if (__DEV__) {
      console.warn('[seenStore] pruneOldSeenEntries failed', error);
    }
  }
}

/**
 * Filter insights to only those not seen recently on the given screen.
 * Returns a new array with unseen insights in the same order.
 */
export async function filterUnseenInsights<T extends { id: string }>({
  insights,
  screen,
  userId,
  nowTs,
  ttlMs = 24 * 60 * 60 * 1000,
}: {
  insights: T[];
  screen: string;
  userId: string | null | undefined;
  nowTs: number;
  ttlMs?: number;
}): Promise<T[]> {
  const unseen: T[] = [];

  for (const insight of insights) {
    const seen = await wasInsightSeenRecently({
      userId,
      screen,
      insightId: insight.id,
      nowTs,
      ttlMs,
    });

    if (!seen) {
      unseen.push(insight);
    }
  }

  return unseen;
}
