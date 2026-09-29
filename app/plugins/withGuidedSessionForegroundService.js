const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');

/**
 * One app-owned health foreground service for guided, mindfulness and meditation.
 * HeadlessJsTaskService so the session loop survives the activity being destroyed.
 * N-0042 may add the location type to this same service later. Do not register a second service.
 */
const SERVICE_CLASS = 'ReclaimSessionForegroundService';
const PACKAGE_CLASS = 'ReclaimSessionForegroundPackage';
const TASK_NAME = 'ReclaimSessionForeground';
const FGS_TYPE = 'health';
const NOTIFICATION_ID = 92911;
const CHANNEL_ID = 'reclaim_session_fgs';

const PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_HEALTH',
  'android.permission.ACTIVITY_RECOGNITION',
  'android.permission.WAKE_LOCK',
  'android.permission.POST_NOTIFICATIONS',
];

const SERVICE_KT = (pkg) => `package ${pkg}

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

object ReclaimSessionForegroundState {
  @Volatile var running: Boolean = false
  @Volatile var domain: String? = null
  @Volatile var sessionId: String? = null

  fun clear() {
    running = false
    domain = null
    sessionId = null
  }
}

class ${SERVICE_CLASS} : HeadlessJsTaskService() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val domain = intent?.getStringExtra("domain")
    val sessionId = intent?.getStringExtra("sessionId")
    if (intent == null || domain.isNullOrEmpty() || sessionId.isNullOrEmpty()) {
      stopSelf()
      return START_NOT_STICKY
    }
    try {
      promoteToForeground(intent)
    } catch (e: Exception) {
      stopSelf()
      return START_NOT_STICKY
    }
    ReclaimSessionForegroundState.running = true
    ReclaimSessionForegroundState.domain = domain
    ReclaimSessionForegroundState.sessionId = sessionId
    return super.onStartCommand(intent, flags, startId)
  }

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    val domain = extras.getString("domain") ?: return null
    val sessionId = extras.getString("sessionId") ?: return null
    val data = Arguments.createMap()
    data.putString("domain", domain)
    data.putString("sessionId", sessionId)
    data.putDouble("delayMs", extras.getLong("delayMs", 5000L).toDouble())
    data.putDouble("endsAtMs", extras.getLong("endsAtMs", 0L).toDouble())
    return HeadlessJsTaskConfig("${TASK_NAME}", data, 0L, true)
  }

  override fun onHeadlessJsTaskFinish(taskId: Int) {
    if (!ReclaimSessionForegroundState.running) {
      stopSelf()
    }
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Swiping the phone UI away must not stop an open session.
  }

  override fun onDestroy() {
    ReclaimSessionForegroundState.clear()
    super.onDestroy()
  }

  private fun promoteToForeground(intent: Intent) {
    val title = intent.getStringExtra("taskTitle") ?: "Reclaim"
    val body = intent.getStringExtra("taskDesc") ?: ""
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        "${CHANNEL_ID}",
        "Session in progress",
        NotificationManager.IMPORTANCE_LOW,
      )
      channel.setShowBadge(false)
      manager.createNotificationChannel(channel)
    }
    val icon = applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info
    val open = Intent(Intent.ACTION_VIEW).apply {
      data = android.net.Uri.parse(intent.getStringExtra("linkingURI") ?: "reclaim://training")
      setPackage(packageName)
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val pending = PendingIntent.getActivity(this, ${NOTIFICATION_ID}, open, pendingFlags)
    val notification = NotificationCompat.Builder(this, "${CHANNEL_ID}")
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(icon)
      .setContentIntent(pending)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(${NOTIFICATION_ID}, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
    } else {
      startForeground(${NOTIFICATION_ID}, notification)
    }
  }
}
`;

