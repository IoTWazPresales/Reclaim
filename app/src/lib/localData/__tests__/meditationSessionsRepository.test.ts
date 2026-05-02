import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

const hoisted = vi.hoisted(() => ({
  loadBlobMirrorForUser: vi.fn(),
  replaceBlobMirror: vi.fn(),
}));

vi.mock('@/lib/localData/smallModuleMirrors', () => ({
  ASYNC_MIRROR_DOMAIN: {
    medDoseQueue: 'med_dose_queue',
    meditationSessions: 'meditation_sessions',
    recoveryProgress: 'recovery_progress',
  },
  isValidMeditationSessions: (arr: unknown): boolean => {
    if (!Array.isArray(arr)) return false;
    for (const item of arr) {
      if (!item || typeof item !== 'object') return false;
      const o = item as Record<string, unknown>;
      if (typeof o.id !== 'string' || typeof o.startTime !== 'string') return false;
    }
    return true;
  },
  loadBlobMirrorForUser: (...args: unknown[]) => hoisted.loadBlobMirrorForUser(...args),
  replaceBlobMirror: (...args: unknown[]) => hoisted.replaceBlobMirror(...args),
}));

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

describe('meditationSessionsRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    hoisted.loadBlobMirrorForUser.mockReset();
    hoisted.replaceBlobMirror.mockReset();
    vi.resetModules();
  });

  it('loads canonical rows from local blob', async () => {
    hoisted.loadBlobMirrorForUser.mockResolvedValue([{ id: 'a', startTime: '2026-01-01T00:00:00.000Z' }]);
    const { loadMeditationSessionsForUser } = await import('../meditationSessionsRepository');
    const rows = await loadMeditationSessionsForUser('u1');
    expect(rows?.map((r) => r.id)).toEqual(['a']);
  });

  it('migrates legacy AsyncStorage into canonical store once', async () => {
    hoisted.loadBlobMirrorForUser.mockResolvedValue(null);
    const key = '@reclaim/meditations/v1';
    await AsyncStorage.setItem(key, JSON.stringify([{ id: 'leg', startTime: '2026-02-01T00:00:00.000Z' }]));
    const { tryMigrateMeditationsFromAsyncStorage } = await import('../meditationSessionsRepository');
    const migrated = await tryMigrateMeditationsFromAsyncStorage('u1');
    expect(migrated?.length).toBe(1);
    expect(hoisted.replaceBlobMirror).toHaveBeenCalled();
  });
});
