// C:\Reclaim\app\src\lib\sync.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import {
  getCurrentUser,
  listMood,
  listMeditations,
  upsertSleepSessionFromHealth,
  upsertDailyActivityFromHealth,
  upsertVitalsDailyFromHealth,
  upsertMindfulnessSessionFromHealth,
} from '@/lib/api';
import { runSleepSyncPipeline } from '@/lib/sleep/sleepSyncPipeline';
import type { ActivitySample, HealthMetric, SleepSession as HealthSleepSession } from '@/lib/health/types';
import { AppleHealthKitProvider } from '@/lib/health/providers/appleHealthKit';
import { getIntegrationStatus } from '@/lib/health/integrationStore';
import {
  healthConnectGetSleepSessions,
  healthConnectGetDailyActivity,
  healthConnectGetDailyVitals,
  healthConnectGetTodayActivity,
  healthConnectGetTodayVitals,
  healthConnectGetMindfulnessSessions,
  HEALTH_CONNECT_SLEEP_METRICS,
  healthConnectHasPermissions,
  healthConnectIsAvailable,
} from '@/lib/health/healthConnectService';
import { logger } from '@/lib/logger';
import { logTelemetry } from '@/lib/telemetry';

const LAST_SYNC_KEY = '@reclaim/sync/last'; // legacy generic key
const LAST_HEALTH_SYNC_ATTEMPT_KEY = '@reclaim/sync/health/last_attempt';
const LAST_HEALTH_SYNC_SUCCESS_KEY = '@reclaim/sync/health/last_success';
const APPLE_SYNC_METRICS: HealthMetric[] = ['sleep_analysis', 'sleep_stages', 'steps', 'active_energy'];

export async function getLastSyncISO(): Promise<string | null> {
  return (
    (await AsyncStorage.getItem(LAST_HEALTH_SYNC_ATTEMPT_KEY)) ||
    (await AsyncStorage.getItem(LAST_SYNC_KEY)) ||
    null
  );
}
export async function getLastHealthSyncSuccessISO(): Promise<string | null> {
  return (await AsyncStorage.getItem(LAST_HEALTH_SYNC_SUCCESS_KEY)) || null;
}
async function setLastSyncISO(iso: string) {
  await AsyncStorage.multiSet([
    [LAST_HEALTH_SYNC_ATTEMPT_KEY, iso],
    [LAST_SYNC_KEY, iso],
  ]);
}
async function setLastHealthSyncSuccessISO(iso: string) {
  await AsyncStorage.setItem(LAST_HEALTH_SYNC_SUCCESS_KEY, iso);
}
async function setLegacySyncISO(iso: string) {
  await AsyncStorage.setItem(LAST_SYNC_KEY, iso);
}

async function retryBoolean(
  check: () => Promise<boolean>,
  attempts = 3,
  delayMs = 300,
  checkTimeoutMs = 5_000,
  label = 'readiness_check',
): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    const ok = await withTimeout(
      check().catch(() => false),
      checkTimeoutMs,
      `${label}_attempt_${i + 1}`,
    ).catch(() => false);
    if (ok) return true;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isTimeoutError(error: unknown): boolean {
  const message = String((error as any)?.message ?? error ?? '').toLowerCase();
  return message.includes('timed out');
}

// Google Fit chunked reads removed (Android ingestion is Health Connect only).

/**
 * Push all local mood + meditation sessions to Supabase.
 * - Upserts by `id` so it’s safe to call repeatedly.
 * - Adds `user_id` (current supabase auth) to each row.
 *
 * Expected tables (create them if you don’t have these yet):
 *
 *  -- mood_entries
 *  id TEXT PRIMARY KEY,
 *  user_id UUID REFERENCES auth.users (id),
 *  rating INT,
 *  note TEXT,
 *  created_at TIMESTAMPTZ
 *
 *  -- meditation_sessions
 *  id TEXT PRIMARY KEY,
 *  user_id UUID REFERENCES auth.users (id),
 *  meditation_type TEXT,
 *  start_time TIMESTAMPTZ,
 *  end_time TIMESTAMPTZ,
 *  duration_sec INT,
 *  note TEXT
 */
