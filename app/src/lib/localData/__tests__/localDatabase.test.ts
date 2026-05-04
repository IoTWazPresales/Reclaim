import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const execAsync = vi.fn(async () => undefined);
  const openDatabaseAsync = vi.fn(async () => ({
    execAsync,
    getFirstAsync: vi.fn(async (sql: string) => {
      if (String(sql).includes('user_version')) return { user_version: 0 };
      return null;
    }),
    withTransactionAsync: vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
  }));
  return { execAsync, openDatabaseAsync };
});

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: hoisted.openDatabaseAsync,
}));

describe('local database', () => {
  beforeEach(() => {
    hoisted.execAsync.mockClear();
    hoisted.openDatabaseAsync.mockClear();
    hoisted.openDatabaseAsync.mockImplementation(async () => ({
      execAsync: hoisted.execAsync,
      getFirstAsync: vi.fn(async (sql: string) => {
        if (String(sql).includes('user_version')) return { user_version: 0 };
        return null;
      }),
      withTransactionAsync: vi.fn(async (fn: () => Promise<void>) => {
        await fn();
      }),
    }));
  });

  afterEach(async () => {
    vi.resetModules();
    const { __resetLocalDatabaseForTests } = await import('@/lib/localData/database');
    __resetLocalDatabaseForTests();
  });

  afterAll(async () => {
    vi.resetModules();
    const { __resetLocalDatabaseForTests } = await import('@/lib/localData/database');
    __resetLocalDatabaseForTests();
  });

  it('runs migrations once and bumps PRAGMA user_version', async () => {
    const { initializeLocalDatabase } = await import('@/lib/localData/database');
    const r = await initializeLocalDatabase();
    expect(r.ok).toBe(true);

    const pragmas = hoisted.execAsync.mock.calls
      .map((c) => String((c as unknown[])[0] ?? ''))
      .filter((s) => s.includes('user_version'));
    expect(pragmas.some((s) => s.includes('PRAGMA user_version = 1'))).toBe(true);
    expect(pragmas.some((s) => s.includes('PRAGMA user_version = 2'))).toBe(true);
    expect(pragmas.some((s) => s.includes('PRAGMA user_version = 3'))).toBe(true);
    expect(pragmas.some((s) => s.includes('PRAGMA user_version = 4'))).toBe(true);
    expect(pragmas.some((s) => s.includes('PRAGMA user_version = 5'))).toBe(true);

    const ddl = hoisted.execAsync.mock.calls.map((c) => String((c as unknown[])[0] ?? '')).join('\n');
    expect(ddl).toContain('reclaim_sync_metadata');
    expect(ddl).toContain('reclaim_local_sleep_session');
    expect(ddl).toContain('reclaim_mood_pending');
    expect(ddl).toContain('reclaim_routine_day_state');
    expect(ddl).toContain('reclaim_read_cache');
  });

  it('second initializeLocalDatabase is idempotent (singleton)', async () => {
    const { initializeLocalDatabase } = await import('@/lib/localData/database');
    await initializeLocalDatabase();
    await initializeLocalDatabase();
    expect(hoisted.openDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  it('skips already-applied migration when user_version is current', async () => {
    hoisted.openDatabaseAsync.mockImplementation(async () => ({
      execAsync: hoisted.execAsync,
      getFirstAsync: vi.fn(async (sql: string) => {
        if (String(sql).includes('user_version')) return { user_version: 5 };
        return null;
      }),
      withTransactionAsync: vi.fn(async (fn: () => Promise<void>) => {
        await fn();
      }),
    }));

    const { runMigrations } = await import('@/lib/localData/database');
    const db = await hoisted.openDatabaseAsync();
    await runMigrations(db as any);
    expect(hoisted.execAsync).not.toHaveBeenCalled();
  });

  it('failed open surfaces failed status', async () => {
    hoisted.openDatabaseAsync.mockImplementation(async () => {
      throw new Error('boom');
    });

    const { initializeLocalDatabase, getLocalDbLastError, __resetLocalDatabaseForTests } =
      await import('@/lib/localData/database');
    __resetLocalDatabaseForTests();

    const r = await initializeLocalDatabase();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('boom');
    expect(getLocalDbLastError()?.message).toBe('boom');
  });
});
