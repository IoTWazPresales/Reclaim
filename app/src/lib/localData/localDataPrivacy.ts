/**
 * Privacy export and account-deletion support for the on-device SQLite layer (`reclaim_local.db`).
 * Excludes auth/session tokens (those are in SecureStore / not in this schema).
 */
import { initializeLocalDatabase, requireLocalDatabase } from '@/lib/localData/database';
import { logger } from '@/lib/logger';

const EXPORT_NOTE =
  'On-device operational mirrors and queues. `reclaim_sync_metadata` is device-wide sync bookkeeping, not RLS-scoped.';

export type LocalDataExportSection = {
  schemaVersion: 1;
  userId: string;
  generatedAt: string;
  note: string;
  /** All rows in `reclaim_sync_metadata` (device-wide, not per-user in schema). */
  reclaim_sync_metadata: Array<{
    domain: string;
    last_success_at: string | null;
    last_attempt_at: string | null;
    last_error: string | null;
    pending_count: number;
    provider_watermark: string | null;
    updated_at: string;
  }>;
  reclaim_local_sleep_session: Array<{
    id: string;
    start_time: string;
    end_time: string;
    record: unknown;
  }>;
  reclaim_health_integration_snapshot: unknown | null;
  reclaim_mood_pending: Array<unknown>;
  reclaim_async_blob_mirror: Array<{ domain: string; payload: unknown }>;
  reclaim_routine_day_state: Array<{ day_date: string; state: unknown }>;
  /** Read-through JSON snapshots for remote-heavy list reads (meds, daily health aggregates, training history). */
  reclaim_read_cache: Array<{ cache_key: string; payload: unknown }>;
};

export async function exportLocalDataSectionForUser(
  userId: string,
): Promise<LocalDataExportSection | { error: string }> {
  try {
    const init = await initializeLocalDatabase();
    if (!init.ok) {
      return { error: 'local_database_unavailable' };
    }
    const db = requireLocalDatabase();

    const syncRows = await db.getAllAsync<{
      domain: string;
      last_success_at: string | null;
      last_attempt_at: string | null;
      last_error: string | null;
      pending_count: number;
      provider_watermark: string | null;
      updated_at: string;
    }>(`SELECT domain, last_success_at, last_attempt_at, last_error, pending_count, provider_watermark, updated_at
        FROM reclaim_sync_metadata ORDER BY domain ASC`);

    const sleepRows = await db.getAllAsync<{
      id: string;
      payload_json: string;
      start_time: string;
      end_time: string;
    }>(
      `SELECT id, payload_json, start_time, end_time FROM reclaim_local_sleep_session
       WHERE user_id = ? ORDER BY start_time DESC`,
      [userId],
    );

    const healthRow = await db.getFirstAsync<{ payload_json: string }>(
      `SELECT payload_json FROM reclaim_health_integration_snapshot WHERE user_id = ?`,
      [userId],
    );
    let healthSnapshot: unknown = null;
    if (healthRow?.payload_json) {
      try {
        healthSnapshot = JSON.parse(healthRow.payload_json) as unknown;
      } catch {
        healthSnapshot = { _parseError: true };
      }
    }

    const moodRows = await db.getAllAsync<{ payload_json: string }>(
      `SELECT payload_json FROM reclaim_mood_pending WHERE user_id = ? ORDER BY local_id ASC`,
      [userId],
    );
    const moodPending = moodRows.map((r) => {
      try {
        return JSON.parse(r.payload_json) as unknown;
      } catch {
        return { _raw: r.payload_json, _parseError: true };
      }
    });

    const blobRows = await db.getAllAsync<{ domain: string; payload_json: string }>(
      `SELECT domain, payload_json FROM reclaim_async_blob_mirror WHERE user_id = ? ORDER BY domain ASC`,
      [userId],
    );
    const asyncBlobMirror = blobRows.map((r) => {
      try {
        return { domain: r.domain, payload: JSON.parse(r.payload_json) as unknown };
      } catch {
        return { domain: r.domain, payload: { _raw: r.payload_json, _parseError: true } };
      }
    });

    const routineRows = await db.getAllAsync<{ day_date: string; payload_json: string }>(
      `SELECT day_date, payload_json FROM reclaim_routine_day_state WHERE user_id = ? ORDER BY day_date ASC`,
      [userId],
    );
    const routineDayState = routineRows.map((r) => {
      try {
        return { day_date: r.day_date, state: JSON.parse(r.payload_json) as unknown };
      } catch {
        return { day_date: r.day_date, state: { _raw: r.payload_json, _parseError: true } };
      }
    });

    const readCacheRows = await db.getAllAsync<{ cache_key: string; payload_json: string }>(
      `SELECT cache_key, payload_json FROM reclaim_read_cache WHERE user_id = ? ORDER BY cache_key ASC`,
      [userId],
    );
    const reclaim_read_cache = readCacheRows.map((r) => {
      try {
        return { cache_key: r.cache_key, payload: JSON.parse(r.payload_json) as unknown };
      } catch {
        return { cache_key: r.cache_key, payload: { _raw: r.payload_json, _parseError: true } };
      }
    });

    const localSleep = sleepRows.map((r) => {
      let record: unknown;
      try {
        record = JSON.parse(r.payload_json) as unknown;
      } catch {
        record = { _parseError: true };
      }
      return {
        id: r.id,
        start_time: r.start_time,
        end_time: r.end_time,
        record,
      };
    });

    const section: LocalDataExportSection = {
      schemaVersion: 1,
      userId,
      generatedAt: new Date().toISOString(),
      note: EXPORT_NOTE,
      reclaim_sync_metadata: syncRows ?? [],
      reclaim_local_sleep_session: localSleep,
      reclaim_health_integration_snapshot: healthSnapshot,
      reclaim_mood_pending: moodPending,
      reclaim_async_blob_mirror: asyncBlobMirror,
      reclaim_routine_day_state: routineDayState,
      reclaim_read_cache,
    };
    return section;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn('[localDataPrivacy] export failed', e);
    return { error: msg };
  }
}

/**
 * Removes user-scoped SQLite rows and resets device-wide sync/meta stubs.
 * Idempotent. Does not delete the database file.
 */
export async function clearAllLocalDataForUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!userId?.trim()) {
    return { ok: false, error: 'missing_user_id' };
  }
  try {
    const init = await initializeLocalDatabase();
    if (!init.ok) {
      logger.warn('[localDataPrivacy] clear skipped: database unavailable');
      return { ok: false, error: 'local_database_unavailable' };
    }
    const db = requireLocalDatabase();

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM reclaim_local_sleep_session WHERE user_id = ?`, [userId]);
      await db.runAsync(`DELETE FROM reclaim_health_integration_snapshot WHERE user_id = ?`, [userId]);
      await db.runAsync(`DELETE FROM reclaim_mood_pending WHERE user_id = ?`, [userId]);
      await db.runAsync(`DELETE FROM reclaim_async_blob_mirror WHERE user_id = ?`, [userId]);
      await db.runAsync(`DELETE FROM reclaim_routine_day_state WHERE user_id = ?`, [userId]);
      await db.runAsync(`DELETE FROM reclaim_read_cache WHERE user_id = ?`, [userId]);
      await db.runAsync(`DELETE FROM reclaim_sync_metadata`, []);
      await db.runAsync(`DELETE FROM reclaim_meta`, []);
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn('[localDataPrivacy] clear failed', e);
    return { ok: false, error: msg };
  }
}
