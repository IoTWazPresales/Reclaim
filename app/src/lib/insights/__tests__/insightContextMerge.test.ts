import { describe, expect, it } from 'vitest';
import { mergeMedDoseLogsForInsights, mergeSleepSessionsForInsights } from '../insightContextMerge';

describe('mergeSleepSessionsForInsights', () => {
  it('keeps local-only rows and lets remote override same id', () => {
    const local = [
      { id: 'a', start_time: '2026-05-01T22:00:00.000Z' },
      { id: 'b', start_time: '2026-04-20T10:00:00.000Z' },
    ];
    const remote = [
      { id: 'a', start_time: '2026-05-01T23:00:00.000Z' },
    ];
    const out = mergeSleepSessionsForInsights(local, remote);
    expect(out.find((s) => s.id === 'a')?.start_time).toBe('2026-05-01T23:00:00.000Z');
    expect(out.find((s) => s.id === 'b')?.start_time).toBe('2026-04-20T10:00:00.000Z');
  });
});

describe('mergeMedDoseLogsForInsights', () => {
  it('dedupes by med+scheduled_for; remote wins the slot, local fills missing slots', () => {
    const local = [
      { med_id: 'm1', scheduled_for: '2026-05-01T08:00:00.000Z', id: 'local-1' } as const,
      { med_id: 'm2', scheduled_for: '2026-05-01T20:00:00.000Z', id: 'local-2' } as const,
    ];
    const remote = [
      { med_id: 'm1', scheduled_for: '2026-05-01T08:00:00.000Z', id: 'remote-1' } as const,
    ];
    const out = mergeMedDoseLogsForInsights(
      local as { med_id: string; scheduled_for: string; id: string }[],
      remote as { med_id: string; scheduled_for: string; id: string }[],
    );
    const m1 = out.find((l) => l.med_id === 'm1');
    expect(m1?.id).toBe('remote-1');
    expect(out.some((l) => l.id === 'local-2')).toBe(true);
    expect(out).toHaveLength(2);
  });
});
