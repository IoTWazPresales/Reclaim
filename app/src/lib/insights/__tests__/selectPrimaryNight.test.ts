import { describe, expect, it } from 'vitest';
import type { SleepSession } from '@/lib/api';
import {
  selectPrimaryNight,
  selectPrimaryNightsForAverage,
} from '../selectPrimaryNight';
import { buildSleepInsightContext } from '../sleepInsightContext';

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

describe('selectPrimaryNight', () => {
  it('prefers overnight bout over a later morning nap', () => {
    const night = session({
      id: 'night',
      start_time: '2026-07-17T22:00:00.000Z',
      end_time: '2026-07-18T06:00:00.000Z',
    });
    const nap = session({
      id: 'nap',
      start_time: '2026-07-18T08:30:00.000Z',
      end_time: '2026-07-18T09:00:00.000Z',
    });
    const pick = selectPrimaryNight([nap, night]);
    expect(pick?.session.id).toBe('night');
    expect(pick?.hours).toBe(8);
  });

  it('ignores short naps entirely when nothing else qualifies', () => {
    const nap = session({
      id: 'nap',
      start_time: '2026-07-18T08:30:00.000Z',
      end_time: '2026-07-18T09:00:00.000Z',
    });
    expect(selectPrimaryNight([nap])).toBeNull();
  });
});

describe('buildSleepInsightContext primary night', () => {
  it('does not treat a morning nap as lastNight when a real night exists', () => {
    const out = buildSleepInsightContext([
      session({
        id: 'nap',
        start_time: '2026-07-18T08:30:00.000Z',
        end_time: '2026-07-18T09:00:00.000Z',
        metadata: { avgHeartRate: 70 },
      }),
      session({
        id: 'night',
        start_time: '2026-07-17T22:00:00.000Z',
        end_time: '2026-07-18T06:00:00.000Z',
        metadata: { avgHeartRate: 55 },
      }),
    ]);
    expect(out?.lastNight?.hours).toBe(8);
    expect(out?.lastNight?.avgHeartRate).toBe(55);
  });

  it('avg7d uses primary nights not raw session fragments', () => {
    const nights = selectPrimaryNightsForAverage(
      [
        session({
          id: 'n1',
          start_time: '2026-07-16T22:00:00.000Z',
          end_time: '2026-07-17T06:00:00.000Z',
        }),
        session({
          id: 'nap',
          start_time: '2026-07-17T08:00:00.000Z',
          end_time: '2026-07-17T08:25:00.000Z',
        }),
      ],
      7,
    );
    expect(nights).toHaveLength(1);
    expect(nights[0].hours).toBe(8);
  });
});
