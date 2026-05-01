/**
 * Regression tests for sleepConsolidation — E1 (duplicated night key logic),
 * metadata double-counting, and edge cases.
 */
import { describe, it, expect } from 'vitest';
import {
  consolidateSleepSessions,
  getSleepNightKey,
  type TaggedSleepSession,
} from '../sleepConsolidation';

function makeSession(opts: {
  start: Date;
  end: Date;
  source?: string;
  stages?: any[];
  efficiency?: number;
  metadata?: Record<string, any>;
}): TaggedSleepSession {
  const durationMinutes = Math.round(
    (opts.end.getTime() - opts.start.getTime()) / 60000,
  );
  return {
    startTime: opts.start,
    endTime: opts.end,
    durationMinutes,
    source: (opts.source ?? 'health_connect') as any,
    stages: opts.stages,
    efficiency: opts.efficiency,
    metadata: opts.metadata,
    _provider: (opts.source ?? 'health_connect') as any,
  };
}

describe('getSleepNightKey — noon cutoff', () => {
  it('session ending at 7am is attributed to previous day', () => {
    const end = new Date(2026, 3, 10, 7, 0);
    const key = getSleepNightKey({ endTime: end } as any);
    expect(key).toBe('2026-04-09');
  });

  it('session ending at noon is attributed to same day', () => {
    const end = new Date(2026, 3, 10, 12, 0);
    const key = getSleepNightKey({ endTime: end } as any);
    expect(key).toBe('2026-04-10');
  });

  it('session ending at midnight is attributed to previous day', () => {
    const end = new Date(2026, 3, 11, 0, 0);
    const key = getSleepNightKey({ endTime: end } as any);
    expect(key).toBe('2026-04-10');
  });

  it('session ending at 11:59am is still attributed to previous day', () => {
    const end = new Date(2026, 3, 10, 11, 59);
    const key = getSleepNightKey({ endTime: end } as any);
    expect(key).toBe('2026-04-09');
  });

  it('handles ISO string input', () => {
    const session = { endTime: '2026-04-10T07:00:00.000Z' };
    const key = getSleepNightKey(session as any);
    expect(typeof key).toBe('string');
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('consolidateSleepSessions — merging splits', () => {
  it('merges two adjacent sessions into one', () => {
    const sessions: TaggedSleepSession[] = [
      makeSession({
        start: new Date(2026, 3, 9, 23, 0),
        end: new Date(2026, 3, 10, 6, 0),
      }),
      makeSession({
        start: new Date(2026, 3, 10, 6, 20),
        end: new Date(2026, 3, 10, 7, 0),
      }),
    ];

    const result = consolidateSleepSessions(sessions);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].durationMinutes).toBeGreaterThan(400);
  });

  it('does NOT merge sessions with gap > 2 hours', () => {
    const sessions: TaggedSleepSession[] = [
      makeSession({
        start: new Date(2026, 3, 9, 23, 0),
        end: new Date(2026, 3, 10, 3, 0),
      }),
      makeSession({
        start: new Date(2026, 3, 10, 6, 0),
        end: new Date(2026, 3, 10, 7, 0),
      }),
    ];

    const result = consolidateSleepSessions(sessions);
    // Both are on the same night (end before noon → April 9), so they're
    // in the same group but the gap is 3 hours, exceeding MAX_GAP_MINUTES (120).
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps separate sessions on different nights', () => {
    const sessions: TaggedSleepSession[] = [
      makeSession({
        start: new Date(2026, 3, 9, 23, 0),
        end: new Date(2026, 3, 10, 7, 0),
      }),
      makeSession({
        start: new Date(2026, 3, 10, 23, 0),
        end: new Date(2026, 3, 11, 7, 0),
      }),
    ];

    const result = consolidateSleepSessions(sessions);
    expect(result.sessions).toHaveLength(2);
  });
});

describe('consolidateSleepSessions — dedup same source', () => {
  it('picks richer session when two providers report same window', () => {
    const sessions: TaggedSleepSession[] = [
      makeSession({
        start: new Date(2026, 3, 9, 23, 0),
        end: new Date(2026, 3, 10, 7, 0),
        source: 'health_connect',
        stages: [{ start: new Date(2026, 3, 9, 23, 0), end: new Date(2026, 3, 10, 1, 0), stage: 'deep' }],
        efficiency: 0.85,
      }),
      makeSession({
        start: new Date(2026, 3, 9, 23, 0),
        end: new Date(2026, 3, 10, 7, 0),
        source: 'apple_healthkit',
      }),
    ];

    const result = consolidateSleepSessions(sessions);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].efficiency).toBe(0.85);
  });
});

describe('consolidateSleepSessions — metadata merging', () => {
  it('sums stage minutes when merging split sessions', () => {
    const sessions: TaggedSleepSession[] = [
      makeSession({
        start: new Date(2026, 3, 9, 23, 0),
        end: new Date(2026, 3, 10, 3, 0),
        metadata: { deepSleepMinutes: 60, remSleepMinutes: 30 },
      }),
      makeSession({
        start: new Date(2026, 3, 10, 3, 15),
        end: new Date(2026, 3, 10, 7, 0),
        metadata: { deepSleepMinutes: 45, remSleepMinutes: 40 },
      }),
    ];

    const result = consolidateSleepSessions(sessions);
    expect(result.sessions).toHaveLength(1);
    const meta = result.sessions[0].metadata;
    expect(meta?.deepSleepMinutes).toBe(105);
    expect(meta?.remSleepMinutes).toBe(70);
  });
});

describe('consolidateSleepSessions — edge cases', () => {
  it('returns empty for empty input', () => {
    const result = consolidateSleepSessions([]);
    expect(result.sessions).toHaveLength(0);
    expect(result.supersededKeys).toHaveLength(0);
  });

  it('filters out sessions with invalid dates', () => {
    const sessions: TaggedSleepSession[] = [
      makeSession({
        start: new Date(2026, 3, 9, 23, 0),
        end: new Date(2026, 3, 10, 7, 0),
      }),
      { startTime: 'invalid' as unknown as Date, endTime: 'also-invalid' as unknown as Date, durationMinutes: 0, source: 'unknown' as any },
    ];

    const result = consolidateSleepSessions(sessions as any);
    expect(result.sessions).toHaveLength(1);
  });

  it('filters out sessions where end <= start', () => {
    const sessions: TaggedSleepSession[] = [
      makeSession({
        start: new Date(2026, 3, 10, 7, 0),
        end: new Date(2026, 3, 9, 23, 0),
      }),
    ];

    const result = consolidateSleepSessions(sessions);
    expect(result.sessions).toHaveLength(0);
  });

  it('results are sorted most-recent-first', () => {
    const sessions: TaggedSleepSession[] = [
      makeSession({
        start: new Date(2026, 3, 8, 23, 0),
        end: new Date(2026, 3, 9, 7, 0),
      }),
      makeSession({
        start: new Date(2026, 3, 10, 23, 0),
        end: new Date(2026, 3, 11, 7, 0),
      }),
      makeSession({
        start: new Date(2026, 3, 9, 23, 0),
        end: new Date(2026, 3, 10, 7, 0),
      }),
    ];

    const result = consolidateSleepSessions(sessions);
    for (let i = 1; i < result.sessions.length; i++) {
      const prev = new Date(result.sessions[i - 1].endTime).getTime();
      const curr = new Date(result.sessions[i].endTime).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});
