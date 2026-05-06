/**
 * Enables guided trace logging/capture for local dev and EAS internal development-channel builds.
 * Installed development APKs typically run with __DEV__ false unless Metro is connected.
 */

import * as Updates from 'expo-updates';

export function isGuidedDevInstrumentationEnabled(): boolean {
  if (__DEV__) return true;
  try {
    return Updates.channel === 'development';
  } catch {
    return false;
  }
}
