const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

/**
 * Patch react-native-health-connect contract creation for SDK 34+:
 * - SDK >= 34 -> PermissionController.createRequestPermissionResultContract()
 * - else      -> PermissionController.createRequestPermissionResultContract(providerPackageName)
 *
 * IMPORTANT:
 * - Only patches if it finds the exact assignment line
 * - No risky fallback injection (prevents broken Kotlin)
 */
function withReactNativeHealthConnectAndroid14ContractFix(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const target = path.join(
        projectRoot,
        "node_modules",
        "react-native-health-connect",
        "android",
        "src",
        "main",
        "java",
        "dev",
        "matinzd",
        "healthconnect",
        "permissions",
        "HealthConnectPermissionDelegate.kt"
      );

      if (!fs.existsSync(target)) return cfg;

      const src = fs.readFileSync(target, "utf8");

      // Idempotent check
      if (
        src.includes("SDK_INT >= 34") &&
        src.includes("createRequestPermissionResultContract()") &&
        src.includes("createRequestPermissionResultContract(providerPackageName)")
      ) {
        return cfg;
      }

      const assignmentRe =
        /val\s+contract\s*=\s*PermissionController\.createRequestPermissionResultContract\(\s*providerPackageName\s*\)/m;

      if (!assignmentRe.test(src)) {
        // Upstream changed; do nothing rather than risk breaking Kotlin
        return cfg;
      }

      const replacement =
        "val contract = if (android.os.Build.VERSION.SDK_INT >= 34) {\n" +
        "      PermissionController.createRequestPermissionResultContract()\n" +
        "    } else {\n" +
        "      PermissionController.createRequestPermissionResultContract(providerPackageName)\n" +
        "    }";

      const out = src.replace(assignmentRe, replacement);

      // Sanity: ensure both branches exist
      const occurrences = (out.match(/createRequestPermissionResultContract\(/g) ?? []).length;
      if (occurrences < 2) {
        return cfg;
      }

      fs.writeFileSync(target, out);
      return cfg;
    },
  ]);
}

module.exports = withReactNativeHealthConnectAndroid14ContractFix;
module.exports.default = withReactNativeHealthConnectAndroid14ContractFix;
