/**
 * Regression tests for routineSettings — H14.
 *
 * H14: saveRoutineTemplateSettings has catch { // ignore } — write failures
 * are completely silent. This test suite locks the round-trip behavior and
 * documents the silent-failure edge case.
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

vi.mock('../routines', () => ({
  defaultRoutineTemplates: [
    { id: 'morning', enabled: true },
    { id: 'evening', enabled: false },
  ],
}));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('routineSettings — round-trip', () => {
  it('returns defaults from templates when storage is empty', async () => {
    const { loadRoutineTemplateSettings } = await import('../routineSettings');
    const settings = await loadRoutineTemplateSettings();
    expect(settings).toEqual({ morning: true, evening: false });
  });

  it('persists and loads custom settings', async () => {
    const { loadRoutineTemplateSettings, saveRoutineTemplateSettings } =
      await import('../routineSettings');
    await saveRoutineTemplateSettings({ morning: false, evening: true });
    const loaded = await loadRoutineTemplateSettings();
    expect(loaded).toEqual({ morning: false, evening: true });
  });

  it('updateRoutineTemplateEnabled modifies a single key', async () => {
    const { loadRoutineTemplateSettings, saveRoutineTemplateSettings, updateRoutineTemplateEnabled } =
      await import('../routineSettings');
    await saveRoutineTemplateSettings({ morning: true, evening: false });
    await updateRoutineTemplateEnabled('evening', true);
    const loaded = await loadRoutineTemplateSettings();
    expect(loaded.morning).toBe(true);
    expect(loaded.evening).toBe(true);
  });
});

describe('H14 — silent save failure', () => {
  it('saveRoutineTemplateSettings swallows errors (does NOT throw)', async () => {
    const { saveRoutineTemplateSettings } = await import('../routineSettings');
    (AsyncStorage.setItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('disk full'));

    // This documents the bug: save silently succeeds even when storage throws
    await expect(saveRoutineTemplateSettings({ morning: false })).resolves.toBeUndefined();
  });

  it('load returns empty object on corrupt JSON (not defaults)', async () => {
    const { loadRoutineTemplateSettings } = await import('../routineSettings');
    await AsyncStorage.setItem('settings:routine_templates:v1', '{corrupt');
    const result = await loadRoutineTemplateSettings();
    // Bug: returns {} instead of template defaults
    expect(result).toEqual({});
  });
});
