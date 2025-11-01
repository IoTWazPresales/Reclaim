/// <reference types="node" />
import type { ExpoConfig } from '@expo/config';

const ENV = process?.env ?? ({} as NodeJS.ProcessEnv);
const scheme = ENV.EXPO_PUBLIC_APP_SCHEME ?? 'reclaim';
const EAS_PROJECT_ID = 'd053ca52-e860-4241-822b-8f821974f884';

const config: ExpoConfig = {
  name: 'Reclaim',
  slug: 'reclaim-app',
  version: '1.0.0',

  // ✅ Bare workflow requires a literal string
  runtimeVersion: '1.0.0',

  scheme,
  orientation: 'portrait',
  icon: './assets/icon.png',
  splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#0b1220' },

  android: {
    // Note: shown as “ignored” because you have /android — that’s normal
    package: 'com.yourcompany.reclaim',
    // versionCode here is informational only since you’re using remote versions
    versionCode: 1,
    permissions: ['POST_NOTIFICATIONS', 'WAKE_LOCK', 'VIBRATE', 'INTERNET'],
    intentFilters: [
      { action: 'VIEW', category: ['BROWSABLE', 'DEFAULT'], data: [{ scheme }] },
    ],
  },

  ios: { supportsTablet: true },

  plugins: [
    'expo-notifications',
    'expo-web-browser',
    ['expo-build-properties', { android: { minSdkVersion: 26, newArchEnabled: false } }],
    ['react-native-health-connect', { permissions: ['com.google.sleep.session', 'com.google.sleep.stage'] }],
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
};

export default config;
