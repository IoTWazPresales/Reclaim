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

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  composeForecastGradeLine,
  forecastHit,
  gradeForecastWithMood,
  getForecastAccuracySummary,
  recordTodayForecast,
} from '@/lib/forecastJournal';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('forecast grading copy', () => {
  it('grades an over-pessimistic forecast honestly', () => {
    expect(composeForecastGradeLine('-', 6)).toBe(
      'We expected a rough day — you said 6/10. Updating your model.',
    );
  });

  it('acknowledges a rough day that was rough', () => {
    expect(composeForecastGradeLine('-', 3)).toContain('you still showed up');
  });

  it('grades an over-optimistic forecast honestly', () => {
    expect(composeForecastGradeLine('+', 3)).toBe(
      'We expected a steadier day — you said 3/10. Updating your model.',
    );
  });
});

describe('forecastHit', () => {
  it('scores tone vs mood bands', () => {
    expect(forecastHit('-', 3)).toBe(true);
    expect(forecastHit('-', 7)).toBe(false);
    expect(forecastHit('+', 7)).toBe(true);
    expect(forecastHit('+', 3)).toBe(false);
    expect(forecastHit('~', 5)).toBe(true);
    expect(forecastHit('~', 9)).toBe(false);
  });
});

describe('forecast journal (store + grade)', () => {
  it('stores today\'s forecast and grades it once with the check-in mood', async () => {
    await recordTodayForecast({ tone: '-', headline: 'rough ahead', confidence: 60 });

    const line = await gradeForecastWithMood(6);
    expect(line).toBe('We expected a rough day — you said 6/10. Updating your model.');

    // Already graded — the frozen entry is not re-graded.
    const second = await gradeForecastWithMood(2);
    expect(second).toBeNull();

    const summary = await getForecastAccuracySummary(7);
    expect(summary.gradedCount).toBe(1);
    expect(summary.hitCount).toBe(0);
    expect(summary.line).toContain('0 of 1');
  });

  it('a graded entry is frozen against later forecast overwrites', async () => {
    await recordTodayForecast({ tone: '-', headline: 'rough ahead', confidence: 60 });
    await gradeForecastWithMood(3);
    await recordTodayForecast({ tone: '+', headline: 'looking better', confidence: 70 });

    const summary = await getForecastAccuracySummary(7);
    expect(summary.gradedCount).toBe(1);
    expect(summary.hitCount).toBe(1); // '-' with 3/10 = hit, unchanged
  });

  it('returns null when there is nothing to grade', async () => {
    expect(await gradeForecastWithMood(5)).toBeNull();
  });
});
