import { logger } from '@/lib/logger';
import { syncHealthData } from '@/lib/sync';
import { logTelemetry } from '@/lib/telemetry';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';

export const HEALTH_SYNC_REASON = {
  STARTUP_GATE: 'startup_gate',
  DASHBOARD_INITIAL: 'dashboard_initial',
  DASHBOARD_FOREGROUND: 'dashboard_foreground',
  DASHBOARD_MANUAL: 'dashboard_manual',
  INTEGRATIONS_CONNECT: 'integrations_connect',
  INTEGRATIONS_IMPORT: 'integrations_import',
  SLEEP_CONNECT: 'sleep_connect',
  SLEEP_IMPORT: 'sleep_import',
  SLEEP_AUTO_CONNECT: 'sleep_auto_connect',
  ONBOARDING_SLEEP_CONNECT: 'onboarding_sleep_connect',
  BACKGROUND_FETCH: 'background_fetch',
  RECONCILE_PULL: 'reconcile_pull',
  UNKNOWN: 'unknown',
} as const;

export type HealthSyncReason = (typeof HEALTH_SYNC_REASON)[keyof typeof HEALTH_SYNC_REASON];

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

function isConnectOrImportReason(reason: HealthSyncReason): boolean {
  return (
    reason === HEALTH_SYNC_REASON.INTEGRATIONS_CONNECT ||
    reason === HEALTH_SYNC_REASON.INTEGRATIONS_IMPORT ||
    reason === HEALTH_SYNC_REASON.SLEEP_CONNECT ||
    reason === HEALTH_SYNC_REASON.SLEEP_IMPORT ||
    reason === HEALTH_SYNC_REASON.SLEEP_AUTO_CONNECT ||
    reason === HEALTH_SYNC_REASON.ONBOARDING_SLEEP_CONNECT
  );
}

function defaultCooldownMs(reason: HealthSyncReason): number {
  switch (reason) {
    case HEALTH_SYNC_REASON.DASHBOARD_FOREGROUND:
      return 180_000;
    case HEALTH_SYNC_REASON.DASHBOARD_INITIAL:
      return 120_000;
    case HEALTH_SYNC_REASON.SLEEP_AUTO_CONNECT:
    case HEALTH_SYNC_REASON.STARTUP_GATE:
      return 10_000;
    case HEALTH_SYNC_REASON.INTEGRATIONS_CONNECT:
    case HEALTH_SYNC_REASON.INTEGRATIONS_IMPORT:
    case HEALTH_SYNC_REASON.SLEEP_CONNECT:
    case HEALTH_SYNC_REASON.SLEEP_IMPORT:
    case HEALTH_SYNC_REASON.ONBOARDING_SLEEP_CONNECT:
    case HEALTH_SYNC_REASON.BACKGROUND_FETCH:
    case HEALTH_SYNC_REASON.RECONCILE_PULL:
    case HEALTH_SYNC_REASON.DASHBOARD_MANUAL:
      return 0;
    case HEALTH_SYNC_REASON.UNKNOWN:
    default:
      return 10_000;
  }
}

function defaultSleepWindowCap(reason: HealthSyncReason): number | undefined {
  switch (reason) {
    case HEALTH_SYNC_REASON.DASHBOARD_FOREGROUND:
    case HEALTH_SYNC_REASON.DASHBOARD_INITIAL:
    case HEALTH_SYNC_REASON.DASHBOARD_MANUAL:
    case HEALTH_SYNC_REASON.STARTUP_GATE:
      return 7;
    case HEALTH_SYNC_REASON.BACKGROUND_FETCH:
    case HEALTH_SYNC_REASON.RECONCILE_PULL:
      return 7;
    case HEALTH_SYNC_REASON.INTEGRATIONS_CONNECT:
    case HEALTH_SYNC_REASON.INTEGRATIONS_IMPORT:
    case HEALTH_SYNC_REASON.SLEEP_CONNECT:
    case HEALTH_SYNC_REASON.SLEEP_IMPORT:
    case HEALTH_SYNC_REASON.SLEEP_AUTO_CONNECT:
    case HEALTH_SYNC_REASON.ONBOARDING_SLEEP_CONNECT:
      // ~3 months of Health Connect sleep + daily aggregate backfill into Supabase
      return 90;
    case HEALTH_SYNC_REASON.UNKNOWN:
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

