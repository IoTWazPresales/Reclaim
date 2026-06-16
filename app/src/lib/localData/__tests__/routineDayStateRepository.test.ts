import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  return { routineRows, mockDb };
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

describe('routineDayStateRepository', () => {
  beforeEach(async () => {
    vi.resetModules();
    await AsyncStorage.clear();
    hoisted.routineRows.clear();
    hoisted.mockDb.getFirstAsync.mockClear();
    hoisted.mockDb.runAsync.mockClear();
  });

  function insertReplaceCalls() {
    return hoisted.mockDb.runAsync.mock.calls.filter((c) => String(c[0]).includes('INSERT OR REPLACE'));
  }

  it(
    'save then load roundtrips payload_json',
    async () => {
      const { saveRoutineDayStateForUser, loadRoutineDayStateForUser } = await import(
        '../routineDayStateRepository'
      );
      const day = '2026-05-01';
      const state = {
        breakfast: { templateId: 'breakfast', state: 'accepted' as const },
      };
      await saveRoutineDayStateForUser('u1', day, state);
      expect(insertReplaceCalls()).toHaveLength(1);
      const loaded = await loadRoutineDayStateForUser('u1', day);
      expect(loaded).toEqual(state);
    },
    15_000,
  );

  it('migrates legacy AsyncStorage into SQLite once (idempotent)', async () => {
    const day = '2026-05-02';
    const key = `@reclaim/routines/${day}`;
    const state = {
      lunch: { templateId: 'lunch', state: 'skipped' as const },
    };
    await AsyncStorage.setItem(key, JSON.stringify(state));

    const { tryMigrateRoutineDayFromAsyncStorage, loadRoutineDayStateForUser } = await import(
      '../routineDayStateRepository'
    );

    const first = await tryMigrateRoutineDayFromAsyncStorage('u1', day);
    expect(first).toEqual(state);
    expect(insertReplaceCalls()).toHaveLength(1);

    hoisted.mockDb.runAsync.mockClear();
    const second = await tryMigrateRoutineDayFromAsyncStorage('u1', day);
    expect(second).toEqual(state);
    expect(insertReplaceCalls()).toHaveLength(0);

    const direct = await loadRoutineDayStateForUser('u1', day);
    expect(direct).toEqual(state);
  });

  it('does not duplicate rows on repeated migration (same PK)', async () => {
    const day = '2026-05-03';
    const key = `@reclaim/routines/${day}`;
    await AsyncStorage.setItem(key, JSON.stringify({ breakfast: { templateId: 'breakfast', state: 'suggested' } }));

    const { tryMigrateRoutineDayFromAsyncStorage } = await import('../routineDayStateRepository');
    await tryMigrateRoutineDayFromAsyncStorage('u2', day);
    await tryMigrateRoutineDayFromAsyncStorage('u2', day);
    expect(hoisted.routineRows.size).toBe(1);
    expect(hoisted.routineRows.has(`u2|${day}`)).toBe(true);
  });
});
