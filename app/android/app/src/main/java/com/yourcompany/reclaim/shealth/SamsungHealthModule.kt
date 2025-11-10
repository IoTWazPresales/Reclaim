package com.yourcompany.reclaim.shealth

import android.content.pm.PackageManager
import android.os.HandlerThread
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule
import com.samsung.android.sdk.health.data.HealthDataService
import com.samsung.android.sdk.health.data.HealthDataStore
import com.samsung.android.sdk.health.data.data.AggregatedData
import com.samsung.android.sdk.health.data.data.HealthDataPoint
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import com.samsung.android.sdk.health.data.request.LocalTimeGroup
import com.samsung.android.sdk.health.data.request.LocalTimeGroupUnit
import com.samsung.android.sdk.health.data.request.Ordering
import com.samsung.android.sdk.health.data.response.DataResponse
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.concurrent.atomic.AtomicBoolean
import java.util.function.Consumer

@ReactModule(name = SamsungHealthModule.NAME)
class SamsungHealthModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SamsungHealth"
        private const val SHEALTH_PACKAGE = "com.samsung.android.app.shealth"
        private const val TAG = "SamsungHealthModule"
    }

    private val handlerThread = HandlerThread("SamsungHealthThread").apply { start() }
    private val backgroundLooper = handlerThread.looper
    private val isRequestingPermissions = AtomicBoolean(false)

    private var dataStore: HealthDataStore? = null

    private val requiredPermissions: Set<Permission> = setOf(
        Permission.of(DataTypes.HEART_RATE, AccessType.READ),
        Permission.of(DataTypes.SLEEP, AccessType.READ),
        Permission.of(DataTypes.STEPS, AccessType.READ)
    )

    override fun getName(): String = NAME

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(isSamsungHealthInstalled())
    }

    @ReactMethod
    fun connect(promise: Promise) {
        if (!isSamsungHealthInstalled()) {
            promise.reject("E_NOT_AVAILABLE", "Samsung Health app is not installed on this device.")
            return
        }

        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("E_NO_ACTIVITY", "Samsung Health connection requires an active activity.")
            return
        }

        val store = try {
            ensureStore()
        } catch (error: Throwable) {
            promise.reject("E_STORE_UNAVAILABLE", error.message, error)
            return
        }

        if (!isRequestingPermissions.compareAndSet(false, true)) {
            promise.reject("E_IN_PROGRESS", "A Samsung Health permission request is already in progress.")
            return
        }

        val permissionSuccess = object : Consumer<Set<Permission>> {
            override fun accept(granted: Set<Permission>) {
                if (granted.containsAll(requiredPermissions)) {
                    isRequestingPermissions.set(false)
                    promise.resolve(true)
                    return
                }

                UiThreadUtil.runOnUiThread {
                    try {
                        val requestSuccess = object : Consumer<Set<Permission>> {
                            override fun accept(requested: Set<Permission>) {
                                isRequestingPermissions.set(false)
                                if (requested.containsAll(requiredPermissions)) {
                                    promise.resolve(true)
                                } else {
                                    promise.reject(
                                        "E_PERMISSION_DENIED",
                                        "Samsung Health permissions were declined."
                                    )
                                }
                            }
                        }
                        val requestError = object : Consumer<Throwable> {
                            override fun accept(error: Throwable) {
                                isRequestingPermissions.set(false)
                                promise.reject(
                                    "E_PERMISSION_REQUEST",
                                    error.message ?: "Samsung Health permission request failed.",
                                    error
                                )
                            }
                        }
                        store.requestPermissionsAsync(requiredPermissions, activity)
                            .setCallback(activity.mainLooper, requestSuccess, requestError)
                    } catch (error: Throwable) {
                        isRequestingPermissions.set(false)
                        promise.reject("E_PERMISSION_REQUEST", error.message, error)
                    }
                }
            }
        }

        val permissionError = object : Consumer<Throwable> {
            override fun accept(error: Throwable) {
                isRequestingPermissions.set(false)
                promise.reject(
                    "E_PERMISSION_STATUS",
                    error.message ?: "Failed to check Samsung Health permission status.",
                    error
                )
            }
        }

        store.getGrantedPermissionsAsync(requiredPermissions)
            .setCallback(backgroundLooper, permissionSuccess, permissionError)
    }

    @ReactMethod
    fun disconnect() {
        dataStore = null
    }

    @ReactMethod
    fun readDailySteps(startMillis: Double, endMillis: Double, promise: Promise) {
        val store = safeStore(promise) ?: return
        val request = try {
            val start = toLocalDateTime(startMillis)
            val end = toLocalDateTime(endMillis)
            val filter = LocalTimeFilter.of(start, end)
            val group = LocalTimeGroup.of(LocalTimeGroupUnit.HOURLY, 1)
            DataType.StepsType.TOTAL.requestBuilder
                .setLocalTimeFilterWithGroup(filter, group)
                .setOrdering(Ordering.ASC)
                .build()
        } catch (error: Throwable) {
            promise.reject("E_STEPS_REQUEST", error.message, error)
            return
        }

        store.aggregateDataAsync(request)
            .setCallback(
                backgroundLooper,
                Consumer { response: DataResponse<AggregatedData<Long>> ->
                    var total = 0L
                    val segments = Arguments.createArray()
                    response.dataList.forEach { aggregated ->
                        val value = (aggregated.value as? Number)?.toLong() ?: 0L
                        val startEpoch = aggregated.startTime?.toEpochMilli() ?: 0L
                        val endEpoch = aggregated.endTime?.toEpochMilli() ?: 0L
                        total += value
                        val map = Arguments.createMap()
                        map.putDouble("value", value.toDouble())
                        map.putDouble("start", startEpoch.toDouble())
                        map.putDouble("end", endEpoch.toDouble())
                        segments.pushMap(map)
                    }
                    val result = Arguments.createMap().apply {
                        putDouble("total", total.toDouble())
                        putArray("segments", segments)
                    }
                    promise.resolve(result)
                },
                Consumer { error: Throwable ->
                    promise.reject(
                        "E_STEPS_READ",
                        error.message ?: "Failed to read step data from Samsung Health.",
                        error
                    )
                }
            )
    }

    @ReactMethod
    fun readSleepSessions(startMillis: Double, endMillis: Double, promise: Promise) {
        val store = safeStore(promise) ?: return
        val request = try {
            val start = toLocalDateTime(startMillis)
            val end = toLocalDateTime(endMillis)
            DataTypes.SLEEP.readDataRequestBuilder
                .setLocalTimeFilter(LocalTimeFilter.of(start, end))
                .setOrdering(Ordering.ASC)
                .build()
        } catch (error: Throwable) {
            promise.reject("E_SLEEP_REQUEST", error.message, error)
            return
        }

        store.readDataAsync(request)
            .setCallback(
                backgroundLooper,
                Consumer<DataResponse<HealthDataPoint>> { response ->
                    val array = Arguments.createArray()
                    response.dataList.forEach { dataPoint ->
                        val start = dataPoint.startTime?.toEpochMilli() ?: 0L
                        val end = dataPoint.endTime?.toEpochMilli() ?: 0L
                        array.pushMap(Arguments.createMap().apply {
                            putString("uid", dataPoint.uid ?: "")
                            putDouble("start", start.toDouble())
                            putDouble("end", end.toDouble())
                        })
                    }
                    promise.resolve(array)
                },
                Consumer<Throwable> { error ->
                    promise.reject(
                        "E_SLEEP_READ",
                        error.message ?: "Failed to read sleep sessions from Samsung Health.",
                        error
                    )
                }
            )
    }

    @ReactMethod
    fun readHeartRate(startMillis: Double, endMillis: Double, promise: Promise) {
        val store = safeStore(promise) ?: return
        val request = try {
            val start = toLocalDateTime(startMillis)
            val end = toLocalDateTime(endMillis)
            DataTypes.HEART_RATE.readDataRequestBuilder
                .setLocalTimeFilter(LocalTimeFilter.of(start, end))
                .setOrdering(Ordering.ASC)
                .build()
        } catch (error: Throwable) {
            promise.reject("E_HEARTRATE_REQUEST", error.message, error)
            return
        }

        store.readDataAsync(request)
            .setCallback(
                backgroundLooper,
                Consumer<DataResponse<HealthDataPoint>> { response ->
                    val array = Arguments.createArray()
                    response.dataList.forEach { point ->
                        val value = point.getValue(DataType.HeartRateType.HEART_RATE) ?: return@forEach
                        val timestamp = point.startTime?.toEpochMilli() ?: 0L
                        array.pushMap(Arguments.createMap().apply {
                            putDouble("value", value.toDouble())
                            putDouble("timestamp", timestamp.toDouble())
                        })
                    }
                    promise.resolve(array)
                },
                Consumer<Throwable> { error ->
                    promise.reject(
                        "E_HEARTRATE_READ",
                        error.message ?: "Failed to read heart rate samples from Samsung Health.",
                        error
                    )
                }
            )
    }

    private fun safeStore(promise: Promise): HealthDataStore? {
        return try {
            ensureStore()
        } catch (error: Throwable) {
            promise.reject("E_STORE_UNAVAILABLE", error.message, error)
            null
        }
    }

    private fun ensureStore(): HealthDataStore {
        dataStore?.let { return it }
        val store = HealthDataService.getStore(reactContext)
        dataStore = store
        return store
    }

    private fun isSamsungHealthInstalled(): Boolean {
        val pm = reactContext.packageManager
        val packages = listOf(
            SHEALTH_PACKAGE,
            "com.sec.android.app.shealth" // legacy package name on some devices
        )
        for (pkg in packages) {
            try {
                pm.getPackageInfo(pkg, 0)
                return true
            } catch (_: PackageManager.NameNotFoundException) {
                // continue
            }
        }
        return try {
            HealthDataService.isSamsungHealthInstalled(reactContext)
        } catch (_: Throwable) {
            false
        }
    }

    private fun toLocalDateTime(millis: Double): LocalDateTime =
        LocalDateTime.ofInstant(Instant.ofEpochMilli(millis.toLong()), ZoneId.systemDefault())

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        dataStore = null
        if (handlerThread.isAlive) {
            handlerThread.quitSafely()
        }
    }
}