const MODULE_KT = (pkg) => `package ${pkg}

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import androidx.core.content.ContextCompat

class ReclaimSessionForegroundModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ReclaimSessionForeground"

  @ReactMethod
  fun getState(promise: Promise) {
    val map = Arguments.createMap()
    map.putBoolean("running", ReclaimSessionForegroundState.running)
    if (ReclaimSessionForegroundState.domain == null) {
      map.putNull("domain")
    } else {
      map.putString("domain", ReclaimSessionForegroundState.domain)
    }
    if (ReclaimSessionForegroundState.sessionId == null) {
      map.putNull("sessionId")
    } else {
      map.putString("sessionId", ReclaimSessionForegroundState.sessionId)
    }
    promise.resolve(map)
  }

  @ReactMethod
  fun start(options: ReadableMap, promise: Promise) {
    try {
      val domain = options.getString("domain") ?: ""
      val sessionId = options.getString("sessionId") ?: ""
      if (domain.isEmpty() || sessionId.isEmpty()) {
        promise.resolve(false)
        return
      }
      if (
        ReclaimSessionForegroundState.running &&
        ReclaimSessionForegroundState.domain == domain &&
        ReclaimSessionForegroundState.sessionId == sessionId
      ) {
        promise.resolve(true)
        return
      }
      val intent = Intent(reactApplicationContext, ${SERVICE_CLASS}::class.java)
      intent.putExtra("domain", domain)
      intent.putExtra("sessionId", sessionId)
      intent.putExtra("taskTitle", options.getString("taskTitle") ?: "Reclaim")
      intent.putExtra("taskDesc", options.getString("taskDesc") ?: "")
      intent.putExtra("linkingURI", options.getString("linkingURI") ?: "reclaim://training")
      val delayMs = if (options.hasKey("delayMs")) options.getDouble("delayMs").toLong() else 5000L
      val endsAtMs = if (options.hasKey("endsAtMs")) options.getDouble("endsAtMs").toLong() else 0L
      intent.putExtra("delayMs", delayMs)
      intent.putExtra("endsAtMs", endsAtMs)
      ContextCompat.startForegroundService(reactApplicationContext, intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SESSION_FGS_START", e.message, e)
    }
  }

  @ReactMethod
  fun stop(domain: String, promise: Promise) {
    try {
      val current = ReclaimSessionForegroundState.domain
      if (ReclaimSessionForegroundState.running && current != null && current != domain) {
        promise.resolve(false)
        return
      }
      val intent = Intent(reactApplicationContext, ${SERVICE_CLASS}::class.java)
      reactApplicationContext.stopService(intent)
      ReclaimSessionForegroundState.clear()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SESSION_FGS_STOP", e.message, e)
    }
  }
}
`;

const PACKAGE_KT = (pkg) => `package ${pkg}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ${PACKAGE_CLASS} : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(ReclaimSessionForegroundModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`;

function findMainActivity(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(next);
      if (found) return found;
    } else if (entry.isFile() && entry.name === 'MainActivity.kt') {
      return next;
    }
  }
  return null;
}

function writeSessionForegroundSources(androidRoot) {
  const javaRoot = path.join(androidRoot, 'app', 'src', 'main', 'java');
  if (!fs.existsSync(javaRoot)) return false;
  const mainActivityPath = findMainActivity(javaRoot);
  if (!mainActivityPath) return false;
  const mainSrc = fs.readFileSync(mainActivityPath, 'utf8');
  const match = mainSrc.match(/^\s*package\s+([^\s]+)\s*$/m);
  const pkg = match?.[1];
  if (!pkg) return false;
  const targetDir = path.dirname(mainActivityPath);
  fs.writeFileSync(path.join(targetDir, `${SERVICE_CLASS}.kt`), SERVICE_KT(pkg));
  fs.writeFileSync(path.join(targetDir, 'ReclaimSessionForegroundModule.kt'), MODULE_KT(pkg));
  fs.writeFileSync(path.join(targetDir, `${PACKAGE_CLASS}.kt`), PACKAGE_KT(pkg));
  return true;
}

function ensureUsesPermission(androidManifest, name) {
  const manifest = androidManifest.manifest;
  manifest['uses-permission'] = manifest['uses-permission'] ?? [];
  const arr = manifest['uses-permission'];
  if (!arr.some((item) => item?.$?.['android:name'] === name)) {
    arr.push({ $: { 'android:name': name } });
  }
}

