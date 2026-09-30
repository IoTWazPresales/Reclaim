/**
 * Home privacy zone for a run route.
 * 200 metres is a privacy radius so the saved track does not start at the door.
 * It is not a pace, a session length, or a deload. RUNNING_DESIGN.md does not define it.
 */
export const RUN_HOME_PRIVACY_RADIUS_M = 200;

export type RunFix = {
  recordedAt: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
};

export type RunHome = {
  latitude: number;
  longitude: number;
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in metres. */
export function distanceMetres(a: RunHome, b: Pick<RunFix, 'latitude' | 'longitude'>): number {
  const earthM = 6_371_000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInsideHomePrivacyZone(fix: Pick<RunFix, 'latitude' | 'longitude'>, home: RunHome | null): boolean {
  if (!home) return false;
  return distanceMetres(home, fix) <= RUN_HOME_PRIVACY_RADIUS_M;
}

/** Points inside the home zone are omitted. With no saved home, the track is unchanged. */
export function pointsOutsideHomePrivacyZone(points: RunFix[], home: RunHome | null): RunFix[] {
  if (!home) return points.slice();
  return points.filter((point) => !isInsideHomePrivacyZone(point, home));
}
