/**
 * Upsert arbitrary ledger rows for a calendar day (backfill + live snapshot).
 */
import type { InsightContext } from '@/lib/insights/InsightEngine';
import { initializeLocalDatabase, requireLocalDatabase } from '@/lib/localData/database';
import {
  flattenInsightContextToLedgerRows,
  type SignalLedgerRow,
} from '@/lib/localData/signalLedgerFlatten';
import { logger } from '@/lib/logger';
import { formatLocalDateYYYYMMDD } from '@/lib/training/dateUtils';

export type { SignalLedgerRow };
export { flattenInsightContextToLedgerRows, SIGNAL_LEDGER_FACTORS } from '@/lib/localData/signalLedgerFlatten';

export type SignalLedgerPoint = {
  dayDate: string;
  factor: string;
  value: number;
  source: string | null;
  updatedAt: string;
};

export async function upsertSignalLedgerRows(
  userId: string,
  dayDate: string,
  rows: SignalLedgerRow[],
): Promise<number> {
  if (!userId || rows.length === 0) return 0;
  const init = await initializeLocalDatabase();
  if (!init.ok) return 0;
  const db = requireLocalDatabase();
  const now = new Date().toISOString();
  let written = 0;
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `INSERT INTO reclaim_signal_ledger (user_id, day_date, factor, value, source, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, day_date, factor) DO UPDATE SET
           value = excluded.value,
           source = excluded.source,
           updated_at = excluded.updated_at`,
        [userId, dayDate, row.factor, row.value, row.source, now],
      );
      written += 1;
    }
  });
  return written;
}

export async function writeSignalLedgerSnapshot(
  userId: string,
  context: InsightContext,
  dayDate: string = formatLocalDateYYYYMMDD(new Date()),
): Promise<number> {
  return upsertSignalLedgerRows(userId, dayDate, flattenInsightContextToLedgerRows(context));
}

export async function readSignalLedgerSeries(
  userId: string,
  factor: string,
  days: number,
): Promise<SignalLedgerPoint[]> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return [];
  const db = requireLocalDatabase();
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, days));
  const sinceDay = formatLocalDateYYYYMMDD(since);

  try {
    const rows = await db.getAllAsync<{
      day_date: string;
      factor: string;
      value: number;
      source: string | null;
      updated_at: string;
    }>(
      `SELECT day_date, factor, value, source, updated_at
       FROM reclaim_signal_ledger
       WHERE user_id = ? AND factor = ? AND day_date >= ?
       ORDER BY day_date ASC`,
      [userId, factor, sinceDay],
    );
    return (rows ?? []).map((r) => ({
      dayDate: r.day_date,
      factor: r.factor,
      value: r.value,
      source: r.source,
      updatedAt: r.updated_at,
    }));
  } catch (e) {
    logger.debug('[readSignalLedgerSeries] failed', (e as Error)?.message);
    return [];
  }
}

export async function readSignalLedgerMultiSeries(
  userId: string,
  factors: string[],
  days: number,
): Promise<Record<string, SignalLedgerPoint[]>> {
  const result: Record<string, SignalLedgerPoint[]> = {};
  for (const f of factors) {
    result[f] = await readSignalLedgerSeries(userId, f, days);
  }
  return result;
}
