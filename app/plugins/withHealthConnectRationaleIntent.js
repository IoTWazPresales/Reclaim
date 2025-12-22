const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");

/**
 * Health Connect requires an exported Activity to handle:
 *   androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE
 *
 * On Android 14+ Health Connect may also expect the app to expose:
 *   android.intent.action.VIEW_PERMISSION_USAGE (via activity-alias)
 *
 * If missing, Health Connect PermissionsActivity can log:
 *   "App should support rationale intent, finishing!"
 * and the permission flow returns empty -> JS sees NO_DIALOG/UNAVAILABLE.
 *
 * This plugin:
 * 1) Injects a minimal manifest <activity> for PermissionsRationaleActivity
 * 2) Injects the Android 14+ <activity-alias> ViewPermissionUsageActivity
 * 3) Creates PermissionsRationaleActivity.kt next to MainActivity.kt (idempotent)
 */
function withHealthConnectRationaleIntent(config) {
  // 1) Manifest injection (keep it MINIMAL and canonical)
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return cfg;

    app.activity = app.activity ?? [];
    app["activity-alias"] = app["activity-alias"] ?? [];

    const activities = app.activity;
    const aliases = app["activity-alias"];

    const RATIONALE_ACTIVITY = ".PermissionsRationaleActivity";
    const ACTION_RATIONALE = "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE";

    const ALIAS_NAME = "ViewPermissionUsageActivity";
    const ACTION_VIEW_USAGE = "android.intent.action.VIEW_PERMISSION_USAGE";
    const CAT_HEALTH_PERMS = "android.intent.category.HEALTH_PERMISSIONS";
    const PERM_START_VIEW_USAGE = "android.permission.START_VIEW_PERMISSION_USAGE";

    const hasRationaleActivity = activities.some((a) => {
      const name = a?.$?.["android:name"];
      return name === RATIONALE_ACTIVITY || (typeof name === "string" && name.endsWith("PermissionsRationaleActivity"));
    });

    if (!hasRationaleActivity) {
      activities.push({
        $: {
          "android:name": RATIONALE_ACTIVITY,
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": ACTION_RATIONALE } }],
          },
        ],
      });
    } else {
      // Ensure existing activity is exported and has ONLY the minimal rationale filter.
      const a =
        activities.find((x) => {
          const name = x?.$?.["android:name"];
          return name === RATIONALE_ACTIVITY || (typeof name === "string" && name.endsWith("PermissionsRationaleActivity"));
        }) ?? activities[activities.length - 1];

      a.$ = a.$ ?? {};
      a.$["android:exported"] = "true";

      // Overwrite to the minimal canonical filter to avoid strict-match failures.
      a["intent-filter"] = [
        {
          action: [{ $: { "android:name": ACTION_RATIONALE } }],
        },
      ];
    }

    const hasAlias = aliases.some((al) => al?.$?.["android:name"] === ALIAS_NAME);

    if (!hasAlias) {
      aliases.push({
        $: {
          "android:name": ALIAS_NAME,
          "android:exported": "true",
          "android:permission": PERM_START_VIEW_USAGE,
          "android:targetActivity": RATIONALE_ACTIVITY,
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": ACTION_VIEW_USAGE } }],
            category: [{ $: { "android:name": CAT_HEALTH_PERMS } }],
          },
        ],
      });
    }

    return cfg;
  });

  // 2) Create Kotlin activity file next to MainActivity.kt in generated android project
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const androidRoot = cfg.modRequest.platformProjectRoot; // .../android
      const javaRoot = path.join(androidRoot, "app", "src", "main", "java");
      if (!fs.existsSync(javaRoot)) return cfg;

      const findMainActivity = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) {
            const found = findMainActivity(p);
            if (found) return found;
          } else if (e.isFile() && e.name === "MainActivity.kt") {
            return p;
          }
        }
        return null;
      };

      const mainActivityPath = findMainActivity(javaRoot);
      if (!mainActivityPath) return cfg;

      const mainSrc = fs.readFileSync(mainActivityPath, "utf8");
      const m = mainSrc.match(/^\s*package\s+([^\s]+)\s*$/m);
      const pkg = m?.[1];
      if (!pkg) return cfg;

      const targetDir = path.dirname(mainActivityPath);
      const targetFile = path.join(targetDir, "PermissionsRationaleActivity.kt");
      if (fs.existsSync(targetFile)) return cfg; // idempotent

      const out = `package ${pkg}

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle

/**
 * Minimal rationale Activity required by Health Connect.
 *
 * Must be exported in the manifest and handle:
 *   androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE
 */
class PermissionsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    AlertDialog.Builder(this)
      .setTitle("Health permissions")
      .setMessage("Reclaim uses Health Connect to read the health data you choose (e.g. sleep, steps, heart rate). You can grant or manage these permissions in the next screen.")
      .setPositiveButton(android.R.string.ok) { _, _ -> finish() }
      .setOnCancelListener { finish() }
      .show()
  }
}
`;

      fs.writeFileSync(targetFile, out);
      return cfg;
    },
  ]);

  return config;
}

module.exports = withHealthConnectRationaleIntent;
module.exports.default = withHealthConnectRationaleIntent;
