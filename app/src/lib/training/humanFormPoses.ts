/**
 * Pure pose model for animated human form cues.
 * Poses are normalized 0..1 knobs; layout maps them to pixels in HumanFormDiagram.
 */
import type { MovementIntent } from './types';

export type HumanPose = {
  /** 0 = upright spine, 1 = deep forward hinge */
  torsoLean: number;
  /** 0 = hips open/standing, 1 = hips flexed (sit back) */
  hipBend: number;
  /** 0 = knees soft/straight, 1 = deep knee flex */
  kneeBend: number;
  /** 0 = arms at sides, 0.5 ≈ horizontal front, 1 = overhead */
  armElevate: number;
  /** 0 = elbows straight, 1 = fully flexed */
  elbowBend: number;
  /** 0 = arms forward plane, 1 = arms pulled back (row finish) */
  armRetract: number;
};

export type HumanPosePair = { start: HumanPose; end: HumanPose };

const STAND: HumanPose = {
  torsoLean: 0,
  hipBend: 0.08,
  kneeBend: 0.06,
  armElevate: 0.05,
  elbowBend: 0.08,
  armRetract: 0.1,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function lerpPose(a: HumanPose, b: HumanPose, t: number): HumanPose {
  const u = clamp01(t);
  return {
    torsoLean: lerp(a.torsoLean, b.torsoLean, u),
    hipBend: lerp(a.hipBend, b.hipBend, u),
    kneeBend: lerp(a.kneeBend, b.kneeBend, u),
    armElevate: lerp(a.armElevate, b.armElevate, u),
    elbowBend: lerp(a.elbowBend, b.elbowBend, u),
    armRetract: lerp(a.armRetract, b.armRetract, u),
  };
}

/** Intents that `primaryIntentForDiagram` may return — each must have a pair. */
export const HUMAN_FORM_INTENTS: MovementIntent[] = [
  'knee_dominant',
  'hip_hinge',
  'horizontal_press',
  'vertical_press',
  'horizontal_pull',
  'vertical_pull',
  'elbow_flexion',
  'elbow_extension',
  'trunk_stability',
  'carry',
  'shoulder_isolation',
  'conditioning',
];

const POSES: Record<MovementIntent, HumanPosePair> = {
  knee_dominant: {
    // Stand → squat bottom (form at depth)
    start: { ...STAND, armElevate: 0.35, elbowBend: 0.15, armRetract: 0.2 },
    end: {
      torsoLean: 0.28,
      hipBend: 0.85,
      kneeBend: 0.9,
      armElevate: 0.4,
      elbowBend: 0.2,
      armRetract: 0.15,
    },
  },
  hip_hinge: {
    start: { ...STAND, armElevate: 0.15, elbowBend: 0.1 },
    end: {
      torsoLean: 0.72,
      hipBend: 0.7,
      kneeBend: 0.22,
      armElevate: 0.2,
      elbowBend: 0.12,
      armRetract: 0.05,
    },
  },
  horizontal_press: {
    // Bottom (chest) → lockout
    start: {
      torsoLean: 0.02,
      hipBend: 0.05,
      kneeBend: 0.05,
      armElevate: 0.48,
      elbowBend: 0.75,
      armRetract: 0.35,
    },
    end: {
      torsoLean: 0.02,
      hipBend: 0.05,
      kneeBend: 0.05,
      armElevate: 0.52,
      elbowBend: 0.08,
      armRetract: 0.55,
    },
  },
  vertical_press: {
    start: {
      ...STAND,
      armElevate: 0.55,
      elbowBend: 0.7,
      armRetract: 0.25,
    },
    end: {
      ...STAND,
      armElevate: 0.98,
      elbowBend: 0.05,
      armRetract: 0.15,
    },
  },
  horizontal_pull: {
    // Arms long → elbows back (contracted)
    start: {
      torsoLean: 0.35,
      hipBend: 0.35,
      kneeBend: 0.2,
      armElevate: 0.45,
      elbowBend: 0.15,
      armRetract: 0.05,
    },
    end: {
      torsoLean: 0.32,
      hipBend: 0.32,
      kneeBend: 0.18,
      armElevate: 0.42,
      elbowBend: 0.7,
      armRetract: 0.85,
    },
  },
  vertical_pull: {
    start: {
      ...STAND,
      armElevate: 0.95,
      elbowBend: 0.1,
      armRetract: 0.2,
    },
    end: {
      ...STAND,
      armElevate: 0.7,
      elbowBend: 0.85,
      armRetract: 0.55,
    },
  },
  elbow_flexion: {
    start: { ...STAND, armElevate: 0.12, elbowBend: 0.1, armRetract: 0.15 },
    end: { ...STAND, armElevate: 0.22, elbowBend: 0.92, armRetract: 0.2 },
  },
  elbow_extension: {
    start: { ...STAND, armElevate: 0.85, elbowBend: 0.85, armRetract: 0.25 },
    end: { ...STAND, armElevate: 0.9, elbowBend: 0.08, armRetract: 0.2 },
  },
  trunk_stability: {
    // Subtle brace pulse
    start: { ...STAND, torsoLean: 0.02, hipBend: 0.1, kneeBend: 0.08 },
    end: { ...STAND, torsoLean: 0.06, hipBend: 0.14, kneeBend: 0.1, armElevate: 0.08 },
  },
  carry: {
    start: { ...STAND, armElevate: 0.02, elbowBend: 0.05, armRetract: 0.05 },
    end: {
      torsoLean: 0.04,
      hipBend: 0.12,
      kneeBend: 0.18,
      armElevate: 0.02,
      elbowBend: 0.05,
      armRetract: 0.05,
    },
  },
  shoulder_isolation: {
    start: { ...STAND, armElevate: 0.08, elbowBend: 0.12 },
    end: { ...STAND, armElevate: 0.55, elbowBend: 0.1, armRetract: 0.1 },
  },
  conditioning: {
    start: { ...STAND, kneeBend: 0.15, hipBend: 0.15, armElevate: 0.2 },
    end: {
      torsoLean: 0.1,
      hipBend: 0.45,
      kneeBend: 0.5,
      armElevate: 0.55,
      elbowBend: 0.35,
      armRetract: 0.25,
    },
  },
};

export function posePairForIntent(intent: MovementIntent): HumanPosePair {
  return POSES[intent] ?? POSES.horizontal_press;
}

export type HumanLayout = {
  head: { cx: number; cy: number; r: number };
  /** Torso centerline top (neck) → bottom (hips) */
  neck: { x: number; y: number };
  hip: { x: number; y: number };
  shoulder: { x: number; y: number };
  elbow: { x: number; y: number };
  wrist: { x: number; y: number };
  knee: { x: number; y: number };
  ankle: { x: number; y: number };
  /** Second arm/leg slightly offset for depth */
  elbowB: { x: number; y: number };
  wristB: { x: number; y: number };
  kneeB: { x: number; y: number };
  ankleB: { x: number; y: number };
  stroke: number;
};

function rot(ox: number, oy: number, ang: number, len: number): { x: number; y: number } {
  return { x: ox + Math.sin(ang) * len, y: oy + Math.cos(ang) * len };
}

/**
 * Side-biased mannequin layout in a square of `size`.
 * Facing viewer-right so presses/hinges read clearly.
 */
export function layoutHuman(pose: HumanPose, size: number): HumanLayout {
  const s = size;
  const stroke = Math.max(5, s * 0.055);
  const cx = s * 0.48;
  const groundY = s * 0.92;

  const thigh = s * 0.22;
  const shin = s * 0.2;
  const torso = s * 0.26;
  const upperArm = s * 0.16;
  const foreArm = s * 0.14;
  const headR = s * 0.07;

  const kneeFlex = pose.kneeBend * 1.35; // radians-ish scale
  const hipFlex = pose.hipBend * 1.1 + pose.torsoLean * 0.35;
  const torsoAng = pose.torsoLean * 0.95; // lean forward from vertical

  // Ankle fixed; build up the chain
  const ankle = { x: cx + s * 0.02, y: groundY };
  const shinAng = -0.05 + kneeFlex * 0.15;
  const knee = {
    x: ankle.x - Math.sin(shinAng + kneeFlex * 0.4) * shin,
    y: ankle.y - Math.cos(shinAng + kneeFlex * 0.35) * shin,
  };
  const thighAng = torsoAng * 0.3 + hipFlex * 0.9;
  const hip = {
    x: knee.x - Math.sin(thighAng) * thigh * (0.7 + pose.hipBend * 0.15),
    y: knee.y - Math.cos(thighAng) * thigh * (0.85 - pose.kneeBend * 0.15),
  };

  const neck = rot(hip.x, hip.y, Math.PI + torsoAng, -torso);
  // rot with PI+torso from hip upward: use explicit
  const neckX = hip.x + Math.sin(torsoAng) * torso * 0.15;
  const neckY = hip.y - Math.cos(torsoAng) * torso;
  const neckPt = { x: neckX, y: neckY };

  const shoulder = {
    x: neckPt.x + Math.sin(torsoAng) * s * 0.02,
    y: neckPt.y + s * 0.02,
  };
  const head = {
    cx: shoulder.x + Math.sin(torsoAng) * s * 0.02,
    cy: shoulder.y - headR * 1.35,
    r: headR,
  };

  // Arms: elevate from downward (0) toward overhead (1)
  const elevateAng = -Math.PI * 0.5 + pose.armElevate * Math.PI * 0.95; // -90° → ~+80°
  const retractPull = pose.armRetract * 0.55;
  const upperAng = elevateAng - retractPull;
  const elbowFlexAng = pose.elbowBend * 1.4;

  const elbow = rot(shoulder.x, shoulder.y, upperAng, upperArm);
  const wristAng = upperAng + elbowFlexAng * (pose.armElevate > 0.6 ? -1 : 1);
  const wrist = rot(elbow.x, elbow.y, wristAng, foreArm);

  // Far-side limbs (lighter offset)
  const ankleB = { x: ankle.x - s * 0.04, y: ankle.y };
  const kneeB = { x: knee.x - s * 0.035, y: knee.y + s * 0.01 };
  const elbowB = { x: elbow.x - s * 0.03, y: elbow.y + s * 0.015 };
  const wristB = { x: wrist.x - s * 0.03, y: wrist.y + s * 0.015 };

  void neck; // kept for clarity of earlier attempt
  return {
    head,
    neck: neckPt,
    hip,
    shoulder,
    elbow,
    wrist,
    knee,
    ankle,
    elbowB,
    wristB,
    kneeB,
    ankleB,
    stroke,
  };
}
