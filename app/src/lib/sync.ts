// C:\Reclaim\app\src\lib\sync.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import {
  getCurrentUser,
  listMood,
  listMeditations,
  upsertSleepSessionFromHealth,
  upsertDailyActivityFromHealth,
} from '@/lib/api';
import { getUnifiedHealthService } from '@/lib/health';
import type { ActivitySample, SleepSession as HealthSleepSession } from '@/lib/health/types';
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
    const service = getUnifiedHealthService();
    if (!service) {
      logger.debug('Health service unavailable; skipping health sync.');
      result.debug!.serviceAvailable = false;
      return result;
    }
    result.debug!.serviceAvailable = true;

    let hasPermissions = false;
    try {
      hasPermissions = await service.hasAllPermissions();
      result.debug!.hasPermissions = hasPermissions;
    } catch (error) {
      logger.warn('Failed to verify health permissions:', error);
      hasPermissions = false;
      result.debug!.hasPermissions = false;
    }

    if (!hasPermissions) {
      logger.debug('Health permissions not granted; skipping health sync.');
      logger.warn('⚠️ SYNC BLOCKED: Health permissions not granted. Connect a provider and grant permissions.');
      return result;
    }

    const [latestSleep, todayActivity] = await Promise.all([
      service.getLatestSleepSession(),
      service.getTodayActivity(),
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

    if (todayActivity?.timestamp) {
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
    const service = getUnifiedHealthService();
    if (!service) {
      result.errors.push('Health service unavailable');
      return result;
    }

    const hasPermissions = await service.hasAllPermissions();
    if (!hasPermissions) {
      result.errors.push('Health permissions not granted');
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
      const sleepSessions = await service.getSleepSessions(startDate, endDate);
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
      if (!service || typeof service.getActivityRange !== 'function') {
        logger.warn('Service or getActivityRange method not available');
        result.errors.push('Activity service not available');
      } else {
        const activitySamples = await service.getActivityRange(startDate, endDate);
        logger.debug(`Found ${activitySamples.length} activity samples to sync`);
      
        // Group by date and sync daily summaries
        const activityByDate = new Map<string, ActivitySample>();
        for (const sample of activitySamples) {
          if (sample?.timestamp) {
            const date = new Date(sample.timestamp);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            
            // Keep the most recent sample for each day
            const existing = activityByDate.get(dateKey);
            if (!existing || (sample.timestamp > existing.timestamp)) {
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
