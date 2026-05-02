import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  invalidateQueriesAfterMedDoseReplay,
  invalidateQueriesAfterTrainingOfflineReplay,
} from '@/lib/sync/postReplayQueryInvalidation';

describe('post-replay query invalidation (device-first + server ack)', () => {
  it('invalidates med-related keys only after med queue replay count > 0', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateQueriesAfterMedDoseReplay(qc, 0);
    expect(spy).not.toHaveBeenCalled();
    await invalidateQueriesAfterMedDoseReplay(qc, 2);
    expect(spy).toHaveBeenCalled();
    const keys = spy.mock.calls.map((c) => c[0]);
    expect(keys.some((k) => (k as any)?.queryKey?.[0] === 'meds')).toBe(true);
    expect(keys.some((k) => (k as any)?.queryKey?.[0] === 'meds:logs:7d')).toBe(true);
    spy.mockRestore();
  });

  it('invalidates training list/analytics keys only after offline replay success > 0', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateQueriesAfterTrainingOfflineReplay(qc, 0);
    expect(spy).not.toHaveBeenCalled();
    await invalidateQueriesAfterTrainingOfflineReplay(qc, 1);
    expect(spy).toHaveBeenCalledTimes(2);
    const keys = spy.mock.calls.map((c) => (c[0] as any)?.queryKey?.[0]);
    expect(keys).toContain('training:sessions');
    expect(keys).toContain('training:sessions:analytics');
    spy.mockRestore();
  });
});
