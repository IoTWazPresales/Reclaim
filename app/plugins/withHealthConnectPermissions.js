const { withAndroidManifest } = require('@expo/config-plugins');

// These are the exact permission strings from AndroidX Health Connect (HealthPermission).
// We only declare what we request in JS (read-only).
const HEALTH_CONNECT_READ_PERMISSIONS = [
  'android.permission.health.READ_SLEEP',
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_DISTANCE',
  'android.permission.health.READ_ELEVATION_GAINED',
  'android.permission.health.READ_FLOORS_CLIMBED',
  'android.permission.health.READ_SPEED',
  'android.permission.health.READ_VO2_MAX',
  'android.permission.health.READ_WHEELCHAIR_PUSHES',
  'android.permission.health.READ_HEART_RATE',
  'android.permission.health.READ_RESTING_HEART_RATE',
  'android.permission.health.READ_HEART_RATE_VARIABILITY',
  'android.permission.health.READ_RESPIRATORY_RATE',
  'android.permission.health.READ_OXYGEN_SATURATION',
  'android.permission.health.READ_SKIN_TEMPERATURE',
  'android.permission.health.READ_BODY_TEMPERATURE',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  'android.permission.health.READ_TOTAL_CALORIES_BURNED',
  'android.permission.health.READ_EXERCISE',
  'android.permission.health.READ_EXERCISE_ROUTE',
  'android.permission.health.READ_ACTIVITY_INTENSITY',
  'android.permission.health.READ_PLANNED_EXERCISE',
  'android.permission.health.READ_POWER',
  // Body measurements
  'android.permission.health.READ_WEIGHT',
  'android.permission.health.READ_HEIGHT',
  'android.permission.health.READ_BODY_FAT',
  'android.permission.health.READ_LEAN_BODY_MASS',
  'android.permission.health.READ_BODY_WATER_MASS',
  'android.permission.health.READ_BONE_MASS',
  'android.permission.health.READ_BASAL_METABOLIC_RATE',
  // Cycle tracking
  'android.permission.health.READ_BASAL_BODY_TEMPERATURE',
  'android.permission.health.READ_CERVICAL_MUCUS',
  'android.permission.health.READ_INTERMENSTRUAL_BLEEDING',
  'android.permission.health.READ_MENSTRUATION',
  'android.permission.health.READ_OVULATION_TEST',
  'android.permission.health.READ_SEXUAL_ACTIVITY',
  // Nutrition / wellness
  'android.permission.health.READ_NUTRITION',
  'android.permission.health.READ_HYDRATION',
  'android.permission.health.READ_MINDFULNESS',
  // Vitals
  'android.permission.health.READ_BLOOD_GLUCOSE',
  'android.permission.health.READ_BLOOD_PRESSURE',
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


