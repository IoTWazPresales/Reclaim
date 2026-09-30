import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { logger } from '@/lib/logger';

/** Manifest and runtime location permissions for a run. Declared and used together. */
export const RUN_LOCATION_PERMISSIONS = {
  fine: 'android.permission.ACCESS_FINE_LOCATION',
  foregroundService: 'android.permission.FOREGROUND_SERVICE_LOCATION',
  writeRoute: 'android.permission.health.WRITE_EXERCISE_ROUTE',
} as const;

export function shouldRequestFineLocation(alreadyGranted: boolean, isRun: boolean): boolean {
  return isRun && !alreadyGranted;
}

/** Fine location is requested only when a run is starting and it is not already granted. */
export async function ensureFineLocationForRun(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    if (!shouldRequestFineLocation(granted, true)) return granted;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location during a run',
      message: 'Reclaim uses your location while a run is in progress so the route can be saved. Strength sessions do not ask for this.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    logger.warn('[RUN_LOCATION] fine location request failed', e);
    return false;
  }
}

export type NativeRunFix = {
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  recordedAtMs?: number;
};

type RunLocationNative = {
  getLastLocation?: () => Promise<NativeRunFix>;
};

export async function readNativeRunFix(): Promise<NativeRunFix | null> {
  const native = NativeModules.ReclaimSessionForeground as RunLocationNative | undefined;
  if (!native?.getLastLocation) return null;
  try {
    const fix = await native.getLastLocation();
    if (typeof fix?.latitude !== 'number' || typeof fix?.longitude !== 'number') return null;
    if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return null;
    return fix;
  } catch (e) {
    if (__DEV__) logger.debug('[RUN_LOCATION] getLastLocation failed', e);
    return null;
  }
}
