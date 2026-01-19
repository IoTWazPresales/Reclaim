// C:\Reclaim\app\src\lib\sync.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import {
  getCurrentUser,
  listMood,
  listMeditations,
  upsertSleepSessionFromHealth,
  upsertDailyActivityFromHealth,
  upsertVitalsDailyFromHealth,
} from '@/lib/api';
import type { ActivitySample, SleepSession as HealthSleepSession } from '@/lib/health/types';
import {
  getGoogleFitProvider,
  googleFitGetLatestSleepSession,
  googleFitGetTodayActivity,
  googleFitHasPermissions,
} from '@/lib/health/googleFitService';
import {
  healthConnectGetSleepSessions,
  healthConnectGetTodayActivity,
  healthConnectGetTodayVitals,
  healthConnectHasPermissions,
  healthConnectIsAvailable,
} from '@/lib/health/healthConnectService';
import {
  samsungIsAvailable,
  samsungRequestPermissions,
  samsungReadSleep,
} from '@/lib/health/samsungHealthService';
import { logger } from '@/lib/logger';

const LAST_SYNC_KEY = '@reclaim/sync/last';

export async function getLastSyncISO(): Promise<string | null> {
  return (await AsyncStorage.getItem(LAST_SYNC_KEY)) || null;
}
async function setLastSyncISO(iso: string) {
  await AsyncStorage.setItem(LAST_SYNC_KEY, iso);
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
  await setLastSyncISO(now);
  return { moodUpserted: moodRows.length, meditationUpserted: medRows.length };
}

function mapHealthSleepSource(session: HealthSleepSession | null): HealthSleepSession | null {
  return session;
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function getExistingSleepDateKeys(start: Date, end: Date): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('start_time,end_time')
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString());

  if (error) {
    logger.warn('Failed to fetch existing sleep sessions for dedupe:', error);
    return new Set();
  }

  const keys = new Set<string>();
  for (const row of data ?? []) {
    const base = row?.end_time ?? row?.start_time;
    if (!base) continue;
    const dt = new Date(base);
    const key = toDateKey(dt);
    keys.add(key);
  }
  return keys;
}

function sleepDateKeyFromSession(session: { startTime?: Date; endTime?: Date }): string | null {
  if (!session?.startTime && !session?.endTime) return null;
  const base = session.endTime ?? session.startTime;
  if (!base) return null;
  return toDateKey(base);
}

export async function importSamsungHistory(days = 90): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const result = { imported: 0, skipped: 0, errors: [] as string[] };

  try {
    if (!(await samsungIsAvailable())) {
      result.errors.push('Samsung Health not available');
      return result;
    }
    const granted = await samsungRequestPermissions();
    if (!granted) {
      result.errors.push('Samsung Health permissions not granted');
      return result;
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const existing = await getExistingSleepDateKeys(start, end);

    const sessions = await samsungReadSleep(start, end);
    if (!sessions.length) {
      logger.debug('[SamsungHealth] No sleep rows returned');
      return result;
    }

    logger.debug('[SamsungHealth] fetched sessions', { count: sessions.length });

    for (const session of sessions) {
      const key = sleepDateKeyFromSession(session);
      if (!key) {
        result.errors.push('Missing start/end on session');
        continue;
      }
      logger.debug('[SamsungHealth] sleepDateKey', { key });
      if (existing.has(key)) {
        result.skipped += 1;
        continue;
      }
      try {
        const startTime = session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
        const endTime = session.endTime instanceof Date ? session.endTime : new Date(session.endTime);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || endTime <= startTime) {
          result.errors.push(`Invalid session times for key ${key}`);
          continue;
        }
        await upsertSleepSessionFromHealth({
          startTime,
          endTime,
          source: 'samsung_health',
          durationMinutes: session.durationMinutes,
          efficiency: session.efficiency,
          stages: session.stages,
          metadata: session.metadata,
        });
        existing.add(key);
        result.imported += 1;
      } catch (e: any) {
        result.errors.push(e?.message ?? String(e));
      }
    }
  } catch (e: any) {
    result.errors.push(e?.message ?? String(e));
  }

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

type SyncDebugInfo = {
  serviceAvailable: boolean;
  hasPermissions: boolean;
  sleepDataFound: boolean;
  sleepDataDetails?: SleepDataDetails;
  saveError?: string;
};

