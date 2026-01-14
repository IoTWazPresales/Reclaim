// Build Fingerprint Overlay - Shows build info in dev/preview builds only
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { logger } from '@/lib/logger';

// Generate a random build token at module load time
const BUILD_TOKEN = `B${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

// Try to get git commit (will be undefined in production builds)
let GIT_COMMIT: string | undefined;
try {
  // This will only work if git is available and we're in a git repo
  // In EAS builds, this will be undefined
  GIT_COMMIT = undefined; // Will be set via build-time env if available
} catch {
  GIT_COMMIT = undefined;
}

// JS bundle timestamp (build time)
const BUNDLE_TIMESTAMP = new Date().toISOString();

interface BuildFingerprintOverlayProps {
  visible?: boolean;
}

export function BuildFingerprintOverlay({ visible = true }: BuildFingerprintOverlayProps) {
  const [updateInfo, setUpdateInfo] = useState<{
    updateId: string | null;
    channel: string | null;
    isEnabled: boolean;
  }>({
    updateId: null,
    channel: null,
    isEnabled: false,
  });

  useEffect(() => {
    if (__DEV__ || Constants.expoConfig?.extra?.showBuildFingerprint) {
      try {
        setUpdateInfo({
          updateId: Updates.updateId ?? null,
          channel: Updates.channel ?? null,
          isEnabled: Updates.isEnabled,
        });
      } catch {
        // Updates not available
      }
    }
  }, []);

  // Only show in dev or if explicitly enabled
  if (!__DEV__ && !Constants.expoConfig?.extra?.showBuildFingerprint) {
    return null;
  }

  if (!visible) {
    return null;
  }

  const expoConfig = Constants.expoConfig;
  const version = expoConfig?.version ?? 'unknown';
  const buildNumber =
    Platform.OS === 'ios'
      ? expoConfig?.ios?.buildNumber ?? 'unknown'
      : String(expoConfig?.android?.versionCode ?? 'unknown');

  // Log fingerprint at mount
  useEffect(() => {
    logger.debug('[BuildFingerprint]', {
      token: BUILD_TOKEN,
      commit: GIT_COMMIT || 'unknown',
      version,
      buildNumber,
      updateId: updateInfo.updateId,
      channel: updateInfo.channel,
      bundleTimestamp: BUNDLE_TIMESTAMP,
    });
  }, []);

  return (
    <>
      {/* Bucket 3: OTA detection banner */}
      {updateInfo.isEnabled && (
        <View style={styles.otaBanner} pointerEvents="none">
          <Text style={styles.otaText}>
            {updateInfo.updateId ? '⚠️ OTA update active' : '✅ OTA off / no update'}
          </Text>
        </View>
      )}
      <View style={styles.container} pointerEvents="none">
        <View style={styles.content}>
          <Text style={styles.label} numberOfLines={1}>
            {BUILD_TOKEN}
          </Text>
          <Text style={styles.smallText} numberOfLines={1}>
            {GIT_COMMIT || 'unknown'} • v{version} ({buildNumber})
          </Text>
          {updateInfo.updateId && (
            <Text style={styles.smallText} numberOfLines={1}>
              OTA: {updateInfo.channel || 'unknown'} ({updateInfo.updateId.substring(0, 8)})
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  otaBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 8,
    zIndex: 9999,
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  otaText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 8,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 4,
    maxWidth: 200,
  },
  content: {
    gap: 2,
  },
  label: {
    color: '#00ff00',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  smallText: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

// Export token for use in console logs
export { BUILD_TOKEN, GIT_COMMIT, BUNDLE_TIMESTAMP };
