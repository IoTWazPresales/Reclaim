import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Hoisted so vi.mock factory stays pure (no importOriginal → avoids Expo harness load). */
const moodMirrorMocks = vi.hoisted(() => ({
  loadMoodPendingMirrorForUser: vi.fn(),
  replaceMoodPendingMirror: vi.fn(),
}));

vi.mock('@/lib/localData/database', () => ({
  initializeLocalDatabase: vi.fn(async () => ({ ok: true, status: 'ready' as const })),
}));

vi.mock('@/lib/localData/smallModuleMirrors', () => ({
  replaceMoodPendingMirror: (...args: unknown[]) => moodMirrorMocks.replaceMoodPendingMirror(...args),
  loadMoodPendingMirrorForUser: (...args: unknown[]) =>
    moodMirrorMocks.loadMoodPendingMirrorForUser(...args),
  isValidPendingMoodRow: (r: unknown): boolean => {
    if (!r || typeof r !== 'object') return false;
    const o = r as Record<string, unknown>;
    return (
      typeof o.localId === 'string' &&
      typeof o.rating === 'number' &&
      typeof o.ts === 'string' &&
      typeof o.day_date === 'string' &&
      typeof o.enqueuedAt === 'string' &&
      typeof o.retryCount === 'number' &&
      (o.kind === 'user' || o.kind === 'legacy_import')
    );
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

describe('moodOutbox', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    vi.resetModules();
    moodMirrorMocks.loadMoodPendingMirrorForUser.mockReset();
    moodMirrorMocks.replaceMoodPendingMirror.mockReset();
    moodMirrorMocks.loadMoodPendingMirrorForUser.mockResolvedValue([]);
    moodMirrorMocks.replaceMoodPendingMirror.mockResolvedValue(undefined);
  });

  function validPending() {
    return {
      localId: 'lid-1',
      rating: 4,
      ts: '2025-06-01T10:00:00.000Z',
      day_date: '2025-06-01',
      note: null,
      tags: null,
      energy: null,
      source: 'manual',
      enqueuedAt: '2025-06-01T10:00:00.000Z',
      retryCount: 0,
      kind: 'user' as const,
    };
  }

  it('dedupes append by localId', async () => {
    const mod = await import('../moodOutbox');
    const base = {
      localId: 'same-id',
      rating: 4,
      ts: '2025-06-01T10:00:00.000Z',
      day_date: '2025-06-01',
      note: null,
      tags: null,
      energy: null,
      source: 'manual',
      enqueuedAt: '2025-06-01T10:00:00.000Z',
      retryCount: 0,
      kind: 'user' as const,
    };
    await mod.appendPendingMoodCheckin(base);
    await mod.appendPendingMoodCheckin({ ...base, rating: 5 });
    const rows = await mod.loadPendingMoodCheckins();
    expect(rows.length).toBe(1);
    expect(rows[0].rating).toBe(5);
    expect(moodMirrorMocks.replaceMoodPendingMirror).toHaveBeenCalled();
  });

  it('loads canonical localData when AsyncStorage key is missing', async () => {
    const row = validPending();
    moodMirrorMocks.loadMoodPendingMirrorForUser.mockResolvedValue([row]);
    const mod = await import('../moodOutbox');
    const rows = await mod.loadPendingMoodCheckins();
    expect(rows).toHaveLength(1);
    expect(rows[0].localId).toBe('lid-1');
    const raw = await AsyncStorage.getItem(mod.MOOD_PENDING_KEY_V2);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed).toHaveLength(1);
  });

  it('returns empty when intentional empty array and aligns legacy AsyncStorage', async () => {
    const mod = await import('../moodOutbox');
    await AsyncStorage.setItem(mod.MOOD_PENDING_KEY_V2, '[]');
    moodMirrorMocks.loadMoodPendingMirrorForUser.mockResolvedValue([]);
    const rows = await mod.loadPendingMoodCheckins();
    expect(rows).toEqual([]);
    expect(moodMirrorMocks.loadMoodPendingMirrorForUser).toHaveBeenCalled();
  });

  it('prefers localData canonical rows over stale legacy AsyncStorage', async () => {
    const mod = await import('../moodOutbox');
    const asRow = { ...validPending(), localId: 'from-as', rating: 2 };
    await AsyncStorage.setItem(mod.MOOD_PENDING_KEY_V2, JSON.stringify([asRow]));
    moodMirrorMocks.loadMoodPendingMirrorForUser.mockResolvedValue([
      { ...validPending(), localId: 'from-sql', rating: 9 },
    ]);
    const rows = await mod.loadPendingMoodCheckins();
    expect(rows).toHaveLength(1);
    expect(rows[0].localId).toBe('from-sql');
    const aligned = await AsyncStorage.getItem(mod.MOOD_PENDING_KEY_V2);
    expect(JSON.parse(aligned as string)[0].localId).toBe('from-sql');
  });

  it('migrates legacy AsyncStorage when localData has no pending rows', async () => {
    moodMirrorMocks.loadMoodPendingMirrorForUser.mockResolvedValue([]);
    const mod = await import('../moodOutbox');
    const row = validPending();
    await AsyncStorage.setItem(mod.MOOD_PENDING_KEY_V2, JSON.stringify([row]));
    const rows = await mod.loadPendingMoodCheckins();
    expect(rows).toHaveLength(1);
    expect(rows[0].localId).toBe('lid-1');
    expect(moodMirrorMocks.replaceMoodPendingMirror).toHaveBeenCalledWith([row]);
  });
});
