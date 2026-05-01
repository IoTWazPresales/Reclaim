import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { LOCAL_DB_MIGRATIONS } from '@/lib/localData/migrations';
import type { LocalDbInitResult, LocalDbInitStatus } from '@/lib/localData/types';

const DB_NAME = 'reclaim_local.db';

let dbSingleton: SQLiteDatabase | null = null;
let initPromise: Promise<LocalDbInitResult> | null = null;
let status: LocalDbInitStatus = 'uninitialized';
let lastInitError: Error | null = null;

export function getLocalDbStatus(): LocalDbInitStatus {
  return status;
}

export function getLocalDbLastError(): Error | null {
  return lastInitError;
}

async function readUserVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return typeof row?.user_version === 'number' ? row.user_version : 0;
}

/** Apply pending migrations in order; safe to call multiple times. */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  let current = await readUserVersion(db);
  for (const m of LOCAL_DB_MIGRATIONS) {
    if (current >= m.version) continue;
    await db.withTransactionAsync(async () => {
      await m.up(db);
    });
    await db.execAsync(`PRAGMA user_version = ${m.version}`);
    current = m.version;
  }
}

/**
 * Opens the local DB, runs migrations, returns singleton.
 * Does not block forever — failures surface via status / result (no silent corruption).
 */
export async function initializeLocalDatabase(): Promise<LocalDbInitResult> {
  if (dbSingleton && status === 'ready') {
    return { ok: true, status: 'ready' };
  }
  if (initPromise) return initPromise;

  status = 'opening';
  lastInitError = null;

  initPromise = (async (): Promise<LocalDbInitResult> => {
    try {
      const db = await openDatabaseAsync(DB_NAME);
      await runMigrations(db);
      dbSingleton = db;
      status = 'ready';
      return { ok: true, status: 'ready' };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      lastInitError = err;
      dbSingleton = null;
      status = 'failed';
      return { ok: false, status: 'failed', error: err };
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/** Returns ready DB or throws — use after initializeLocalDatabase() succeeds. */
export function requireLocalDatabase(): SQLiteDatabase {
  if (!dbSingleton || status !== 'ready') {
    throw new Error('Local database not initialized — call initializeLocalDatabase() first');
  }
  return dbSingleton;
}

/** Test-only: reset module state (Vitest). */
export function __resetLocalDatabaseForTests(): void {
  dbSingleton = null;
  initPromise = null;
  status = 'uninitialized';
  lastInitError = null;
}
