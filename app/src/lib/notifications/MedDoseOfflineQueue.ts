/**
 * MedDoseOfflineQueue - Persist med dose actions when logMedDose fails (network/transient errors).
 * Replay when network returns. Phase 3 reliability.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import {
  ASYNC_MIRROR_DOMAIN,
  isValidPendingMedDoseQueue,
  loadBlobMirrorForUser,
  scheduleMedDoseQueueMirror,
} from '@/lib/localData/smallModuleMirrors';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

const QUEUE_KEY = '@reclaim/notifications/medDoseQueue';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type PendingMedDose = {
  med_id: string;
  status: 'taken' | 'skipped';
  taken_at?: string;
  scheduled_for?: string;
  enqueuedAt: string;
};

let medDoseQueueSyncInFlight: Promise<{ synced: number; failed: number; errors: string[] }> | null = null;

function parseMedDoseQueueFromAsyncStorage(raw: string | null): PendingMedDose[] | null {
  if (raw === null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (parsed.length === 0) return [];
    if (!isValidPendingMedDoseQueue(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function loadQueue(): Promise<PendingMedDose[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const fromAs = parseMedDoseQueueFromAsyncStorage(raw);
  if (fromAs !== null) return fromAs;

  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return [];
    const blob = await loadBlobMirrorForUser(ASYNC_MIRROR_DOMAIN.medDoseQueue, uid);
    if (!blob || !isValidPendingMedDoseQueue(blob)) return [];
    logger.info('[MED_DOSE_QUEUE] Restored queue from SQLite mirror (AsyncStorage missing or invalid)', {
      count: blob.length,
    });
    await saveQueue(blob);
    return blob;
  } catch (e) {
    logger.warn('[MED_DOSE_QUEUE] SQLite mirror restore failed', e);
    return [];
  }
}

async function saveQueue(queue: PendingMedDose[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    scheduleMedDoseQueueMirror(queue);
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
  if (medDoseQueueSyncInFlight) {
    logger.debug('[MED_DOSE_QUEUE] sync coalesced to in-flight run');
    return medDoseQueueSyncInFlight;
  }

  medDoseQueueSyncInFlight = (async () => {
    const queue = await loadQueue();
    if (queue.length === 0) return { synced: 0, failed: 0, errors: [] };

    const now = Date.now();
    const valid = queue.filter(
      (e) => now - new Date(e.enqueuedAt).getTime() < TTL_MS
    );

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    let remaining = [...valid];

    for (const entry of valid) {
      try {
        await logMedDoseFn({
          med_id: entry.med_id,
          status: entry.status,
          taken_at: entry.taken_at,
          scheduled_for: entry.scheduled_for,
        });
        remaining = remaining.filter((e) => e !== entry);
        synced++;
        logger.debug('[MED_DOSE_QUEUE] Synced', { med_id: entry.med_id, status: entry.status });
      } catch (e: any) {
        failed++;
        errors.push(`${entry.med_id}:${entry.status}: ${e?.message ?? 'Unknown'}`);
        logger.warn('[MED_DOSE_QUEUE] Sync failed', { med_id: entry.med_id, error: e });
      }
    }

    // Preserve entries added while this sync run was active.
    const snapshotKeys = new Set(
      queue.map((entry) => `${entry.med_id}|${entry.status}|${entry.scheduled_for ?? ''}|${entry.enqueuedAt}`)
    );
    const latestQueue = await loadQueue();
    const newEntries = latestQueue.filter(
      (entry) => !snapshotKeys.has(`${entry.med_id}|${entry.status}|${entry.scheduled_for ?? ''}|${entry.enqueuedAt}`)
    );
    await saveQueue([...remaining, ...newEntries]);

    return { synced, failed, errors };
  })();

  try {
    return await medDoseQueueSyncInFlight;
  } finally {
    medDoseQueueSyncInFlight = null;
  }
}

/**
 * After queued doses replay to Supabase (`meds_log`), invalidate caches that read remote history.
 * Operational truth for “logged from notification while offline” was the durable queue; acknowledged rows now live on server.
 */
export function invalidateQueriesAfterMedDoseReplay(qc: QueryClient, syncedCount: number): Promise<void> {
  if (syncedCount <= 0) return Promise.resolve();
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['meds'] }),
    qc.invalidateQueries({ queryKey: ['meds:logs:7d'] }),
    qc.invalidateQueries({ queryKey: ['timeline:meds'] }),
    qc.invalidateQueries({ queryKey: ['meds:events:30d'] }),
    qc.invalidateQueries({ queryKey: ['insights:feedback:latest250'] }),
    qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'med_logs' }),
  ]).then(() => undefined);
}
