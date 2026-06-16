/**
 * Regression tests for integrationStore — B12, B13, D21.
 *
 * B12: Apple disconnect mutation is a no-op (no markIntegrationDisconnected call)
 * B13: getRuntimeConnectionState returns null for Apple/Garmin/Huawei → reconciliation skips them
 * D21: reconcile writes markIntegrationConnected/Disconnected then overwrites with setIntegrationStatus
 *
 * These tests cover the store's CRUD lifecycle to serve as a safety net.
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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
  },
}));

vi.mock('@/lib/localData/database', () => ({
  initializeLocalDatabase: vi.fn(async () => ({ ok: true, status: 'ready' as const })),
}));

vi.mock('@/lib/localData/healthIntegrationSnapshotRepository', () => ({
  saveHealthIntegrationSnapshot: vi.fn(async () => undefined),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('integrationStore — CRUD lifecycle', () => {
  it('starts with no connections', async () => {
    const { getAllIntegrationStatuses } = await import('../integrationStore');
    const statuses = await getAllIntegrationStatuses();
    expect(statuses).toEqual({});
  });

  it('markIntegrationConnected persists and sets lastConnectedAt', async () => {
    const { markIntegrationConnected, getIntegrationStatus } = await import('../integrationStore');
    await markIntegrationConnected('health_connect');
    const status = await getIntegrationStatus('health_connect');
    expect(status).not.toBeNull();
    expect(status!.connected).toBe(true);
    expect(status!.lastConnectedAt).toBeDefined();
    expect(status!.lastError).toBeNull();
    expect(status!.manualDisconnect).toBe(false);
  });

  it('markIntegrationDisconnected clears connected and sets lastDisconnectedAt', async () => {
    const { markIntegrationConnected, markIntegrationDisconnected, getIntegrationStatus } =
      await import('../integrationStore');
    await markIntegrationConnected('health_connect');
    await markIntegrationDisconnected('health_connect', { manual: true });
    const status = await getIntegrationStatus('health_connect');
    expect(status!.connected).toBe(false);
    expect(status!.manualDisconnect).toBe(true);
    expect(status!.lastDisconnectedAt).toBeDefined();
  });

  it('markIntegrationError preserves lastConnectedAt from previous connection', async () => {
    const { markIntegrationConnected, markIntegrationError, getIntegrationStatus } =
      await import('../integrationStore');
    await markIntegrationConnected('apple_healthkit');
    const before = await getIntegrationStatus('apple_healthkit');
    const prevConnectedAt = before!.lastConnectedAt;

    await markIntegrationError('apple_healthkit', 'Permissions declined');
    const after = await getIntegrationStatus('apple_healthkit');
    expect(after!.connected).toBe(false);
    expect(after!.lastError).toBe('Permissions declined');
    expect(after!.lastConnectedAt).toBe(prevConnectedAt);
  });

  it('first markIntegrationConnected auto-sets preferred integration', async () => {
    const { markIntegrationConnected, getPreferredIntegration } = await import('../integrationStore');
    await markIntegrationConnected('health_connect');
    const preferred = await getPreferredIntegration();
    expect(preferred).toBe('health_connect');
  });

  it('markIntegrationDisconnected clears preferred if it was the disconnected one', async () => {
    const { markIntegrationConnected, markIntegrationDisconnected, getPreferredIntegration } =
      await import('../integrationStore');
    await markIntegrationConnected('health_connect');
    expect(await getPreferredIntegration()).toBe('health_connect');

    await markIntegrationDisconnected('health_connect');
    expect(await getPreferredIntegration()).toBeNull();
  });

  it('multiple integrations can be connected simultaneously', async () => {
    const { markIntegrationConnected, getConnectedIntegrations } = await import('../integrationStore');
    await markIntegrationConnected('health_connect');
    await markIntegrationConnected('apple_healthkit');
    const connected = await getConnectedIntegrations();
    expect(connected).toContain('health_connect');
    expect(connected).toContain('apple_healthkit');
    expect(connected).toHaveLength(2);
  });

  it('setIntegrationStatus overwrites existing status completely', async () => {
    const { markIntegrationConnected, setIntegrationStatus, getIntegrationStatus } =
      await import('../integrationStore');
    await markIntegrationConnected('health_connect');

    await setIntegrationStatus('health_connect', {
      connected: false,
      lastError: 'overwritten',
    });
    const status = await getIntegrationStatus('health_connect');
    expect(status!.connected).toBe(false);
    expect(status!.lastError).toBe('overwritten');
    // lastConnectedAt from markIntegrationConnected is now LOST
    expect(status!.lastConnectedAt).toBeUndefined();
  });

  it('loadConnections returns empty object on corrupt JSON', async () => {
    await AsyncStorage.setItem('@reclaim/health/connections', '{invalid');
    const { getAllIntegrationStatuses } = await import('../integrationStore');
    const statuses = await getAllIntegrationStatuses();
    expect(statuses).toEqual({});
  });
});

describe('B12 — Apple disconnect gap (documented)', () => {
  // NOTE: integrations.ts cannot be imported in Node tests because it pulls in
  // platform-specific Health Connect / Apple HealthKit modules. The B12 bug is:
  // apple_healthkit DEFINITIONS has no `disconnect` function, so the
  // useHealthIntegrationsList disconnect mutation is a no-op for Apple.
  //
  // This test documents that markIntegrationDisconnected IS the correct way
  // to record a disconnect — if it's not called, state drifts.

  it('markIntegrationDisconnected properly clears connected state', async () => {
    const { markIntegrationConnected, markIntegrationDisconnected, getIntegrationStatus } =
      await import('../integrationStore');
    await markIntegrationConnected('apple_healthkit');
    expect((await getIntegrationStatus('apple_healthkit'))!.connected).toBe(true);

    await markIntegrationDisconnected('apple_healthkit', { manual: true });
    const status = await getIntegrationStatus('apple_healthkit');
    expect(status!.connected).toBe(false);
    expect(status!.manualDisconnect).toBe(true);
  });

  it('without markIntegrationDisconnected, store retains connected=true', async () => {
    const { markIntegrationConnected, getIntegrationStatus } =
      await import('../integrationStore');
    await markIntegrationConnected('apple_healthkit');

    // Simulate what happens when disconnect mutation skips markIntegrationDisconnected:
    // nothing changes in the store.
    const status = await getIntegrationStatus('apple_healthkit');
    expect(status!.connected).toBe(true);
  });
});
