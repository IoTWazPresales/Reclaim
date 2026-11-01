import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalDbInitResult, LocalDbInitStatus } from './types';

// Online-only spike: optional cache callers already fall back when init fails.
// Do not import SQLite's runtime/WASM or pretend an in-memory DB is durable.
const unavailable = new Error('Local SQLite cache is unavailable in Web Lite.');
export function getLocalDbStatus(): LocalDbInitStatus { return 'failed'; }
export function getLocalDbLastError(): Error { return unavailable; }
export async function initializeLocalDatabase(): Promise<LocalDbInitResult> {
  return { ok: false, status: 'failed', error: unavailable };
}
export function requireLocalDatabase(): SQLiteDatabase { throw unavailable; }
export async function runMigrations(_db: SQLiteDatabase): Promise<void> { throw unavailable; }
export function __resetLocalDatabaseForTests(): void { /* No mutable web database state. */ }
