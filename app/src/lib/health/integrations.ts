import { Alert, Platform } from 'react-native';

import {
  IntegrationId,
  StoredConnection,
  getAllIntegrationStatuses,
  getIntegrationStatus,
  markIntegrationConnected,
  markIntegrationDisconnected,
  markIntegrationError,
  setIntegrationStatus,
} from './integrationStore';
import type { HealthPlatform, HealthMetric } from './types';
import { AppleHealthKitProvider } from './providers/appleHealthKit';
import {
  getHealthConnectAvailability,
  healthConnectHasPermissions,
  healthConnectRequestPermissions,
  healthConnectRevokeAllPermissions,
  HEALTH_CONNECT_DEFAULT_METRICS,
  HEALTH_CONNECT_SLEEP_METRICS,
  HEALTH_CONNECT_MIN_ANDROID_VERSION,
} from './healthConnectService';
import { logger } from '@/lib/logger';
export type IntegrationIcon = {
  type: 'MaterialCommunityIcons';
  name: string;
};

export type IntegrationDefinition = {
  id: IntegrationId;
  title: string;
  subtitle: string;
  platform: HealthPlatform;
  supported: boolean;
  icon: IntegrationIcon;
  connect: () => Promise<{ success: boolean; message?: string }>;
  disconnect?: () => Promise<void>;
};

export type IntegrationWithStatus = IntegrationDefinition & {
  status: StoredConnection | null;
};

const METRICS: HealthMetric[] = [
  'sleep_analysis',
  'sleep_stages',
  'heart_rate',
  'resting_heart_rate',
  'heart_rate_variability',
  'active_energy',
];

// Only one native health permission flow at a time (Health Connect vs Apple).
let authUiInFlight: IntegrationId | null = null;
const disconnectProbeFailures: Partial<Record<IntegrationId, number>> = {};
const DISCONNECT_CONFIRMATION_FAILURES = 2;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function retryBooleanCheck(
  check: () => Promise<boolean>,
  attempts = 3,
  delayMs = 300,
  checkTimeoutMs = 4_000,
  label = 'integration_check',
): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    const ok = await withTimeout(
      check().catch(() => false),
      checkTimeoutMs,
      `${label}_attempt_${i + 1}`,
    ).catch(() => false);
    if (ok) return true;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

function getAndroidApiLevel(): number {
  if (Platform.OS !== 'android') return 0;
  const version =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);
  return Number.isFinite(version) ? version : 0;
}

async function connectAppleHealth(): Promise<{ success: boolean; message?: string }> {
  if (Platform.OS !== 'ios') {
    return { success: false, message: 'Apple Health is only supported on iOS.' };
  }

  try {
    const provider = new AppleHealthKitProvider();
    const available = await provider.isAvailable();
    if (!available) {
      return {
        success: false,
        message: 'Apple Health is not available on this device.',
      };
    }

    const granted = await provider.requestPermissions(METRICS);
    if (!granted) {
      await markIntegrationError('apple_healthkit', 'Permissions declined');
      return { success: false, message: 'Apple Health permissions were declined.' };
    }

    await markIntegrationConnected('apple_healthkit');
    return { success: true };
  } catch (error: any) {
    await markIntegrationError('apple_healthkit', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to connect to Apple Health.',
    };
  }
}

async function connectHealthConnect(): Promise<{ success: boolean; message?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, message: 'Health Connect is only available on Android devices.' };
  }

  if (authUiInFlight && authUiInFlight !== 'health_connect') {
    return { success: false, message: 'Another health permission flow is already in progress. Please try again.' };
  }
  authUiInFlight = 'health_connect';

  const availability = await getHealthConnectAvailability();
  if (availability === 'unsupported') {
    const message = 'Health Connect requires Android 13 or later.';
    await markIntegrationError('health_connect', message);
    authUiInFlight = null;
    return { success: false, message };
  }
  if (availability === 'needs_install') {
    const message =
      'Install the Health Connect app from Google Play, open it once, and then try connecting again.';
    await markIntegrationError('health_connect', message);
    authUiInFlight = null;
    return { success: false, message };
  }
  if (availability === 'needs_update') {
    const message = 'Update the Health Connect app from Google Play, then try connecting again.';
    await markIntegrationError('health_connect', message);
    authUiInFlight = null;
    return { success: false, message };
  }

  try {
    // Additive expansion: request sleep + activity + vitals metrics (no change to connection flow).
    const granted = await healthConnectRequestPermissions(HEALTH_CONNECT_DEFAULT_METRICS);
    if (!granted) {
      const message = 'Health Connect permissions were declined.';
      await markIntegrationError('health_connect', message);
      return { success: false, message };
    }
    // Sleep permission is the minimum contract for "connected" in this screen.
    const verified = await retryBooleanCheck(
      () => healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS),
      8,
      400,
      4_000,
      'health_connect_post_connect_permissions',
    );
    if (!verified) {
      const message =
        'Health Connect consent completed, but required permissions were not fully granted. Please retry and keep the app in foreground.';
      await markIntegrationError('health_connect', message);
      return { success: false, message };
    }
    await markIntegrationConnected('health_connect');
    return { success: true };
  } catch (error: any) {
    await markIntegrationError('health_connect', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to connect to Health Connect.',
    };
  } finally {
    if (authUiInFlight === 'health_connect') authUiInFlight = null;
  }
}

