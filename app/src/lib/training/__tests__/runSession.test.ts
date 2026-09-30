import { describe, expect, it } from 'vitest';
import { parseGpxTrack } from '@/lib/training/runGpx';
import { runCueIntentKey, runStartCue } from '@/lib/training/runCue';
import {
  distanceMetres,
  isInsideHomePrivacyZone,
  pointsOutsideHomePrivacyZone,
  RUN_HOME_PRIVACY_RADIUS_M,
} from '@/lib/training/runPrivacy';

describe('run privacy zone', () => {
  const home = { latitude: -33.9, longitude: 18.4 };

  it('keeps the product privacy radius at 200 m', () => {
    expect(RUN_HOME_PRIVACY_RADIUS_M).toBe(200);
  });

  it('drops a point at the saved home and keeps a point well outside it', () => {
    const near = { recordedAt: '2026-09-30T12:00:00.000Z', latitude: -33.9, longitude: 18.4 };
    const far = { recordedAt: '2026-09-30T12:01:00.000Z', latitude: -33.92, longitude: 18.4 };
    expect(distanceMetres(home, near)).toBeLessThan(200);
    expect(isInsideHomePrivacyZone(near, home)).toBe(true);
    expect(isInsideHomePrivacyZone(far, home)).toBe(false);
    expect(pointsOutsideHomePrivacyZone([near, far], home)).toEqual([far]);
  });

  it('stores the track unchanged when no home is saved', () => {
    const point = { recordedAt: '2026-09-30T12:00:00.000Z', latitude: 1, longitude: 2 };
    expect(pointsOutsideHomePrivacyZone([point], null)).toEqual([point]);
  });
});

describe('run GPX harness', () => {
  it('reads track points in either attribute order', () => {
    const gpx = `<?xml version="1.0"?>
      <gpx><trk><trkseg>
        <trkpt lat="-33.9" lon="18.4"></trkpt>
        <trkpt lon="18.41" lat="-33.91"></trkpt>
      </trkseg></trk></gpx>`;
    const points = parseGpxTrack(gpx, '2026-09-30T12:00:00.000Z');
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ latitude: -33.9, longitude: 18.4 });
    expect(points[1]).toMatchObject({ latitude: -33.91, longitude: 18.41 });
    expect(points[1].recordedAt > points[0].recordedAt).toBe(true);
  });
});

describe('run cue', () => {
  it('uses the talk test and does not state a pace', () => {
    const cue = runStartCue();
    expect(cue.body.toLowerCase()).toContain('talk');
    expect(cue.body.toLowerCase()).toContain('no pace is set');
    expect(cue.body.toLowerCase()).not.toMatch(/\d|min\/km|heart rate|zone/);
    expect(runCueIntentKey('sess-1')).toBe('training_run:sess-1');
  });
});
