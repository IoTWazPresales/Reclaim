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

export async function syncHealthData(): Promise<{
  sleepSynced: boolean;
  activitySynced: boolean;
  syncedAt: string | null;
}> {
  const result = {
    sleepSynced: false,
    activitySynced: false,
    syncedAt: null as string | null,
  };

  try {
    const service = getUnifiedHealthService();
    if (!service) {
      logger.debug('Health service unavailable; skipping health sync.');
      return result;
    }

    let hasPermissions = false;
    try {
      hasPermissions = await service.hasAllPermissions();
    } catch (error) {
      logger.warn('Failed to verify health permissions:', error);
      hasPermissions = false;
    }

    if (!hasPermissions) {
      logger.debug('Health permissions not granted; skipping health sync.');
      return result;
    }

    const [latestSleep, todayActivity] = await Promise.all([
      service.getLatestSleepSession(),
      service.getTodayActivity(),
    ]);

    if (latestSleep?.startTime && latestSleep?.endTime) {
      try {
        await upsertSleepSessionFromHealth({
          startTime: latestSleep.startTime,
          endTime: latestSleep.endTime,
          source: latestSleep.source ?? 'unknown',
          durationMinutes: latestSleep.durationMinutes,
          efficiency: latestSleep.efficiency,
          stages: latestSleep.stages,
          metadata: latestSleep.metadata,
        });
        result.sleepSynced = true;
      } catch (error) {
        logger.warn('Failed to upsert sleep session from health provider:', error);
      }
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
