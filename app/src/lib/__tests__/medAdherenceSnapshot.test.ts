import { describe, it, expect } from 'vitest';
import { buildMedAdherenceSnapshot } from '@/lib/meds/medAdherenceSnapshot';
import { computeAdherenceFromSchedule, isScheduledMed } from '@/lib/medicationSchedulePolicy';

describe('buildMedAdherenceSnapshot', () => {
  const scheduledMed = {
    id: 'med-1',
    schedule: { times: ['08:00'], days: [1, 2, 3, 4, 5, 6, 7] },
  };

  it('never reports 0% when no doses logged', () => {
    const snap = buildMedAdherenceSnapshot([], [scheduledMed], 7);
    expect(snap.pct).toBeNull();
    expect(snap.headline).toBe('No doses logged yet');
    expect(snap.orbitStatus).toBe('no_logs');
  });

  it('reports pct when at least one dose logged', () => {
    const logs = [
      {
        med_id: 'med-1',
        status: 'taken' as const,
        taken_at: new Date().toISOString(),
      },
    ];
    const snap = buildMedAdherenceSnapshot(logs, [scheduledMed], 7);
    expect(snap.pct).not.toBeNull();
    expect(snap.taken).toBe(1);
    expect(snap.orbitStatus).toBe('attention');
  });

  it('matches computeAdherenceFromSchedule when taken > 0', () => {
    const logs = Array.from({ length: 6 }, () => ({
      med_id: 'med-1',
      status: 'taken' as const,
      taken_at: new Date().toISOString(),
    }));
    const raw = computeAdherenceFromSchedule(logs, [scheduledMed], 7);
    const snap = buildMedAdherenceSnapshot(logs, [scheduledMed], 7);
    expect(snap.pct).toBe(raw.pct);
    expect(snap.scheduled).toBe(raw.scheduled);
  });

  it('handles PRN-only meds without scheduled adherence', () => {
    const prn = { id: 'p1', schedule: { prn: true as const } };
    const snap = buildMedAdherenceSnapshot([], [prn]);
    expect(snap.hasScheduledMeds).toBe(false);
    expect(snap.pct).toBeNull();
    expect(isScheduledMed(prn)).toBe(false);
  });
});
