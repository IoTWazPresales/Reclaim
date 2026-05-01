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
];
