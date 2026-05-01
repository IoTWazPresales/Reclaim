/**
 * Regression tests for dedupSleepSessionsByNight — E1 (parity with
 * sleepConsolidation.getSleepNightKey), nap handling, preferred source.
 */
import { describe, it, expect } from 'vitest';
import {
  dedupSleepSessionsByNight,
  sleepNightKey,
  pickLatestDedupedSleepRow,
} from '../dedupSleepSessionsByNight';

type Row = {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  source: string;
  session_type?: string;
  stages?: any;
};

function makeRow(opts: {
  start: string;
  end: string;
  duration?: number;
  source?: string;
  session_type?: string;
  stages?: any;
}): Row {
  return {
    start_time: opts.start,
    end_time: opts.end,
    duration_minutes: opts.duration ?? 480,
    source: opts.source ?? 'healthconnect',
    session_type: opts.session_type,
    stages: opts.stages,
  };
}

describe('sleepNightKey', () => {
  it('rolls back before-noon end times to previous day', () => {
    expect(sleepNightKey('2026-04-10T07:00:00.000Z')).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('returns raw string for invalid ISO', () => {
    expect(sleepNightKey('not-a-date')).toBe('not-a-date');
  });
});

describe('dedupSleepSessionsByNight', () => {
  it('returns input unchanged for single row', () => {
    const rows = [
      makeRow({ start: '2026-04-09T23:00:00Z', end: '2026-04-10T07:00:00Z' }),
    ];
    const result = dedupSleepSessionsByNight(rows as any, null);
    expect(result).toHaveLength(1);
  });

  it('deduplicates two rows for the same night keeping longer', () => {
    const rows = [
      makeRow({
        start: '2026-04-09T23:00:00Z',
        end: '2026-04-10T07:00:00Z',
        duration: 480,
        source: 'healthconnect',
      }),
      makeRow({
        start: '2026-04-09T23:30:00Z',
        end: '2026-04-10T06:00:00Z',
        duration: 390,
        source: 'healthkit',
      }),
    ];
    const result = dedupSleepSessionsByNight(rows as any, null);
    expect(result).toHaveLength(1);
    expect((result[0] as any).duration_minutes).toBe(480);
  });

  it('prefers preferred source when durations are comparable', () => {
    const rows = [
      makeRow({
        start: '2026-04-09T23:00:00Z',
        end: '2026-04-10T07:00:00Z',
        duration: 480,
        source: 'healthconnect',
      }),
      makeRow({
        start: '2026-04-09T23:00:00Z',
        end: '2026-04-10T07:00:00Z',
        duration: 475,
        source: 'healthkit',
        stages: JSON.stringify([{ stage: 'deep', start: '2026-04-10T01:00:00Z', end: '2026-04-10T02:00:00Z' }]),
      }),
    ];
    const result = dedupSleepSessionsByNight(rows as any, 'healthkit');
    expect(result).toHaveLength(1);
    expect((result[0] as any).source).toBe('healthkit');
  });

  it('prefers "main" session_type within preferred source group', () => {
    const rows = [
      makeRow({
        start: '2026-04-09T23:00:00Z',
        end: '2026-04-10T07:00:00Z',
        duration: 480,
        source: 'healthconnect',
        session_type: 'nap',
      }),
      makeRow({
        start: '2026-04-09T22:30:00Z',
        end: '2026-04-10T06:30:00Z',
        duration: 480,
        source: 'healthconnect',
        session_type: 'main',
      }),
    ];
    const result = dedupSleepSessionsByNight(rows as any, 'healthconnect');
    expect(result).toHaveLength(1);
    expect((result[0] as any).session_type).toBe('main');
  });

  it('keeps rows from different nights', () => {
    const rows = [
      makeRow({ start: '2026-04-09T23:00:00Z', end: '2026-04-10T07:00:00Z' }),
      makeRow({ start: '2026-04-10T23:00:00Z', end: '2026-04-11T07:00:00Z' }),
    ];
    const result = dedupSleepSessionsByNight(rows as any, null);
    expect(result).toHaveLength(2);
  });

  it('sorts result most-recent-first', () => {
    const rows = [
      makeRow({ start: '2026-04-08T23:00:00Z', end: '2026-04-09T07:00:00Z' }),
      makeRow({ start: '2026-04-10T23:00:00Z', end: '2026-04-11T07:00:00Z' }),
    ];
    const result = dedupSleepSessionsByNight(rows as any, null);
    expect(new Date((result[0] as any).start_time).getTime())
      .toBeGreaterThan(new Date((result[1] as any).start_time).getTime());
  });
});

describe('pickLatestDedupedSleepRow', () => {
  it('returns the most recent night after dedup', () => {
    const rows = [
      makeRow({ start: '2026-04-09T23:00:00Z', end: '2026-04-10T07:00:00Z' }),
      makeRow({ start: '2026-04-10T23:00:00Z', end: '2026-04-11T07:00:00Z' }),
    ];
    const latest = pickLatestDedupedSleepRow(rows as any, null);
    expect(latest).not.toBeNull();
    expect((latest as any).start_time).toBe('2026-04-10T23:00:00Z');
  });

  it('returns null for empty input', () => {
    expect(pickLatestDedupedSleepRow([], null)).toBeNull();
  });
});
