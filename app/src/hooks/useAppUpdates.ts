import { useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { logger } from '@/lib/logger';

export interface UpdateStatus {
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  updateInfo: Awaited<ReturnType<typeof Updates.fetchUpdateAsync>> | null;
  error: Error | null;
}

/**
 * Hook to check for and apply app updates
 * Works for both OTA updates (EAS Updates) and native updates (store updates)
 */
export function useAppUpdates() {
  const [status, setStatus] = useState<UpdateStatus>({
    isUpdateAvailable: false,
    isUpdatePending: false,
    isChecking: false,
    isDownloading: false,
    updateInfo: null,
    error: null,
  });

  useEffect(() => {
    checkForUpdates();
  }, []);

  /**
   * Check for available updates
   * Handles both OTA updates and store updates
   */
  const checkForUpdates = async () => {
    // Skip in development
    if (__DEV__) {
      logger.debug('Skipping update check in development mode');
      return;
    }

    // Skip if updates are not enabled
    if (!Updates.isEnabled) {
      logger.debug('Updates are not enabled');
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isChecking: true, error: null }));

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        logger.log('Update available, downloading...');
        setStatus(prev => ({ ...prev, isUpdateAvailable: true, isDownloading: true }));

        const result = await Updates.fetchUpdateAsync();

        if (result.isNew) {
          logger.log('Update downloaded, will apply on next restart');
          setStatus(prev => ({
            ...prev,
            isUpdatePending: true,
            isDownloading: false,
            updateInfo: result,
          }));

          // Show user-friendly notification
          if (Platform.OS === 'android') {
            Alert.alert(
              'Update Downloaded',
              'A new version has been downloaded. The app will update the next time you restart it.',
              [
                {
                  text: 'Restart Now',
                  onPress: () => {
                    Updates.reloadAsync().catch((err) => {
                      logger.error('Failed to reload with update:', err);
                      Alert.alert('Error', 'Failed to apply update. Please restart the app manually.');
                    });
                  },
                },
                { text: 'Later', style: 'cancel' },
              ]
            );
          }
        }
      } else {
        logger.debug('No update available');
        setStatus(prev => ({ ...prev, isUpdateAvailable: false, isChecking: false }));
      }
    } catch (error: any) {
      logger.error('Update check failed:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
        isChecking: false,
        isDownloading: false,
      }));
    }
  };

  /**
   * Manually trigger update check
   */
  const checkForUpdatesManually = async () => {
    await checkForUpdates();
  };

  /**
   * Apply pending update immediately
   */
  const applyUpdate = async () => {
    if (!status.isUpdatePending) {
      logger.warn('No update pending to apply');
      return;
    }

    try {
      await Updates.reloadAsync();
    } catch (error: any) {
      logger.error('Failed to apply update:', error);
      throw error;
    }
  };

  /**
   * Get current update info
   */
  const getCurrentUpdateInfo = () => {
    return {
      updateId: Updates.updateId,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      createdAt: Updates.createdAt,
      manifest: Updates.manifest,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      isEmergencyLaunch: Updates.isEmergencyLaunch,
    };
  };

  return {
    ...status,
    checkForUpdates: checkForUpdatesManually,
    applyUpdate,
    getCurrentUpdateInfo,
    currentUpdateInfo: getCurrentUpdateInfo(),
  };
}

/**
 * Get app version info for display
 */
export function getAppVersionInfo() {
  const expoConfig = Constants.expoConfig;
  
  return {
    version: expoConfig?.version ?? '1.0.0',
    buildNumber: Platform.OS === 'ios' 
      ? expoConfig?.ios?.buildNumber ?? '1'
      : expoConfig?.android?.versionCode ?? 1,
    runtimeVersion: Updates.runtimeVersion ?? '1.0.0',
    updateId: Updates.updateId ?? 'unknown',
    channel: Updates.channel ?? 'unknown',
    isDevelopment: __DEV__,
    isUpdateEnabled: Updates.isEnabled,
  };
}

