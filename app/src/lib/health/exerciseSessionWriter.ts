/**
 * Health Connect ExerciseSession writer — strength sessions on finish.
 * Graceful when HC unavailable or permission denied.
 */

import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  insertRecords,
  type Permission,
} from 'react-native-health-connect';
import { logger } from '@/lib/logger';
import {
  healthConnectGetActiveEnergyForSessionWindow,
  healthConnectGetHeartRateForSessionWindow,
} from '@/lib/health/healthConnectService';

/** Android Health Connect EXERCISE_TYPE_STRENGTH_TRAINING */
const EXERCISE_TYPE_STRENGTH_TRAINING = 70;

let openSessionStartIso: string | null = null;
let writePermissionRequested = false;

async function ensureHealthConnectReady(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const ok = await initialize();
    return !!ok;
  } catch {
    return false;
  }
}

async function hasExerciseWritePermission(): Promise<boolean> {
  try {
    const granted = (await getGrantedPermissions()) as Permission[];
    return granted.some((p) => p.recordType === 'ExerciseSession' && p.accessType === 'write');
  } catch {
    return false;
  }
}

/** Call when a training session starts (local marker + one-time write permission). */
export async function markTrainingSessionStartForHealthConnect(): Promise<void> {
  openSessionStartIso = new Date().toISOString();
  if (Platform.OS !== 'android') return;
  if (writePermissionRequested) return;
  const ready = await ensureHealthConnectReady();
  if (!ready) return;
  try {
    await requestPermission([{ accessType: 'write', recordType: 'ExerciseSession' }]);
    writePermissionRequested = true;
  } catch (e) {
    logger.debug('[ExerciseSessionWriter] write permission request skipped', e);
  }
}

export type ExerciseSessionWriteResult = {
  wrote: boolean;
  activeCaloriesKcal?: number;
  avgHeartRateBpm?: number;
};

/**
 * Write a completed strength-training ExerciseSession and read back energy/HR for the window.
 */
export async function writeTrainingExerciseSessionToHealthConnect(
  startedAtIso: string,
  endedAtIso: string,
): Promise<ExerciseSessionWriteResult> {
  openSessionStartIso = null;
  if (Platform.OS !== 'android') return { wrote: false };

  const ready = await ensureHealthConnectReady();
  if (!ready) return { wrote: false };

  const canWrite = await hasExerciseWritePermission();
  if (!canWrite) return { wrote: false };

  try {
    await insertRecords([
      {
        recordType: 'ExerciseSession',
        exerciseType: EXERCISE_TYPE_STRENGTH_TRAINING,
        startTime: startedAtIso,
        endTime: endedAtIso,
        title: 'Reclaim strength training',
      },
    ]);
  } catch (e) {
    logger.warn('[ExerciseSessionWriter] insertRecords failed', e);
    return { wrote: false };
  }

  const [energy, hr] = await Promise.all([
    healthConnectGetActiveEnergyForSessionWindow(startedAtIso, endedAtIso),
    healthConnectGetHeartRateForSessionWindow(startedAtIso, endedAtIso),
  ]);

  return {
    wrote: true,
    activeCaloriesKcal: energy.activeCaloriesKcal ?? undefined,
    avgHeartRateBpm: hr.avgHeartRateBpm ?? undefined,
  };
}

/** Prefer explicit start; fall back to in-memory marker from session start. */
export function consumeOpenTrainingSessionStart(): string | null {
  const v = openSessionStartIso;
  openSessionStartIso = null;
  return v;
}

export function formatSessionHealthMetricsLine(summary: {
  activeCaloriesKcal?: number | null;
  avgHeartRateBpm?: number | null;
  durationMinutes?: number | null;
}): string | null {
  const parts: string[] = [];
  if (summary.activeCaloriesKcal != null && summary.activeCaloriesKcal > 0) {
    parts.push(`${Math.round(summary.activeCaloriesKcal)} kcal`);
  }
  if (summary.avgHeartRateBpm != null && summary.avgHeartRateBpm > 0) {
    parts.push(`avg ${summary.avgHeartRateBpm} bpm`);
  }
  if (summary.durationMinutes != null && summary.durationMinutes > 0) {
    parts.push(`${summary.durationMinutes} min`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