async function disconnectHealthConnect(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await healthConnectRevokeAllPermissions();
      // Revoke can be asynchronous on some devices; wait for permission state to settle.
      await retryBooleanCheck(
        async () => !(await healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS)),
        8,
        350,
        4_000,
        'health_connect_disconnect_settle',
      );
    } catch (e) {
      if (__DEV__) console.warn('[integrations] Health Connect revoke failed, proceeding with local disconnect:', e);
    }
  }
  await markIntegrationDisconnected('health_connect', { manual: true });
}

// Samsung Health integrations have been removed for now.

async function connectGarmin(): Promise<{ success: boolean; message?: string }> {
  const message =
    'Garmin Health API requires approval from Garmin and OAuth credentials. Once credentials ' +
    'are available, update the connector to complete the integration.';
  Alert.alert('Garmin Connect', message);
  await markIntegrationError('garmin', message);
  return { success: false, message };
}

async function connectHuawei(): Promise<{ success: boolean; message?: string }> {
  const message =
    'Huawei Health integration depends on Huawei Mobile Services (HMS) Health Kit. ' +
    'Set up an HMS developer account and supply credentials to enable this connector.';
  Alert.alert('Huawei Health', message);
  await markIntegrationError('huawei', message);
  return { success: false, message };
}

export function getPlatformForIntegration(id: IntegrationId): HealthPlatform {
  switch (id) {
    case 'google_fit':
      return 'google_fit';
    case 'health_connect':
      return 'health_connect';
    case 'apple_healthkit':
      return 'apple_healthkit';
    case 'garmin':
      return 'garmin';
    case 'huawei':
      return 'huawei';
    default:
      return 'unknown';
  }
}

const DEFINITIONS: IntegrationDefinition[] = [
  {
    id: 'health_connect',
    title: 'Health Connect',
    subtitle: 'Sync via Android Health Connect',
    platform: 'health_connect',
    supported:
      Platform.OS === 'android' &&
      getAndroidApiLevel() >= HEALTH_CONNECT_MIN_ANDROID_VERSION,
    icon: { type: 'MaterialCommunityIcons', name: 'alpha-h-circle' },
    connect: connectHealthConnect,
    disconnect: disconnectHealthConnect,
  },
  {
    id: 'apple_healthkit',
    title: 'Apple Health',
    subtitle: 'Sync from Apple HealthKit',
    platform: 'apple_healthkit',
    supported: Platform.OS === 'ios',
    icon: { type: 'MaterialCommunityIcons', name: 'apple' },
    connect: connectAppleHealth,
  },
  {
    id: 'garmin',
    title: 'Garmin Connect',
    subtitle: 'Garmin Health API (setup required)',
    platform: 'garmin',
    supported: true,
    icon: { type: 'MaterialCommunityIcons', name: 'watch-variant' },
    connect: connectGarmin,
  },
  {
    id: 'huawei',
    title: 'Huawei Health',
    subtitle: 'Huawei HMS Health Kit (setup required)',
    platform: 'huawei',
    supported: true,
    icon: { type: 'MaterialCommunityIcons', name: 'cellphone-wireless' },
    connect: connectHuawei,
  },
];

export function getIntegrationDefinitions(): IntegrationDefinition[] {
  return DEFINITIONS;
}

