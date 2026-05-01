import type { SleepSession } from '@/lib/api';
import { initializeLocalDatabase, requireLocalDatabase } from '@/lib/localData/database';
import { logger } from '@/lib/logger';

export async function mergeRemoteSleepSessionsIntoLocal(userId: string, sessions: SleepSession[]): Promise<void> {
  if (sessions.length === 0) return;
  const init = await initializeLocalDatabase();
  if (!init.ok) return;

  const db = requireLocalDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const s of sessions) {
      if (!s?.id || s.user_id !== userId) continue;
      const payload = JSON.stringify(s);
      await db.runAsync(
        `INSERT OR REPLACE INTO reclaim_local_sleep_session (id, user_id, payload_json, start_time, end_time, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, s.user_id, payload, s.start_time, s.end_time, now],
      );
    }
  });
}

export async function deleteLocalSleepSessionsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const init = await initializeLocalDatabase();
  if (!init.ok) return;

  const db = requireLocalDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM reclaim_local_sleep_session WHERE id IN (${placeholders})`, ids);
}

/**
 * Reads mirrored cloud/provider-backed rows from SQLite (device-local UX cache).
 * Does not contact Supabase.
 */
export async function listLocalSleepSessions(userId: string, sinceDays: number): Promise<SleepSession[]> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return [];

  const db = requireLocalDatabase();
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const sinceIso = since.toISOString();

  try {
    const rows = await db.getAllAsync<{ payload_json: string }>(
      `SELECT payload_json FROM reclaim_local_sleep_session
       WHERE user_id = ? AND start_time >= ?
       ORDER BY start_time DESC`,
      [userId, sinceIso],
    );
    return (rows ?? []).map((r) => JSON.parse(r.payload_json) as SleepSession);
  } catch (e) {
    logger.debug('[listLocalSleepSessions] failed', (e as Error)?.message);
    return [];
  }
}
