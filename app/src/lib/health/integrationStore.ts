import AsyncStorage from '@react-native-async-storage/async-storage';

export type IntegrationId =
  | 'google_fit'
  | 'health_connect'
  | 'apple_healthkit'
  | 'garmin'
  | 'huawei';

export type StoredConnection = {
  connected: boolean;
  lastConnectedAt?: string;
  lastError?: string | null;
};

type StoredConnections = Record<IntegrationId, StoredConnection>;

const STORAGE_KEY = '@reclaim/health/connections';
const PREFERRED_KEY = '@reclaim/health/preferredIntegration';

async function loadConnections(): Promise<StoredConnections> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as StoredConnections;
    return JSON.parse(raw) as StoredConnections;
  } catch {
    return {} as StoredConnections;
  }
}

async function saveConnections(connections: StoredConnections) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
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
  });
  const preferred = await getPreferredIntegration();
  if (!preferred) {
    await setPreferredIntegration(id);
  }
}

export async function markIntegrationError(id: IntegrationId, error: Error | string): Promise<void> {
  const message = typeof error === 'string' ? error : error?.message ?? 'Unknown error';
  await setIntegrationStatus(id, {
    connected: false,
    lastError: message,
  });
}

export async function markIntegrationDisconnected(id: IntegrationId): Promise<void> {
  await setIntegrationStatus(id, {
    connected: false,
    lastError: null,
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
  } catch {
    return null;
  }
}