export async function syncAll(): Promise<{ moodUpserted: number; meditationUpserted: number }> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('No signed-in user');

  // Local data
  const mood = await listMood(1000);
  const med  = await listMeditations();

  // Map to remote schemas
  const moodRows = mood.map((m) => ({
    id: m.id,
    user_id: user.id,
    rating: m.rating,
    note: m.note ?? null,
    created_at: m.created_at, // ISO
  }));

  const medRows = med.map((s) => ({
    id: s.id,
    user_id: user.id,
    meditation_type: s.meditationType ?? null,
    start_time: s.startTime, // ISO
    end_time: s.endTime ?? null, // ISO or null
    duration_sec: s.durationSec ?? null,
    note: s.note ?? null,
  }));

  // Upsert mood
  if (moodRows.length) {
    const { error } = await supabase
      .from('mood_entries')
      .upsert(moodRows, { onConflict: 'id' })
      .select('id');
    if (error) throw error;
  }

  // Upsert meditation sessions
  if (medRows.length) {
    const { error } = await supabase
      .from('meditation_sessions')
      .upsert(medRows, { onConflict: 'id' })
      .select('id');
    if (error) throw error;
  }

  const now = new Date().toISOString();
  await setLegacySyncISO(now);
  return { moodUpserted: moodRows.length, meditationUpserted: medRows.length };
}

function mapHealthSleepSource(session: HealthSleepSession | null): HealthSleepSession | null {
  return session;
}

type SleepSource = 'healthconnect' | 'googlefit' | 'healthkit' | 'samsung_health';
type SleepProviderKey = 'health_connect' | 'google_fit' | 'apple_healthkit' | 'samsung_health';

type ExistingSleepSnapshot = {
  sessionKeys: Set<string>;
  countsBySource: Record<SleepSource, number>;
  queryError?: string;
};

type ProviderSleepOutcome = {
  provider: SleepProviderKey;
  connected: boolean;
  available: boolean;
  hasPermissions: boolean;
  windowDays: number;
  sessionsRead: number;
  writeAttempts: number;
  writeSuccesses: number;
  skippedExisting: number;
  skippedInvalid: number;
  skippedMissingTimes: number;
  note?: string;
  errors?: string[];
};

function emptySourceCounts(): Record<SleepSource, number> {
  return {
    healthconnect: 0,
    googlefit: 0,
    healthkit: 0,
    samsung_health: 0,
  };
}

function createProviderOutcome(provider: SleepProviderKey): ProviderSleepOutcome {
  return {
    provider,
    connected: false,
    available: false,
    hasPermissions: false,
    windowDays: 0,
    sessionsRead: 0,
    writeAttempts: 0,
    writeSuccesses: 0,
    skippedExisting: 0,
    skippedInvalid: 0,
    skippedMissingTimes: 0,
  };
}

function toSleepSessionKey(startTime: Date, endTime: Date): string {
  return `${startTime.toISOString()}|${endTime.toISOString()}`;
}

function sleepSessionKeyFromSession(session: { startTime?: Date; endTime?: Date }): string | null {
  if (!session?.startTime || !session?.endTime) return null;
  if (isNaN(session.startTime.getTime()) || isNaN(session.endTime.getTime())) return null;
  if (session.endTime <= session.startTime) return null;
  return toSleepSessionKey(session.startTime, session.endTime);
}

function asSleepSource(value: unknown): SleepSource | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'healthconnect' || normalized === 'health_connect') return 'healthconnect';
  if (normalized === 'googlefit' || normalized === 'google_fit') return 'googlefit';
  if (
    normalized === 'healthkit' ||
    normalized === 'apple_healthkit' ||
    normalized === 'apple_health'
  ) {
    return 'healthkit';
  }
  if (normalized === 'samsung_health' || normalized === 'samsunghealth') return 'samsung_health';
  return null;
}

