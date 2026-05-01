import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  shouldInvalidateAfterHealthSyncResult,
  invalidateHealthSyncSummaryQueries,
} from '../healthSyncQueryInvalidation';

describe('healthSyncQueryInvalidation', () => {
  it('shouldInvalidate matches Dashboard policy', () => {
    expect(shouldInvalidateAfterHealthSyncResult({ sleepSynced: false, activitySynced: false })).toBe(false);
    expect(shouldInvalidateAfterHealthSyncResult({ sleepSynced: true, activitySynced: false })).toBe(true);
    expect(
      shouldInvalidateAfterHealthSyncResult({
        sleepSynced: false,
        activitySynced: false,
        debug: { sleepSyncStatus: 'write_failed' },
      }),
    ).toBe(true);
  });

  it('invalidateHealthSyncSummaryQueries no-ops when policy false', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateHealthSyncSummaryQueries(qc, { sleepSynced: false, activitySynced: false });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('invalidateHealthSyncSummaryQueries hits sleep summary keys when synced', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateHealthSyncSummaryQueries(qc, { sleepSynced: true, activitySynced: false });
    const keys = spy.mock.calls.map((c) => (c[0] as any)?.queryKey?.[0]);
    expect(keys).toContain('dashboard:lastSleep');
    expect(keys).toContain('sleep:sessions:ring');
    spy.mockRestore();
  });
});
