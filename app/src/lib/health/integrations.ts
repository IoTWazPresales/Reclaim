import { Alert, Platform } from 'react-native';

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
    
    // Check availability
    let available = false;
    try {
      available = await provider.isAvailable();
    } catch (availError: any) {
      console.error('[GoogleFit] Error checking availability:', availError);
      await markIntegrationError('google_fit', `Availability check failed: ${availError?.message ?? 'Unknown error'}`);
      return {
        success: false,
        message: `Google Fit availability check failed: ${availError?.message ?? 'Please ensure Google Fit is installed and try again.'}`,
      };
    }
    
    if (!available) {
      await markIntegrationError('google_fit', 'Google Fit not available');
      return {
        success: false,
        message: 'Google Fit app not detected. Please:\n\n1. Install Google Fit from Play Store\n2. Sign in to Google Fit\n3. Restart this app and try again',
      };
    }

    // Request permissions with better error handling
    let granted = false;
    try {
      granted = await provider.requestPermissions(METRICS);
    } catch (permError: any) {
      console.error('[GoogleFit] Error requesting permissions:', permError);
      await markIntegrationError('google_fit', `Permission request failed: ${permError?.message ?? 'Unknown error'}`);
      
      // Check if it's an OAuth configuration issue
      const errorMsg = permError?.message?.toLowerCase() || '';
      if (errorMsg.includes('oauth') || errorMsg.includes('client') || errorMsg.includes('credential')) {
        return {
          success: false,
          message: 'Google Fit OAuth configuration issue. Please verify:\n\n1. OAuth Client ID is configured in app.config.ts\n2. Package name matches Google Cloud Console\n3. SHA-1 certificate fingerprint is registered\n4. You\'re using a development build (not Expo Go)',
        };
      }
      
      return {
        success: false,
        message: `Failed to request permissions: ${permError?.message ?? 'Please try again or check app settings.'}`,
      };
    }
    
    if (!granted) {
      await markIntegrationError('google_fit', 'Permissions declined');
      return { 
        success: false, 
        message: 'Google Fit permissions were declined. Please:\n\n1. Grant ACTIVITY_RECOGNITION permission when prompted\n2. Grant Google Fit OAuth permissions\n3. Check Settings > Apps > Reclaim > Permissions' 
      };
    }

    await markIntegrationConnected('google_fit');
    return { success: true };
  } catch (error: any) {
    console.error('[GoogleFit] Unexpected error in connectGoogleFit:', error);
    console.error('[GoogleFit] Error stack:', error?.stack);
    await markIntegrationError('google_fit', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to connect to Google Fit. Please ensure Google Fit is installed and properly configured.',
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

// Health Connect and Samsung Health integrations have been removed for now.

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


