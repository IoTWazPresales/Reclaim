/**
 * Pure tests for human form pose lerp + intent coverage.
 */
import { describe, expect, it } from 'vitest';
import type { MovementIntent } from '@/lib/training/types';
import {
  HUMAN_FORM_INTENTS,
  layoutHuman,
  lerp,
  lerpPose,
  posePairForIntent,
  type HumanPose,
} from '@/lib/training/humanFormPoses';

const sample: HumanPose = {
  torsoLean: 0,
  hipBend: 0,
  kneeBend: 0,
  armElevate: 0,
  elbowBend: 0,
  armRetract: 0,
};

const sampleEnd: HumanPose = {
  torsoLean: 1,
  hipBend: 1,
  kneeBend: 1,
  armElevate: 1,
  elbowBend: 1,
  armRetract: 1,
};

describe('lerp / lerpPose', () => {
  it('lerps scalars and clamps t', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, -1)).toBe(0);
    expect(lerp(0, 10, 2)).toBe(10);
  });

  it('lerpPose at 0/1 returns endpoints; mid is between', () => {
    expect(lerpPose(sample, sampleEnd, 0)).toEqual(sample);
    expect(lerpPose(sample, sampleEnd, 1)).toEqual(sampleEnd);
    const mid = lerpPose(sample, sampleEnd, 0.5);
    expect(mid.torsoLean).toBe(0.5);
    expect(mid.kneeBend).toBe(0.5);
  });
});

describe('posePairForIntent coverage', () => {
  it('defines start/end for every diagram intent', () => {
    for (const intent of HUMAN_FORM_INTENTS) {
      const pair = posePairForIntent(intent);
      expect(pair.start).toBeTruthy();
      expect(pair.end).toBeTruthy();
      expect(typeof pair.start.kneeBend).toBe('number');
      expect(typeof pair.end.armElevate).toBe('number');
    }
  });

  it('falls back for unknown intent casting', () => {
    const pair = posePairForIntent('horizontal_press' as MovementIntent);
    expect(pair.start.armElevate).toBeGreaterThan(0);
  });
});

describe('layoutHuman', () => {
  it('returns finite joints inside the canvas', () => {
    const pair = posePairForIntent('knee_dominant');
    const layout = layoutHuman(lerpPose(pair.start, pair.end, 0.5), 160);
    expect(layout.head.r).toBeGreaterThan(0);
    expect(layout.stroke).toBeGreaterThan(0);
    for (const p of [layout.hip, layout.knee, layout.ankle, layout.shoulder, layout.elbow, layout.wrist]) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThan(-20);
      expect(p.x).toBeLessThan(180);
      expect(p.y).toBeGreaterThan(-20);
      expect(p.y).toBeLessThan(180);
    }
  });
});
