const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patch expo-notifications ExpoNotificationBuilder.kt to add Android chronometer
 * countdown support for rest notifications. When content.data contains
 * chronometerCountDown: true and chronometerBaseTime (millis when countdown hits 0),
 * the notification will show a live countdown timer.
 */
function withExpoNotificationsChronometer(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const builderPath = path.join(
        projectRoot,
        'node_modules',
        'expo-notifications',
        'android',
        'src',
        'main',
        'java',
        'expo',
        'modules',
        'notifications',
        'notifications',
        'presentation',
        'builders',
        'ExpoNotificationBuilder.kt'
      );

      if (!fs.existsSync(builderPath)) {
        console.warn('[withExpoNotificationsChronometer] ExpoNotificationBuilder.kt not found, skipping patch');
        return cfg;
      }

      let content = fs.readFileSync(builderPath, 'utf8');

      if (content.includes('chronometerCountDown')) {
        console.log('[withExpoNotificationsChronometer] Already patched');
        return cfg;
      }

      const chronometerBlock = `
    // Chronometer countdown for rest notifications (Reclaim patch)
    notificationContent.body?.let { body ->
      if (body.optBoolean("chronometerCountDown", false)) {
        val baseTime = body.optLong("chronometerBaseTime", 0L)
        if (baseTime > 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
          builder.setUsesChronometer(true)
          builder.setChronometerCountDown(true)
          builder.setWhen(baseTime)
        }
      }
    }
`;

      const insertAfter = 'notificationContent.categoryId?.let { addActionsToBuilder(builder, it) }';
      if (!content.includes(insertAfter)) {
        console.warn('[withExpoNotificationsChronometer] Could not find insertion point');
        return cfg;
      }

      content = content.replace(
        insertAfter,
        insertAfter + chronometerBlock
      );

      fs.writeFileSync(builderPath, content);
      console.log('[withExpoNotificationsChronometer] Patched ExpoNotificationBuilder.kt for chronometer countdown');
      return cfg;
    },
  ]);
}

module.exports = withExpoNotificationsChronometer;
module.exports.default = withExpoNotificationsChronometer;
