import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

const medDoseMirrorMocks = vi.hoisted(() => ({
  loadBlobMirrorForUser: vi.fn(),
}));

vi.mock('@/lib/localData/smallModuleMirrors', () => ({
  ASYNC_MIRROR_DOMAIN: {
    medDoseQueue: 'med_dose_queue',
    meditationSessions: 'meditation_sessions',
    recoveryProgress: 'recovery_progress',
  },
  isValidPendingMedDoseQueue: (arr: unknown): boolean => {
    if (!Array.isArray(arr)) return false;
    for (const item of arr) {
      if (!item || typeof item !== 'object') return false;
      const o = item as Record<string, unknown>;
      if (typeof o.med_id !== 'string') return false;
      if (o.status !== 'taken' && o.status !== 'skipped') return false;
      if (typeof o.enqueuedAt !== 'string') return false;
    }
    return true;
  },
  loadBlobMirrorForUser: (...args: unknown[]) => medDoseMirrorMocks.loadBlobMirrorForUser(...args),
  scheduleMedDoseQueueMirror: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'test-user-1' } } })),
    },
  },
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

describe('MedDoseOfflineQueue — Phase 3.5 restore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    medDoseMirrorMocks.loadBlobMirrorForUser.mockReset();
    vi.resetModules();
  });

  it('restores queue from SQLite mirror when AsyncStorage is missing', async () => {
    const entry = {
      med_id: 'm1',
      status: 'taken' as const,
      enqueuedAt: new Date().toISOString(),
    };
    medDoseMirrorMocks.loadBlobMirrorForUser.mockResolvedValue([entry]);
    const mod = await import('../MedDoseOfflineQueue');
    await mod.enqueueMedDose({ med_id: 'm2', status: 'skipped' });
    const rawAfterEnqueue = await AsyncStorage.getItem('@reclaim/notifications/medDoseQueue');
    const parsedAfter = JSON.parse(rawAfterEnqueue as string);
    expect(parsedAfter.some((p: { med_id: string }) => p.med_id === 'm1')).toBe(true);
    expect(parsedAfter.some((p: { med_id: string }) => p.med_id === 'm2')).toBe(true);

    medDoseMirrorMocks.loadBlobMirrorForUser.mockResolvedValue([]);
    const result = await mod.syncMedDoseQueue(async () => undefined);
    expect(result.synced).toBe(2);
  });

  it('does not crash when mirror payload is invalid', async () => {
    medDoseMirrorMocks.loadBlobMirrorForUser.mockResolvedValue({ not: 'array' });
    const mod = await import('../MedDoseOfflineQueue');
    await expect(mod.syncMedDoseQueue(async () => undefined)).resolves.toBeDefined();
  });

  it('prefers existing AsyncStorage queue over mirror', async () => {
    const mod = await import('../MedDoseOfflineQueue');
    await AsyncStorage.setItem(
      '@reclaim/notifications/medDoseQueue',
      JSON.stringify([
        {
          med_id: 'as-only',
          status: 'taken',
          enqueuedAt: new Date().toISOString(),
        },
      ]),
    );
    medDoseMirrorMocks.loadBlobMirrorForUser.mockResolvedValue([
      {
        med_id: 'mirror-only',
        status: 'skipped',
        enqueuedAt: new Date().toISOString(),
      },
    ]);
    await mod.enqueueMedDose({ med_id: 'new', status: 'taken' });
    const raw = await AsyncStorage.getItem('@reclaim/notifications/medDoseQueue');
    const parsed = JSON.parse(raw as string);
    expect(parsed.some((p: { med_id: string }) => p.med_id === 'as-only')).toBe(true);
    expect(parsed.some((p: { med_id: string }) => p.med_id === 'mirror-only')).toBe(false);
    expect(medDoseMirrorMocks.loadBlobMirrorForUser).not.toHaveBeenCalled();
  });
});
