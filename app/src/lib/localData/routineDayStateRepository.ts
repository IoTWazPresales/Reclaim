/**
 * Canonical per-day routine suggestion state for Today (`reclaim_routine_day_state`).
 * Legacy `@reclaim/routines/<YYYY-MM-DD>` remains compatibility / migration source.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { initializeLocalDatabase, requireLocalDatabase } from '@/lib/localData/database';
import { logger } from '@/lib/logger';
import type { RoutineStateByTemplate } from '@/lib/routines';
import { ROUTINE_DAY_LEGACY_STORAGE_PREFIX } from '@/lib/routines';

function legacyStorageKeyForDate(dayDate: string): string {
  return `${ROUTINE_DAY_LEGACY_STORAGE_PREFIX}${dayDate}`;
}

export async function loadRoutineDayStateForUser(
  userId: string,
  dayDate: string,
): Promise<RoutineStateByTemplate | null> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return null;

  try {
    const db = requireLocalDatabase();
    const row = await db.getFirstAsync<{ payload_json: string }>(
      `SELECT payload_json FROM reclaim_routine_day_state WHERE user_id = ? AND day_date = ?`,
      [userId, dayDate],
    );
    if (!row?.payload_json) return null;
    const parsed = JSON.parse(row.payload_json) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as RoutineStateByTemplate;
    return {};
  } catch (e) {
    logger.debug('[loadRoutineDayStateForUser]', (e as Error)?.message);
    return null;
  }
}

export async function saveRoutineDayStateForUser(
  userId: string,
  dayDate: string,
  state: RoutineStateByTemplate,
): Promise<void> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return;

  try {
    const db = requireLocalDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO reclaim_routine_day_state (user_id, day_date, payload_json, updated_at)
       VALUES (?, ?, ?, ?)`,
      [userId, dayDate, JSON.stringify(state), now],
    );
  } catch (e) {
    logger.debug('[saveRoutineDayStateForUser]', (e as Error)?.message);
  }
}

/**
 * One-way migration when SQLite has no row: copy legacy AsyncStorage blob into localData.
 */
export async function tryMigrateRoutineDayFromAsyncStorage(
  userId: string,
  dayDate: string,
): Promise<RoutineStateByTemplate | null> {
  const existing = await loadRoutineDayStateForUser(userId, dayDate);
  if (existing !== null) return existing;

  const raw = await AsyncStorage.getItem(legacyStorageKeyForDate(dayDate));
  if (raw === null || raw === '') return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const state = parsed as RoutineStateByTemplate;
    await saveRoutineDayStateForUser(userId, dayDate, state);
    logger.info('[routines] Migrated legacy AsyncStorage routine day state to localData', { dayDate });
    return state;
  } catch {
    return null;
  }
}
