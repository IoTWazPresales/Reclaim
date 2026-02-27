import { logger } from '@/lib/logger';
import { syncHealthData } from '@/lib/sync';
import { logTelemetry } from '@/lib/telemetry';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';

export type HealthSyncReason =
  | 'startup_gate'
  | 'dashboard_initial'
  | 'dashboard_foreground'
  | 'dashboard_manual'
  | 'integrations_connect'
  | 'integrations_import'
  | 'sleep_connect'
  | 'sleep_import'
  | 'sleep_auto_connect'
  | 'onboarding_sleep_connect'
  | 'background_fetch'
  | 'reconcile_pull'
  | 'unknown';

export type HealthSyncResult = Awaited<ReturnType<typeof syncHealthData>>;

export type CoordinatedHealthSyncResult = HealthSyncResult & {
  coordinator: {
    reason: HealthSyncReason;
    coalesced: boolean;
    skipped: boolean;
    skipReason?: 'cooldown';
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
};

export type RequestHealthSyncOptions = {
  reason: HealthSyncReason;
  force?: boolean;
  minIntervalMs?: number;
};

let inFlight: Promise<CoordinatedHealthSyncResult> | null = null;
let inFlightReason: HealthSyncReason | null = null;
let queuedConnectImportRun: Promise<CoordinatedHealthSyncResult> | null = null;
let lastCompletedAtMs = 0;
let lastResult: CoordinatedHealthSyncResult | null = null;

function isConnectOrImportReason(reason: HealthSyncReason): boolean {
  return (
    reason === 'integrations_connect' ||
    reason === 'integrations_import' ||
    reason === 'sleep_connect' ||
    reason === 'sleep_import' ||
    reason === 'sleep_auto_connect' ||
    reason === 'onboarding_sleep_connect'
  );
}

function defaultCooldownMs(reason: HealthSyncReason): number {
  switch (reason) {
    case 'dashboard_foreground':
      return 180_000;
    case 'dashboard_initial':
      return 120_000;
    case 'sleep_auto_connect':
    case 'startup_gate':
      return 10_000;
    case 'integrations_connect':
    case 'integrations_import':
    case 'sleep_connect':
    case 'sleep_import':
    case 'onboarding_sleep_connect':
    case 'background_fetch':
    case 'reconcile_pull':
    case 'dashboard_manual':
      return 0;
    case 'unknown':
    default:
      return 10_000;
  }
}

function defaultSleepWindowCap(reason: HealthSyncReason): number | undefined {
  switch (reason) {
    case 'dashboard_foreground':
    case 'dashboard_initial':
    case 'dashboard_manual':
    case 'startup_gate':
      return 7;
    case 'background_fetch':
    case 'reconcile_pull':
      return 7;
    case 'integrations_connect':
    case 'integrations_import':
    case 'sleep_connect':
    case 'sleep_import':
    case 'sleep_auto_connect':
    case 'onboarding_sleep_connect':
      return undefined;
    case 'unknown':
    default:
      return 7;
  }
}

function makeCoordinatorEnvelope(
  base: HealthSyncResult,
  input: {
    reason: HealthSyncReason;
    coalesced: boolean;
    skipped: boolean;
    skipReason?: 'cooldown';
    startedAt: string;
    completedAt: string;
  },
): CoordinatedHealthSyncResult {
  const durationMs = Math.max(
    0,
    new Date(input.completedAt).getTime() - new Date(input.startedAt).getTime(),
  );
  return {
    ...base,
    coordinator: {
      reason: input.reason,
      coalesced: input.coalesced,
      skipped: input.skipped,
      skipReason: input.skipReason,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      durationMs,
    },
  };
}

function cloneWithMeta(
  base: CoordinatedHealthSyncResult,
  meta: Partial<CoordinatedHealthSyncResult['coordinator']>,
): CoordinatedHealthSyncResult {
  return {
    ...base,
    coordinator: {
      ...base.coordinator,
      ...meta,
    },
  };
}

export async function requestHealthSync(
  options: RequestHealthSyncOptions,
): Promise<CoordinatedHealthSyncResult> {
  const reason = options.reason ?? 'unknown';
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const minIntervalMs = options.minIntervalMs ?? defaultCooldownMs(reason);

  if (
    !options.force &&
    minIntervalMs > 0 &&
    lastCompletedAtMs > 0 &&
    nowMs - lastCompletedAtMs < minIntervalMs
  ) {
    void logTelemetry({
      name: 'sync_coordinator_skipped',
      properties: { reason, skipReason: 'cooldown' },
      tags: ['SYNC_COORDINATOR'],
    });
    if (lastResult) {
      return cloneWithMeta(lastResult, {
        reason,
        skipped: true,
        skipReason: 'cooldown',
        coalesced: false,
        startedAt: nowIso,
        completedAt: nowIso,
        durationMs: 0,
      });
    }
    return makeCoordinatorEnvelope(
      {
        sleepSynced: false,
        activitySynced: false,
        syncedAt: nowIso,
      },
      {
        reason,
        coalesced: false,
        skipped: true,
        skipReason: 'cooldown',
        startedAt: nowIso,
        completedAt: nowIso,
      },
    );
  }

  if (inFlight) {
    const currentInFlightReason = inFlightReason;
    // Connect/import flows should not be dropped behind unrelated in-flight runs
    // (e.g., startup/dashboard). They can coalesce with another connect/import run.
    if (
      options.force &&
      isConnectOrImportReason(reason) &&
      currentInFlightReason &&
      !isConnectOrImportReason(currentInFlightReason)
    ) {
      if (!queuedConnectImportRun) {
        const requestedReason = reason;
        queuedConnectImportRun = (async () => {
          await inFlight;
          return requestHealthSync({
            reason: requestedReason,
            force: true,
            minIntervalMs: 0,
          });
        })().finally(() => {
          queuedConnectImportRun = null;
        });
      }
      const queued = await queuedConnectImportRun;
      void logTelemetry({
        name: 'sync_coordinator_coalesced',
        properties: {
          reason,
          inFlightReason: currentInFlightReason ?? 'unknown',
          queuedAfterInFlight: true,
        },
        tags: ['SYNC_COORDINATOR'],
      });
      return cloneWithMeta(queued, {
        reason,
        coalesced: true,
        skipped: false,
        skipReason: undefined,
      });
    } else {
      const shared = await inFlight;
      void logTelemetry({
        name: 'sync_coordinator_coalesced',
        properties: { reason, inFlightReason: currentInFlightReason ?? 'unknown' },
        tags: ['SYNC_COORDINATOR'],
      });
      return cloneWithMeta(shared, {
        reason,
        coalesced: true,
        skipped: false,
        skipReason: undefined,
      });
    }
  }

  const startedAt = new Date().toISOString();
  inFlightReason = reason;
  inFlight = (async () => {
    try {
      logger.debug('[SYNC_COORDINATOR] health sync start', { reason });
      const maxSleepWindowDays = defaultSleepWindowCap(reason);
      const forceFullSleepImport = isConnectOrImportReason(reason);
      const readinessRetries = forceFullSleepImport ? 4 : 1;
      const readinessRetryDelayMs = forceFullSleepImport ? 350 : 250;
      // Use persisted integration state as source of truth.
      // Runtime probing here caused disconnected providers to be treated as connected.
      const forceRuntimeConnectedProviders = false;
      const base =
        typeof maxSleepWindowDays === 'number'
          ? await syncHealthData({
              maxSleepWindowDays,
              forceFullSleepImport,
              readinessRetries,
              readinessRetryDelayMs,
              forceRuntimeConnectedProviders,
            })
          : await syncHealthData({
              forceFullSleepImport,
              readinessRetries,
              readinessRetryDelayMs,
              forceRuntimeConnectedProviders,
            });
      const completedAt = new Date().toISOString();
      const merged = makeCoordinatorEnvelope(base, {
        reason,
        coalesced: false,
        skipped: false,
        startedAt,
        completedAt,
      });
      lastCompletedAtMs = Date.now();
      lastResult = merged;
      logger.debug('[SYNC_COORDINATOR] health sync done', {
        reason,
        durationMs: merged.coordinator.durationMs,
        sleepSynced: merged.sleepSynced,
        activitySynced: merged.activitySynced,
      });
      const providerSummary = Object.entries(merged.debug?.sleepProviders ?? {}).reduce<
        Record<string, string>
      >((acc, [providerKey, provider]) => {
        if (!provider) return acc;
        acc[providerKey] = [
          provider.connected ? 'connected' : 'disconnected',
          provider.available ? 'available' : 'unavailable',
          provider.hasPermissions ? 'perms' : 'no_perms',
          `read:${provider.sessionsRead}`,
          `wrote:${provider.writeSuccesses}/${provider.writeAttempts}`,
          `existing:${provider.skippedExisting}`,
          provider.note ? `note:${provider.note}` : '',
        ]
          .filter(Boolean)
          .join('|');
        return acc;
      }, {});
      void logTelemetry({
        name: 'sync_coordinator_completed',
        properties: {
          reason,
          durationMs: merged.coordinator.durationMs,
          sleepSynced: merged.sleepSynced,
          activitySynced: merged.activitySynced,
          skipped: false,
          coalesced: false,
          providerSummary,
          sleepSyncStatus: merged.debug?.sleepSyncStatus ?? null,
          sleepWriteAttempts: merged.debug?.sleepWriteAttempts ?? 0,
          sleepWriteSuccesses: merged.debug?.sleepWriteSuccesses ?? 0,
        },
        tags: ['SYNC_COORDINATOR'],
      });
      void reconcileNotifications().catch((e) => { if (__DEV__) logger.debug('[SyncCoordinator]', e); });
      return merged;
    } catch (error) {
      const completedAt = new Date().toISOString();
      const fallback = makeCoordinatorEnvelope(
        {
          sleepSynced: false,
          activitySynced: false,
          syncedAt: completedAt,
        },
        {
          reason,
          coalesced: false,
          skipped: false,
          startedAt,
          completedAt,
        },
      );
      lastCompletedAtMs = Date.now();
      lastResult = fallback;
      logger.warn('[SYNC_COORDINATOR] health sync failed', { reason, error });
      void logTelemetry({
        name: 'sync_coordinator_failed',
        severity: 'warn',
        properties: {
          reason,
          message: error instanceof Error ? error.message : String(error),
        },
        tags: ['SYNC_COORDINATOR'],
      });
      return fallback;
    } finally {
      inFlight = null;
      inFlightReason = null;
    }
  })();

  return inFlight;
}

