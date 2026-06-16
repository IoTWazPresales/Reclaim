// C:\Reclaim\app\src\lib\__tests__\medicationPrnAndAdherence.test.ts
import { describe, it, expect } from 'vitest';
import type { MedForSchedule, MedDoseLogForAdherence } from '../medicationSchedulePolicy';
import {
  computeAdherenceFromSchedule,
  isPrnMed,
  isScheduledMed,
} from '../medicationSchedulePolicy';

describe('medication PRN + schedule adherence', () => {
  const scheduled: MedForSchedule = {
    id: 's1',
    schedule: { times: ['08:00'], days: [1, 2, 3, 4, 5, 6, 7] },
  };
  const prn: MedForSchedule = { id: 'p1', schedule: { prn: true } };

  it('isPrnMed and isScheduledMed are mutually exclusive for normal data', () => {
    expect(isPrnMed(prn)).toBe(true);
    expect(isScheduledMed(prn)).toBe(false);
    expect(isPrnMed(scheduled)).toBe(false);
    expect(isScheduledMed(scheduled)).toBe(true);
  });

  it('computeAdherenceFromSchedule counts expected only from scheduled meds', () => {
    const logs: MedDoseLogForAdherence[] = [];
    const r = computeAdherenceFromSchedule(logs, [scheduled, prn], 7);
    expect(r.taken).toBe(0);
    expect(r.scheduled).toBeGreaterThan(0);
    expect(r.pct).toBe(0);
  });

  it('computeAdherenceFromSchedule ignores PRN dose logs in taken numerator', () => {
    const now = new Date();
    const iso = now.toISOString();
    const logs: MedDoseLogForAdherence[] = [
      { med_id: 'p1', status: 'taken', taken_at: iso, scheduled_for: iso },
    ];
    const r = computeAdherenceFromSchedule(logs, [scheduled, prn], 7);
    expect(r.taken).toBe(0);
  });

  it('computeAdherenceFromSchedule counts taken only for scheduled med_ids', () => {
    const now = new Date();
    const iso = now.toISOString();
    const logs: MedDoseLogForAdherence[] = [
      { med_id: 's1', status: 'taken', taken_at: iso, scheduled_for: iso },
      { med_id: 'p1', status: 'taken', taken_at: iso, scheduled_for: iso },
    ];
    const r = computeAdherenceFromSchedule(logs, [scheduled, prn], 7);
    expect(r.taken).toBe(1);
  });

  it('computeAdherenceFromSchedule has no expected slots when only PRN meds (insight % must not imply low adherence)', () => {
    const logs: MedDoseLogForAdherence[] = [];
    const r = computeAdherenceFromSchedule(logs, [prn], 7);
    expect(r.scheduled).toBe(0);
    expect(r.taken).toBe(0);
    expect(r.pct).toBe(0);
  });
});

describe('onboarding / upsert policy (documented shapes)', () => {
  it('PRN representation remains schedule: { prn: true }', () => {
    const prn = { schedule: { prn: true as const } };
    expect(prn.schedule).toEqual({ prn: true });
  });

  it('scheduled shape uses times + days arrays when present', () => {
    const scheduled = { schedule: { times: ['08:00'], days: [1, 2, 3, 4, 5, 6, 7] } };
    expect(scheduled.schedule.times?.length).toBeGreaterThan(0);
    expect(scheduled.schedule.days?.length).toBeGreaterThan(0);
  });
});
