import type { RunFix } from './runPrivacy';

/**
 * Read track points from a GPX string. Used by the route harness.
 * Device playback of a GPX file stays a human check while the emulator is down.
 */
export function parseGpxTrack(gpx: string, recordedAt = '2026-09-30T12:00:00.000Z'): RunFix[] {
  const points: RunFix[] = [];
  const re = /<trkpt\b[^>]*\blat="([^"]+)"[^>]*\blon="([^"]+)"|<trkpt\b[^>]*\blon="([^"]+)"[^>]*\blat="([^"]+)"/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(gpx))) {
    const latitude = Number(match[1] ?? match[4]);
    const longitude = Number(match[2] ?? match[3]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const at = new Date(Date.parse(recordedAt) + index * 1000).toISOString();
    points.push({ recordedAt: at, latitude, longitude });
    index += 1;
  }
  return points;
}
