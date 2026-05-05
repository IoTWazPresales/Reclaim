import { describe, it, expect } from 'vitest';
import { isPrnMed, isScheduledMed } from '../medicationSchedulePolicy';

/**
 * Mirrors MedsScreen edit semantics (no React): PRN uses `{ prn: true }`; scheduled uses times+days.
 */
describe('medication edit conversion policy', () => {
  it('scheduled → PRN is represented only by the PRN marker (no lingering times/days in model)', () => {
    const scheduled = {
      id: 'm1',
      schedule: { times: ['08:00', '21:00'], days: [1, 2, 3, 4, 5] as number[] },
    };
    expect(isScheduledMed(scheduled)).toBe(true);

    const afterPrn = { id: 'm1', schedule: { prn: true as const } };
    expect(isPrnMed(afterPrn)).toBe(true);
    expect(isScheduledMed(afterPrn)).toBe(false);
  });

  it('PRN → scheduled requires a proper fixed schedule for isScheduledMed', () => {
    const prn = { id: 'm2', schedule: { prn: true as const } };
    expect(isPrnMed(prn)).toBe(true);

    const scheduled = {
      id: 'm2',
      schedule: { times: ['09:00'], days: [1, 2, 3, 4, 5, 6, 7] },
    };
    expect(isScheduledMed(scheduled)).toBe(true);
    expect(isPrnMed(scheduled)).toBe(false);
  });

  it('missing schedule is neither PRN nor scheduled-for-adherence', () => {
    expect(isPrnMed({ schedule: undefined })).toBe(false);
    expect(isScheduledMed({ schedule: undefined })).toBe(false);
  });
});
