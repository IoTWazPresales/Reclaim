import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

describe('Phase 1 mood canonical — legacy import', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    vi.resetModules();
  });

  it(
    'imports legacy MOOD_KEY rows into pending once without removing legacy storage',
    async () => {
      const { MOOD_LEGACY_KEY_V1, loadPendingMoodCheckins, loadMoodLegacyImportState } = await import('../moodOutbox');
      const legacy = [{ id: 'legacy-1', rating: 3, created_at: '2024-01-15T12:00:00.000Z' }];
      await AsyncStorage.setItem(MOOD_LEGACY_KEY_V1, JSON.stringify(legacy));

      const { runLegacyMoodImportOnce } = await import('../moodService');
      await runLegacyMoodImportOnce();
      const pending = await loadPendingMoodCheckins();
      expect(pending.some((p) => p.localId === 'legacy-1')).toBe(true);
      const st = await loadMoodLegacyImportState();
      expect(st.importedLegacyIds).toContain('legacy-1');

      await runLegacyMoodImportOnce();
      const pending2 = await loadPendingMoodCheckins();
      expect(pending2.filter((p) => p.localId === 'legacy-1').length).toBe(1);

      const rawLegacy = await AsyncStorage.getItem(MOOD_LEGACY_KEY_V1);
      expect(rawLegacy).toBeTruthy();
    },
    20_000,
  );

  it('does not clear legacy MOOD_KEY when JSON is invalid (import failure)', async () => {
    const { MOOD_LEGACY_KEY_V1 } = await import('../moodOutbox');
    const bad = '{ not valid json';
    await AsyncStorage.setItem(MOOD_LEGACY_KEY_V1, bad);

    const { runLegacyMoodImportOnce } = await import('../moodService');
    await runLegacyMoodImportOnce();

    expect(await AsyncStorage.getItem(MOOD_LEGACY_KEY_V1)).toBe(bad);
  });
});
