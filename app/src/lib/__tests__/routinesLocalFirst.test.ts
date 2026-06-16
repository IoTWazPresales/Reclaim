import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RoutineSuggestionRemote, RoutineStateByTemplate } from '@/lib/routines';

const hoisted = vi.hoisted(() => {
  const routineRows = new Map<string, string>();
  const mockDb = {
    getFirstAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      if (!String(sql).includes('reclaim_routine_day_state')) return null;
      const uid = params?.[0] as string;
      const day = params?.[1] as string;
      const payload = routineRows.get(`${uid}|${day}`);
      return payload !== undefined ? { payload_json: payload } : null;
    }),
    runAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      if (!String(sql).includes('reclaim_routine_day_state')) return;
      const uid = params?.[0] as string;
      const day = params?.[1] as string;
      const payload = params?.[2] as string;
      routineRows.set(`${uid}|${day}`, payload);
    }),
  };
  const getUser = vi.fn();
  return { routineRows, mockDb, getUser };
});

vi.mock('@/lib/localData/database', () => ({
  initializeLocalDatabase: vi.fn(async () => ({ ok: true, status: 'ready' as const })),
  requireLocalDatabase: () => hoisted.mockDb,
  __resetLocalDatabaseForTests: vi.fn(() => {
    hoisted.routineRows.clear();
    hoisted.mockDb.getFirstAsync.mockClear();
    hoisted.mockDb.runAsync.mockClear();
  }),
}));

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => hoisted.getUser(...args),
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

describe('mergeRemoteRoutineSuggestionsIntoLocal', () => {
  it('does not overwrite local accepted/skipped with remote suggested', async () => {
    const { mergeRemoteRoutineSuggestionsIntoLocal } = await import('@/lib/routines');
    const local: RoutineStateByTemplate = {
      breakfast: { templateId: 'breakfast', state: 'accepted', startISO: '2026-05-01T08:00:00.000Z' },
    };
    const remote: RoutineSuggestionRemote[] = [
      {
        id: '1',
        user_id: 'u',
        date: '2026-05-01',
        routine_template_id: 'breakfast',
        suggested_start_ts: null,
        suggested_end_ts: null,
        reason: null,
        state: 'suggested',
        created_at: '2026-05-01T00:00:00.000Z',
      },
    ];
    const merged = mergeRemoteRoutineSuggestionsIntoLocal(local, remote);
    expect(merged.breakfast?.state).toBe('accepted');
  });

  it('fills missing templates from remote', async () => {
    const { mergeRemoteRoutineSuggestionsIntoLocal } = await import('@/lib/routines');
    const local: RoutineStateByTemplate = {};
    const remote: RoutineSuggestionRemote[] = [
      {
        id: '2',
        user_id: 'u',
        date: '2026-05-01',
        routine_template_id: 'lunch',
        suggested_start_ts: '2026-05-01T12:00:00.000Z',
        suggested_end_ts: null,
        reason: null,
        state: 'suggested',
        created_at: '2026-05-01T00:00:00.000Z',
      },
    ];
    const merged = mergeRemoteRoutineSuggestionsIntoLocal(local, remote);
    expect(merged.lunch?.state).toBe('suggested');
    expect(merged.lunch?.startISO).toBe('2026-05-01T12:00:00.000Z');
  });
});

describe('loadRoutineState / saveRoutineState', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    hoisted.routineRows.clear();
    hoisted.mockDb.getFirstAsync.mockClear();
    hoisted.mockDb.runAsync.mockClear();
    hoisted.getUser.mockReset();
    vi.resetModules();
  });

  it('signed-in: reads canonical SQLite before legacy AsyncStorage when both differ', async () => {
    hoisted.getUser.mockResolvedValue({ data: { user: { id: 'u-sig' } } });
    const day = '2026-05-10';
    const canonical: RoutineStateByTemplate = {
      breakfast: { templateId: 'breakfast', state: 'accepted' },
    };
    hoisted.routineRows.set(`u-sig|${day}`, JSON.stringify(canonical));

    const legacyKey = `@reclaim/routines/${day}`;
    await AsyncStorage.setItem(
      legacyKey,
      JSON.stringify({ breakfast: { templateId: 'breakfast', state: 'skipped' } }),
    );

    const { loadRoutineState } = await import('@/lib/routines');
    const loaded = await loadRoutineState(day);
    expect(loaded.breakfast?.state).toBe('accepted');
  });

  it('signed-in: save writes SQLite before AsyncStorage compatibility key', async () => {
    hoisted.getUser.mockResolvedValue({ data: { user: { id: 'u-save' } } });
    const day = '2026-05-11';
    const state: RoutineStateByTemplate = {
      dinner: { templateId: 'dinner', state: 'skipped' },
    };

    const setItemSpy = vi.spyOn(AsyncStorage, 'setItem');

    const { saveRoutineState } = await import('@/lib/routines');
    await saveRoutineState(day, state);

    expect(hoisted.mockDb.runAsync).toHaveBeenCalled();
    const legacyKey = `@reclaim/routines/${day}`;
    expect(setItemSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    const lastSet = setItemSpy.mock.calls.at(-1);
    expect(lastSet?.[0]).toBe(legacyKey);
    expect(JSON.parse(String(lastSet?.[1]))).toEqual(state);
  });

  it('offline / no user: reads AsyncStorage without SQLite', async () => {
    hoisted.getUser.mockResolvedValue({ data: { user: null } });
    const day = '2026-05-12';
    const legacy: RoutineStateByTemplate = {
      walk_break: { templateId: 'walk_break', state: 'accepted' },
    };
    await AsyncStorage.setItem(`@reclaim/routines/${day}`, JSON.stringify(legacy));

    const { loadRoutineState } = await import('@/lib/routines');
    const loaded = await loadRoutineState(day);
    expect(loaded).toEqual(legacy);
    expect(hoisted.mockDb.getFirstAsync).not.toHaveBeenCalled();
  });

  it('migrates legacy AsyncStorage into SQLite on first signed-in load', async () => {
    hoisted.getUser.mockResolvedValue({ data: { user: { id: 'u-mig' } } });
    const day = '2026-05-13';
    const legacy: RoutineStateByTemplate = {
      lunch: { templateId: 'lunch', state: 'accepted' },
    };
    await AsyncStorage.setItem(`@reclaim/routines/${day}`, JSON.stringify(legacy));

    const { loadRoutineState } = await import('@/lib/routines');
    const loaded = await loadRoutineState(day);
    expect(loaded).toEqual(legacy);
    expect(hoisted.mockDb.runAsync).toHaveBeenCalled();
    expect(hoisted.routineRows.get(`u-mig|${day}`)).toBe(JSON.stringify(legacy));
  });
});
