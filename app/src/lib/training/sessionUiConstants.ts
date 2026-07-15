/**
 * Session UI thresholds (display / resume guards).
 * Not work-position authority — see sessionWorkAuthority for set/exercise cursor.
 */

/** Production: treat an open session as stale after this many hours without recent set activity. */
export const STALE_SESSION_HOURS = 5;

/**
 * Resolves the stale-session threshold in ms.
 * Production: STALE_SESSION_HOURS.
 * __DEV__ only: if EXPO_PUBLIC_STALE_SESSION_MINUTES is a positive number, use that many minutes
 * so overnight behavior can be simulated without waiting production hours. Unset → production hours.
 */
export function getStaleSessionThresholdMs(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): number {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const raw = env.EXPO_PUBLIC_STALE_SESSION_MINUTES;
    if (raw != null && raw !== '') {
      const minutes = Number(raw);
      if (Number.isFinite(minutes) && minutes > 0) {
        return minutes * 60 * 1000;
      }
    }
  }
  return STALE_SESSION_HOURS * 60 * 60 * 1000;
}
