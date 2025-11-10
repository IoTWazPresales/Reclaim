package com.yourcompany.reclaim.shealth

import android.content.pm.PackageManager
import android.os.Handler
import android.os.HandlerThread
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.UiThreadUtil
import com.samsung.android.sdk.healthdata.*
import java.util.concurrent.atomic.AtomicBoolean

@ReactModule(name = SamsungHealthModule.NAME)
class SamsungHealthModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SamsungHealth"
        private const val SHEALTH_PACKAGE = "com.samsung.android.app.shealth"
    }

    private val handlerThread = HandlerThread("SamsungHealthThread").apply { start() }
    private val backgroundHandler = Handler(handlerThread.looper)

    private var dataStore: HealthDataStore? = null
    private var connectPromise: Promise? = null
    private val isConnecting = AtomicBoolean(false)

    private val permissionKeySet: Set<HealthPermissionManager.PermissionKey> = setOf(
        HealthPermissionManager.PermissionKey(
            HealthConstants.StepCount.HEALTH_DATA_TYPE,
            HealthPermissionManager.PermissionType.READ
        ),
        HealthPermissionManager.PermissionKey(
            HealthConstants.Sleep.HEALTH_DATA_TYPE,
            HealthPermissionManager.PermissionType.READ
        ),
        HealthPermissionManager.PermissionKey(
            HealthConstants.HeartRate.HEALTH_DATA_TYPE,
            HealthPermissionManager.PermissionType.READ
        )
    )

    private val connectionListener = object : HealthDataStore.ConnectionListener {
        override fun onConnected() {
            requestPermissionsInternal()
        }

        override fun onConnectionFailed(p0: HealthDataStore.ConnectionErrorResult?) {
            isConnecting.set(false)
            connectPromise?.reject(
                "E_CONNECTION_FAILED",
                p0?.message ?: "Failed to connect to Samsung Health."
            )
            connectPromise = null
            dataStore?.disconnectService()
            dataStore = null
        }

        override fun onDisconnected() {
            isConnecting.set(false)
            dataStore = null
        }
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(isSamsungHealthInstalled())
    }

    @ReactMethod
    fun connect(promise: Promise) {
        if (!isSamsungHealthInstalled()) {
            promise.reject("E_NOT_AVAILABLE", "Samsung Health app is not installed.")
            return
        }

        if (dataStore != null && dataStore?.isConnected == true) {
            checkPermissions(promise)
            return
        }

        if (!isConnecting.compareAndSet(false, true)) {
            promise.reject("E_IN_PROGRESS", "Samsung Health connection is already in progress.")
            return
        }

        connectPromise = promise
        val store = HealthDataStore(reactContext, connectionListener)
        dataStore = store
        store.connectService()
    }

    @ReactMethod
    fun disconnect() {
        dataStore?.disconnectService()
        dataStore = null
        isConnecting.set(false)
    }

    @ReactMethod
    fun readDailySteps(startMillis: Double, endMillis: Double, promise: Promise) {
        if (!ensureConnected(promise)) return
        backgroundHandler.post {
            val resolver = HealthDataResolver(dataStore, null)

            val filter = HealthDataResolver.Filter.and(
                HealthDataResolver.Filter.greaterThanEquals(
                    HealthConstants.StepCount.START_TIME,
                    startMillis.toLong()
                ),
                HealthDataResolver.Filter.lessThan(
                    HealthConstants.StepCount.END_TIME,
                    endMillis.toLong()
                )
            )

            val request = HealthDataResolver.ReadRequest.Builder()
                .setDataType(HealthConstants.StepCount.HEALTH_DATA_TYPE)
                .setProperties(
                    arrayOf(
                        HealthConstants.StepCount.COUNT,
                        HealthConstants.StepCount.START_TIME,
                        HealthConstants.StepCount.END_TIME
                    )
                )
                .setFilter(filter)
                .build()

            try {
                var total = 0.0
                resolver.read(request).use { result ->
                    while (result.hasNext()) {
                        val data = result.next()
                        total += data.getLong(HealthConstants.StepCount.COUNT).toDouble()
                    }
                }
                promise.resolve(total)
            } catch (e: Exception) {
                promise.reject("E_READ_STEPS", e.message, e)
            }
        }
    }

    @ReactMethod
    fun readSleepSessions(startMillis: Double, endMillis: Double, promise: Promise) {
        if (!ensureConnected(promise)) return

        backgroundHandler.post {
            val resolver = HealthDataResolver(dataStore, null)

            val filter = HealthDataResolver.Filter.and(
                HealthDataResolver.Filter.greaterThanEquals(
                    HealthConstants.Sleep.START_TIME,
                    startMillis.toLong()
                ),
                HealthDataResolver.Filter.lessThan(
                    HealthConstants.Sleep.END_TIME,
                    endMillis.toLong()
                )
            )

            val request = HealthDataResolver.ReadRequest.Builder()
                .setDataType(HealthConstants.Sleep.HEALTH_DATA_TYPE)
                .setProperties(
                    arrayOf(
                        HealthConstants.Sleep.START_TIME,
                        HealthConstants.Sleep.END_TIME,
                        HealthConstants.Sleep.STATE
                    )
                )
                .setFilter(filter)
                .build()

            try {
                val array = Arguments.createArray()
                resolver.read(request).use { result ->
                    while (result.hasNext()) {
                        val data = result.next()
                        val map = Arguments.createMap()
                        map.putDouble(
                            "start",
                            data.getLong(HealthConstants.Sleep.START_TIME).toDouble()
                        )
                        map.putDouble(
                            "end",
                            data.getLong(HealthConstants.Sleep.END_TIME).toDouble()
                        )
                        if (data.getString(HealthConstants.Sleep.STATE) != null) {
                            map.putString(
                                "state",
                                data.getString(HealthConstants.Sleep.STATE)
                            )
                        }
                        array.pushMap(map)
                    }
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("E_READ_SLEEP", e.message, e)
            }
        }
    }

    @ReactMethod
    fun readHeartRate(startMillis: Double, endMillis: Double, promise: Promise) {
        if (!ensureConnected(promise)) return

        backgroundHandler.post {
            val resolver = HealthDataResolver(dataStore, null)

            val filter = HealthDataResolver.Filter.and(
                HealthDataResolver.Filter.greaterThanEquals(
                    HealthConstants.HeartRate.START_TIME,
                    startMillis.toLong()
                ),
                HealthDataResolver.Filter.lessThan(
                    HealthConstants.HeartRate.END_TIME,
                    endMillis.toLong()
                )
            )

            val request = HealthDataResolver.ReadRequest.Builder()
                .setDataType(HealthConstants.HeartRate.HEALTH_DATA_TYPE)
                .setProperties(
                    arrayOf(
                        HealthConstants.HeartRate.HEART_RATE,
                        HealthConstants.HeartRate.START_TIME
                    )
                )
                .setFilter(filter)
                .build()

            try {
                val array = Arguments.createArray()
                resolver.read(request).use { result ->
                    while (result.hasNext()) {
                        val data = result.next()
                        val map = Arguments.createMap()
                        map.putDouble(
                            "value",
                            data.getFloat(HealthConstants.HeartRate.HEART_RATE).toDouble()
                        )
                        map.putDouble(
                            "timestamp",
                            data.getLong(HealthConstants.HeartRate.START_TIME).toDouble()
                        )
                        array.pushMap(map)
                    }
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("E_READ_HEARTRATE", e.message, e)
            }
        }
    }

    private fun isSamsungHealthInstalled(): Boolean {
        return try {
            reactContext.packageManager.getPackageInfo(SHEALTH_PACKAGE, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    private fun checkPermissions(promise: Promise) {
        try {
            val store = dataStore ?: run {
                promise.reject("E_NOT_CONNECTED", "Samsung Health store is not connected.")
                return
            }
            val pmsManager = HealthPermissionManager(store)
            val resultMap = pmsManager.isPermissionAcquired(permissionKeySet)
            val needed = permissionKeySet.filter { resultMap[it] != true }.toSet()
            if (needed.isEmpty()) {
                promise.resolve(true)
                return
            }
            val activity = currentActivity
            if (activity == null) {
                promise.reject("E_NO_ACTIVITY", "A foreground activity is required to request permissions.")
                return
            }
            UiThreadUtil.runOnUiThread {
                try {
                    pmsManager.requestPermissions(needed, activity)
                        .setResultListener { result ->
                            val map = result.resultMap
                            val granted = map.all { it.value == true }
                            if (granted) {
                                promise.resolve(true)
                            } else {
                                promise.reject(
                                    "E_PERMISSION_DENIED",
                                    "Samsung Health permissions were declined."
                                )
                            }
                        }
                } catch (e: Exception) {
                    promise.reject("E_PERMISSION_REQUEST", e.message, e)
                }
            }
        } catch (e: Exception) {
            promise.reject("E_PERMISSION_CHECK", e.message, e)
        }
    }

    private fun requestPermissionsInternal() {
        val promise = connectPromise ?: return
        connectPromise = null
        isConnecting.set(false)
        checkPermissions(promise)
    }

    private fun ensureConnected(promise: Promise): Boolean {
        val connected = dataStore?.isConnected == true
        if (!connected) {
            promise.reject("E_NOT_CONNECTED", "Samsung Health is not connected.")
        }
        return connected
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        dataStore?.disconnectService()
        dataStore = null
        handlerThread.quitSafely()
    }
}

