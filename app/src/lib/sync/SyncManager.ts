/**
 * Single entrypoint for sync. Produces verifiable SyncResult.
 * Use runSync only; avoid calling sync.ts / health services directly from screens.
 */

import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { getInvalidationKeys, type CacheDomain } from '@/lib/cache/invalidationMap';
import { syncHealthData, importSamsungHistory } from '@/lib/sync';

export type SyncTrigger =
  | 'manual'
  | 'dashboard'
  | 'integrations-import'
  | 'sleep-import'
  | 'connect-count'
  | 'pull-refresh'
  | 'app-open'
  | 'foreground';

export type SyncScope = 'health' | 'localPush' | 'trainingQueue' | 'all';

export type SyncResult = {
  trigger: SyncTrigger;
  scope: SyncScope;
  startedAt: string;
  durationMs: number;
  providersAttempted: string[];
  providersSkipped: Array<{ provider: string; reason: string }>;
  recordsFetched: Record<string, number>;
  recordsWritten: Record<string, number>;
  recordsDeduped: Record<string, number>;
  postWriteVerification: Record<string, { ok: boolean; detail?: string }>;
  errors: Array<{ message: string; source?: string }>;
  cacheInvalidations: (string | string[])[];
  summary: string;
  syncedAt: string | null;
};

export type UserContext = {
  includeSamsung?: boolean;
};

function defaultResult(trigger: SyncTrigger, scope: SyncScope, startedAt: Date): SyncResult {
  return {
    trigger,
    scope,
    startedAt: startedAt.toISOString(),
    durationMs: 0,
    providersAttempted: [],
    providersSkipped: [],
    recordsFetched: {},
    recordsWritten: {},
    recordsDeduped: {},
    postWriteVerification: {},
    errors: [],
    cacheInvalidations: [],
    summary: 'No sync performed',
    syncedAt: null,
  };
}

const HEALTH_INVALIDATION_DOMAINS: CacheDomain[] = ['sleep', 'dashboard', 'sleep_settings'];

/**
 * Lightweight post-write read-back for sleep_sessions. If we wrote sleep, verify ≥1 row in window.
 */
async function runSyncVerifier(stats: {
  recordsWritten: Record<string, number>;
}): Promise<Record<string, { ok: boolean; detail?: string }>> {
  const out: Record<string, { ok: boolean; detail?: string }> = {};
  if ((stats.recordsWritten['sleep'] ?? 0) === 0) return out;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      out['sleep'] = { ok: false, detail: 'no user' };
      return out;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('id')
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .limit(1);
    if (error) {
      logger.warn('[SYNC_VERIFY] sleep read-back failed', error);
      out['sleep'] = { ok: false, detail: error.message };
      return out;
    }
    const ok = (data ?? []).length >= 1;
    out['sleep'] = ok ? { ok: true } : { ok: false, detail: 'no matching row in window' };
    if (__DEV__) logger.debug('[SYNC_VERIFY] sleep', out['sleep']);

    const { data: last5, error: readErr } = await supabase
      .from('sleep_sessions')
      .select('id')
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time', { ascending: false })
      .limit(5);
    const readbackN = readErr ? 0 : (last5 ?? []).length;
    logger.debug('[SLEEP_SYNC] readback=', readbackN);
  } catch (e) {
    out['sleep'] = { ok: false, detail: e instanceof Error ? e.message : 'unknown' };
  }
  return out;
}

async function runHealthSync(
  _trigger: SyncTrigger,
  userContext: UserContext,
  result: SyncResult,
): Promise<void> {
  const health = await syncHealthData();
  result.syncedAt = health.syncedAt ?? null;
  if (health.sleepSynced) result.recordsWritten['sleep'] = (result.recordsWritten['sleep'] ?? 0) + 1;
  if (health.activitySynced) result.recordsWritten['activity'] = (result.recordsWritten['activity'] ?? 0) + 1;

  if (userContext.includeSamsung) {
    try {
      const samsung = await importSamsungHistory(90);
      result.recordsWritten['sleep'] = (result.recordsWritten['sleep'] ?? 0) + samsung.imported;
      result.recordsDeduped['sleep'] = (result.recordsDeduped['sleep'] ?? 0) + samsung.skipped;
      for (const msg of samsung.errors) result.errors.push({ message: msg, source: 'samsung' });
    } catch (e) {
      result.errors.push({
        message: e instanceof Error ? e.message : String(e),
        source: 'samsung',
      });
    }
  }

  const anyWritten =
    (result.recordsWritten['sleep'] ?? 0) > 0 || (result.recordsWritten['activity'] ?? 0) > 0;
  if (result.errors.length) {
    result.summary = result.errors[0]?.message ?? 'Sync failed';
  } else if (anyWritten) {
    result.summary = 'Health data synced.';
  } else {
    result.summary = 'No new data (already present).';
  }

  result.cacheInvalidations = getInvalidationKeys(HEALTH_INVALIDATION_DOMAINS);
  result.postWriteVerification = await runSyncVerifier({ recordsWritten: result.recordsWritten });
}

/**
 * Run sync for the given scope. Returns verifiable SyncResult.
 */
export async function runSync(options: {
  trigger: SyncTrigger;
  scope: SyncScope;
  userContext?: UserContext;
}): Promise<SyncResult> {
  const { trigger, scope, userContext = {} } = options;
  const startedAt = new Date();
  const result = defaultResult(trigger, scope, startedAt);

  logger.info('[SYNC] runSync', { trigger, scope });

  try {
    if (scope === 'health' || scope === 'all') {
      await runHealthSync(trigger, userContext, result);
    }
    if (scope === 'all') {
      // localPush + trainingQueue: placeholder for later commits
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push({ message: msg });
    result.summary = msg;
    logger.warn('[SYNC] runSync failed', { trigger, scope, error: msg });
  }

  result.durationMs = Math.round(Date.now() - startedAt.getTime());
  return result;
}