async function getExistingSleepSnapshot(start: Date, end: Date): Promise<ExistingSleepSnapshot> {
  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('start_time,end_time,source')
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString());

  if (error) {
    logger.warn('Failed to fetch existing sleep sessions for dedupe:', error);
    return {
      sessionKeys: new Set<string>(),
      countsBySource: emptySourceCounts(),
      queryError: error.message ?? String(error),
    };
  }

  const keys = new Set<string>();
  const countsBySource = emptySourceCounts();
  for (const row of data ?? []) {
    const startTime = row?.start_time ? new Date(row.start_time) : undefined;
    const endTime = row?.end_time ? new Date(row.end_time) : undefined;
    const validStart = startTime && !isNaN(startTime.getTime()) ? startTime : undefined;
    const validEnd = endTime && !isNaN(endTime.getTime()) ? endTime : undefined;
    const key = sleepSessionKeyFromSession({ startTime: validStart, endTime: validEnd });
    if (key) keys.add(key);
    const source = asSleepSource((row as any)?.source);
    if (source) countsBySource[source] += 1;
  }
  return { sessionKeys: keys, countsBySource };
}

// Samsung Health import has been removed from production sync flows.

type SleepDataDetails = {
  hasStartTime: boolean;
  hasEndTime: boolean;
  durationMinutes?: number;
  source?: string;
  hasStages?: boolean;
  hasMetadata?: boolean;
};

type SleepSyncStatus = 'synced' | 'no_new_data' | 'write_failed' | 'no_provider' | 'pipeline_error';

type SyncDebugInfo = {
  serviceAvailable: boolean;
  hasPermissions: boolean;
  sleepDataFound: boolean;
  sleepWriteAttempts: number;
  sleepWriteSuccesses: number;
  sleepSyncStatus?: SleepSyncStatus;
  sleepPipelineWritten?: number;
  sleepPipelineSkipped?: number;
  sleepSupersededDeleted?: number;
  sleepRowsBySource?: Record<SleepSource, number>;
  sleepProviders?: Record<SleepProviderKey, ProviderSleepOutcome>;
  sleepExistingSnapshotError?: string;
  sleepWriteErrors?: string[];
  sleepDataDetails?: SleepDataDetails;
  saveError?: string;
};

type SyncHealthOptions = {
  maxSleepWindowDays?: number;
  forceFullSleepImport?: boolean;
  readinessRetries?: number;
  readinessRetryDelayMs?: number;
  forceRuntimeConnectedProviders?: boolean;
};

