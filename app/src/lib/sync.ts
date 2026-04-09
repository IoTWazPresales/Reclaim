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
} from '@/lib/api';
import { runSleepSyncPipeline } from '@/lib/sleep/sleepSyncPipeline';
import type { ActivitySample, HealthMetric, SleepSession as HealthSleepSession } from '@/lib/health/types';
import {
  getGoogleFitProvider,
  googleFitGetSleepSessions,
  googleFitGetTodayActivity,
  googleFitHasPermissions,
} from '@/lib/health/googleFitService';
import { AppleHealthKitProvider } from '@/lib/health/providers/appleHealthKit';
import { getIntegrationStatus } from '@/lib/health/integrationStore';
import {
  healthConnectGetDailyActivity,
  healthConnectGetDailyVitals,
  healthConnectGetSleepSessions,
  healthConnectGetTodayActivity,
  healthConnectGetTodayVitals,
  HEALTH_CONNECT_SLEEP_METRICS,
  healthConnectHasPermissions,
  healthConnectIsAvailable,
} from '@/lib/health/healthConnectService';
import {
  samsungIsAvailable,
  samsungRequestPermissions,
  samsungReadSleep,
} from '@/lib/health/samsungHealthService';
import { logger } from '@/lib/logger';
import { logTelemetry } from '@/lib/telemetry';

const LAST_SYNC_KEY = '@reclaim/sync/last'; // legacy generic key
const LAST_HEALTH_SYNC_ATTEMPT_KEY = '@reclaim/sync/health/last_attempt';
const LAST_HEALTH_SYNC_SUCCESS_KEY = '@reclaim/sync/health/last_success';
const APPLE_SYNC_METRICS: HealthMetric[] = ['sleep_analysis', 'sleep_stages', 'steps', 'active_energy'];

/** ~3 months of HC daily rows into `activity_daily` / `vitals_daily` on first connect / import. */
export const HEALTH_CONNECT_HISTORICAL_IMPORT_DAYS = 90;

const HC_DAILY_BACKFILL_CHUNK = 12;

/**
 * Pulls N days of Health Connect daily activity + vitals and upserts into Supabase (idempotent).
 * Used on first connect (`forceFullSleepImport`) and by `syncHistoricalHealthData`.
 */
export async function backfillHealthConnectDailyHistoryToSupabase(days: number): Promise<{
  activityDaysWritten: number;
  vitalsDaysWritten: number;
  errors: string[];
}> {
  const result = { activityDaysWritten: 0, vitalsDaysWritten: 0, errors: [] as string[] };
  if (Platform.OS !== 'android') return result;

  const available = await healthConnectIsAvailable().catch(() => false);
  if (!available) return result;

  const d = Math.max(1, Math.min(365, Math.floor(days)));

  const canActivity = await healthConnectHasPermissions(['steps', 'active_energy']).catch(() => false);
  const canVitals = await healthConnectHasPermissions([
    'heart_rate',
    'resting_heart_rate',
    'heart_rate_variability',
  ]).catch(() => false);

  if (!canActivity && !canVitals) return result;

  try {
    const [activitySamples, vitalsRows] = await Promise.all([
      canActivity
        ? healthConnectGetDailyActivity(d).catch((e) => {
            result.errors.push(`activity_read:${e instanceof Error ? e.message : String(e)}`);
            return [] as Awaited<ReturnType<typeof healthConnectGetDailyActivity>>;
          })
        : Promise.resolve([]),
      canVitals
        ? healthConnectGetDailyVitals(d).catch((e) => {
            result.errors.push(`vitals_read:${e instanceof Error ? e.message : String(e)}`);
            return [] as Awaited<ReturnType<typeof healthConnectGetDailyVitals>>;
          })
        : Promise.resolve([]),
    ]);

    if (canActivity && activitySamples.length) {
      for (let i = 0; i < activitySamples.length; i += HC_DAILY_BACKFILL_CHUNK) {
        const chunk = activitySamples.slice(i, i + HC_DAILY_BACKFILL_CHUNK);
        await Promise.all(
          chunk.map(async (s) => {
            if (!s?.timestamp) return;
            try {
              await upsertDailyActivityFromHealth({
                date: s.timestamp,
                steps: s.steps ?? null,
                activeEnergy: s.activeEnergyBurned ?? null,
                source: 'health_connect',
              });
              result.activityDaysWritten += 1;
            } catch (e) {
              result.errors.push(`activity_upsert:${e instanceof Error ? e.message : String(e)}`);
            }
          }),
        );
      }
    }

    if (canVitals && vitalsRows.length) {
      for (let i = 0; i < vitalsRows.length; i += HC_DAILY_BACKFILL_CHUNK) {
        const chunk = vitalsRows.slice(i, i + HC_DAILY_BACKFILL_CHUNK);
        await Promise.all(
          chunk.map(async (row) => {
            if (!row?.date) return;
            try {
              await upsertVitalsDailyFromHealth({
                date: row.date,
                restingHeartRateBpm: row.restingHeartRateBpm ?? null,
                hrvRmssdMs: row.hrvRmssdMs ?? null,
                avgHeartRateBpm: row.avgHeartRateBpm ?? null,
                minHeartRateBpm: row.minHeartRateBpm ?? null,
                maxHeartRateBpm: row.maxHeartRateBpm ?? null,
                source: 'health_connect',
              });
              result.vitalsDaysWritten += 1;
            } catch (e) {
              result.errors.push(`vitals_upsert:${e instanceof Error ? e.message : String(e)}`);
            }
          }),
        );
      }
    }
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  }

  logger.debug('[HealthConnect] daily history backfill', result);
  return result;
}

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

