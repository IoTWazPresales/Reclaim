/**
 * SyncEngine wrapper: auth gating, retry/backoff, and delegation to sync pipelines.
 * Does not introduce new pull semantics; only wraps existing sync functions.
 *
 * Push order: `syncAll` (mood outbox + meditation ledger upsert) → med dose replay → training offline replay.
 * After durable queues acknowledge server writes, targeted React Query invalidation refreshes UI that reads Supabase history
 * (cache is not operational truth).
 */

import { createObservabilityLogger } from '@/lib/logger';
import { getSession } from '@/lib/authSessionService';
import { queryClient } from '@/lib/queryClient';
import { syncAll } from '@/lib/sync';
import {
  invalidateQueriesAfterMedDoseReplay,
  syncMedDoseQueue,
} from '@/lib/notifications/MedDoseOfflineQueue';
import { logMedDose } from '@/data/repositories/MedsRepository';
import { replayTrainingOfflineQueueAndRefreshUI } from '@/lib/training/offlineSync';
import { requestHealthSync } from '@/sync/SyncCoordinator';

const syncLog = createObservabilityLogger('SYNC_ENGINE');

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export type SyncEngineResult =
  | { ok: true; ran: true }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES) {
        syncLog.debug(`[SYNC_RETRY] ${context} attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms`, e);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        syncLog.warn(`[SYNC_RETRY] ${context} failed after ${MAX_RETRIES + 1} attempts`, e);
      }
    }
  }
  throw lastError;
}

async function ensureSession(): Promise<SyncEngineResult | null> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      syncLog.debug('[SYNC_GATE] no session, skipping');
      return { ok: true, skipped: true, reason: 'no_session' };
    }
    return null;
  } catch (e) {
    syncLog.debug('[SYNC_GATE] auth check failed, skipping', e);
    return { ok: true, skipped: true, reason: 'no_session' };
  }
}

/**
 * Push local mood + meditation to Supabase.
 */
export async function runOncePush(): Promise<SyncEngineResult> {
  const gate = await ensureSession();
  if (gate) return gate;

  try {
    await withRetry(() => syncAll(), 'runOncePush');
    const medSync = await syncMedDoseQueue(logMedDose);
    if (medSync.synced > 0) {
      syncLog.debug('[SYNC_ENGINE] med dose queue synced', medSync);
    }
    const trainSync = await replayTrainingOfflineQueueAndRefreshUI();
    if (trainSync.success > 0) {
      syncLog.debug('[SYNC_ENGINE] training queue synced', trainSync);
    }
    await recordQueueSyncMetadata(medSync, trainSync);
    syncLog.debug('[SYNC_ENGINE] runOncePush success');
    return { ok: true, ran: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    syncLog.warn('[SYNC_ENGINE] runOncePush failed', e);
    return { ok: false, error: msg };
  }
}

async function recordQueueSyncMetadata(
  medSync: { synced: number; failed: number; errors: string[] },
  trainSync: { success: number; failed: number; errors: string[] },
): Promise<void> {
  const { writeSyncMetadataBestEffort } = await import('@/lib/localData/syncMetadataRepository');
  const { getMedDoseQueuePendingCount } = await import('@/lib/notifications/MedDoseOfflineQueue');
  const { loadOfflineQueue } = await import('@/lib/training/offlineQueue');
  const at = new Date().toISOString();
  const medPending = await getMedDoseQueuePendingCount();
  await writeSyncMetadataBestEffort({
    domain: 'meds',
    last_attempt_at: at,
    last_success_at: medSync.failed === 0 ? at : undefined,
    last_error: medSync.failed > 0 ? medSync.errors[0] ?? 'med_dose_queue' : null,
    pending_count: medPending,
  });
  const trainPending = (await loadOfflineQueue()).length;
  await writeSyncMetadataBestEffort({
    domain: 'training',
    last_attempt_at: at,
    last_success_at: trainSync.failed === 0 ? at : undefined,
    last_error: trainSync.failed > 0 ? trainSync.errors[0] ?? 'training_offline' : null,
    pending_count: trainPending,
  });
}

/**
 * Pull health data from providers and write to Supabase (Health Connect, Apple Health, Samsung where applicable).
 * Used by BackgroundFetch.
 */
export async function runOncePull(): Promise<SyncEngineResult> {
  const gate = await ensureSession();
  if (gate) return gate;

  try {
    await withRetry(() => requestHealthSync({ reason: 'background_fetch', force: true }), 'runOncePull');
    syncLog.debug('[SYNC_ENGINE] runOncePull success');
    return { ok: true, ran: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    syncLog.warn('[SYNC_ENGINE] runOncePull failed', e);
    return { ok: false, error: msg };
  }
}

/**
 * Full reconcile: push local data then pull health data.
 */
export async function reconcile(): Promise<SyncEngineResult> {
  const gate = await ensureSession();
  if (gate) return gate;

  try {
    await withRetry(() => syncAll(), 'reconcile-push');
    const medSync = await syncMedDoseQueue(logMedDose);
    if (medSync.synced > 0) {
      syncLog.debug('[SYNC_ENGINE] med dose queue synced', medSync);
      await invalidateQueriesAfterMedDoseReplay(queryClient, medSync.synced);
    }
    const trainSync = await replayTrainingOfflineQueueAndRefreshUI();
    if (trainSync.success > 0) {
      syncLog.debug('[SYNC_ENGINE] training queue synced', trainSync);
    }
    await recordQueueSyncMetadata(medSync, trainSync);
    await withRetry(() => requestHealthSync({ reason: 'reconcile_pull', force: true }), 'reconcile-pull');
    syncLog.debug('[SYNC_ENGINE] reconcile success');
    return { ok: true, ran: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    syncLog.warn('[SYNC_ENGINE] reconcile failed', e);
    return { ok: false, error: msg };
  }
}
