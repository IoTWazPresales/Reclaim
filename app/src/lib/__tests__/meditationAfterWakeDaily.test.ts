import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] ?? null),
      setItem: vi.fn(async (key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: vi.fn(async (key: string) => {
        delete store[key];
      }),
      clear: vi.fn(async () => {
        store = {};
      }),
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  markAfterWakeMeditationSentToday,
  wasAfterWakeMeditationSentToday,
} from '@/lib/meditation/meditationAfterWakeDaily';

describe('meditationAfterWakeDaily', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    vi.clearAllMocks();
  });

  it('returns false until marked for today', async () => {
    expect(await wasAfterWakeMeditationSentToday()).toBe(false);
    await markAfterWakeMeditationSentToday();
    expect(await wasAfterWakeMeditationSentToday()).toBe(true);
  });
});
