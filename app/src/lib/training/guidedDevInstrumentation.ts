/**
 * Enables guided trace logging/capture when:
 * - Local Metro (__DEV__), or
 * - Standalone QA APK (EXPO_PUBLIC_GUIDED_TRACE_QA), or
 * - Legacy EAS internal dev-channel installs (Updates.channel === 'development').
 *
 * Standalone QA builds must not rely on __DEV__ or the development channel alone.
 */

import * as Updates from 'expo-updates';

/** Build-time flag from EAS profile `env` (embedded in JS bundle). */
export function isGuidedTraceQaBuild(): boolean {
  return process.env.EXPO_PUBLIC_GUIDED_TRACE_QA === '1';
}

export function isGuidedDevInstrumentationEnabled(): boolean {
  if (__DEV__) return true;
  if (isGuidedTraceQaBuild()) return true;
  try {
    return Updates.channel === 'development';
  } catch {
    return false;
  }
}
