import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadMeditationSettings } from '@/lib/meditationSettings';

describe('loadMeditationSettings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('writes a 4-7-8 after-wake rule when nothing is stored', async () => {
    vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null);
    const setItem = vi.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const settings = await loadMeditationSettings();
    expect(settings.rules).toEqual([
      { mode: 'after_wake', type: 'four_7_8_breathing', offsetMinutes: 0 },
    ]);
    expect(setItem).toHaveBeenCalled();
  });

  it('keeps an empty saved list', async () => {
    vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(JSON.stringify({ rules: [] }));
    const setItem = vi.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const settings = await loadMeditationSettings();
    expect(settings.rules).toEqual([]);
    expect(setItem).not.toHaveBeenCalled();
  });
});
