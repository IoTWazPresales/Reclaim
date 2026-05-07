/**
 * Enables guided trace logging/capture only when:
 * - Running under Metro (`__DEV__`), or
 * - Standalone QA/internal APK with build-time `EXPO_PUBLIC_GUIDED_TRACE_QA=1` (EAS profile env).
 *
 * Production/store bundles must not set `EXPO_PUBLIC_GUIDED_TRACE_QA`.
 * Do not use `developmentClient` / dev launcher profiles for this QA path — use profile `qa-guided-trace-apk`.
 */

/** Build-time flag from EAS profile `env` (embedded in the JS bundle). */
export function isGuidedTraceQaBuild(): boolean {
  return process.env.EXPO_PUBLIC_GUIDED_TRACE_QA === '1';
}

export function isGuidedDevInstrumentationEnabled(): boolean {
  if (__DEV__) return true;
  return isGuidedTraceQaBuild();
}
