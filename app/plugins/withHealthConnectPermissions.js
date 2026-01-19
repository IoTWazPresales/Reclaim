const { withAndroidManifest } = require('@expo/config-plugins');

// These are the exact permission strings from AndroidX Health Connect (HealthPermission).
// We only declare what we request in JS (read-only).
const HEALTH_CONNECT_READ_PERMISSIONS = [
  'android.permission.health.READ_SLEEP',
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_HEART_RATE',
  'android.permission.health.READ_RESTING_HEART_RATE',
  'android.permission.health.READ_HEART_RATE_VARIABILITY',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  'android.permission.health.READ_TOTAL_CALORIES_BURNED',
  'android.permission.health.READ_EXERCISE',
];

function ensureUsesPermission(androidManifest, name) {
  const manifest = androidManifest.manifest;
  manifest['uses-permission'] = manifest['uses-permission'] ?? [];
  const arr = manifest['uses-permission'];
  const has = arr.some((p) => p?.$?.['android:name'] === name);
  if (!has) {
    arr.push({ $: { 'android:name': name } });
  }
}

function ensureHealthConnectQueries(androidManifest) {
  // Helps some devices/OS versions resolve the Health Connect provider package.
  const manifest = androidManifest.manifest;
  manifest.queries = manifest.queries ?? [{ package: [] }];
  const q = Array.isArray(manifest.queries) ? manifest.queries[0] : manifest.queries;
  q.package = q.package ?? [];
  const pkgs = q.package;
  const has = pkgs.some((p) => p?.$?.['android:name'] === 'com.google.android.apps.healthdata');
  if (!has) {
    pkgs.push({ $: { 'android:name': 'com.google.android.apps.healthdata' } });
  }
}

function withHealthConnectPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    HEALTH_CONNECT_READ_PERMISSIONS.forEach((perm) => ensureUsesPermission(cfg.modResults, perm));
    ensureHealthConnectQueries(cfg.modResults);
    return cfg;
  });
}

module.exports = withHealthConnectPermissions;
module.exports.default = withHealthConnectPermissions;


