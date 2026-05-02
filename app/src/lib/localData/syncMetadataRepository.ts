/**
 * Best-effort writes to `reclaim_sync_metadata` — never throws to callers; failures are logged only.
 * Used so foreground/background reconciliation surfaces durable sync state per domain (not React Query).
 */
import { initializeLocalDatabase, requireLocalDatabase } from '@/lib/localData/database';
import type { SyncDomainKey } from '@/lib/localData/types';
import { logger } from '@/lib/logger';

export type SyncMetadataRow = {
  domain: string;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  pending_count: number;
  stale_after_seconds: number | null;
  next_desired_sync_at: string | null;
  provider_watermark: string | null;
  updated_at: string;
};

export type SyncMetadataPatch = {
  domain: SyncDomainKey;
  last_attempt_at: string;
  /** Set to update; omit to preserve existing */
  last_success_at?: string | null;
  last_error?: string | null;
  pending_count?: number;
  provider_watermark?: string | null;
};

function mergePatch(existing: SyncMetadataRow | null, patch: SyncMetadataPatch): Omit<SyncMetadataRow, 'domain'> & { domain: string } {
  const now = new Date().toISOString();
  return {
    domain: patch.domain,
    last_success_at:
      patch.last_success_at !== undefined ? patch.last_success_at : existing?.last_success_at ?? null,
    last_attempt_at: patch.last_attempt_at,
    last_error: patch.last_error !== undefined ? patch.last_error : existing?.last_error ?? null,
    pending_count: patch.pending_count !== undefined ? patch.pending_count : existing?.pending_count ?? 0,
    stale_after_seconds: existing?.stale_after_seconds ?? null,
    next_desired_sync_at: existing?.next_desired_sync_at ?? null,
    provider_watermark:
      patch.provider_watermark !== undefined ? patch.provider_watermark : existing?.provider_watermark ?? null,
    updated_at: now,
  };
}

export async function writeSyncMetadataBestEffort(patch: SyncMetadataPatch): Promise<void> {
  try {
    const init = await initializeLocalDatabase();
    if (!init.ok) return;

    const db = requireLocalDatabase();
    const existing = await db.getFirstAsync<SyncMetadataRow>(
      `SELECT domain, last_success_at, last_attempt_at, last_error, pending_count, stale_after_seconds, next_desired_sync_at, provider_watermark, updated_at
       FROM reclaim_sync_metadata WHERE domain = ?`,
      [patch.domain],
    );

    const merged = mergePatch(existing, patch);

    await db.runAsync(
      `INSERT OR REPLACE INTO reclaim_sync_metadata
        (domain, last_success_at, last_attempt_at, last_error, pending_count, stale_after_seconds, next_desired_sync_at, provider_watermark, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        merged.domain,
        merged.last_success_at,
        merged.last_attempt_at,
        merged.last_error,
        merged.pending_count,
        merged.stale_after_seconds,
        merged.next_desired_sync_at,
        merged.provider_watermark,
        merged.updated_at,
      ],
    );
  } catch (e) {
    logger.debug('[syncMetadata] write failed', (e as Error)?.message);
  }
}

export async function readSyncMetadataForDomain(domain: SyncDomainKey): Promise<SyncMetadataRow | null> {
  try {
    const init = await initializeLocalDatabase();
    if (!init.ok) return null;
    const db = requireLocalDatabase();
    const row = await db.getFirstAsync<SyncMetadataRow>(
      `SELECT domain, last_success_at, last_attempt_at, last_error, pending_count, stale_after_seconds, next_desired_sync_at, provider_watermark, updated_at
       FROM reclaim_sync_metadata WHERE domain = ?`,
      [domain],
    );
    return row ?? null;
  } catch {
    return null;
  }
}

/** Provider pull (`syncHealthData` / `requestHealthSync`) — sleep vs daily aggregates get separate rows. */
export async function recordHealthPullSyncMetadata(
  result: {
    sleepSynced: boolean;
    activitySynced: boolean;
    syncedAt: string | null;
    debug?: {
      sleepSyncStatus?: string;
      saveError?: string;
    };
  },
  reason: string,
): Promise<void> {
  const at = result.syncedAt ?? new Date().toISOString();
  const status = result.debug?.sleepSyncStatus;
  const saveErr = result.debug?.saveError ?? null;

  const sleepSuccess =
    result.sleepSynced ||
    status === 'no_new_data' ||
    status === 'synced' ||
    (status === undefined && !saveErr);

  const sleepFailureMsg =
    saveErr ||
    (status === 'write_failed' || status === 'pipeline_error' ? `sleep:${status}` : null);

  await writeSyncMetadataBestEffort({
    domain: 'sleep',
    last_attempt_at: at,
    last_success_at: sleepSuccess ? at : undefined,
    last_error: sleepSuccess ? null : sleepFailureMsg ?? undefined,
    pending_count: 0,
    provider_watermark: JSON.stringify({
      reason,
      sleepSyncStatus: status ?? null,
      sleepSynced: result.sleepSynced,
    }),
  });

  const dailySuccess = !!result.activitySynced;
  await writeSyncMetadataBestEffort({
    domain: 'health_daily',
    last_attempt_at: at,
    last_success_at: dailySuccess ? at : undefined,
    pending_count: 0,
    provider_watermark: JSON.stringify({ reason, activitySynced: result.activitySynced }),
  });
}