function ensureSessionService(androidManifest) {
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  mainApplication.service = mainApplication.service ?? [];
  const services = mainApplication.service.filter(
    (service) => service?.$?.['android:name'] !== 'com.asterinet.react.bgactions.RNBackgroundActionsTask',
  );
  mainApplication.service = services;
  const name = `.${SERVICE_CLASS}`;
  const existing = services.find((service) => service?.$?.['android:name'] === name);
  if (existing) {
    existing.$['android:foregroundServiceType'] = FGS_TYPE;
    existing.$['android:exported'] = 'false';
    existing.$['android:stopWithTask'] = 'false';
    return;
  }
  services.push({
    $: {
      'android:name': name,
      'android:foregroundServiceType': FGS_TYPE,
      'android:exported': 'false',
      'android:stopWithTask': 'false',
    },
  });
}

function patchManifestText(xml) {
  let next = xml.replace(
    /<service\b[^>]*android:name="com\.asterinet\.react\.bgactions\.RNBackgroundActionsTask"[^>]*\/>/g,
    '',
  );
  for (const perm of PERMISSIONS) {
    if (!next.includes(perm)) {
      next = next.replace(
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
        `<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n  <uses-permission android:name="${perm}"/>`,
      );
    }
  }
  if (!next.includes(SERVICE_CLASS)) {
    next = next.replace(
      '</application>',
      `    <service android:name=".${SERVICE_CLASS}" android:exported="false" android:foregroundServiceType="${FGS_TYPE}" android:stopWithTask="false"/>\n  </application>`,
    );
  }
  return next;
}

function patchMainApplicationText(src) {
  if (src.includes(`${PACKAGE_CLASS}()`)) return src;
  if (src.includes('add(ExactAlarmPackage())')) {
    return src.replace(
      'add(ExactAlarmPackage())',
      `add(ExactAlarmPackage())\n              add(${PACKAGE_CLASS}())`,
    );
  }
  if (src.includes('PackageList(this).packages.apply {')) {
    return src.replace(
      /PackageList\(this\)\.packages\.apply\s*\{/,
      `PackageList(this).packages.apply {\n              add(${PACKAGE_CLASS}())`,
    );
  }
  return src;
}

function applyToExistingAndroidProject(androidRoot) {
  const wrote = writeSessionForegroundSources(androidRoot);
  const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
  const javaRoot = path.join(androidRoot, 'app', 'src', 'main', 'java');
  const mainActivityPath = fs.existsSync(javaRoot) ? findMainActivity(javaRoot) : null;
  const mainApplicationPath = mainActivityPath
    ? path.join(path.dirname(mainActivityPath), 'MainApplication.kt')
    : null;
  if (fs.existsSync(manifestPath)) {
    const xml = fs.readFileSync(manifestPath, 'utf8');
    const patched = patchManifestText(xml);
    if (patched !== xml) fs.writeFileSync(manifestPath, patched);
  }
  if (mainApplicationPath && fs.existsSync(mainApplicationPath)) {
    const src = fs.readFileSync(mainApplicationPath, 'utf8');
    const patched = patchMainApplicationText(src);
    if (patched !== src) fs.writeFileSync(mainApplicationPath, patched);
  }
  return wrote;
}

function withGuidedSessionForegroundService(config) {
  config = withAndroidManifest(config, (cfg) => {
    for (const perm of PERMISSIONS) {
      ensureUsesPermission(cfg.modResults, perm);
    }
    ensureSessionService(cfg.modResults);
    return cfg;
  });

  config = withMainApplication(config, (cfg) => {
    cfg.modResults.contents = patchMainApplicationText(cfg.modResults.contents);
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      writeSessionForegroundSources(cfg.modRequest.platformProjectRoot);
      return cfg;
    },
  ]);

  return config;
}

module.exports = withGuidedSessionForegroundService;
module.exports.default = withGuidedSessionForegroundService;
module.exports.applyToExistingAndroidProject = applyToExistingAndroidProject;
module.exports.SERVICE_CLASS = SERVICE_CLASS;