export async function syncHealthData(): Promise<{
  sleepSynced: boolean;
  activitySynced: boolean;
  syncedAt: string | null;
  debug?: SyncDebugInfo;
}>;
export async function syncHealthData(options: SyncHealthOptions): Promise<{
  sleepSynced: boolean;
  activitySynced: boolean;
  syncedAt: string | null;
  debug?: SyncDebugInfo;
}>;
export async function syncHealthData(options?: SyncHealthOptions): Promise<{
  sleepSynced: boolean;
  activitySynced: boolean;
  syncedAt: string | null;
  debug?: SyncDebugInfo;
}> {
  const result: {
    sleepSynced: boolean;
    activitySynced: boolean;
    syncedAt: string | null;
    debug: SyncDebugInfo;
  } = {
    sleepSynced: false,
    activitySynced: false,
    syncedAt: null as string | null,
    debug: {
      serviceAvailable: false,
      hasPermissions: false,
      sleepDataFound: false,
      sleepWriteAttempts: 0,
      sleepWriteSuccesses: 0,
      sleepSyncStatus: 'no_provider',
    },
  };

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      result.debug.saveError = sessionError?.message ?? 'Authentication session is unavailable or expired.';
      result.debug.sleepSyncStatus = 'write_failed';
      return result;
    }

    // Android is Health Connect–only for ingestion. Keep legacy provider modules, but do not
    // probe or sync them here (Google Fit / Samsung Health).
    const [appleStatus, hcStatus, hcAvailable] = await Promise.all([
      getIntegrationStatus('apple_healthkit').catch(() => null),
      getIntegrationStatus('health_connect').catch(() => null),
      healthConnectIsAvailable().catch(() => false),
    ]);
    const gfAvailable = false;
    const samsungStatus = null;
    const gfStatus = null;
    const appleConnected = !!appleStatus?.connected;
    const samsungConnected = false;
    const storedHcConnected = !!hcStatus?.connected;
    const storedGfConnected = false;
    const hcManualDisconnect = hcStatus?.manualDisconnect === true;
    const gfManualDisconnect = true;

    const readinessRetries = Math.max(1, options?.readinessRetries ?? 1);
    const readinessRetryDelayMs = Math.max(100, options?.readinessRetryDelayMs ?? 300);
    const forceRuntimeConnectedProviders = options?.forceRuntimeConnectedProviders === true;

    const shouldProbeHcPermissions =
      hcAvailable &&
      (storedHcConnected || (forceRuntimeConnectedProviders && !hcManualDisconnect));
    const shouldProbeGfPermissions = false;

    const hcHasPermissions = shouldProbeHcPermissions
      ? await retryBoolean(
          () => healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS),
          readinessRetries,
          readinessRetryDelayMs,
          4_000,
          'hc_sleep_permissions',
        )
      : false;
    const gfHasPermissions = false;

    const hcConnected =
      storedHcConnected || (forceRuntimeConnectedProviders && !hcManualDisconnect && hcHasPermissions);
    const gfConnected = false;

    result.debug.serviceAvailable = hcAvailable || gfAvailable || appleConnected || samsungConnected;
    result.debug.hasPermissions = hcHasPermissions || gfHasPermissions;

    const sleepProviders: Record<SleepProviderKey, ProviderSleepOutcome> = {
      health_connect: createProviderOutcome('health_connect'),
      google_fit: createProviderOutcome('google_fit'),
      apple_healthkit: createProviderOutcome('apple_healthkit'),
      samsung_health: createProviderOutcome('samsung_health'),
    };
    sleepProviders.health_connect.connected = hcConnected;
    sleepProviders.health_connect.available = hcAvailable;
    sleepProviders.health_connect.hasPermissions = hcHasPermissions;
    sleepProviders.google_fit.connected = gfConnected;
    sleepProviders.google_fit.available = gfAvailable;
    sleepProviders.google_fit.hasPermissions = gfHasPermissions;
    sleepProviders.apple_healthkit.connected = appleConnected;
    sleepProviders.apple_healthkit.available = appleConnected;
    sleepProviders.samsung_health.connected = samsungConnected;
    sleepProviders.samsung_health.available = samsungConnected;

    result.debug.sleepProviders = sleepProviders;

    const anyProviderConfigured =
      hcConnected || gfConnected || appleConnected || samsungConnected;
    if (!anyProviderConfigured) {
      logger.debug('[syncHealthData] No health provider available; skipping');
      result.debug.sleepSyncStatus = 'no_provider';
      return result;
    }

    const anyProviderPreflightReady =
      (hcConnected && hcAvailable && hcHasPermissions) ||
      (gfConnected && gfAvailable && gfHasPermissions) ||
      appleConnected ||
      samsungConnected;
    if (!anyProviderPreflightReady) {
      logger.debug('[syncHealthData] Providers configured but none ready for sleep sync');
      result.debug.sleepSyncStatus = 'no_provider';
      return result;
    }

    const maxWindowDays = options?.maxSleepWindowDays;
    const forceFullSleepImport = options?.forceFullSleepImport === true;
    const fullHistoryDays = maxWindowDays && maxWindowDays > 0
      ? Math.min(365, maxWindowDays)
      : 365;
    const snapshotWindowDays = forceFullSleepImport ? fullHistoryDays : 90;

    // Establish a window for deduping sleep inserts
    const endRange = new Date();
    const startRange = new Date();
    startRange.setDate(startRange.getDate() - snapshotWindowDays);
    const existingSnapshot = await getExistingSleepSnapshot(startRange, endRange);
    if (existingSnapshot.queryError) {
      result.debug.sleepExistingSnapshotError = existingSnapshot.queryError;
      result.debug.saveError = `Could not read existing sleep sessions before sync: ${existingSnapshot.queryError}`;
      result.debug.sleepSyncStatus = 'write_failed';
      return result;
    }
    const existingSessionKeys = existingSnapshot.sessionKeys;
    const hadNoSleepDataAtStart = existingSessionKeys.size === 0;
    result.debug.sleepRowsBySource = existingSnapshot.countsBySource;

    const windowDaysForSource = (source: SleepSource) => {
      if (forceFullSleepImport) {
        return snapshotWindowDays;
      }
      const baseDays = hadNoSleepDataAtStart || existingSnapshot.countsBySource[source] === 0 ? 90 : 7;
      if (!maxWindowDays || maxWindowDays <= 0) return baseDays;
      return Math.min(baseDays, maxWindowDays);
    };

    // Provider priority guardrails: if Health Connect successfully writes daily aggregates,
    // don't overwrite them with Google Fit later in this function.
    let hcActivitySaved = false;
    let appleActivitySaved = false;
    let hcVitalsSaved = false;
    let sleepWriteAttempts = 0;
    let sleepWriteSuccesses = 0;
    const sleepWriteErrors: string[] = [];

    const pushSleepWriteError = (
      providerName: string,
      providerOutcome: ProviderSleepOutcome,
      error: unknown,
    ) => {
      const message =
        typeof error === 'string'
          ? error
          : (error as any)?.message || (error as any)?.details || String(error);
      const formatted = `[${providerName}] ${message}`;
      sleepWriteErrors.push(formatted);
      providerOutcome.errors = providerOutcome.errors ?? [];
      if (providerOutcome.errors.length < 5) providerOutcome.errors.push(message);
      logger.warn(`[syncHealthData] ${formatted}`);
    };

    // ---------- Collect sleep from all providers for consolidated pipeline ----------
    const sessionsByProvider: Array<{
      provider: 'health_connect' | 'apple_healthkit' | 'samsung_health' | 'google_fit';
      sessions: HealthSleepSession[];
    }> = [];

    // ---------- Health Connect sleep (collect) ----------
    try {
      if (hcConnected) {
        const hcOutcome = sleepProviders.health_connect;
        if (!hcAvailable) {
          hcOutcome.note = 'provider_unavailable';
        } else if (hcHasPermissions) {
          const hcDays = windowDaysForSource('healthconnect');
          hcOutcome.windowDays = hcDays;
          logger.debug('[HealthConnect] sleep sync', {
            providerHasNoRows: existingSnapshot.countsBySource.healthconnect === 0,
            days: hcDays,
          });
          const hcSessions = await withTimeout(
            healthConnectGetSleepSessions(hcDays),
            12_000,
            'Health Connect sleep read',
          );
          hcOutcome.sessionsRead = hcSessions.length;
          if (hcSessions.length > 0) {
            result.debug.sleepDataFound = true;
            sessionsByProvider.push({ provider: 'health_connect', sessions: hcSessions });
          }
        } else {
          hcOutcome.note = 'permissions_missing';
        }
      } else {
        sleepProviders.health_connect.note = 'provider_not_connected';
      }
    } catch (error) {
      sleepProviders.health_connect.note = 'sync_error';
      const message = error instanceof Error ? error.message : String(error);
      sleepProviders.health_connect.errors = sleepProviders.health_connect.errors ?? [];
      if (sleepProviders.health_connect.errors.length < 5) {
        sleepProviders.health_connect.errors.push(message);
      }
      logger.error('Health Connect sleep sync skipped due to error:', error);
    }

    // ---------- Health Connect activity + vitals (daily aggregates) ----------
    // Full-window run (connect/import): backfill same window as sleep. Otherwise: today only.
    try {
      if (hcConnected && hcAvailable) {
        const hcHasPerms = await healthConnectHasPermissions([
          'steps',
          'active_energy',
          'heart_rate',
          'resting_heart_rate',
          'heart_rate_variability',
        ]);
        if (hcHasPerms) {
          const hcDays = windowDaysForSource('healthconnect');

          if (forceFullSleepImport && hcDays > 1) {
            // Backfill activity and vitals for the same window as sleep (same architecture as sleep).
            const [activityDays, vitalsDays] = await Promise.all([
              healthConnectGetDailyActivity(hcDays).catch(() => [] as ActivitySample[]),
              healthConnectGetDailyVitals(hcDays).catch(() => [] as { date: Date; restingHeartRateBpm?: number | null; hrvRmssdMs?: number | null; avgHeartRateBpm?: number | null; minHeartRateBpm?: number | null; maxHeartRateBpm?: number | null }[]),
            ]);

            for (const sample of activityDays ?? []) {
              if (!sample?.timestamp) continue;
              try {
                await upsertDailyActivityFromHealth({
                  date: sample.timestamp,
                  steps: sample.steps ?? null,
                  activeEnergy: sample.activeEnergyBurned ?? null,
                  source: 'health_connect',
                });
                result.activitySynced = true;
                hcActivitySaved = true;
              } catch (error) {
                logger.warn('Failed to upsert HC activity day:', error);
              }
            }

            for (const v of vitalsDays ?? []) {
              if (!v?.date) continue;
              try {
                await upsertVitalsDailyFromHealth({
                  date: v.date,
                  restingHeartRateBpm: v.restingHeartRateBpm ?? null,
                  hrvRmssdMs: v.hrvRmssdMs ?? null,
                  avgHeartRateBpm: v.avgHeartRateBpm ?? null,
                  minHeartRateBpm: v.minHeartRateBpm ?? null,
                  maxHeartRateBpm: v.maxHeartRateBpm ?? null,
                  source: 'health_connect',
                });
                hcVitalsSaved = true;
              } catch (error) {
                logger.warn('Failed to upsert HC vitals day:', error);
              }
            }
          } else {
            // Today only (dashboard refresh, capped window, etc.).
            const [todayActivity, todayVitals] = await Promise.all([
              healthConnectGetTodayActivity().catch(() => null),
              healthConnectGetTodayVitals().catch(() => null),
            ]);

            if (todayActivity?.timestamp) {
              try {
                await upsertDailyActivityFromHealth({
                  date: todayActivity.timestamp,
                  steps: todayActivity.steps ?? null,
                  activeEnergy: todayActivity.activeEnergyBurned ?? null,
                  source: 'health_connect',
                });
                result.activitySynced = true;
                hcActivitySaved = true;
              } catch (error) {
                logger.warn('Failed to upsert HC activity summary:', error);
              }
            }

            if (todayVitals?.date) {
              try {
                await upsertVitalsDailyFromHealth({
                  date: todayVitals.date,
                  restingHeartRateBpm: todayVitals.restingHeartRateBpm ?? null,
                  hrvRmssdMs: todayVitals.hrvRmssdMs ?? null,
                  avgHeartRateBpm: todayVitals.avgHeartRateBpm ?? null,
                  minHeartRateBpm: todayVitals.minHeartRateBpm ?? null,
                  maxHeartRateBpm: todayVitals.maxHeartRateBpm ?? null,
                  source: 'health_connect',
                });
                hcVitalsSaved = true;
              } catch (error) {
                logger.warn('Failed to upsert HC vitals daily:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Health Connect activity/vitals sync skipped due to error:', error);
    }

    // ---------- Health Connect mindfulness (full-window backfill) ----------
    try {
      if (hcConnected && hcAvailable && forceFullSleepImport) {
        const hcDays = windowDaysForSource('healthconnect');
        if (hcDays > 1) {
          const hasMindfulness = await healthConnectHasPermissions(['mindfulness']);
          if (hasMindfulness) {
            const sessions = await healthConnectGetMindfulnessSessions(hcDays).catch(() => []);
            for (const s of sessions) {
              try {
                await upsertMindfulnessSessionFromHealth({
                  startTime: s.startTime,
                  endTime: s.endTime,
                  durationSec: s.durationSec,
                  sessionType: s.sessionType ?? null,
                  title: s.title ?? null,
                  notes: s.notes ?? null,
                  externalId: `${s.startTime.toISOString()}_${s.endTime.toISOString()}`,
                });
              } catch (err) {
                logger.warn('Failed to upsert HC mindfulness session:', err);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Health Connect mindfulness sync skipped due to error:', error);
    }

    // ---------- Apple HealthKit sleep + activity ----------
    try {
      if (appleStatus?.connected) {
        const appleOutcome = sleepProviders.apple_healthkit;
        const appleProvider = new AppleHealthKitProvider();
        const granted = await appleProvider.requestPermissions(APPLE_SYNC_METRICS);
        appleOutcome.hasPermissions = granted;
        if (granted) {
          const endDate = new Date();
          const startDate = new Date();
          const appleDays = windowDaysForSource('healthkit');
          appleOutcome.windowDays = appleDays;
          startDate.setDate(startDate.getDate() - appleDays);
          logger.debug('[AppleHealth] sleep sync', {
            providerHasNoRows: existingSnapshot.countsBySource.healthkit === 0,
            days: appleDays,
          });

          const appleSessions = await appleProvider.getSleepSessions(startDate, endDate);
          appleOutcome.sessionsRead = appleSessions.length;
          if (appleSessions.length > 0) {
            result.debug.sleepDataFound = true;
            sessionsByProvider.push({ provider: 'apple_healthkit', sessions: appleSessions });
          }

          const appleActivity = await appleProvider.getActivity(startDate, endDate);
          for (const sample of appleActivity) {
            if (!sample?.timestamp) continue;
            try {
              await upsertDailyActivityFromHealth({
                date: sample.timestamp,
                steps: sample.steps ?? null,
                activeEnergy: sample.activeEnergyBurned ?? null,
                source: 'apple_healthkit',
              });
              result.activitySynced = true;
              appleActivitySaved = true;
            } catch (error) {
              logger.warn('Failed to upsert Apple Health activity summary:', error);
            }
          }
        } else {
          appleOutcome.note = 'permissions_missing';
        }
      } else {
        sleepProviders.apple_healthkit.note = 'provider_not_connected';
      }
    } catch (error) {
      sleepProviders.apple_healthkit.note = 'sync_error';
      logger.warn('Apple HealthKit sync skipped due to error:', error);
    }

    // Legacy providers (Google Fit / Samsung Health) are not used for ingestion anymore.
    // Keep provider outcomes for debugging older stored connection state.
    sleepProviders.samsung_health.note = 'provider_not_connected';
    sleepProviders.google_fit.note = 'provider_not_connected';

    // ---------- Run consolidated sleep pipeline (merge splits, dedupe, enrich, write) ----------
    if (sessionsByProvider.length > 0) {
      try {
        const pipelineResult = await runSleepSyncPipeline({ sessionsByProvider, existingSessionKeys });
        sleepWriteAttempts = pipelineResult.written + pipelineResult.skipped;
        sleepWriteSuccesses = pipelineResult.written;
        if (pipelineResult.written > 0) result.sleepSynced = true;
        // All skipped = data already in DB; treat as successful sync for UI/refresh
        if (pipelineResult.skipped > 0 && pipelineResult.written === 0) result.sleepSynced = true;
        result.debug.sleepPipelineWritten = pipelineResult.written;
        result.debug.sleepPipelineSkipped = pipelineResult.skipped;
        result.debug.sleepSupersededDeleted = pipelineResult.supersededDeleted;
      } catch (error) {
        pushSleepWriteError('SleepPipeline', sleepProviders.health_connect, error);
        result.debug.sleepSyncStatus = 'pipeline_error';
      }
    }

    result.debug.sleepWriteAttempts = sleepWriteAttempts;
    result.debug.sleepWriteSuccesses = sleepWriteSuccesses;
    if (sleepWriteErrors.length > 0) {
      result.debug.sleepWriteErrors = sleepWriteErrors.slice(0, 10);
    }
    if (sleepWriteAttempts > 0 && sleepWriteSuccesses === 0) {
      if (sleepWriteErrors.length > 0) {
        result.debug.saveError = sleepWriteErrors[0];
        result.debug.sleepSyncStatus = 'write_failed';
      } else {
        result.debug.sleepSyncStatus = 'synced';
      }
    } else if (sleepWriteSuccesses > 0) {
      result.debug.sleepSyncStatus = 'synced';
    } else {
      const anyProviderReady = Object.values(sleepProviders).some(
        (p) => p.connected && p.available && p.hasPermissions,
      );
      result.debug.sleepSyncStatus = anyProviderReady || result.debug.sleepDataFound
        ? 'no_new_data'
        : 'no_provider';
    }

    // No fallback provider writes: Android ingestion is Health Connect only.

    const attemptedAt = new Date().toISOString();
    await setLastSyncISO(attemptedAt);
    result.syncedAt = attemptedAt;
    if (result.sleepSynced || result.activitySynced) {
      await setLastHealthSyncSuccessISO(attemptedAt);
    }
    void logTelemetry({
      name: 'sync_provider_outcomes',
      properties: {
        sleepSyncStatus: result.debug.sleepSyncStatus ?? null,
        sleepWriteAttempts: result.debug.sleepWriteAttempts,
        sleepWriteSuccesses: result.debug.sleepWriteSuccesses,
        providerSummary: Object.fromEntries(
          Object.entries(result.debug.sleepProviders ?? {}).map(([provider, details]) => [
            provider,
            {
              connected: details.connected,
              available: details.available,
              hasPermissions: details.hasPermissions,
              sessionsRead: details.sessionsRead,
              writeAttempts: details.writeAttempts,
              writeSuccesses: details.writeSuccesses,
              skippedExisting: details.skippedExisting,
              note: details.note ?? null,
              firstError: details.errors?.[0] ?? null,
            },
          ]),
        ),
      },
      tags: ['SYNC_PROVIDER'],
    });
  } catch (error) {
    logger.warn('syncHealthData encountered an error:', error);
    const attemptedAt = new Date().toISOString();
    await setLastSyncISO(attemptedAt);
    result.syncedAt = attemptedAt;
  }

  return result;
}

/**
 * Sync historical health data (last N days)
 * This is called after permissions are granted to do a full initial sync
 */
export async function syncHistoricalHealthData(days: number = 30): Promise<{
  sleepSessionsSynced: number;
  activityDaysSynced: number;
  errors: string[];
}> {
  const result = {
    sleepSessionsSynced: 0,
    activityDaysSynced: 0,
    errors: [] as string[],
  };

  try {
    if (Platform.OS !== 'android') {
      result.errors.push('Historical Health Connect sync is only available on Android.');
      return result;
    }

    const available = await healthConnectIsAvailable().catch(() => false);
    if (!available) {
      result.errors.push('Health Connect unavailable');
      return result;
    }

    const hasPermissions = await healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS);
    if (!hasPermissions) {
      result.errors.push('Health Connect sleep permissions not granted');
      return result;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    logger.debug('Starting historical health data sync', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
    });

    // Sync sleep sessions (consolidation + dedupe handled by pipeline)
    try {
      const sleepSessions = await healthConnectGetSleepSessions(Math.max(1, Math.floor(days)));
      logger.debug(`Found ${sleepSessions.length} Health Connect sleep sessions to sync`);

      const existing = (await getExistingSleepSnapshot(startDate, endDate)).sessionKeys;
      const pipelineResult = await runSleepSyncPipeline({
        sessionsByProvider: [{ provider: 'health_connect', sessions: sleepSessions }],
        existingSessionKeys: existing,
      });
      result.sleepSessionsSynced = pipelineResult.written;
    } catch (error: any) {
      const errorMsg = `Failed to fetch sleep sessions: ${error?.message || String(error)}`;
      logger.error(errorMsg, error);
      result.errors.push(errorMsg);
    }

    // Sync activity + vitals daily aggregates (best effort)
    try {
      const [activityDays, vitalsDays] = await Promise.all([
        healthConnectGetDailyActivity(Math.max(1, Math.floor(days))).catch(() => []),
        healthConnectGetDailyVitals(Math.max(1, Math.floor(days))).catch(() => []),
      ]);

      for (const sample of activityDays ?? []) {
        if (!sample?.timestamp) continue;
        await upsertDailyActivityFromHealth({
          date: sample.timestamp,
          steps: sample.steps ?? null,
          activeEnergy: sample.activeEnergyBurned ?? null,
          source: 'health_connect',
        })
          .then(() => {
            result.activityDaysSynced += 1;
          })
          .catch(() => {});
      }

      for (const v of vitalsDays ?? []) {
        if (!v?.date) continue;
        await upsertVitalsDailyFromHealth({
          date: v.date,
          restingHeartRateBpm: v.restingHeartRateBpm ?? null,
          hrvRmssdMs: v.hrvRmssdMs ?? null,
          avgHeartRateBpm: v.avgHeartRateBpm ?? null,
          minHeartRateBpm: v.minHeartRateBpm ?? null,
          maxHeartRateBpm: v.maxHeartRateBpm ?? null,
          source: 'health_connect',
        }).catch(() => {});
      }
    } catch (error: any) {
      const errorMsg = `Failed to fetch daily aggregates: ${error?.message || String(error)}`;
      logger.error(errorMsg, error);
      result.errors.push(errorMsg);
    }

    if (result.sleepSessionsSynced > 0 || result.activityDaysSynced > 0) {
      await setLastSyncISO(new Date().toISOString());
    }

    logger.debug('Historical sync completed', result);
  } catch (error) {
    logger.error('Historical health data sync failed:', error);
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}
