import { Alert, Platform, NativeModules, Linking } from 'react-native';
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
import { SamsungHealthProvider } from './providers/samsungHealth';

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

async function connectHealthConnect(): Promise<{ success: boolean; message?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, message: 'Health Connect is only available on Android.' };
  }

  async function openHealthConnectStore() {
    const playStoreUrl = 'market://details?id=com.google.android.apps.healthdata';
    const webUrl = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';
    try {
      const canOpenMarket = await Linking.canOpenURL(playStoreUrl);
      await Linking.openURL(canOpenMarket ? playStoreUrl : webUrl);
    } catch (error) {
      console.warn('[HealthConnect] Failed to open Play Store listing:', error);
      Alert.alert(
        'Health Connect',
        'Unable to open the Play Store listing automatically. Please search for "Health Connect by Android" in the Play Store and install it manually.'
      );
    }
  }

  try {
    // Use the provider's isAvailable method for consistency
    const { HealthConnectProvider } = await import('./providers/healthConnect');
    const provider = new HealthConnectProvider();
    
    let available = false;
    try {
      available = await provider.isAvailable();
    } catch (availError: any) {
      console.error('[HealthConnect] Error checking availability:', availError);
      await markIntegrationError('health_connect', `Availability check failed: ${availError?.message ?? 'Unknown error'}`);
      return {
        success: false,
        message: `Health Connect availability check failed: ${availError?.message ?? 'Please ensure Health Connect is installed and try again.'}`,
      };
    }
    
    if (!available) {
      await markIntegrationError('health_connect', 'Health Connect not available');
      // Provide more helpful error message based on Android version
      const androidVersion = Platform.Version;
      const isAndroid14Plus = androidVersion >= 34;
      Alert.alert(
        'Install Health Connect',
        'Health Connect by Android is required to sync your sleep, heart rate, and activity data. Install it from the Play Store, open it once to complete setup, then return here to grant permissions.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Play Store',
            onPress: () => {
              void openHealthConnectStore();
            },
          },
        ]
      );
      
      return {
        success: false,
        message: isAndroid14Plus
          ? 'Health Connect is not available. Please:\n\n1. Check Settings > Apps > Health Connect and ensure it\'s enabled\n2. Update Health Connect from Play Store if available\n3. Restart your device'
          : 'Health Connect is not installed. Please:\n\n1. Install "Health Connect" from Google Play Store (requires Android 13+)\n2. Open Health Connect and complete setup\n3. Restart this app and try again',
      };
    }

    // Request permissions using the provider
    let granted = false;
    try {
      granted = await provider.requestPermissions(METRICS);
    } catch (permError: any) {
      console.error('[HealthConnect] Error requesting permissions:', permError);
      await markIntegrationError('health_connect', `Permission request failed: ${permError?.message ?? 'Unknown error'}`);
      return {
        success: false,
        message: `Failed to request permissions: ${permError?.message ?? 'Please try again or check Health Connect settings.'}`,
      };
    }
    
    if (!granted) {
      await markIntegrationError('health_connect', 'Permissions declined');
      return { success: false, message: 'Health Connect permissions were declined. Please grant permissions in Health Connect settings to sync your health data.' };
    }

    await markIntegrationConnected('health_connect');
    console.log('[HealthConnect] Successfully connected and permissions granted');
    
    // Trigger historical sync after successful connection
    try {
      const { syncHistoricalHealthData } = await import('@/lib/sync');
      // Sync in background - don't wait for it
      syncHistoricalHealthData(30).catch((error) => {
        console.warn('[HealthConnect] Historical sync failed:', error);
      });
    } catch (syncError) {
      console.warn('[HealthConnect] Failed to trigger historical sync:', syncError);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('[HealthConnect] Unexpected error in connectHealthConnect:', error);
    console.error('[HealthConnect] Error stack:', error?.stack);
    await markIntegrationError('health_connect', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to connect to Health Connect. Please ensure Health Connect is installed and try again.',
    };
  }
}

async function connectSamsungHealth(): Promise<{ success: boolean; message?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, message: 'Samsung Health is only available on Android devices.' };
  }

  try {
    const provider = new SamsungHealthProvider();
    
    // Check availability with better error handling
    let available = false;
    try {
      available = await provider.isAvailable();
    } catch (availError: any) {
      console.error('[SamsungHealth] Error checking availability:', availError);
      await markIntegrationError('samsung_health', `Availability check failed: ${availError?.message ?? 'Unknown error'}`);
      return {
        success: false,
        message: `Samsung Health is not available: ${availError?.message ?? 'Please ensure Samsung Health app is installed and the native module is properly linked.'}`,
      };
    }
    
    if (!available) {
      await markIntegrationError('samsung_health', 'Samsung Health not available');
      return {
        success: false,
        message: 'Samsung Health app not detected. Please:\n\n1. Install Samsung Health from Galaxy Store/Play Store\n2. Enable Developer Mode in Samsung Health (Settings > About > tap version 10 times)\n3. Restart the app',
      };
    }

    // Request permissions with better error handling
    let granted = false;
    try {
      granted = await provider.requestPermissions(METRICS);
    } catch (permError: any) {
      console.error('[SamsungHealth] Error requesting permissions:', permError);
      await markIntegrationError('samsung_health', `Permission request failed: ${permError?.message ?? 'Unknown error'}`);
      return {
        success: false,
        message: `Failed to request permissions: ${permError?.message ?? 'Please try again or check Samsung Health settings.'}`,
      };
    }
    
    if (!granted) {
      await markIntegrationError('samsung_health', 'Permissions declined');
      return { success: false, message: 'Samsung Health permissions were declined. Please grant permissions in Samsung Health app settings.' };
    }

    await markIntegrationConnected('samsung_health');
    console.log('[SamsungHealth] Successfully connected and permissions granted');
    
    // Trigger historical sync after successful connection
    try {
      const { syncHistoricalHealthData } = await import('@/lib/sync');
      // Sync in background - don't wait for it
      syncHistoricalHealthData(30).catch((error) => {
        console.warn('[SamsungHealth] Historical sync failed:', error);
      });
    } catch (syncError) {
      console.warn('[SamsungHealth] Failed to trigger historical sync:', syncError);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('[SamsungHealth] Unexpected error in connectSamsungHealth:', error);
    console.error('[SamsungHealth] Error stack:', error?.stack);
    await markIntegrationError('samsung_health', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to connect to Samsung Health. Please ensure Samsung Health is installed and try again.',
    };
  }
}

async function disconnectSamsungHealth(): Promise<void> {
  // Samsung Health SDK doesn't require explicit disconnection
  // The SDK manages connections automatically
  // We just mark the integration as disconnected in our store
  await markIntegrationDisconnected('samsung_health');
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
    subtitle: 'Sync data directly from Samsung Health',
    platform: 'samsung_health',
    supported: Platform.OS === 'android',
    icon: { type: 'MaterialCommunityIcons', name: 'cellphone' },
    connect: connectSamsungHealth,
    disconnect: disconnectSamsungHealth,
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


