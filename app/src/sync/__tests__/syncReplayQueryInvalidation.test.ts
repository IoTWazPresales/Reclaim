import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  invalidateQueriesAfterMedDoseReplay,
  invalidateQueriesAfterTrainingOfflineReplay,
  isMedDoseLogRelatedQueryKey,
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
    const predCalls = spy.mock.calls.filter((c) => typeof (c[0] as any)?.predicate === 'function');
    expect(predCalls.length).toBeGreaterThan(0);
    const pred = (predCalls[0][0] as any).predicate;
    expect(pred({ queryKey: ['med_logs:30', 'uuid-1'] })).toBe(true);
    expect(pred({ queryKey: ['meds:logs:30d'] })).toBe(true);
    expect(pred({ queryKey: ['meds'] })).toBe(false);
    spy.mockRestore();
  });

  it('isMedDoseLogRelatedQueryKey covers detail and rolling-window keys', () => {
    expect(isMedDoseLogRelatedQueryKey(['med_logs:30', 'x'])).toBe(true);
    expect(isMedDoseLogRelatedQueryKey(['meds:logs:7d'])).toBe(true);
    expect(isMedDoseLogRelatedQueryKey(['meds:logs:30d'])).toBe(true);
    expect(isMedDoseLogRelatedQueryKey(['meds'])).toBe(false);
    expect(isMedDoseLogRelatedQueryKey(['timeline:meds'])).toBe(false);
  });

  it('invalidates training list/analytics and active session caches after offline replay success > 0', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateQueriesAfterTrainingOfflineReplay(qc, 0);
    expect(spy).not.toHaveBeenCalled();
    await invalidateQueriesAfterTrainingOfflineReplay(qc, 1);
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(3);
    const keys = spy.mock.calls.map((c) => (c[0] as any)?.queryKey?.[0]);
    expect(keys).toContain('training:sessions');
    expect(keys).toContain('training:sessions:analytics');
    expect(keys).toContain('training:set_logs');
    const hasSessionPredicate = spy.mock.calls.some(
      (c) => typeof (c[0] as any)?.predicate === 'function',
    );
    expect(hasSessionPredicate).toBe(true);
    spy.mockRestore();
  });
});
