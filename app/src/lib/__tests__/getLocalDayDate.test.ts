import { describe, it, expect } from 'vitest';
import { getLocalDayDate } from '../api';

describe('getLocalDayDate (E5 – MO-01 / OV-01)', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = getLocalDayDate(new Date(2026, 3, 12, 14, 30)); // April 12, 2026 2:30pm local
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses the local calendar day, not UTC', () => {
    const localMidnight = new Date(2026, 3, 12, 0, 0, 0, 0); // April 12 midnight local
    const result = getLocalDayDate(localMidnight);
    expect(result).toBe('2026-04-12');
  });

  it('late-night local time stays on the local calendar day', () => {
    const lateNight = new Date(2026, 3, 12, 23, 59, 59); // April 12 11:59pm local
    expect(getLocalDayDate(lateNight)).toBe('2026-04-12');
  });

  it('early-morning local time is attributed to the current local day', () => {
    const earlyMorning = new Date(2026, 3, 13, 0, 30, 0); // April 13 12:30am local
    expect(getLocalDayDate(earlyMorning)).toBe('2026-04-13');
  });

  it('does NOT produce a UTC-shifted date for positive-offset midnight', () => {
    // In any positive-offset timezone, local midnight is the previous UTC day.
    // getLocalDayDate must return the LOCAL day, not the UTC day.
    const localMidnight = new Date(2026, 0, 15, 0, 0, 0, 0); // Jan 15 midnight local
    const localDay = getLocalDayDate(localMidnight);
    expect(localDay).toBe('2026-01-15');
    // Contrast: the old toISOString().split('T')[0] pattern would return '2026-01-14'
    // in any timezone east of UTC.
    const offsetMinutes = localMidnight.getTimezoneOffset();
    if (offsetMinutes < 0) {
      // Positive offset (e.g. UTC+2, UTC+9) — UTC day is previous
      const utcDay = localMidnight.toISOString().split('T')[0];
      expect(utcDay).toBe('2026-01-14');
      expect(localDay).not.toBe(utcDay);
    }
  });

  it('defaults to current time when no argument given', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(getLocalDayDate()).toBe(expected);
  });

  it('handles single-digit months and days with zero-padding', () => {
    const jan1 = new Date(2026, 0, 1, 12, 0);
    expect(getLocalDayDate(jan1)).toBe('2026-01-01');
  });

  it('handles year boundaries correctly', () => {
    const nye = new Date(2025, 11, 31, 23, 59);
    expect(getLocalDayDate(nye)).toBe('2025-12-31');
    const nyd = new Date(2026, 0, 1, 0, 1);
    expect(getLocalDayDate(nyd)).toBe('2026-01-01');
  });
});
