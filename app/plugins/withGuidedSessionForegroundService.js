const {
  AndroidConfig,
  withAndroidManifest,
} = require('@expo/config-plugins');

/**
 * Guided-session Android Foreground Service (real FGS — not Expo sticky).
 *
 * Best-practice type for active exercise / fitness tracking: `health`
 * + FOREGROUND_SERVICE_HEALTH + ACTIVITY_RECOGNITION (runtime prerequisite).
 *
 * Uses react-native-background-actions service:
 *   com.asterinet.react.bgactions.RNBackgroundActionsTask
 */
const SERVICE_NAME = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';
const FGS_TYPE = 'health';

const PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_HEALTH',
  'android.permission.ACTIVITY_RECOGNITION',
  'android.permission.WAKE_LOCK',
  'android.permission.POST_NOTIFICATIONS',
];

function ensureUsesPermission(androidManifest, name) {
  const manifest = androidManifest.manifest;
  manifest['uses-permission'] = manifest['uses-permission'] ?? [];
  const arr = manifest['uses-permission'];
  if (!arr.some((p) => p?.$?.['android:name'] === name)) {
    arr.push({ $: { 'android:name': name } });
  }
}

function ensureBackgroundActionsService(androidManifest) {
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  mainApplication.service = mainApplication.service ?? [];
  const services = mainApplication.service;
  const existing = services.find((s) => s?.$?.['android:name'] === SERVICE_NAME);
  if (existing) {
    existing.$['android:foregroundServiceType'] = FGS_TYPE;
    existing.$['android:exported'] = existing.$['android:exported'] ?? 'false';
    return;
  }
  services.push({
    $: {
      'android:name': SERVICE_NAME,
      'android:foregroundServiceType': FGS_TYPE,
      'android:exported': 'false',
    },
  });
}

function withGuidedSessionForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    for (const perm of PERMISSIONS) {
      ensureUsesPermission(cfg.modResults, perm);
    }
    ensureBackgroundActionsService(cfg.modResults);
    return cfg;
  });
}

module.exports = withGuidedSessionForegroundService;
module.exports.default = withGuidedSessionForegroundService;
