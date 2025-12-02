/**
 * Native App Detection
 * Checks if health apps are installed using package names
 */
import { NativeModules, Platform } from 'react-native';
import { Linking } from 'react-native';

const { AppDetection } = NativeModules as any;

// Package names for health apps
export const HEALTH_APP_PACKAGES = {
  SAMSUNG_HEALTH: 'com.sec.android.app.shealth',
  HEALTH_CONNECT_CONTROLLER: 'com.google.android.healthconnect.controller',
  HEALTH_CONNECT_DATA: 'com.google.android.healthconnect.apps.healthdata',
} as const;

/**
 * Check if an app is installed by trying to open it
 * Falls back to checking if we can query the package
 */
export async function isAppInstalled(packageName: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    // Try using native module if available
    if (AppDetection && typeof AppDetection.isAppInstalled === 'function') {
      return await AppDetection.isAppInstalled(packageName);
    }

    // Fallback: Try to query the package using Android Intent
    // This is a workaround - we'll use the queries in AndroidManifest
    // and check if the app responds to a query
    try {
      const url = `android-app://${packageName}`;
      const canOpen = await Linking.canOpenURL(url);
      return canOpen;
    } catch {
      // If that fails, we can't determine - return false to be safe
      return false;
    }
  } catch (error) {
    console.warn(`[AppDetection] Error checking ${packageName}:`, error);
    return false;
  }
}

/**
 * Check if Samsung Health is installed
 */
export async function isSamsungHealthInstalled(): Promise<boolean> {
  return isAppInstalled(HEALTH_APP_PACKAGES.SAMSUNG_HEALTH);
}

/**
 * Check if Health Connect is installed
 * Checks both controller and data packages
 */
export async function isHealthConnectInstalled(): Promise<boolean> {
  const controller = await isAppInstalled(HEALTH_APP_PACKAGES.HEALTH_CONNECT_CONTROLLER);
  const data = await isAppInstalled(HEALTH_APP_PACKAGES.HEALTH_CONNECT_DATA);
  // Health Connect is installed if either package exists
  return controller || data;
}