async function getRuntimeConnectionState(id: IntegrationId): Promise<boolean | null> {
  if (id === 'google_fit') {
    return false;
  }
  if (id === 'health_connect') {
    if (Platform.OS !== 'android') return false;
    try {
      const availability = await getHealthConnectAvailability().catch(() => 'unsupported');
      if (availability !== 'available') return false;
      return await healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS).catch(() => false);
    } catch (e) {
      if (__DEV__) console.warn('[integrations] getRuntimeConnectionState HC check failed:', e);
      return false;
    }
  }
  return null;
}

export async function reconcileStoredIntegrationStatuses(
  options: { force?: boolean; maxAgeMs?: number; allowManualReconnect?: boolean } = {},
): Promise<void> {
  const maxAgeMs = options.maxAgeMs ?? 60_000;
  const statuses = await getAllIntegrationStatuses();
  const ids = Object.keys(statuses) as IntegrationId[];
  for (const id of ids) {
    const stored = statuses[id];
    if (!stored) continue;
    const validatedMs = stored.lastValidatedAt ? new Date(stored.lastValidatedAt).getTime() : 0;
    if (
      !options.force &&
      Number.isFinite(validatedMs) &&
      validatedMs > 0 &&
      Date.now() - validatedMs < maxAgeMs
    ) {
      continue;
    }
    let runtimeConnected = await getRuntimeConnectionState(id);
    if (runtimeConnected === null) continue;
    if (stored.connected && !runtimeConnected) {
      await new Promise((r) => setTimeout(r, 400));
      runtimeConnected = await getRuntimeConnectionState(id);
      if (stored.connected && !runtimeConnected) {
        await new Promise((r) => setTimeout(r, 600));
        runtimeConnected = await getRuntimeConnectionState(id);
      }
    }
    if (runtimeConnected === null) continue;
    let effectiveRuntimeConnected = runtimeConnected;
    if (stored.connected && !runtimeConnected && !stored.manualDisconnect) {
      const failures = (disconnectProbeFailures[id] ?? 0) + 1;
      disconnectProbeFailures[id] = failures;
      if (failures < DISCONNECT_CONFIRMATION_FAILURES) {
        // Treat first miss as transient to avoid flipping connection status on flaky probes.
        effectiveRuntimeConnected = true;
        logger.debug('[Integrations] transient disconnect probe ignored', {
          id,
          failures,
          required: DISCONNECT_CONFIRMATION_FAILURES,
        });
      }
    } else {
      disconnectProbeFailures[id] = 0;
    }
    if (stored.manualDisconnect && effectiveRuntimeConnected && !options.allowManualReconnect) {
      await setIntegrationStatus(id, {
        ...stored,
        connected: false,
        lastValidatedAt: new Date().toISOString(),
        validationSource: 'permissions',
      });
      continue;
    }
    if (!!stored.connected !== effectiveRuntimeConnected) {
      if (effectiveRuntimeConnected) {
        await markIntegrationConnected(id);
      } else {
        await markIntegrationDisconnected(id);
      }
    }
    await setIntegrationStatus(id, {
      connected: effectiveRuntimeConnected,
      lastConnectedAt: effectiveRuntimeConnected
        ? stored.lastConnectedAt ?? new Date().toISOString()
        : stored.lastConnectedAt,
      lastDisconnectedAt: effectiveRuntimeConnected ? stored.lastDisconnectedAt : stored.lastDisconnectedAt ?? new Date().toISOString(),
      lastValidatedAt: new Date().toISOString(),
      validationSource: 'permissions',
      lastError: effectiveRuntimeConnected ? null : stored.lastError ?? null,
      manualDisconnect: effectiveRuntimeConnected ? false : stored.manualDisconnect ?? false,
    });
  }
}

export async function getIntegrationWithStatus(
  id: IntegrationId
): Promise<IntegrationWithStatus | null> {
  const definition = DEFINITIONS.find((item) => item.id === id);
  if (!definition) return null;
  const status = await getIntegrationStatus(id);
  return {
    ...definition,
    status,
  };
}

export async function getIntegrationsWithStatus(): Promise<IntegrationWithStatus[]> {
  await reconcileStoredIntegrationStatuses();
  const statuses = await getAllIntegrationStatuses();
  return DEFINITIONS.map((definition) => ({
    ...definition,
    status: statuses[definition.id] ?? null,
  }));
}


