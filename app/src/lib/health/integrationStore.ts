import AsyncStorage from '@react-native-async-storage/async-storage';

import { initializeLocalDatabase } from '@/lib/localData/database';
import { saveHealthIntegrationSnapshot } from '@/lib/localData/healthIntegrationSnapshotRepository';
import { supabase } from '@/lib/supabase';

export type IntegrationId =
  | 'google_fit'
  | 'health_connect'
  | 'samsung_health'
  | 'apple_healthkit'
  | 'garmin'
  | 'huawei';

export type StoredConnection = {
  connected: boolean;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  lastValidatedAt?: string;
  validationSource?: 'stored' | 'sdk' | 'permissions';
  lastError?: string | null;
  manualDisconnect?: boolean;
};

export type StoredConnections = Record<IntegrationId, StoredConnection>;

const STORAGE_KEY = '@reclaim/health/connections';
const PREFERRED_KEY = '@reclaim/health/preferredIntegration';

async function loadConnections(): Promise<StoredConnections> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as StoredConnections;
    return JSON.parse(raw) as StoredConnections;
  } catch (e) {
    if (__DEV__) console.warn('[integrationStore] loadConnections failed, returning empty:', e);
    return {} as StoredConnections;
  }
}

async function mirrorConnectionsToLocalSnapshot(connections: StoredConnections): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const r = await initializeLocalDatabase();
    if (!r.ok) return;
    await saveHealthIntegrationSnapshot(user.id, connections);
  } catch {
    // Non-fatal: AsyncStorage remains authoritative for connectivity UX.
  }
}

async function saveConnections(connections: StoredConnections) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
  await mirrorConnectionsToLocalSnapshot(connections);
}

export async function getAllIntegrationStatuses(): Promise<StoredConnections> {
  return loadConnections();
}

export async function getIntegrationStatus(id: IntegrationId): Promise<StoredConnection | null> {
  const state = await loadConnections();
  return state[id] ?? null;
}

export async function setIntegrationStatus(
  id: IntegrationId,
  status: StoredConnection
): Promise<void> {
  const state = await loadConnections();
  state[id] = status;
  await saveConnections(state);
}

export async function markIntegrationConnected(id: IntegrationId): Promise<void> {
  await setIntegrationStatus(id, {
    connected: true,
    lastConnectedAt: new Date().toISOString(),
    lastError: null,
    manualDisconnect: false,
  });
  const preferred = await getPreferredIntegration();
  if (!preferred) {
    await setPreferredIntegration(id);
  }
}

export async function markIntegrationError(id: IntegrationId, error: Error | string): Promise<void> {
  const message = typeof error === 'string' ? error : error?.message ?? 'Unknown error';
  const current = await getIntegrationStatus(id);
  await setIntegrationStatus(id, {
    connected: false,
    lastConnectedAt: current?.lastConnectedAt,
    lastDisconnectedAt: new Date().toISOString(),
    lastError: message,
    manualDisconnect: current?.manualDisconnect ?? false,
  });
}

export async function markIntegrationDisconnected(
  id: IntegrationId,
  options: { manual?: boolean } = {},
): Promise<void> {
  const current = await getIntegrationStatus(id);
  const manualDisconnect = options.manual === true;
  await setIntegrationStatus(id, {
    connected: false,
    lastDisconnectedAt: new Date().toISOString(),
    lastError: null,
    manualDisconnect,
    lastConnectedAt: current?.lastConnectedAt,
  });

  const preferred = await getPreferredIntegration();
  if (preferred === id) {
    await AsyncStorage.removeItem(PREFERRED_KEY);
  }
}

export async function getConnectedIntegrations(): Promise<IntegrationId[]> {
  const state = await loadConnections();
  return (Object.keys(state) as IntegrationId[]).filter((id) => state[id]?.connected);
}

export async function getOrderedIntegrations(): Promise<IntegrationId[]> {
  const connected = await getConnectedIntegrations();
  const preferred = await getPreferredIntegration();
  const others = (Object.keys(await loadConnections()) as IntegrationId[]).filter(
    (id) => !connected.includes(id),
  );
  const orderedConnected = preferred
    ? [preferred, ...connected.filter((id) => id !== preferred)]
    : connected;
  return [...orderedConnected, ...others];
}

export async function setPreferredIntegration(id: IntegrationId): Promise<void> {
  await AsyncStorage.setItem(PREFERRED_KEY, id);
}

export async function getPreferredIntegration(): Promise<IntegrationId | null> {
  try {
    const value = await AsyncStorage.getItem(PREFERRED_KEY);
    return (value as IntegrationId | null) ?? null;
  } catch (e) {
    if (__DEV__) console.warn('[integrationStore] getPreferredIntegration failed:', e);
    return null;
  }
}

