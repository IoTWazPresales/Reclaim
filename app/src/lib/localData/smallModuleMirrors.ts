/**
 * SQLite mirrors for AsyncStorage-backed small modules (durability / restore safety).
 * AsyncStorage remains the canonical read path; mirrors are best-effort replicas after writes.
 * Phase 3.5 read-through: if AsyncStorage is missing or invalid, restore from SQLite (see call sites).
 * Deferred: reconciling AsyncStorage vs mirror when both exist with conflicting timestamps (AsyncStorage wins today).
 */
import { supabase } from '@/lib/supabase';
import type { PendingMoodCheckinV2 } from '@/lib/mood/moodOutbox';
import type { PendingMedDose } from '@/lib/notifications/MedDoseOfflineQueue';
import { initializeLocalDatabase, requireLocalDatabase } from '@/lib/localData/database';
import { logger } from '@/lib/logger';

async function requireUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Domain keys for `reclaim_async_blob_mirror` */
export const ASYNC_MIRROR_DOMAIN = {
  medDoseQueue: 'med_dose_queue',
  meditationSessions: 'meditation_sessions',
  recoveryProgress: 'recovery_progress',
} as const;

export async function replaceMoodPendingMirror(rows: PendingMoodCheckinV2[]): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  const init = await initializeLocalDatabase();
  if (!init.ok) return;

  const db = requireLocalDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM reclaim_mood_pending WHERE user_id = ?`, [userId]);
    for (const row of rows) {
      if (!row?.localId) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO reclaim_mood_pending (user_id, local_id, payload_json, updated_at)
         VALUES (?, ?, ?, ?)`,
        [userId, row.localId, JSON.stringify(row), now],
      );
    }
  });
}

export function scheduleMoodPendingMirror(rows: PendingMoodCheckinV2[]): void {
  void replaceMoodPendingMirror(rows).catch((e) =>
    logger.debug('[replaceMoodPendingMirror]', (e as Error)?.message),
  );
}

export async function replaceBlobMirror(
  domain: string,
  userId: string,
  payload: unknown,
): Promise<void> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return;

  const db = requireLocalDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO reclaim_async_blob_mirror (domain, user_id, payload_json, updated_at)
     VALUES (?, ?, ?, ?)`,
    [domain, userId, JSON.stringify(payload ?? null), now],
  );
}

export async function replaceMedDoseQueueMirror(queue: PendingMedDose[]): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await replaceBlobMirror(ASYNC_MIRROR_DOMAIN.medDoseQueue, userId, queue);
}

export function scheduleMedDoseQueueMirror(queue: PendingMedDose[]): void {
  void replaceMedDoseQueueMirror(queue).catch((e) =>
    logger.debug('[replaceMedDoseQueueMirror]', (e as Error)?.message),
  );
}

export async function replaceMeditationSessionsMirror(sessions: unknown[]): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await replaceBlobMirror(ASYNC_MIRROR_DOMAIN.meditationSessions, userId, sessions);
}

export function scheduleMeditationSessionsMirror(sessions: unknown[]): void {
  void replaceMeditationSessionsMirror(sessions).catch((e) =>
    logger.debug('[replaceMeditationSessionsMirror]', (e as Error)?.message),
  );
}

export async function replaceRecoveryProgressMirror(progress: Record<string, unknown>): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await replaceBlobMirror(ASYNC_MIRROR_DOMAIN.recoveryProgress, userId, progress);
}

export function scheduleRecoveryProgressMirror(progress: Record<string, unknown>): void {
  void replaceRecoveryProgressMirror(progress).catch((e) =>
    logger.debug('[replaceRecoveryProgressMirror]', (e as Error)?.message),
  );
}

// --- Read-through restore (Phase 3.5): load mirror rows when AsyncStorage is missing/invalid ---

export async function loadMoodPendingMirrorForUser(userId: string): Promise<PendingMoodCheckinV2[]> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return [];

  try {
    const db = requireLocalDatabase();
    const rows = await db.getAllAsync<{ payload_json: string }>(
      `SELECT payload_json FROM reclaim_mood_pending WHERE user_id = ? ORDER BY updated_at ASC`,
      [userId],
    );
    const out: PendingMoodCheckinV2[] = [];
    const seen = new Set<string>();
    for (const row of rows ?? []) {
      try {
        const parsed = JSON.parse(row.payload_json) as unknown;
        if (!isValidPendingMoodRow(parsed)) continue;
        if (seen.has(parsed.localId)) continue;
        seen.add(parsed.localId);
        out.push(parsed);
      } catch {
        // skip corrupt row
      }
    }
    return out;
  } catch (e) {
    logger.debug('[loadMoodPendingMirrorForUser]', (e as Error)?.message);
    return [];
  }
}

/** Exported for pending validation in moodOutbox (parse + restore). */
export function isValidPendingMoodRow(r: unknown): r is PendingMoodCheckinV2 {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.localId === 'string' &&
    typeof o.rating === 'number' &&
    typeof o.ts === 'string' &&
    typeof o.day_date === 'string' &&
    typeof o.enqueuedAt === 'string' &&
    typeof o.retryCount === 'number' &&
    (o.kind === 'user' || o.kind === 'legacy_import')
  );
}

export async function loadBlobMirrorForUser(domain: string, userId: string): Promise<unknown | null> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return null;

  try {
    const db = requireLocalDatabase();
    const row = await db.getFirstAsync<{ payload_json: string }>(
      `SELECT payload_json FROM reclaim_async_blob_mirror WHERE domain = ? AND user_id = ?`,
      [domain, userId],
    );
    if (!row?.payload_json) return null;
    return JSON.parse(row.payload_json) as unknown;
  } catch (e) {
    logger.debug('[loadBlobMirrorForUser]', domain, (e as Error)?.message);
    return null;
  }
}

export function isValidPendingMedDoseQueue(arr: unknown): arr is PendingMedDose[] {
  if (!Array.isArray(arr)) return false;
  for (const item of arr) {
    if (!item || typeof item !== 'object') return false;
    const o = item as Record<string, unknown>;
    if (typeof o.med_id !== 'string') return false;
    if (o.status !== 'taken' && o.status !== 'skipped') return false;
    if (typeof o.enqueuedAt !== 'string') return false;
  }
  return true;
}

export function isValidMeditationSessions(arr: unknown): boolean {
  if (!Array.isArray(arr)) return false;
  for (const item of arr) {
    if (!item || typeof item !== 'object') return false;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.startTime !== 'string') return false;
  }
  return true;
}

export function isValidRecoveryProgressPayload(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  const id = o.currentStageId;
  if (id !== 'foundation' && id !== 'stabilize' && id !== 'optimize' && id !== 'thrive') return false;
  if (typeof o.startedAt !== 'string') return false;
  if (!Array.isArray(o.completedStageIds)) return false;
  return true;
}
