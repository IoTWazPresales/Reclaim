import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

const recoveryRepoMocks = vi.hoisted(() => ({
  loadRecoveryProgressForUser: vi.fn(),
  tryMigrateRecoveryFromAsyncStorage: vi.fn(),
  saveRecoveryProgressForUser: vi.fn(),
}));

vi.mock('@/lib/localData/recoveryProgressRepository', () => ({
  loadRecoveryProgressForUser: (...args: unknown[]) =>
    recoveryRepoMocks.loadRecoveryProgressForUser(...args),
  tryMigrateRecoveryFromAsyncStorage: (...args: unknown[]) =>
    recoveryRepoMocks.tryMigrateRecoveryFromAsyncStorage(...args),
  saveRecoveryProgressForUser: (...args: unknown[]) =>
    recoveryRepoMocks.saveRecoveryProgressForUser(...args),
  RECOVERY_PROGRESS_LEGACY_STORAGE_KEY: 'recovery:progress:v1',
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

describe('recovery — localData canonical + legacy AsyncStorage', () => {
  const STORAGE_KEY = 'recovery:progress:v1';

  beforeEach(async () => {
    await AsyncStorage.clear();
    recoveryRepoMocks.loadRecoveryProgressForUser.mockReset();
    recoveryRepoMocks.tryMigrateRecoveryFromAsyncStorage.mockReset();
    recoveryRepoMocks.saveRecoveryProgressForUser.mockReset();
    recoveryRepoMocks.tryMigrateRecoveryFromAsyncStorage.mockResolvedValue(null);
    recoveryRepoMocks.saveRecoveryProgressForUser.mockResolvedValue(undefined);
    vi.resetModules();
  });

  it('loads canonical localData when AsyncStorage key is missing', async () => {
    recoveryRepoMocks.loadRecoveryProgressForUser.mockResolvedValue({
      currentStageId: 'stabilize',
      startedAt: '2026-04-01T00:00:00.000Z',
      completedStageIds: ['foundation'],
      currentWeek: 4,
    });
    const { getRecoveryProgress } = await import('@/lib/recovery');
    const p = await getRecoveryProgress();
    expect(p.currentStageId).toBe('stabilize');
    expect(p.completedStageIds).toContain('foundation');
    expect(recoveryRepoMocks.loadRecoveryProgressForUser).toHaveBeenCalledWith('test-user-1');
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
  });

  it('prefers localData canonical row over stale legacy AsyncStorage when both differ', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentStageId: 'optimize',
        startedAt: '2026-04-01T00:00:00.000Z',
        completedStageIds: [],
        currentWeek: 7,
      }),
    );
    recoveryRepoMocks.loadRecoveryProgressForUser.mockResolvedValue({
      currentStageId: 'thrive',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedStageIds: ['foundation', 'stabilize', 'optimize'],
      currentWeek: 12,
    });
    const { getRecoveryProgress } = await import('@/lib/recovery');
    const p = await getRecoveryProgress();
    expect(p.currentStageId).toBe('thrive');
    expect(recoveryRepoMocks.loadRecoveryProgressForUser).toHaveBeenCalled();
    const aligned = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(aligned as string).currentStageId).toBe('thrive');
  });
});
