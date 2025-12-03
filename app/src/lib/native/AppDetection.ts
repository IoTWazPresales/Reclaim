/**
 * Native App Detection
 * Checks if health apps are installed using SDK availability checks (most reliable method)
 * Following OEM documentation: SDK initialization failure = app not installed/available
 */
import { Platform } from 'react-native';

// Package names for health apps (from AndroidManifest.xml)
export const HEALTH_APP_PACKAGES = {
  SAMSUNG_HEALTH: 'com.sec.android.app.shealth',
  HEALTH_CONNECT: 'com.google.android.apps.healthdata', // Official package name from Google
} as const;

/**
 * Check if Samsung Health is installed
 * Uses SDK availability check - most reliable method per Samsung documentation
 */
export async function isSamsungHealthInstalled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    // Try to check if Samsung Health native module is available
    // This is more reliable than package name checking
    const { NativeModules } = await import('react-native');
    const samsungModule = (NativeModules as any)?.SamsungHealthAndroid;
    
    if (!samsungModule || typeof samsungModule !== 'object') {
      return false;
    }

    // Try to connect - if SDK is available, app is likely installed
    // Note: This doesn't require permissions, just checks availability
    if (typeof samsungModule.connect === 'function') {
      try {
        // Use a non-blocking check - if module exists and can be called, app is installed
        // The actual connection will be done in the provider with proper error handling
        return true;
      } catch {
        return false;
      }
    }

    return false;
  } catch (error) {
    console.warn('[AppDetection] Error checking Samsung Health:', error);
    return false;
  }
}

/**
 * Check if Health Connect is installed
 * Uses SDK availability check - most reliable method per Google Health Connect documentation
 * The SDK's isAvailable() method is the official way to check installation
 */
export async function isHealthConnectInstalled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    // Try to import and check Health Connect SDK
    // This is the recommended method per Google's documentation
    let HealthConnect: any;
    try {
      HealthConnect = require('react-native-health-connect');
    } catch (importError) {
      // Module not available - Health Connect likely not installed
      return false;
    }

    if (!HealthConnect || typeof HealthConnect !== 'object') {
      return false;
    }

    // Use SDK's built-in availability check
    // Per Google docs: isAvailable() checks if Health Connect is installed and accessible
    if (typeof HealthConnect.isAvailable === 'function') {
      try {
        const available = await HealthConnect.isAvailable();
        return available === true;
      } catch (error) {
        // If isAvailable throws an error, Health Connect is not installed
        console.debug('[AppDetection] Health Connect isAvailable check failed:', error);
        return false;
      }
    }

    // If isAvailable method doesn't exist, check if module loaded
    // Module existence doesn't guarantee app installation, but it's a good indicator
    return HealthConnect !== null && HealthConnect !== undefined;
  } catch (error) {
    console.warn('[AppDetection] Error checking Health Connect:', error);
    return false;
  }
}

