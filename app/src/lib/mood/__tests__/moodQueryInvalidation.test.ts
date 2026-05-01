import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateMoodAndInsightQueries, MOOD_CANONICAL_QUERY_KEY } from '../moodQueryInvalidation';

describe('invalidateMoodAndInsightQueries', () => {
  it('invalidates mood and insight-related query keys without global defaults', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateMoodAndInsightQueries(qc);

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(MOOD_CANONICAL_QUERY_KEY);
    expect(keys.some((k) => Array.isArray(k) && k[0] === 'mood_checkins:30')).toBe(true);
    expect(keys.some((k) => Array.isArray(k) && k[0] === 'insights:feedback:latest250')).toBe(true);
    spy.mockRestore();
  });
});
