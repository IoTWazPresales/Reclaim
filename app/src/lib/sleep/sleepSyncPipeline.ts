/**
 * Sleep Sync Pipeline
 *
 * Centralized flow: collect from all providers → consolidate → write.
 * Provider priority: Health Connect > Apple HealthKit > Samsung Health > Google Fit.
 */
import type { HealthPlatform, SleepSession as HealthSleepSession } from '@/lib/health/types';
import {
  consolidateSleepSessions,
  getSleepNightKey,
  type TaggedSleepSession,
} from './sleepConsolidation';
import { upsertSleepSessionFromHealth, deleteSleepSessionsByKeys } from '@/lib/api';
import { logger } from '@/lib/logger';

function sessionKey(s: { startTime: Date | string; endTime: Date | string }): string {
  const start = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
  const end = s.endTime instanceof Date ? s.endTime : new Date(s.endTime);
  return `${start.toISOString()}|${end.toISOString()}`;
}

export type SleepPipelineInput = {
  sessionsByProvider: Array<{
    provider: 'health_connect' | 'apple_healthkit' | 'samsung_health' | 'google_fit';
    sessions: HealthSleepSession[];
  }>;
  existingSessionKeys: Set<string>;
};

export type SleepPipelineResult = {
  written: number;
  skipped: number;
  supersededDeleted: number;
  supersededKeys: string[];
};

/**
 * Run the sleep sync pipeline: consolidate and write.
 */
export async function runSleepSyncPipeline(input: SleepPipelineInput): Promise<SleepPipelineResult> {
  const { sessionsByProvider, existingSessionKeys } = input;
  const result: SleepPipelineResult = { written: 0, skipped: 0, supersededDeleted: 0, supersededKeys: [] };

  const all: TaggedSleepSession[] = [];
  for (const { provider, sessions } of sessionsByProvider) {
    for (const s of sessions ?? []) {
      if (!s?.startTime || !s?.endTime) continue;
      const start = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
      const end = s.endTime instanceof Date ? s.endTime : new Date(s.endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) continue;
      all.push({ ...s, _provider: provider as HealthPlatform });
    }
  }

  if (all.length === 0) return result;

  const { sessions: consolidated, supersededKeys } = consolidateSleepSessions(all);
  result.supersededKeys = supersededKeys;

  for (const session of consolidated) {
    const startTime = session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
    const endTime = session.endTime instanceof Date ? session.endTime : new Date(session.endTime);
    const key = sessionKey({ startTime, endTime });

    if (existingSessionKeys.has(key)) {
      result.skipped += 1;
      continue;
    }

    try {
      await upsertSleepSessionFromHealth({
        startTime,
        endTime,
        source: session.source,
        durationMinutes: session.durationMinutes,
        efficiency: session.efficiency,
        stages: session.stages,
        metadata: session.metadata,
      });
      existingSessionKeys.add(key);
      result.written += 1;
    } catch (error) {
      logger.warn('[sleepSyncPipeline] Upsert failed', { key, error });
    }
  }

  if (supersededKeys.length > 0) {
    try {
      result.supersededDeleted = await deleteSleepSessionsByKeys(supersededKeys);
      if (result.supersededDeleted > 0) {
        logger.debug('[sleepSyncPipeline] Deleted superseded sessions', {
          count: result.supersededDeleted,
          keys: supersededKeys.slice(0, 5),
        });
      }
    } catch (error) {
      logger.warn('[sleepSyncPipeline] Delete superseded failed', { error });
    }
  }

  return result;
}
