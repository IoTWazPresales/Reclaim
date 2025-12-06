const {
  AndroidConfig,
  withAndroidManifest,
  withProjectBuildGradle,
  withAppBuildGradle,
} = require('@expo/config-plugins');

function withSamsungHealth(config) {
  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults;
    ensureSamsungHealthQuery(manifest);

    AndroidConfig.Permissions.ensurePermissions(manifest, [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
    ]);

    return c;
  });

  config = withProjectBuildGradle(config, (c) => c);

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
}

function ensureSamsungHealthQuery(manifest) {
  if (!manifest?.manifest) return;
  if (!Array.isArray(manifest.manifest.queries)) {
    manifest.manifest.queries = [];
  }

  const hasQuery = manifest.manifest.queries.some((query) =>
    query.intent?.some((intent) => {
      const hasAction = intent.action?.some(
        (action) => action?.$?.['android:name'] === 'android.intent.action.VIEW'
      );
      const hasData = intent.data?.some(
        (data) => data?.$?.['android:scheme'] === 'shealth'
      );
      return hasAction && hasData;
    })
  );

  if (!hasQuery) {
    manifest.manifest.queries.push({
      intent: [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          data: [{ $: { 'android:scheme': 'shealth' } }],
        },
      ],
    });
  }
}

module.exports = withSamsungHealth;

