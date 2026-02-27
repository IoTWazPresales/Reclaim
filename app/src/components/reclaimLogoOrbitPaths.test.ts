import { describe, expect, it } from 'vitest';
import { generateReclaimOrbitalPaths } from './reclaimLogoOrbitPaths';

describe('generateReclaimOrbitalPaths', () => {
  it('returns three non-empty orbit point arrays', () => {
    const [ring0, ring1, ring2] = generateReclaimOrbitalPaths();
    expect(ring0.length).toBeGreaterThan(0);
    expect(ring1.length).toBeGreaterThan(0);
    expect(ring2.length).toBeGreaterThan(0);
  });

  it('keeps all points finite for splash logo rendering', () => {
    const rings = generateReclaimOrbitalPaths(360);
    rings.flat().forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });
});
