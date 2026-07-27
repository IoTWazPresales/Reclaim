const fs = require('fs');
const path = require('path');
const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');

/**
 * Native ExactAlarmModule — canScheduleExactAlarms() + ACTION_REQUEST_SCHEDULE_EXACT_ALARM.
 * Used by guided-session soft UX (U4). Does not change notification scheduling authority.
 */

const MODULE_KT = (pkg) => `package ${pkg}

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ExactAlarmModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ExactAlarmModule"

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        promise.resolve(true)
        return
      }
      val am = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      promise.resolve(am.canScheduleExactAlarms())
    } catch (e: Exception) {
      promise.reject("EXACT_ALARM_CHECK", e.message, e)
    }
  }

  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:\${ctx.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:\${ctx.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      }
      ctx.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EXACT_ALARM_SETTINGS", e.message, e)
    }
  }
}
`;

const PACKAGE_KT = (pkg) => `package ${pkg}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ExactAlarmPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(ExactAlarmModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`;

function findMainActivity(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const found = findMainActivity(p);
      if (found) return found;
    } else if (e.isFile() && e.name === 'MainActivity.kt') {
      return p;
    }
  }
  return null;
}

function writeExactAlarmSources(androidRoot) {
  const javaRoot = path.join(androidRoot, 'app', 'src', 'main', 'java');
  if (!fs.existsSync(javaRoot)) return false;

  const mainActivityPath = findMainActivity(javaRoot);
  if (!mainActivityPath) return false;

  const mainSrc = fs.readFileSync(mainActivityPath, 'utf8');
  const m = mainSrc.match(/^\s*package\s+([^\s]+)\s*$/m);
  const pkg = m?.[1];
  if (!pkg) return false;

  const targetDir = path.dirname(mainActivityPath);
  fs.writeFileSync(path.join(targetDir, 'ExactAlarmModule.kt'), MODULE_KT(pkg));
  fs.writeFileSync(path.join(targetDir, 'ExactAlarmPackage.kt'), PACKAGE_KT(pkg));
  return true;
}

function withExactAlarmModule(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      writeExactAlarmSources(cfg.modRequest.platformProjectRoot);
      return cfg;
    },
  ]);

  config = withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('ExactAlarmPackage()')) {
      return cfg;
    }

    if (!src.includes('import com.fissioncorporation.reclaim.ExactAlarmPackage') &&
        !src.includes('ExactAlarmPackage()')) {
      // Package is same package as MainApplication when both live under reclaim —
      // only add fully-qualified add() call; Kotlin same-package needs no import
      // if package matches. Prefer unqualified add for same-package sources.
    }

    if (src.includes('PackageList(this).packages.apply {')) {
      src = src.replace(
        /PackageList\(this\)\.packages\.apply\s*\{/,
        `PackageList(this).packages.apply {\n              add(ExactAlarmPackage())`,
      );
    } else if (src.includes('PackageList(this).packages')) {
      src = src.replace(
        /PackageList\(this\)\.packages/,
        `PackageList(this).packages.apply { add(ExactAlarmPackage()) }`,
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });

  return config;
}

module.exports = withExactAlarmModule;
module.exports.default = withExactAlarmModule;
module.exports.writeExactAlarmSources = writeExactAlarmSources;
