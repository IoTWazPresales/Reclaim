import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

const recoveryMirrorMocks = vi.hoisted(() => ({
  loadBlobMirrorForUser: vi.fn(),
}));

vi.mock('@/lib/localData/smallModuleMirrors', () => ({
  ASYNC_MIRROR_DOMAIN: {
    medDoseQueue: 'med_dose_queue',
    meditationSessions: 'meditation_sessions',
    recoveryProgress: 'recovery_progress',
  },
  loadBlobMirrorForUser: (...args: unknown[]) => recoveryMirrorMocks.loadBlobMirrorForUser(...args),
  scheduleRecoveryProgressMirror: vi.fn(),
  isValidRecoveryProgressPayload: (raw: unknown): raw is Record<string, unknown> => {
    if (!raw || typeof raw !== 'object') return false;
    const o = raw as Record<string, unknown>;
    const id = o.currentStageId;
    if (id !== 'foundation' && id !== 'stabilize' && id !== 'optimize' && id !== 'thrive') return false;
    if (typeof o.startedAt !== 'string') return false;
    if (!Array.isArray(o.completedStageIds)) return false;
    return true;
  },
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

describe('recovery — Phase 3.5 restore from SQLite mirror', () => {
  const STORAGE_KEY = 'recovery:progress:v1';

  beforeEach(async () => {
    await AsyncStorage.clear();
    recoveryMirrorMocks.loadBlobMirrorForUser.mockReset();
    vi.resetModules();
  });

  it('restores progress when AsyncStorage key is missing', async () => {
    recoveryMirrorMocks.loadBlobMirrorForUser.mockResolvedValue({
      currentStageId: 'stabilize',
      startedAt: '2026-04-01T00:00:00.000Z',
      completedStageIds: ['foundation'],
      currentWeek: 4,
    });
    const { getRecoveryProgress } = await import('@/lib/recovery');
    const p = await getRecoveryProgress();
    expect(p.currentStageId).toBe('stabilize');
    expect(p.completedStageIds).toContain('foundation');
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
  });

  it('prefers valid AsyncStorage over mirror', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentStageId: 'optimize',
        startedAt: '2026-04-01T00:00:00.000Z',
        completedStageIds: [],
        currentWeek: 7,
      }),
    );
    recoveryMirrorMocks.loadBlobMirrorForUser.mockResolvedValue({
      currentStageId: 'thrive',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedStageIds: ['foundation', 'stabilize', 'optimize'],
      currentWeek: 12,
    });
    const { getRecoveryProgress } = await import('@/lib/recovery');
    const p = await getRecoveryProgress();
    expect(p.currentStageId).toBe('optimize');
    expect(recoveryMirrorMocks.loadBlobMirrorForUser).not.toHaveBeenCalled();
  });
});
