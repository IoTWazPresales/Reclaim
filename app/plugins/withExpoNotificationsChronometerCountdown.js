const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

/**
 * Patch expo-notifications ExpoNotificationBuilder to support chronometer countdown
 * for rest notifications. When content.data contains chronometerCountDown: true and
 * chronometerBaseTime (millis), the notification shows a live countdown on Android.
 */
function withExpoNotificationsChronometerCountdown(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const target = path.join(
        projectRoot,
        "node_modules",
        "expo-notifications",
        "android",
        "src",
        "main",
        "java",
        "expo",
        "modules",
        "notifications",
        "notifications",
        "presentation",
        "builders",
        "ExpoNotificationBuilder.kt"
      );

      if (!fs.existsSync(target)) return cfg;

      const src = fs.readFileSync(target, "utf8");

      if (src.includes("chronometerCountDown") && src.includes("setChronometerCountDown")) {
        return cfg;
      }

      const marker = "applySoundsAndVibrations(content, builder)";
      const injection =
        "    applySoundsAndVibrations(content, builder)\n\n" +
        "    content.body?.optBoolean(\"chronometerCountDown\", false)?.let { useChronometer ->\n" +
        "      if (useChronometer) {\n" +
        "        val baseTime = content.body?.optLong(\"chronometerBaseTime\", 0L) ?: 0L\n" +
        "        if (baseTime > 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {\n" +
        "          builder.setUsesChronometer(true)\n" +
        "          builder.setChronometerCountDown(true)\n" +
        "          builder.setWhen(baseTime)\n" +
        "        }\n" +
        "      }\n" +
        "    }";

      if (!src.includes(marker)) {
        return cfg;
      }

      const out = src.replace(
        marker,
        "applySoundsAndVibrations(content, builder)\n\n" +
          "    content.body?.optBoolean(\"chronometerCountDown\", false)?.let { useChronometer ->\n" +
          "      if (useChronometer) {\n" +
          "        val baseTime = content.body?.optLong(\"chronometerBaseTime\", 0L) ?: 0L\n" +
          "        if (baseTime > 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {\n" +
          "          builder.setUsesChronometer(true)\n" +
          "          builder.setChronometerCountDown(true)\n" +
          "          builder.setWhen(baseTime)\n" +
          "        }\n" +
          "      }\n" +
          "    }"
      );

      fs.writeFileSync(target, out);
      return cfg;
    },
  ]);
}

module.exports = withExpoNotificationsChronometerCountdown;
module.exports.default = withExpoNotificationsChronometerCountdown;
