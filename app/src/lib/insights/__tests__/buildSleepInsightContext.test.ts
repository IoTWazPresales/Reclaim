import { describe, expect, it } from 'vitest';

import type { SleepSession } from '@/lib/api';
import { buildSleepInsightContext } from '@/lib/insights/sleepInsightContext';

function session(partial: Partial<SleepSession> & Pick<SleepSession, 'start_time' | 'end_time'>): SleepSession {
  return {
    id: partial.id ?? 's1',
    user_id: partial.user_id ?? 'u1',
    start_time: partial.start_time,
    end_time: partial.end_time,
    source: partial.source ?? 'healthconnect',
    created_at: partial.created_at ?? new Date().toISOString(),
    quality: partial.quality ?? null,
    efficiency: partial.efficiency ?? null,
    metadata: partial.metadata ?? null,
    stages: partial.stages ?? null,
    duration_minutes: partial.duration_minutes ?? null,
    note: partial.note ?? null,
    session_type: partial.session_type ?? null,
  };
}

describe('buildSleepInsightContext', () => {
  it('returns undefined when there are no sessions', () => {
    expect(buildSleepInsightContext([])).toBeUndefined();
  });

  it('omits heart rate fields when metadata has no HR (Android / partial HC gap)', () => {
    const t0 = '2026-04-16T22:00:00.000Z';
    const t1 = '2026-04-17T06:00:00.000Z';
    const out = buildSleepInsightContext([
      session({
        start_time: t0,
        end_time: t1,
        metadata: { deepSleepMinutes: 90 },
      }),
    ]);
    expect(out?.lastNight?.hours).toBe(8);
    expect(out?.lastNight?.avgHeartRate).toBeUndefined();
    expect(out?.lastNight?.minHeartRate).toBeUndefined();
    expect(out?.lastNight?.maxHeartRate).toBeUndefined();
  });

  it('maps camelCase avg/min/max heart rate from latest session metadata', () => {
    const t0 = '2026-04-16T23:00:00.000Z';
    const t1 = '2026-04-17T07:00:00.000Z';
    const out = buildSleepInsightContext([
      session({
        start_time: t0,
        end_time: t1,
        metadata: { avgHeartRate: 58.4, minHeartRate: 48.2, maxHeartRate: 72.9 },
      }),
    ]);
    expect(out?.lastNight?.avgHeartRate).toBe(58);
    expect(out?.lastNight?.minHeartRate).toBe(48);
    expect(out?.lastNight?.maxHeartRate).toBe(73);
  });

  it('accepts snake_case HR keys from metadata', () => {
    const t0 = '2026-04-15T22:00:00.000Z';
    const t1 = '2026-04-16T05:00:00.000Z';
    const base = session({ start_time: t0, end_time: t1 });
    const withSnakeHr: SleepSession = {
      ...base,
      metadata: {
        ...(base.metadata ?? {}),
        avg_heart_rate: 61,
        min_heart_rate: 50,
        max_heart_rate: 70,
      } as SleepSession['metadata'],
    };
    const out = buildSleepInsightContext([withSnakeHr]);
    expect(out?.lastNight?.avgHeartRate).toBe(61);
    expect(out?.lastNight?.minHeartRate).toBe(50);
    expect(out?.lastNight?.maxHeartRate).toBe(70);
  });

  it('includes only average when min/max missing (partial wearable payload)', () => {
    const t0 = '2026-04-14T21:00:00.000Z';
    const t1 = '2026-04-15T05:00:00.000Z';
    const out = buildSleepInsightContext([
      session({
        start_time: t0,
        end_time: t1,
        metadata: { avgHeartRate: 55 },
      }),
    ]);
    expect(out?.lastNight?.avgHeartRate).toBe(55);
    expect(out?.lastNight?.minHeartRate).toBeUndefined();
    expect(out?.lastNight?.maxHeartRate).toBeUndefined();
  });

  it('uses most recently ended session for HR when multiple nights exist', () => {
    const older = session({
      id: 'old',
      start_time: '2026-04-14T22:00:00.000Z',
      end_time: '2026-04-15T06:00:00.000Z',
      metadata: { avgHeartRate: 40 },
    });
    const newer = session({
      id: 'new',
      start_time: '2026-04-15T22:00:00.000Z',
      end_time: '2026-04-16T06:00:00.000Z',
      metadata: { avgHeartRate: 62 },
    });
    const out = buildSleepInsightContext([older, newer]);
    expect(out?.lastNight?.avgHeartRate).toBe(62);
  });

  it('does not surface HR when duration cannot be computed (invalid window)', () => {
    const out = buildSleepInsightContext([
      session({
        start_time: '2026-04-16T08:00:00.000Z',
        end_time: '2026-04-16T06:00:00.000Z',
        metadata: { avgHeartRate: 99 },
      }),
    ]);
    expect(out?.lastNight).toBeUndefined();
  });
});
