/**
 * MedDoseOfflineQueue - Persist med dose actions when logMedDose fails (network/transient errors).
 * Replay when network returns. Phase 3 reliability.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

const QUEUE_KEY = '@reclaim/notifications/medDoseQueue';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type PendingMedDose = {
  med_id: string;
  status: 'taken' | 'skipped';
  taken_at?: string;
  scheduled_for?: string;
  enqueuedAt: string;
};

async function loadQueue(): Promise<PendingMedDose[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingMedDose[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    logger.warn('[MED_DOSE_QUEUE] Failed to save queue', e);
  }
}

/**
 * Enqueue a dose for later sync when logMedDose fails.
 */
export async function enqueueMedDose(payload: {
  med_id: string;
  status: 'taken' | 'skipped';
  taken_at?: string;
  scheduled_for?: string;
}): Promise<void> {
  const queue = await loadQueue();
  const entry: PendingMedDose = {
    ...payload,
    enqueuedAt: new Date().toISOString(),
  };
  queue.push(entry);
  await saveQueue(queue);
  logger.debug('[MED_DOSE_QUEUE] Enqueued', { med_id: payload.med_id, status: payload.status });
}

/**
 * Replay queued doses to Supabase. Call when network is available.
 * Returns { synced, failed, errors }.
 */
export async function syncMedDoseQueue(
  logMedDoseFn: (input: {
    med_id: string;
    status: 'taken' | 'skipped';
    taken_at?: string;
    scheduled_for?: string;
  }) => Promise<unknown>
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const queue = await loadQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, errors: [] };

  const now = Date.now();
  const valid = queue.filter(
    (e) => now - new Date(e.enqueuedAt).getTime() < TTL_MS
  );
  if (valid.length !== queue.length) {
    await saveQueue(valid);
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const entry of valid) {
    try {
      await logMedDoseFn({
        med_id: entry.med_id,
        status: entry.status,
        taken_at: entry.taken_at,
        scheduled_for: entry.scheduled_for,
      });
      const next = valid.filter((e) => e !== entry);
      await saveQueue(next);
      synced++;
      logger.debug('[MED_DOSE_QUEUE] Synced', { med_id: entry.med_id, status: entry.status });
    } catch (e: any) {
      failed++;
      errors.push(`${entry.med_id}:${entry.status}: ${e?.message ?? 'Unknown'}`);
      logger.warn('[MED_DOSE_QUEUE] Sync failed', { med_id: entry.med_id, error: e });
    }
  }

  return { synced, failed, errors };
}
