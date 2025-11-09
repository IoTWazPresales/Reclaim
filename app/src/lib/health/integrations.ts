import { Alert, Platform } from 'react-native';
import * as HealthConnect from 'react-native-health-connect';

import {
  IntegrationId,
  StoredConnection,
  getAllIntegrationStatuses,
  getIntegrationStatus,
  markIntegrationConnected,
  markIntegrationDisconnected,
  markIntegrationError,
} from './integrationStore';
import type { HealthPlatform, HealthMetric } from './types';
import { GoogleFitProvider } from './providers/googleFit';
import { AppleHealthKitProvider } from './providers/appleHealthKit';

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
  'steps',
  'active_energy',
  'activity_level',
];

async function connectGoogleFit(): Promise<{ success: boolean; message?: string }> {
  try {
    if (Platform.OS !== 'android') {
      return { success: false, message: 'Google Fit is only available on Android devices.' };
    }

    const provider = new GoogleFitProvider();
    const available = await provider.isAvailable();
    if (!available) {
      return {
        success: false,
        message: 'Google Fit app not detected. Install Google Fit and try again.',
      };
    }

    const granted = await provider.requestPermissions(METRICS);
    if (!granted) {
      await markIntegrationError('google_fit', 'Permissions declined');
      return { success: false, message: 'Google Fit permissions were declined.' };
    }

    await markIntegrationConnected('google_fit');
    return { success: true };
  } catch (error: any) {
    await markIntegrationError('google_fit', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to connect to Google Fit.',
    };
  }
}

async function disconnectGoogleFit(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const GoogleFit = require('react-native-google-fit').default;
      if (GoogleFit?.disconnect) {
        GoogleFit.disconnect();
      }
    } catch {
      // ignore
    }
  }
  await markIntegrationDisconnected('google_fit');
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
    return { success: false, message: 'Health Connect is only available on Android.' };
  }

  try {
    const isAvailable = await HealthConnect.isAvailable?.();
    if (!isAvailable) {
      return {
        success: false,
        message: 'Health Connect is not installed. Install the Health Connect beta from Google Play.',
      };
    }

    await HealthConnect.initialize?.();

    const permissions = [
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'Weight' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'SleepStage' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'RestingHeartRate' },
    ];

    const granted = await HealthConnect.requestPermission?.(permissions);
    const allGranted = Array.isArray(granted)
      ? granted.every((item: { granted: boolean }) => item.granted)
      : false;

    if (!allGranted) {
      await markIntegrationError('health_connect', 'Permissions declined');
      return { success: false, message: 'Health Connect permissions were declined.' };
    }

    await markIntegrationConnected('health_connect');
    return { success: true };
  } catch (error: any) {
    await markIntegrationError('health_connect', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to connect to Health Connect.',
    };
  }
}

async function connectSamsungHealth(): Promise<{ success: boolean; message?: string }> {
  const message =
    'Samsung Health requires the Samsung Health Provider SDK, which is not yet integrated. ' +
    'Refer to Samsung Health Developer Portal to register the app and obtain credentials.';
  Alert.alert('Samsung Health', message);
  await markIntegrationError('samsung_health', message);
  return { success: false, message };
}

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
    case 'samsung_health':
      return 'samsung_health';
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
    id: 'google_fit',
    title: 'Google Fit',
    subtitle: 'Sync data from Google Fit',
    platform: 'google_fit',
    supported: Platform.OS === 'android',
    icon: { type: 'MaterialCommunityIcons', name: 'google-fit' },
    connect: connectGoogleFit,
    disconnect: disconnectGoogleFit,
  },
  {
    id: 'health_connect',
    title: 'Health Connect',
    subtitle: 'Sync via Android Health Connect',
    platform: 'health_connect',
    supported: Platform.OS === 'android',
    icon: { type: 'MaterialCommunityIcons', name: 'heart-pulse' },
    connect: connectHealthConnect,
  },
  {
    id: 'samsung_health',
    title: 'Samsung Health',
    subtitle: 'Direct Samsung device sync (coming soon)',
    platform: 'samsung_health',
    supported: Platform.OS === 'android',
    icon: { type: 'MaterialCommunityIcons', name: 'cellphone' },
    connect: connectSamsungHealth,
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
  const statuses = await getAllIntegrationStatuses();
  return DEFINITIONS.map((definition) => ({
    ...definition,
    status: statuses[definition.id] ?? null,
  }));
}


