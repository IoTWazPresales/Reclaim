/**
 * Regression tests for streaks daysBetween — D8.
 *
 * D8: daysBetween parses YYYY-MM-DD via new Date(string), which treats
 * the format as UTC midnight. But isoDate() uses local calendar day.
 * Near timezone boundaries, this can cause off-by-one streak breaks.
 *
 * Also covers shield mechanics, badge progression, and edge cases.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

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
  vi.resetModules();
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('streaks — consecutive day tracking', () => {
  it('first event starts a streak of 1', async () => {
    const { recordStreakEvent } = await import('../streaks');
    const result = await recordStreakEvent('mood', new Date(2026, 3, 12, 9, 0));
    expect(result.store.mood.count).toBe(1);
    expect(result.store.mood.lastDate).toBe('2026-04-12');
  });

  it('same day does not increment', async () => {
    const { recordStreakEvent } = await import('../streaks');
    await recordStreakEvent('mood', new Date(2026, 3, 12, 9, 0));
    const result = await recordStreakEvent('mood', new Date(2026, 3, 12, 21, 0));
    expect(result.store.mood.count).toBe(1);
  });

  it('consecutive days build streak', async () => {
    const { recordStreakEvent } = await import('../streaks');
    await recordStreakEvent('mood', new Date(2026, 3, 10));
    await recordStreakEvent('mood', new Date(2026, 3, 11));
    await recordStreakEvent('mood', new Date(2026, 3, 12));
    const result = await recordStreakEvent('mood', new Date(2026, 3, 13));
    expect(result.store.mood.count).toBe(4);
  });

  it('gap of 2+ days resets to 1', async () => {
    const { recordStreakEvent } = await import('../streaks');
    await recordStreakEvent('mood', new Date(2026, 3, 10));
    await recordStreakEvent('mood', new Date(2026, 3, 11));
    const result = await recordStreakEvent('mood', new Date(2026, 3, 14));
    expect(result.store.mood.count).toBe(1);
  });
});

describe('streaks — shield mechanics', () => {
  it('awards shield at 7-day milestone', async () => {
    const { recordStreakEvent } = await import('../streaks');
    for (let d = 1; d <= 7; d++) {
      await recordStreakEvent('mood', new Date(2026, 3, d));
    }
    const { store } = await recordStreakEvent('mood', new Date(2026, 3, 7));
    expect(store.mood.shieldsAvailable).toBe(1);
    expect(store.mood.count).toBe(7);
  });

  it('shield absorbs a 1-day gap', async () => {
    const { recordStreakEvent, getStreakStore } = await import('../streaks');
    for (let d = 1; d <= 7; d++) {
      await recordStreakEvent('mood', new Date(2026, 3, d));
    }
    // Skip day 8, resume on day 9
    const result = await recordStreakEvent('mood', new Date(2026, 3, 9));
    expect(result.store.mood.count).toBe(8);
    expect(result.shieldUsed).toBe(true);
    expect(result.store.mood.shieldsAvailable).toBe(0);
  });

  it('shields max at 1', async () => {
    const { recordStreakEvent } = await import('../streaks');
    for (let d = 1; d <= 14; d++) {
      await recordStreakEvent('mood', new Date(2026, 3, d));
    }
    const { store } = await recordStreakEvent('mood', new Date(2026, 3, 14));
    expect(store.mood.shieldsAvailable).toBeLessThanOrEqual(1);
  });
});

describe('streaks — badge progression', () => {
  it('earns 3-day badge', async () => {
    const { recordStreakEvent } = await import('../streaks');
    await recordStreakEvent('mood', new Date(2026, 3, 1));
    await recordStreakEvent('mood', new Date(2026, 3, 2));
    const result = await recordStreakEvent('mood', new Date(2026, 3, 3));
    expect(result.newBadges.length).toBeGreaterThan(0);
    expect(result.newBadges[0].id).toBe('mood_spark');
  });

  it('reports only NEW badges each event', async () => {
    const { recordStreakEvent } = await import('../streaks');
    await recordStreakEvent('mood', new Date(2026, 3, 1));
    await recordStreakEvent('mood', new Date(2026, 3, 2));
    const r3 = await recordStreakEvent('mood', new Date(2026, 3, 3));
    expect(r3.newBadges.length).toBe(1);
    // Day 4 should have no new badge
    const r4 = await recordStreakEvent('mood', new Date(2026, 3, 4));
    expect(r4.newBadges.length).toBe(0);
  });
});

describe('D8 — daysBetween UTC interpretation risk', () => {
  it('consecutive local days are recognized even near midnight', async () => {
    const { recordStreakEvent } = await import('../streaks');
    // 11:55pm on April 12 local
    await recordStreakEvent('mood', new Date(2026, 3, 12, 23, 55));
    // 12:05am on April 13 local
    const result = await recordStreakEvent('mood', new Date(2026, 3, 13, 0, 5));
    expect(result.store.mood.count).toBe(2);
    expect(result.store.mood.lastDate).toBe('2026-04-13');
  });

  it('isoDate produces local-calendar keys', async () => {
    const { recordStreakEvent } = await import('../streaks');
    // Midnight local = different UTC date in negative-offset timezones
    const midnight = new Date(2026, 0, 15, 0, 0, 0);
    const result = await recordStreakEvent('mood', midnight);
    expect(result.store.mood.lastDate).toBe('2026-01-15');
  });
});

describe('streaks — longest tracking', () => {
  it('tracks longest across resets', async () => {
    const { recordStreakEvent } = await import('../streaks');
    // Build 5-day streak
    for (let d = 1; d <= 5; d++) {
      await recordStreakEvent('mood', new Date(2026, 3, d));
    }
    // Gap breaks it
    await recordStreakEvent('mood', new Date(2026, 3, 10));
    // Build 3-day streak
    await recordStreakEvent('mood', new Date(2026, 3, 11));
    const result = await recordStreakEvent('mood', new Date(2026, 3, 12));
    expect(result.store.mood.count).toBe(3);
    expect(result.store.mood.longest).toBe(5);
  });
});
