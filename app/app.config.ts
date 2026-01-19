/// <reference types="node" />
import type { ExpoConfig } from '@expo/config';

// ✅ Expo automatically loads .env files when running 'expo start'
// Environment variables are available via process.env
const ENV = process?.env ?? ({} as NodeJS.ProcessEnv);
const scheme = ENV.EXPO_PUBLIC_APP_SCHEME ?? 'reclaim';
const EAS_PROJECT_ID = 'd053ca52-e860-4241-822b-8f821974f884';

const config: ExpoConfig = {
  name: 'Reclaim',
  slug: 'reclaim-app',
  version: '1.0.2',

  // ✅ Use appVersion policy for runtime
  runtimeVersion: '1.0.2',

  // ✅ New Architecture enabled (required for Reanimated 4.x)
  newArchEnabled: true,

  scheme,
  orientation: 'portrait',
  icon: './assets/icon.png',
 
  splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#0b1220' },

  android: {
    // Note: shown as "ignored" because you have /android — that's normal
    package: 'com.fissioncorporation.reclaim',
    // versionCode here is informational only since you're using remote versions
    versionCode: 3,
    permissions: [
      'POST_NOTIFICATIONS',
      'WAKE_LOCK',
      'VIBRATE',
      'INTERNET',
      'ACTIVITY_RECOGNITION', // For Google Fit steps/activity
    ],
    adaptiveIcon: {
      foregroundImage: './assets/icon-fg-transparent-1024.png',
      backgroundColor: '#0b1220',
    },
    intentFilters: [
      { action: 'VIEW', category: ['BROWSABLE', 'DEFAULT'], data: [{ scheme }] },
    ],
  },

  plugins: [
    'expo-notifications',
    'expo-web-browser',
    [
      'expo-calendar',
      {
        calendarPermission: 'Allow Reclaim to access your calendar to show your schedule.',
        remindersPermission: 'Allow Reclaim to access your reminders.',
      },
    ],
    ['expo-build-properties', { android: { minSdkVersion: 29 }, ios: {}, newArchEnabled: true }],
    // Google Fit OAuth2 configuration
    // NOTE: You need to create OAuth2 credentials in Google Cloud Console
    // and replace YOUR_CLIENT_ID with your actual client ID
    // Format: YOUR_CLIENT_ID.apps.googleusercontent.com
    [
      'react-native-google-fit',
      {
        oauthClientId:
          ENV.EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID ||
          '243577452675-imjobsibjgiin0ajpc3ehhq2046r711o.apps.googleusercontent.com',
      },
    ],
    // Patch generated MainActivity for Health Connect permission delegate initialization
    './plugins/withHealthConnectPermissionDelegate',
    // Ensure Health Connect uses-permission entries exist for the record types we request.
    './plugins/withHealthConnectPermissions',
    // Add required rationale intent-filter for Health Connect permission flow on Android 14+.
    './plugins/withHealthConnectRationaleIntent',
    // Patch react-native-health-connect to use the correct permission contract on Android 14+.
    './plugins/withReactNativeHealthConnectAndroid14ContractFix',
    // If you decide to *disable* OTA updates entirely, uncomment the next line
    // ['expo-updates', { enabled: false }],
  ],

  extra: {
    eas: { projectId: EAS_PROJECT_ID },
    supabaseUrl: ENV.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    appScheme: scheme,
  },

  // Keep this only if you plan to use EAS Updates
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },

  owner: 'eliasonw',

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fissioncorporation.reclaim',
    buildNumber: '1',
    infoPlist: {
      NSCalendarsUsageDescription: '...',
      NSRemindersUsageDescription: '...',
    },
  },
};

export default config;
