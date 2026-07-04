/**
 * Streak repair: one per week, logging within 24h of the missed day keeps the
 * streak. Copy stays no-guilt (shieldUsed drives the "protected" message).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

import { recordStreakEvent, isoWeekKey } from '@/lib/streaks';

beforeEach(async () => {
  await AsyncStorage.clear();
});

// A Monday and the days after it (single ISO week Mon–Sun).
const mon = new Date(2026, 5, 29); // 2026-06-29 (Monday)
const tue = new Date(2026, 5, 30);
const thu = new Date(2026, 6, 2);
const fri = new Date(2026, 6, 3);
const sat = new Date(2026, 6, 4);

describe('streak repair', () => {
  it('missing one day and logging the next keeps the streak (one repair)', async () => {
    await recordStreakEvent('mood', mon);
    await recordStreakEvent('mood', tue);
    // Wednesday missed — Thursday log repairs it.
    const result = await recordStreakEvent('mood', thu);

    expect(result.shieldUsed).toBe(true);
    expect(result.store.mood.count).toBe(3);
  });

  it('only one repair per week — a second gap the same week restarts the streak', async () => {
    await recordStreakEvent('mood', mon);
    await recordStreakEvent('mood', thu); // gap of 3 → restart (repair only covers 1-day gaps)
    expect((await recordStreakEvent('mood', fri)).store.mood.count).toBe(2);

    // Use this week's repair… wait — repair refilled this week already used? Build the case:
    // fresh week state: mon..tue streak, wed missed, thu repairs (uses the weekly repair),
    // fri missed, sat cannot repair again in the same week.
    await AsyncStorage.clear();
    await recordStreakEvent('mood', mon);
    await recordStreakEvent('mood', tue);
    const repaired = await recordStreakEvent('mood', thu);
    expect(repaired.shieldUsed).toBe(true);
    expect(repaired.store.mood.count).toBe(3);

    const afterSecondGap = await recordStreakEvent('mood', sat); // Friday missed again
    expect(afterSecondGap.shieldUsed).toBe(false);
    expect(afterSecondGap.store.mood.count).toBe(1);
  });

  it('repair refills in a new ISO week', async () => {
    // Streak through Sunday, miss Monday, log Tuesday (new week) — repaired.
    const sun = new Date(2026, 6, 5);
    const tueNextWeek = new Date(2026, 6, 7);
    await recordStreakEvent('mood', sat);
    await recordStreakEvent('mood', sun);
    const result = await recordStreakEvent('mood', tueNextWeek);
    expect(result.shieldUsed).toBe(true);
    expect(result.store.mood.count).toBe(3);
  });

  it('isoWeekKey groups Monday-Sunday weeks', () => {
    expect(isoWeekKey(mon)).toBe(isoWeekKey(sat));
    expect(isoWeekKey(mon)).not.toBe(isoWeekKey(new Date(2026, 6, 6)));
  });
});
