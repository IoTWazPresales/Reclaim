/**
 * Durable read-through cache rows for remote-heavy Supabase reads (meds list, daily aggregates, training history lists).
 * Updated after successful remote fetch or merged on write paths; used when the network query fails.
 */
import { initializeLocalDatabase, requireLocalDatabase } from '@/lib/localData/database';
import { logger } from '@/lib/logger';

export const readCacheKeys = {
  meds: 'meds',
  activityDaily: (days: number) => `activity_daily:${days}`,
  vitalsDaily: (days: number) => `vitals_daily:${days}`,
  trainingSessions: (limit: number) => `training_sessions:${limit}`,
} as const;

export async function saveReadCache(userId: string, cacheKey: string, payload: unknown): Promise<void> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return;

  try {
    const db = requireLocalDatabase();
    const json = JSON.stringify(payload ?? null);
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO reclaim_read_cache (user_id, cache_key, payload_json, updated_at)
       VALUES (?, ?, ?, ?)`,
      [userId, cacheKey, json, now],
    );
  } catch (e) {
    logger.debug('[readCache] save failed', (e as Error)?.message);
  }
}

export async function loadReadCache<T>(userId: string, cacheKey: string): Promise<T | null> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return null;

  try {
    const db = requireLocalDatabase();
    const row = await db.getFirstAsync<{ payload_json: string }>(
      `SELECT payload_json FROM reclaim_read_cache WHERE user_id = ? AND cache_key = ?`,
      [userId, cacheKey],
    );
    if (!row?.payload_json) return null;
    return JSON.parse(row.payload_json) as T;
  } catch (e) {
    logger.debug('[readCache] load failed', (e as Error)?.message);
    return null;
  }
}

export async function deleteReadCacheForUser(userId: string): Promise<void> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return;

  try {
    const db = requireLocalDatabase();
    await db.runAsync(`DELETE FROM reclaim_read_cache WHERE user_id = ?`, [userId]);
  } catch (e) {
    logger.debug('[readCache] delete user rows failed', (e as Error)?.message);
  }
}
