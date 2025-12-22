const { withMainActivity } = require('@expo/config-plugins');

/**
 * Patch generated MainActivity to initialize the Health Connect permission delegate.
 *
 * Fixes crash:
 * kotlin.UninitializedPropertyAccessException: lateinit property requestPermission has not been initialized
 * at HealthConnectPermissionDelegate.launchPermissionsDialog
 */
function withHealthConnectPermissionDelegate(config) {
  return withMainActivity(config, (cfg) => {
    const src = cfg.modResults.contents;

    // If already patched, no-op.
    if (src.includes('HealthConnectPermissionDelegate.setPermissionDelegate(this)')) {
      return cfg;
    }

    let out = src;

    // Ensure import exists.
    if (!out.includes('dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate')) {
      // Insert after package line if possible, otherwise near top.
      out = out.replace(
        /^(package\s+[^\r\n]+[\r\n]+)/m,
        `$1\nimport dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate\n`,
      );
    }

    // Inject call right after super.onCreate(...)
    out = out.replace(
      /(super\.onCreate\([^\)]*\)\s*[\r\n]+)/,
      `$1    HealthConnectPermissionDelegate.setPermissionDelegate(this)\n`,
    );

    cfg.modResults.contents = out;
    return cfg;
  });
}

module.exports = withHealthConnectPermissionDelegate;
module.exports.default = withHealthConnectPermissionDelegate;


