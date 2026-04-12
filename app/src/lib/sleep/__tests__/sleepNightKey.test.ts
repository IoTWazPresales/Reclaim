import { describe, it, expect } from 'vitest';
import { sleepNightKey } from '../dedupSleepSessionsByNight';
import { getSleepNightKey } from '../sleepConsolidation';

const makeSession = (endTime: Date) => ({ endTime }) as any;

function localDate(year: number, month: number, day: number, hour: number): Date {
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

/** Compute expected night key using the canonical noon-cutoff rule */
function expectedNightKey(end: Date): string {
  const d = new Date(end.getTime());
  if (d.getHours() < 12) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

describe('sleep-night key parity (SL-01)', () => {
  const hours = [0, 1, 5, 7, 11, 12, 15, 20, 23];

  for (const h of hours) {
    it(`UI dedup and consolidation agree at ${h}:00 local`, () => {
      const end = localDate(2026, 4, 10, h);
      const endISO = end.toISOString();
      expect(sleepNightKey(endISO)).toBe(getSleepNightKey(makeSession(end)));
    });
  }
});

describe('noon-cutoff rule behavior', () => {
  it('session ending before noon is rolled back to the previous local day', () => {
    const end = localDate(2026, 4, 10, 7);
    expect(getSleepNightKey(makeSession(end))).toBe(expectedNightKey(end));
    expect(getSleepNightKey(makeSession(end))).not.toBe(end.toISOString().slice(0, 10));
  });

  it('session ending at noon is NOT rolled back', () => {
    const end = localDate(2026, 4, 10, 12);
    expect(getSleepNightKey(makeSession(end))).toBe(expectedNightKey(end));
  });

  it('session ending in the afternoon is NOT rolled back', () => {
    const end = localDate(2026, 4, 10, 15);
    expect(getSleepNightKey(makeSession(end))).toBe(expectedNightKey(end));
  });

  it('session ending at midnight is rolled back', () => {
    const end = localDate(2026, 4, 11, 0);
    expect(getSleepNightKey(makeSession(end))).toBe(expectedNightKey(end));
  });

  it('before-noon results differ from raw UTC date for morning sessions', () => {
    const morning = localDate(2026, 4, 10, 6);
    const afternoon = localDate(2026, 4, 10, 14);
    const morningKey = getSleepNightKey(makeSession(morning));
    const afternoonKey = getSleepNightKey(makeSession(afternoon));
    expect(morningKey).not.toBe(afternoonKey);
  });
});
