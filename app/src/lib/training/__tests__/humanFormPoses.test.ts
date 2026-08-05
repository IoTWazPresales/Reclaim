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
  /** Arm angle minus torso lean (rot convention) — stable when arms are torso-relative. */
  function armAngleRelativeToTorso(layout: ReturnType<typeof layoutHuman>) {
    const torsoAngEst = Math.atan2(layout.neck.x - layout.hip.x, layout.hip.y - layout.neck.y);
    const armAng = Math.atan2(layout.wrist.x - layout.shoulder.x, layout.wrist.y - layout.shoulder.y);
    return armAng - torsoAngEst;
  }

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

  it('knee_dominant: hip drops; arm angle vs torso stays pinned (not an arm pendulum)', () => {
    const pair = posePairForIntent('knee_dominant');
    const a = layoutHuman(pair.start, 160);
    const b = layoutHuman(pair.end, 160);
    const hipDrop = b.hip.y - a.hip.y;
    const relSwing = Math.abs(armAngleRelativeToTorso(b) - armAngleRelativeToTorso(a));
    expect(hipDrop).toBeGreaterThan(18);
    expect(relSwing).toBeLessThan(0.2);
  });

  it('hip_hinge: hips sit back and torso tips; arm angle vs torso stays pinned', () => {
    const pair = posePairForIntent('hip_hinge');
    const a = layoutHuman(pair.start, 160);
    const b = layoutHuman(pair.end, 160);
    expect(b.hip.x).toBeLessThan(a.hip.x); // sit back
    const uprightA = (a.hip.y - a.neck.y) / Math.max(1, Math.hypot(a.neck.x - a.hip.x, a.hip.y - a.neck.y));
    const uprightB = (b.hip.y - b.neck.y) / Math.max(1, Math.hypot(b.neck.x - b.hip.x, b.hip.y - b.neck.y));
    expect(uprightB).toBeLessThan(uprightA - 0.08);
    const relSwing = Math.abs(armAngleRelativeToTorso(b) - armAngleRelativeToTorso(a));
    expect(relSwing).toBeLessThan(0.25);
  });

  it('horizontal_press: elbow travel dominates body travel', () => {
    const pair = posePairForIntent('horizontal_press');
    const a = layoutHuman(pair.start, 160);
    const b = layoutHuman(pair.end, 160);
    const elbowTravel = Math.hypot(b.elbow.x - a.elbow.x, b.elbow.y - a.elbow.y);
    const hipTravel = Math.hypot(b.hip.x - a.hip.x, b.hip.y - a.hip.y);
    expect(elbowTravel).toBeGreaterThan(hipTravel + 8);
  });

  it('armElevate 0 hangs along torso; with lean, wrist stays torso-relative (not world-down pendulum)', () => {
    const upright = layoutHuman({ ...sample, armElevate: 0 }, 160);
    const leaned = layoutHuman({ ...sample, torsoLean: 0.7, armElevate: 0 }, 160);
    expect(upright.wrist.y).toBeGreaterThan(upright.shoulder.y);
    const relU = { x: upright.wrist.x - upright.shoulder.x, y: upright.wrist.y - upright.shoulder.y };
    const relL = { x: leaned.wrist.x - leaned.shoulder.x, y: leaned.wrist.y - leaned.shoulder.y };
    const angU = Math.atan2(relU.x, relU.y);
    const angL = Math.atan2(relL.x, relL.y);
    expect(angL).toBeGreaterThan(angU + 0.15);
    expect(Math.abs(armAngleRelativeToTorso(leaned) - armAngleRelativeToTorso(upright))).toBeLessThan(0.12);
  });

  it('conditioning keeps armElevate pinned across start/end', () => {
    const pair = posePairForIntent('conditioning');
    expect(pair.start.armElevate).toBeCloseTo(pair.end.armElevate, 5);
    expect(Math.abs(pair.end.armElevate - pair.start.armElevate)).toBeLessThan(0.02);
  });
});
