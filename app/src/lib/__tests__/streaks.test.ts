import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordStreakEvent, getStreakStore, type StreakType } from '../streaks';

vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] ?? null),
      setItem: vi.fn(async (key: string, val: string) => { store[key] = val; }),
      removeItem: vi.fn(async (key: string) => { delete store[key]; }),
      clear: vi.fn(async () => { store = {}; }),
    },
  };
});

beforeEach(async () => {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('streaks isoDate local-day correctness (E6)', () => {
  it('attributes a late-night local event to the local calendar day, not UTC', async () => {
    // 11:30pm local on April 12 — in UTC+2 this is 9:30pm UTC (same day),
    // but in a negative-offset timezone the UTC date could differ.
    // The key test: the streak date should always match the local calendar day.
    const lateNight = new Date(2026, 3, 12, 23, 30, 0); // April 12 local
    const result = await recordStreakEvent('mood', lateNight);
    expect(result.store.mood.lastDate).toBe('2026-04-12');
  });

  it('attributes an early-morning local event to the local calendar day', async () => {
    const earlyMorning = new Date(2026, 3, 13, 0, 30, 0); // April 13 12:30am local
    const result = await recordStreakEvent('mood', earlyMorning);
    expect(result.store.mood.lastDate).toBe('2026-04-13');
  });

  it('recognizes consecutive local days as a streak', async () => {
    const day1 = new Date(2026, 3, 12, 22, 0); // April 12
    const day2 = new Date(2026, 3, 13, 8, 0);  // April 13
    await recordStreakEvent('mood', day1);
    const result = await recordStreakEvent('mood', day2);
    expect(result.store.mood.count).toBe(2);
  });

  it('local midnight does not shift the streak date', async () => {
    const midnight = new Date(2026, 0, 15, 0, 0, 0, 0); // Jan 15 midnight local
    const result = await recordStreakEvent('mood', midnight);
    expect(result.store.mood.lastDate).toBe('2026-01-15');
  });
});