export async function syncHealthData(): Promise<{
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
    },
  };

  try {
    // Establish a window for deduping sleep inserts
    const endRange = new Date();
    const startRange = new Date();
    startRange.setDate(startRange.getDate() - 30);
    const existingDateKeys = await getExistingSleepDateKeys(startRange, endRange);

    // Provider priority guardrails: if Health Connect successfully writes daily aggregates,
    // don't overwrite them with Google Fit later in this function.
    let hcActivitySaved = false;
    let hcVitalsSaved = false;

    // ---------- Health Connect sleep sync (read-only) ----------
    try {
      const hcAvailable = await healthConnectIsAvailable();
      if (hcAvailable) {
        const hcHasPerms = await healthConnectHasPermissions();
        if (hcHasPerms) {
          const hcSessions = await healthConnectGetSleepSessions(30);
          for (const session of hcSessions) {
            if (!session?.startTime || !session?.endTime) continue;
            const startTime =
              session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
            const endTime =
              session.endTime instanceof Date ? session.endTime : new Date(session.endTime);
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || endTime <= startTime) {
              continue;
            }
            const dayKey = toDateKey(startTime);
            if (existingDateKeys.has(dayKey)) {
              continue;
            }
            try {
              await upsertSleepSessionFromHealth({
                startTime,
                endTime,
                source: session.source ?? 'health_connect',
                durationMinutes: session.durationMinutes,
                efficiency: session.efficiency,
                stages: session.stages,
                metadata: session.metadata,
              });
              existingDateKeys.add(dayKey);
              result.sleepSynced = true;
            } catch (error: any) {
              logger.warn('Failed to upsert HC sleep session:', error);
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Health Connect sleep sync skipped due to error:', error);
    }

    // ---------- Health Connect activity + vitals (daily aggregates) ----------
    try {
      const hcAvailable = await healthConnectIsAvailable();
      if (hcAvailable) {
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

    const provider = getGoogleFitProvider();
    const available = await provider.isAvailable();
    result.debug!.serviceAvailable = available;
    if (!available) {
      logger.debug('Google Fit unavailable; skipping health sync.');
      return result;
    }

    let hasPermissions = false;
    try {
      hasPermissions = await googleFitHasPermissions();
      result.debug!.hasPermissions = hasPermissions;
    } catch (error) {
      logger.warn('Failed to verify Google Fit permissions:', error);
      hasPermissions = false;
      result.debug!.hasPermissions = false;
    }

    if (!hasPermissions) {
      logger.debug('Google Fit permissions not granted; skipping health sync.');
      logger.warn('⚠️ SYNC BLOCKED: Google Fit permissions not granted.');
      return result;
    }

    const [latestSleep, todayActivity] = await Promise.all([
      googleFitGetLatestSleepSession(),
      googleFitGetTodayActivity(),
    ]);

    // Validate and sync latest sleep session
    if (latestSleep?.startTime && latestSleep?.endTime) {
      // Validate data before attempting to save
      const startTime = latestSleep.startTime instanceof Date ? latestSleep.startTime : new Date(latestSleep.startTime);
      const endTime = latestSleep.endTime instanceof Date ? latestSleep.endTime : new Date(latestSleep.endTime);
      
      // Sanity checks
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        logger.warn('Invalid sleep session dates:', { startTime, endTime });
        result.debug!.sleepDataFound = false;
        result.debug!.saveError = 'Invalid date format in sleep session';
      } else if (endTime <= startTime) {
        logger.warn('Invalid sleep session: end time is before or equal to start time', {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
        result.debug!.sleepDataFound = false;
        result.debug!.saveError = 'End time must be after start time';
      } else {
        const dayKey = toDateKey(startTime);
        if (existingDateKeys.has(dayKey)) {
          logger.debug('Skipping sleep session; date already synced', { dayKey });
          result.debug!.sleepDataFound = true;
          result.debug!.sleepDataDetails = {
            hasStartTime: !!latestSleep.startTime,
            hasEndTime: !!latestSleep.endTime,
            durationMinutes: latestSleep.durationMinutes,
            source: latestSleep.source,
            hasStages: !!latestSleep.stages?.length,
            hasMetadata: !!latestSleep.metadata,
          };
        } else {
        result.debug!.sleepDataFound = true;
        result.debug!.sleepDataDetails = {
          hasStartTime: !!latestSleep.startTime,
          hasEndTime: !!latestSleep.endTime,
          durationMinutes: latestSleep.durationMinutes,
          source: latestSleep.source,
          hasStages: !!latestSleep.stages?.length,
          hasMetadata: !!latestSleep.metadata,
        };
        
          try {
            logger.debug('Attempting to save sleep session to database...', {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              source: latestSleep.source,
              durationMinutes: latestSleep.durationMinutes,
            });
            
            await upsertSleepSessionFromHealth({
              startTime,
              endTime,
              source: latestSleep.source ?? 'unknown',
              durationMinutes: latestSleep.durationMinutes,
              efficiency: latestSleep.efficiency,
              stages: latestSleep.stages,
              metadata: latestSleep.metadata,
            });
            
            logger.debug('✅ Sleep session saved successfully to sleep_sessions table', {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              source: latestSleep.source,
            });
            existingDateKeys.add(dayKey);
            result.sleepSynced = true;
          } catch (error: any) {
            const errorMsg = error?.message ?? String(error);
            logger.error('❌ FAILED to upsert sleep session from health provider:', error);
            logger.error('Error details:', {
              message: errorMsg,
              code: error?.code,
              details: error?.details,
              hint: error?.hint,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              source: latestSleep.source,
            });
            result.debug!.saveError = errorMsg;
            // Don't throw - let function continue to return debug info
          }
        }
      }
    } else {
      logger.debug('No sleep data found or missing startTime/endTime', {
        hasSleep: !!latestSleep,
        hasStartTime: !!latestSleep?.startTime,
        hasEndTime: !!latestSleep?.endTime,
        startTimeType: latestSleep?.startTime ? typeof latestSleep.startTime : 'null',
        endTimeType: latestSleep?.endTime ? typeof latestSleep.endTime : 'null',
      });
      result.debug!.sleepDataFound = false;
    }

    if (!hcActivitySaved && todayActivity?.timestamp) {
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

    if (!hcVitalsSaved) {
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

    if (result.sleepSynced || result.activitySynced) {
      const syncedAt = new Date().toISOString();
      await setLastSyncISO(syncedAt);
      result.syncedAt = syncedAt;
    }
  } catch (error) {
    logger.warn('syncHealthData encountered an error:', error);
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
    const provider = getGoogleFitProvider();
    const available = await provider.isAvailable();
    if (!available) {
      result.errors.push('Google Fit unavailable');
      return result;
    }

    const hasPermissions = await googleFitHasPermissions();
    if (!hasPermissions) {
      result.errors.push('Google Fit permissions not granted');
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

    // Sync sleep sessions
    try {
      const sleepSessions = await provider.getSleepSessions(startDate, endDate);
      logger.debug(`Found ${sleepSessions.length} sleep sessions to sync`);
      
      for (const session of sleepSessions) {
        if (session?.startTime && session?.endTime) {
          try {
            const startTime = session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
            const endTime = session.endTime instanceof Date ? session.endTime : new Date(session.endTime);
            
            // Validate before saving
            if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime()) && endTime > startTime) {
              logger.debug('Saving sleep session to database:', {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                source: session.source,
                durationMinutes: session.durationMinutes,
              });
              
              await upsertSleepSessionFromHealth({
                startTime,
                endTime,
                source: session.source ?? 'unknown',
                durationMinutes: session.durationMinutes,
                efficiency: session.efficiency,
                stages: session.stages,
                metadata: session.metadata,
              });
              
              logger.debug('✅ Sleep session saved successfully');
              result.sleepSessionsSynced++;
            } else {
              logger.warn('Skipping invalid sleep session:', {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                isValidStart: !isNaN(startTime.getTime()),
                isValidEnd: !isNaN(endTime.getTime()),
                endAfterStart: endTime > startTime,
              });
            }
          } catch (error: any) {
            const errorMsg = `Failed to sync sleep session: ${error?.message || String(error)}`;
            logger.error(errorMsg, error);
            logger.error('Sleep session sync error details:', {
              message: error?.message,
              code: error?.code,
              details: error?.details,
              hint: error?.hint,
              startTime: session.startTime,
              endTime: session.endTime,
              source: session.source,
            });
            result.errors.push(errorMsg);
          }
        }
      }
    } catch (error: any) {
      const errorMsg = `Failed to fetch sleep sessions: ${error?.message || String(error)}`;
      logger.error(errorMsg, error);
      result.errors.push(errorMsg);
    }

    // Sync activity data (daily summaries)
    try {
      const activitySamples = await provider.getActivity(startDate, endDate);
      logger.debug(`Found ${activitySamples.length} activity samples to sync`);

      const activityByDate = new Map<string, ActivitySample>();
      for (const sample of activitySamples) {
        if (sample?.timestamp) {
          const date = new Date(sample.timestamp);
          date.setHours(0, 0, 0, 0);
          const dateKey = date.toISOString().split('T')[0];
          const existing = activityByDate.get(dateKey);
          if (!existing || sample.timestamp > existing.timestamp) {
            activityByDate.set(dateKey, sample);
          }
        }
      }

      for (const [dateKey, sample] of activityByDate.entries()) {
        try {
          await upsertDailyActivityFromHealth({
            date: sample.timestamp,
            steps: sample.steps ?? null,
            activeEnergy: sample.activeEnergyBurned ?? null,
            source: sample.source as any,
          });
          result.activityDaysSynced++;
        } catch (error: any) {
          const errorMsg = `Failed to sync activity for ${dateKey}: ${error?.message || String(error)}`;
          logger.error(errorMsg, error);
          result.errors.push(errorMsg);
        }
      }
    } catch (error: any) {
      const errorMsg = `Failed to fetch activity data: ${error?.message || String(error)}`;
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
