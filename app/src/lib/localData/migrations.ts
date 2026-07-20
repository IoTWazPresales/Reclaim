import type { SQLiteDatabase } from 'expo-sqlite';

export type Migration = {
  readonly version: number;
  readonly description: string;
  readonly up: (db: SQLiteDatabase) => Promise<void>;
};

/** Ordered migrations; each version runs at most once. PRAGMA user_version tracks progress. */
export const LOCAL_DB_MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'bootstrap schema_version + sync_metadata stub',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reclaim_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reclaim_sync_metadata (
          domain TEXT PRIMARY KEY NOT NULL,
          last_success_at TEXT,
          last_attempt_at TEXT,
          last_error TEXT,
          pending_count INTEGER NOT NULL DEFAULT 0,
          stale_after_seconds INTEGER,
          next_desired_sync_at TEXT,
          provider_watermark TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_reclaim_sync_metadata_updated ON reclaim_sync_metadata(updated_at);
      `);
    },
  },
  {
    version: 2,
    description: 'local sleep mirror + health integration status snapshot',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reclaim_local_sleep_session (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_reclaim_local_sleep_user_start
          ON reclaim_local_sleep_session(user_id, start_time DESC);

        CREATE TABLE IF NOT EXISTS reclaim_health_integration_snapshot (
          user_id TEXT PRIMARY KEY NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    },
  },
  {
    version: 3,
    description: 'AsyncStorage durability mirrors: mood pending, blob mirrors (med dose, meditation, recovery)',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reclaim_mood_pending (
          user_id TEXT NOT NULL,
          local_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, local_id)
        );
        CREATE INDEX IF NOT EXISTS idx_reclaim_mood_pending_user ON reclaim_mood_pending(user_id);

        CREATE TABLE IF NOT EXISTS reclaim_async_blob_mirror (
          domain TEXT NOT NULL,
          user_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (domain, user_id)
        );
      `);
    },
  },
  {
    version: 4,
    description: 'routine day state (Today) canonical local rows',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reclaim_routine_day_state (
          user_id TEXT NOT NULL,
          day_date TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, day_date)
        );
        CREATE INDEX IF NOT EXISTS idx_reclaim_routine_day_user_day
          ON reclaim_routine_day_state(user_id, day_date);
      `);
    },
  },
  {
    version: 5,
    description: 'generic read-through JSON cache for Supabase-heavy lists (meds, daily health, training history)',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reclaim_read_cache (
          user_id TEXT NOT NULL,
          cache_key TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, cache_key)
        );
        CREATE INDEX IF NOT EXISTS idx_reclaim_read_cache_user ON reclaim_read_cache(user_id);
      `);
    },
  },
  {
    version: 6,
    description: 'signal ledger tall daily factor snapshots (explanations + graph SSOT)',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reclaim_signal_ledger (
          user_id TEXT NOT NULL,
          day_date TEXT NOT NULL,
          factor TEXT NOT NULL,
          value REAL NOT NULL,
          source TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, day_date, factor)
        );
        CREATE INDEX IF NOT EXISTS idx_signal_ledger_user_factor_day
          ON reclaim_signal_ledger(user_id, factor, day_date DESC);
      `);
    },
  },
];
