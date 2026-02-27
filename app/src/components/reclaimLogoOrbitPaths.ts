import { RECLAIM_VIEWBOX } from '@/lib/reclaimSvgPath';

export type OrbitPoint = { x: number; y: number };
export type OrbitPathTriple = [OrbitPoint[], OrbitPoint[], OrbitPoint[]];

type OrbitSpec = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotationDeg: number;
};

const DEFAULT_SAMPLES = 480;

function sampleEllipse(spec: OrbitSpec, samples: number): OrbitPoint[] {
  const count = Math.max(24, Math.floor(samples));
  const theta = (spec.rotationDeg * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const points: OrbitPoint[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const ex = spec.rx * Math.cos(a);
    const ey = spec.ry * Math.sin(a);

    const x = spec.cx + ex * cosT - ey * sinT;
    const y = spec.cy + ex * sinT + ey * cosT;
    points.push({ x, y });
  }
  return points;
}

/**
 * Stable analytic ring orbits for the Reclaim mark.
 *
 * Why analytic (instead of contour-derived): the path has many internal contours
 * and ContourMeasureIter selection can fail silently, producing empty ring arrays.
 * Explicit ring geometry is deterministic and keeps the three orbs always visible.
 */
export function generateReclaimOrbitalPaths(samples = DEFAULT_SAMPLES): OrbitPathTriple {
  const [vbX, vbY, vbW, vbH] = RECLAIM_VIEWBOX;
  const cx = vbX + vbW * 0.5;
  const cy = vbY + vbH * 0.5;

  const rx = vbW * 0.335;
  const ry = vbH * 0.25;

  const specs: [OrbitSpec, OrbitSpec, OrbitSpec] = [
    { cx, cy, rx, ry, rotationDeg: -18 },
    { cx, cy, rx, ry, rotationDeg: 52 },
    { cx, cy, rx, ry, rotationDeg: 122 },
  ];

  return [
    sampleEllipse(specs[0], samples),
    sampleEllipse(specs[1], samples),
    sampleEllipse(specs[2], samples),
  ];
}
