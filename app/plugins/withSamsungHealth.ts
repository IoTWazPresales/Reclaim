import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withProjectBuildGradle,
  withAppBuildGradle,
} from '@expo/config-plugins';

// NOTE: This plugin prepares the Android project for Samsung Health integration.
// It adds manifest queries/permissions and gradle hooks. The actual native module
// and Samsung SDK dependency must be added per SAMSUNG_HEALTH_SETUP.md.

export const withSamsungHealth: ConfigPlugin = (config) => {
  // AndroidManifest changes
  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults;

    // <queries> so we can detect Samsung Health app
    AndroidConfig.Manifest.addQueriesIntentFilter(manifest, {
      action: 'android.intent.action.VIEW',
      data: [{ scheme: 'shealth' }],
    });

    // Permissions that some Samsung SDK samples recommend (network state, internet)
    AndroidConfig.Permissions.ensurePermissions(manifest, [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
    ]);

    return c;
  });

  // Root build.gradle: ensure mavenCentral (most projects already have it)
  config = withProjectBuildGradle(config, (c) => {
    // No-op: keep default repos; partner SDK coordinates will be added in app build.gradle
    return c;
  });

  // App build.gradle: add placeholder dependency block comment for Samsung SDK
  config = withAppBuildGradle(config, (c) => {
    const contents = c.modResults.contents;
    if (!contents.includes('// SAMSUNG_HEALTH_SDK')) {
      c.modResults.contents = contents.replace(
        /dependencies\s*\{/,
        (m) =>
          `${m}\n    // SAMSUNG_HEALTH_SDK: add Samsung Health SDK dependency here once approved\n    // implementation("com.samsung.android:health-data:VERSION")\n`
      );
    }
    return c;
  });

  return config;
};

export default withSamsungHealth;
