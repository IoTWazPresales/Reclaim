import type { QueryClient } from '@tanstack/react-query';

import type { Med, TrainingSessionRow, SleepSession } from '@/lib/api';
import {
  buildIntegrationsWithStatusFromStoredMap,
  sortIntegrationsWithStatusForUi,
} from '@/lib/health/integrations';
import { getPreferredIntegration } from '@/lib/health/integrationStore';
import { loadHealthIntegrationSnapshot } from '@/lib/localData/healthIntegrationSnapshotRepository';
import { listLocalSleepSessions } from '@/lib/localData/localSleepRepository';
import { initializeLocalDatabase } from '@/lib/localData/database';
import { loadReadCache, readCacheKeys } from '@/lib/localData/readCacheRepository';
import {
  dedupSleepSessionsByNight,
  pickLatestDedupedSleepRow,
  preferredIntegrationToDbSource,
} from '@/lib/sleep/dedupSleepSessionsByNight';
import { mapDbSleepToHealth } from '@/lib/sleep/mapDbSleepToHealth';

function dbRowToLegacyShape(row: SleepSession) {
  const h = mapDbSleepToHealth(row);
  return {
    startTime: h.startTime.toISOString(),
    endTime: h.endTime.toISOString(),
    durationMin: h.durationMinutes ?? 0,
    efficiency: h.efficiency ?? null,
    stages:
      h.stages?.map((seg) => ({
        start: seg.start.toISOString(),
        end: seg.end.toISOString(),
        stage: String(seg.stage ?? 'unknown'),
      })) ?? null,
    metadata: h.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Seeds React Query from durable SQLite so Dashboard/Sleep can paint last-known state
 * before remote refresh completes.
 */
export async function primeLocalFirstReadCaches(qc: QueryClient, userId: string): Promise<void> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return;

  const snap = await loadHealthIntegrationSnapshot(userId);
  if (snap && Object.keys(snap).length > 0) {
    qc.setQueryData(['health:integrations:status'], snap);
    const fromSnap = buildIntegrationsWithStatusFromStoredMap(snap);
    qc.setQueryData(['health-integrations'], sortIntegrationsWithStatusForUi(fromSnap));
  }

  const prefId = await getPreferredIntegration();
  const preferredSource = preferredIntegrationToDbSource(prefId);

  const rows30 = await listLocalSleepSessions(userId, 30);
  if (rows30.length) {
    const latest = pickLatestDedupedSleepRow(rows30, preferredSource);
    if (latest) {
      qc.setQueryData(['dashboard:lastSleep'], mapDbSleepToHealth(latest));
      qc.setQueryData(['sleep:last'], dbRowToLegacyShape(latest));
    }

    const deduped30 = dedupSleepSessionsByNight(rows30, preferredSource);
    qc.setQueryData(
      ['sleep:sessions:30d'],
      deduped30.map((r) => dbRowToLegacyShape(r)),
    );
  }

  const rows7 = await listLocalSleepSessions(userId, 7);
  if (rows7.length) {
    qc.setQueryData(['sleep:sessions:ring'], rows7);
  }

  const cachedMeds = await loadReadCache<Med[]>(userId, readCacheKeys.meds);
  if (cachedMeds && cachedMeds.length > 0) {
    qc.setQueryData(['meds'], cachedMeds);
  }

  const cachedTraining20 = await loadReadCache<TrainingSessionRow[]>(userId, readCacheKeys.trainingSessions(20));
  if (cachedTraining20 && cachedTraining20.length > 0) {
    qc.setQueryData(['training:sessions'], cachedTraining20);
  }
}