type ChunkedGoogleFitRead = {
  sessions: HealthSleepSession[];
  attemptedChunks: number;
  failedChunks: number;
  timedOutChunks: number;
};

async function readGoogleFitSleepSessionsChunked(
  provider: ReturnType<typeof getGoogleFitProvider>,
  days: number,
): Promise<ChunkedGoogleFitRead> {
  const totalDays = Math.max(1, Math.floor(days));
  const chunkDays = totalDays > 120 ? 21 : totalDays > 60 ? 30 : totalDays;
  let remainingDays = totalDays;
  let chunkEnd = new Date();

  const sessions: HealthSleepSession[] = [];
  const seenKeys = new Set<string>();
  let attemptedChunks = 0;
  let failedChunks = 0;
  let timedOutChunks = 0;

  const CHUNK_TIMEOUT_MS = 20_000;

  while (remainingDays > 0) {
    const currentChunkDays = Math.min(chunkDays, remainingDays);
    const chunkStart = new Date(chunkEnd);
    chunkStart.setDate(chunkStart.getDate() - currentChunkDays);
    attemptedChunks += 1;

    let chunkSessions: HealthSleepSession[] = [];
    try {
      chunkSessions = await withTimeout(
        provider.getSleepSessions(chunkStart, chunkEnd),
        CHUNK_TIMEOUT_MS,
        `Google Fit sleep read chunk ${attemptedChunks}`,
      );
    } catch (error) {
      // Retry once on timeout or transient failure
      if (isTimeoutError(error)) timedOutChunks += 1;
      try {
        await new Promise((r) => setTimeout(r, 2000));
        chunkSessions = await withTimeout(
          provider.getSleepSessions(chunkStart, chunkEnd),
          CHUNK_TIMEOUT_MS,
          `Google Fit sleep read chunk ${attemptedChunks} (retry)`,
        );
      } catch (retryError) {
        if (isTimeoutError(retryError)) timedOutChunks += 1;
        failedChunks += 1;
        logger.debug('[GoogleFit] sleep chunk read failed', {
          attemptedChunks,
          currentChunkDays,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const session of chunkSessions) {
      const startTime =
        session?.startTime instanceof Date ? session.startTime : session?.startTime ? new Date(session.startTime) : undefined;
      const endTime =
        session?.endTime instanceof Date ? session.endTime : session?.endTime ? new Date(session.endTime) : undefined;
      const key = sleepSessionKeyFromSession({ startTime, endTime });
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);
      sessions.push(session);
    }

    remainingDays -= currentChunkDays;
    chunkEnd = chunkStart;
  }

  return {
    sessions,
    attemptedChunks,
    failedChunks,
    timedOutChunks,
  };
}

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

export type ImportSamsungOptions =
  | number
  | {
      days: number;
      forceFullHistory?: boolean;
      existingSessionKeys?: Set<string>;
      skipPermissionCheck?: boolean;
    };

/**
 * Import Samsung Health sleep data into Supabase.
 * @param options - Number of days (90 = full history) or { days, forceFullHistory }.
 *   Use 90 (or forceFullHistory) for first sync or manual "Import full history".
 *   Use 7 for incremental sync when user already has sleep data.
 */
export async function importSamsungHistory(options: ImportSamsungOptions = 90): Promise<{
  imported: number;
  skipped: number;
  sessionsRead: number;
  writeAttempts: number;
  writeSuccesses: number;
  skippedExisting: number;
  skippedInvalid: number;
  skippedMissingTimes: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    skipped: 0,
    sessionsRead: 0,
    writeAttempts: 0,
    writeSuccesses: 0,
    skippedExisting: 0,
    skippedInvalid: 0,
    skippedMissingTimes: 0,
    errors: [] as string[],
  };
  const days = typeof options === 'number' ? options : options.days;

  try {
    if (!(await samsungIsAvailable())) {
      result.errors.push('Samsung Health not available');
      return result;
    }
    const skipPermissionCheck = typeof options !== 'number' && options.skipPermissionCheck === true;
    if (!skipPermissionCheck) {
      const granted = await samsungRequestPermissions();
      if (!granted) {
        result.errors.push('Samsung Health permissions not granted');
        return result;
      }
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const existing =
      typeof options === 'number'
        ? (await getExistingSleepSnapshot(start, end)).sessionKeys
        : options.existingSessionKeys ?? (await getExistingSleepSnapshot(start, end)).sessionKeys;

    const sessions = await samsungReadSleep(start, end);
    result.sessionsRead = sessions.length;
    if (!sessions.length) {
      logger.debug('[SamsungHealth] No sleep rows returned');
      return result;
    }

    logger.debug('[SamsungHealth] fetched sessions', { count: sessions.length });

    const pipelineResult = await runSleepSyncPipeline({
      sessionsByProvider: [{ provider: 'samsung_health', sessions }],
      existingSessionKeys: existing,
    });
    result.writeAttempts = pipelineResult.written + pipelineResult.skipped;
    result.writeSuccesses = pipelineResult.written;
    result.imported = pipelineResult.written;
    result.skipped = pipelineResult.skipped;
    result.skippedExisting = pipelineResult.skipped;
  } catch (e: any) {
    result.errors.push(e?.message ?? String(e));
  }

  result.skipped = result.skippedExisting + result.skippedInvalid + result.skippedMissingTimes;
  logger.debug('[SamsungHealth] import summary', result);
  return result;
}

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

    const provider = getGoogleFitProvider();
    const [appleStatus, samsungStatus, hcStatus, gfStatus, hcAvailable, gfAvailable] = await Promise.all([
      getIntegrationStatus('apple_healthkit').catch(() => null),
      getIntegrationStatus('samsung_health').catch(() => null),
      getIntegrationStatus('health_connect').catch(() => null),
      getIntegrationStatus('google_fit').catch(() => null),
      healthConnectIsAvailable().catch(() => false),
      provider.isAvailable().catch(() => false),
    ]);
    const appleConnected = !!appleStatus?.connected;
    const samsungConnected = !!samsungStatus?.connected;
    const storedHcConnected = !!hcStatus?.connected;
    const storedGfConnected = !!gfStatus?.connected;
    const hcManualDisconnect = hcStatus?.manualDisconnect === true;
    const gfManualDisconnect = gfStatus?.manualDisconnect === true;

    const readinessRetries = Math.max(1, options?.readinessRetries ?? 1);
    const readinessRetryDelayMs = Math.max(100, options?.readinessRetryDelayMs ?? 300);
    const forceRuntimeConnectedProviders = options?.forceRuntimeConnectedProviders === true;

    const shouldProbeHcPermissions =
      hcAvailable &&
      (storedHcConnected || (forceRuntimeConnectedProviders && !hcManualDisconnect));
    const shouldProbeGfPermissions =
      gfAvailable &&
      (storedGfConnected || (forceRuntimeConnectedProviders && !gfManualDisconnect));

    const hcHasPermissions = shouldProbeHcPermissions
      ? await retryBoolean(
          () => healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS),
          readinessRetries,
          readinessRetryDelayMs,
          4_000,
          'hc_sleep_permissions',
        )
      : false;
    const gfHasPermissions =
      Platform.OS === 'android'
        ? false
        : shouldProbeGfPermissions
            ? await retryBoolean(
                () => googleFitHasPermissions(),
                readinessRetries,
                readinessRetryDelayMs,
                4_000,
                'gf_permissions',
              )
            : false;

    const hcConnected =
      storedHcConnected || (forceRuntimeConnectedProviders && !hcManualDisconnect && hcHasPermissions);
    const gfConnected =
      Platform.OS === 'android'
        ? false
        : storedGfConnected || (forceRuntimeConnectedProviders && !gfManualDisconnect && gfHasPermissions);

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
    sleepProviders.google_fit.available = Platform.OS === 'android' ? false : gfAvailable;
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
    let todayActivity: Awaited<ReturnType<typeof googleFitGetTodayActivity>> | null = null;
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
          const hcReadTimeoutMs = hcDays > 45 ? 45_000 : 12_000;
          const hcSessions = await withTimeout(
            healthConnectGetSleepSessions(hcDays),
            hcReadTimeoutMs,
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
    } catch (error) {
      logger.warn('Health Connect activity/vitals sync skipped due to error:', error);
    }

    // ---------- Health Connect: backfill daily aggregates (~3 months) on first connect / import ----------
    if (forceFullSleepImport && Platform.OS === 'android' && hcConnected && hcAvailable) {
      try {
        const backfill = await backfillHealthConnectDailyHistoryToSupabase(HEALTH_CONNECT_HISTORICAL_IMPORT_DAYS);
        if (backfill.activityDaysWritten > 0 || backfill.vitalsDaysWritten > 0) {
          result.activitySynced = true;
        }
        if (backfill.errors.length) {
          logger.warn('[syncHealthData] HC daily backfill errors (sample)', backfill.errors.slice(0, 8));
        }
        void logTelemetry({
          name: 'health_connect_daily_backfill',
          properties: {
            activityDaysWritten: backfill.activityDaysWritten,
            vitalsDaysWritten: backfill.vitalsDaysWritten,
            errorCount: backfill.errors.length,
          },
          tags: ['SYNC_HC'],
        });
      } catch (e) {
        logger.warn('[syncHealthData] HC daily backfill failed', e);
      }
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

    // ---------- Samsung Health sleep (collect) ----------
    try {
      if (Platform.OS === 'android') {
        // On Android we rely on Health Connect as the single source of truth.
        sleepProviders.samsung_health.note = 'disabled_hc_only';
      } else if (samsungStatus?.connected) {
        const samsungOutcome = sleepProviders.samsung_health;
        const samsungAvailable = await samsungIsAvailable().catch(() => false);
        samsungOutcome.available = samsungAvailable;
        if (samsungAvailable) {
          const granted = await samsungRequestPermissions().catch(() => false);
          samsungOutcome.hasPermissions = granted;
          if (granted) {
            const samsungDays = windowDaysForSource('samsung_health');
            samsungOutcome.windowDays = samsungDays;
            logger.debug('[SamsungHealth] sync', {
              providerHasNoRows: existingSnapshot.countsBySource.samsung_health === 0,
              days: samsungDays,
            });
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - samsungDays);
            const samsungSessions = await samsungReadSleep(start, end);
            samsungOutcome.sessionsRead = samsungSessions.length;
            if (samsungSessions.length > 0) {
              result.debug.sleepDataFound = true;
              sessionsByProvider.push({ provider: 'samsung_health', sessions: samsungSessions });
            }
          } else {
            samsungOutcome.note = 'permissions_missing';
          }
        } else {
          samsungOutcome.note = 'provider_unavailable';
        }
      } else {
        sleepProviders.samsung_health.note = 'provider_not_connected';
      }
    } catch (error) {
      sleepProviders.samsung_health.note = 'sync_error';
      logger.warn('Samsung Health sync skipped due to error:', error);
    }

    if (!gfConnected) {
      sleepProviders.google_fit.note = Platform.OS === 'android' ? 'disabled_hc_only' : 'provider_not_connected';
    } else if (!gfAvailable) {
      logger.debug('Google Fit unavailable; skipping health sync.');
      sleepProviders.google_fit.note = 'provider_unavailable';
    } else if (!gfHasPermissions) {
      logger.debug('Google Fit permissions not granted; skipping health sync.');
      sleepProviders.google_fit.note = 'permissions_missing';
    }

    // ---------- Google Fit sleep ----------
    try {
      const gfOutcome = sleepProviders.google_fit;
      if (Platform.OS === 'android') {
        // Health Connect is the single Android sleep source; do not read Google Fit.
        gfOutcome.note = 'disabled_hc_only';
      } else if (gfConnected && gfAvailable && gfHasPermissions) {
        const provider = getGoogleFitProvider();
        const gfDays = windowDaysForSource('googlefit');
        gfOutcome.windowDays = gfDays;
        logger.debug('[GoogleFit] sleep sync', {
          providerHasNoRows: existingSnapshot.countsBySource.googlefit === 0,
          days: gfDays,
        });
        const gfRead = await readGoogleFitSleepSessionsChunked(provider, gfDays);
        const googleFitSessions = gfRead.sessions;
        todayActivity = await withTimeout(
          googleFitGetTodayActivity().catch(() => null),
          12_000,
          'Google Fit activity read',
        ).catch(() => null);
        if (gfRead.failedChunks > 0) {
          const errorMessage =
            gfRead.timedOutChunks > 0
              ? `Google Fit sleep read timed out in ${gfRead.timedOutChunks}/${gfRead.attemptedChunks} chunks`
              : `Google Fit sleep read failed in ${gfRead.failedChunks}/${gfRead.attemptedChunks} chunks`;
          const failureRatio = gfRead.failedChunks / gfRead.attemptedChunks;
          const noData = googleFitSessions.length === 0;
          if (noData || failureRatio >= 0.5) {
            pushSleepWriteError('GoogleFit', gfOutcome, errorMessage);
          } else {
            logger.debug(
              `[syncHealthData] [GoogleFit] Partial read: ${errorMessage}, ${googleFitSessions.length} sessions`,
            );
          }
          if (noData) {
            gfOutcome.note = 'sync_error';
          } else if (!gfOutcome.note) {
            gfOutcome.note = 'partial_read';
          }
        }
        gfOutcome.sessionsRead = googleFitSessions.length;
        if (googleFitSessions.length > 0) {
          result.debug.sleepDataFound = true;
          sessionsByProvider.push({ provider: 'google_fit', sessions: googleFitSessions });
        }
      }
    } catch (error) {
      sleepProviders.google_fit.note = 'sync_error';
      const message = error instanceof Error ? error.message : String(error);
      sleepProviders.google_fit.errors = sleepProviders.google_fit.errors ?? [];
      if (sleepProviders.google_fit.errors.length < 5) {
        sleepProviders.google_fit.errors.push(message);
      }
      logger.error('Google Fit sleep sync skipped due to error:', error);
    }

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

    if (!hcActivitySaved && !appleActivitySaved && todayActivity?.timestamp) {
      try {
        await upsertDailyActivityFromHealth({
          date: todayActivity.timestamp,
          steps: todayActivity.steps ?? null,
          activeEnergy: todayActivity.activeEnergyBurned ?? null,
          source: todayActivity.source as any,
        });
        result.activitySynced = true;
      } catch (error) {
        logger.warn('Failed to upsert activity summary from health provider:', error);
      }
    }

    if (!hcVitalsSaved && Platform.OS !== 'android') {
      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [hrSamples, restingHr] = await Promise.all([
          provider.getHeartRate(startOfDay, now).catch(() => []),
          provider.getRestingHeartRate(startOfDay, now).catch(() => null),
        ]);

        const vals = (hrSamples ?? [])
          .map((s: any) => s?.value)
          .filter((v: any) => typeof v === 'number' && Number.isFinite(v)) as number[];

        const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
        const min = vals.length ? Math.min(...vals) : null;
        const max = vals.length ? Math.max(...vals) : null;

        if (avg !== null || restingHr !== null) {
          await upsertVitalsDailyFromHealth({
            date: startOfDay,
            restingHeartRateBpm: restingHr ?? null,
            hrvRmssdMs: null,
            avgHeartRateBpm: avg,
            minHeartRateBpm: min,
            maxHeartRateBpm: max,
            source: 'google_fit',
          });
        }
      } catch (error) {
        logger.warn('Failed to upsert vitals daily from Google Fit:', error);
      }
    }

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
export async function syncHistoricalHealthData(days: number = HEALTH_CONNECT_HISTORICAL_IMPORT_DAYS): Promise<{
  sleepSessionsSynced: number;
  activityDaysSynced: number;
  vitalsDaysSynced: number;
  errors: string[];
}> {
  const result = {
    sleepSessionsSynced: 0,
    activityDaysSynced: 0,
    vitalsDaysSynced: 0,
    errors: [] as string[],
  };

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    logger.debug('Starting historical health data sync (Health Connect)', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
    });

    // For historical imports we currently rely on Health Connect only.
    try {
      const sleepSessions = await healthConnectGetSleepSessions(days);
      logger.debug(`[HealthConnect] Found ${sleepSessions.length} sleep sessions to sync`);

      for (const session of sleepSessions) {
        if (session?.startTime && session?.endTime) {
          try {
            const startTime =
              session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
            const endTime = session.endTime instanceof Date ? session.endTime : new Date(session.endTime);

            if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime()) && endTime > startTime) {
              await upsertSleepSessionFromHealth({
                startTime,
                endTime,
                source: session.source ?? 'health_connect',
                durationMinutes: session.durationMinutes,
                efficiency: session.efficiency,
                stages: session.stages as any,
                metadata: session.metadata,
              });
              result.sleepSessionsSynced++;
            } else {
              logger.warn('[HealthConnect] Skipping invalid historical sleep session', {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              });
            }
          } catch (error: any) {
            const errorMsg = `[HealthConnect] Failed to sync sleep session: ${error?.message || String(error)}`;
            logger.error(errorMsg, error);
            result.errors.push(errorMsg);
          }
        }
      }
    } catch (error: any) {
      const errorMsg = `[HealthConnect] Failed to fetch historical sleep sessions: ${error?.message || String(error)}`;
      logger.error(errorMsg, error);
      result.errors.push(errorMsg);
    }

    try {
      const backfill = await backfillHealthConnectDailyHistoryToSupabase(days);
      result.activityDaysSynced = backfill.activityDaysWritten;
      result.vitalsDaysSynced = backfill.vitalsDaysWritten;
      result.errors.push(...backfill.errors);
    } catch (error: any) {
      const errorMsg = `[HealthConnect] Daily history backfill failed: ${error?.message || String(error)}`;
      logger.error(errorMsg, error);
      result.errors.push(errorMsg);
    }

    if (result.sleepSessionsSynced > 0 || result.activityDaysSynced > 0 || result.vitalsDaysSynced > 0) {
      await setLastSyncISO(new Date().toISOString());
    }

    logger.debug('Historical sync completed', result);
  } catch (error) {
    logger.error('Historical health data sync failed:', error);
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}
