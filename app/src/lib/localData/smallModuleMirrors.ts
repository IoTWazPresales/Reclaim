/**
 * SQLite mirrors for AsyncStorage-backed small modules (durability / future restore).
 * AsyncStorage remains the canonical read path; mirrors are best-effort replicas after writes.
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
