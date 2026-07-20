/**
 * Backfill reclaim_signal_ledger from domain history (mood / sleep / training).
 */
import { listMoodCheckinsDays, listSleepSessionsForInsights, listTrainingSessions } from '@/lib/api';
import { upsertSignalLedgerRows } from '@/lib/localData/signalLedgerRepository';
import {
  buildHistoricalLedgerByDay,
  type MoodLike,
  type SleepLike,
  type TrainingLike,
} from '@/lib/localData/signalLedgerBackfillCore';
import { logger } from '@/lib/logger';

export {
  buildHistoricalLedgerByDay,
  type MoodLike,
  type SleepLike,
  type TrainingLike,
} from '@/lib/localData/signalLedgerBackfillCore';

/**
 * Pull recent domain history and upsert into the local signal ledger.
 * Safe to call on every Insights refresh (ON CONFLICT upsert).
 */
export async function backfillSignalLedgerFromHistory(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const [moods, sleeps, trainings] = await Promise.all([
      listMoodCheckinsDays(30).catch(() => []),
      listSleepSessionsForInsights(30).catch(() => []),
      listTrainingSessions(40).catch(() => []),
    ]);

    const byDay = buildHistoricalLedgerByDay({
      moods: moods as MoodLike[],
      sleeps: sleeps as SleepLike[],
      trainings: trainings as TrainingLike[],
    });

    let written = 0;
    for (const [day, rows] of byDay) {
      written += await upsertSignalLedgerRows(userId, day, rows);
    }
    if (__DEV__) {
      logger.debug('[signalLedgerBackfill] wrote', { days: byDay.size, rows: written });
    }
    return written;
  } catch (e) {
    logger.debug('[signalLedgerBackfill] failed', (e as Error)?.message);
    return 0;
  }
}
