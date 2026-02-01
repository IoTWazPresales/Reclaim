/**
 * SyncEngine wrapper: auth gating, retry/backoff, and delegation to syncAll/syncHealthData.
 * Does not introduce new pull semantics; only wraps existing sync functions.
 */

import { createObservabilityLogger } from '@/lib/logger';
import { getSession } from '@/lib/authSessionService';
import { syncAll, syncHealthData } from '@/lib/sync';

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
    syncLog.debug('[SYNC_ENGINE] runOncePush success');
    return { ok: true, ran: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    syncLog.warn('[SYNC_ENGINE] runOncePush failed', e);
    return { ok: false, error: msg };
  }
}

/**
 * Pull health data from providers and write to Supabase (Health Connect, Google Fit).
 * Used by BackgroundFetch.
 */
export async function runOncePull(): Promise<SyncEngineResult> {
  const gate = await ensureSession();
  if (gate) return gate;

  try {
    await withRetry(() => syncHealthData(), 'runOncePull');
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
    await withRetry(() => syncHealthData(), 'reconcile-pull');
    syncLog.debug('[SYNC_ENGINE] reconcile success');
    return { ok: true, ran: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    syncLog.warn('[SYNC_ENGINE] reconcile failed', e);
    return { ok: false, error: msg };
  }
}
