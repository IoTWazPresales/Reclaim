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
    // Stand → squat bottom — arms stay nearly fixed so the knee/hip loop reads (not arm swing).
    start: { ...STAND, armElevate: 0.12, elbowBend: 0.1, armRetract: 0.12 },
    end: {
      torsoLean: 0.32,
      hipBend: 0.88,
      kneeBend: 0.92,
      armElevate: 0.14,
      elbowBend: 0.12,
      armRetract: 0.12,
    },
  },
  hip_hinge: {
    start: { ...STAND, armElevate: 0.1, elbowBend: 0.08, armRetract: 0.08 },
    end: {
      torsoLean: 0.78,
      hipBend: 0.72,
      kneeBend: 0.22,
      armElevate: 0.12,
      elbowBend: 0.1,
      armRetract: 0.08,
    },
  },
  horizontal_press: {
    // Bottom (chest) → lockout: elbows travel forward as retract opens + elbow extends.
    start: {
      torsoLean: 0.02,
      hipBend: 0.05,
      kneeBend: 0.05,
      armElevate: 0.42,
      elbowBend: 0.85,
      armRetract: 0.72,
    },
    end: {
      torsoLean: 0.02,
      hipBend: 0.05,
      kneeBend: 0.05,
      armElevate: 0.52,
      elbowBend: 0.06,
      armRetract: 0.08,
    },
  },
  vertical_press: {
    start: {
      ...STAND,
      armElevate: 0.55,
      elbowBend: 0.72,
      armRetract: 0.2,
    },
    end: {
      ...STAND,
      armElevate: 0.95,
      elbowBend: 0.05,
      armRetract: 0.12,
    },
  },
  horizontal_pull: {
    // Arms long forward → elbows back (row finish).
    start: {
      torsoLean: 0.35,
      hipBend: 0.35,
      kneeBend: 0.2,
      armElevate: 0.48,
      elbowBend: 0.12,
      armRetract: 0.05,
    },
    end: {
      torsoLean: 0.3,
      hipBend: 0.32,
      kneeBend: 0.18,
      armElevate: 0.42,
      elbowBend: 0.72,
      armRetract: 0.88,
    },
  },
  vertical_pull: {
    start: {
      ...STAND,
      armElevate: 0.95,
      elbowBend: 0.08,
      armRetract: 0.15,
    },
    end: {
      ...STAND,
      armElevate: 0.72,
      elbowBend: 0.88,
      armRetract: 0.5,
    },
  },
  elbow_flexion: {
    start: { ...STAND, armElevate: 0.08, elbowBend: 0.08, armRetract: 0.12 },
    end: { ...STAND, armElevate: 0.12, elbowBend: 0.92, armRetract: 0.15 },
  },
  elbow_extension: {
    start: { ...STAND, armElevate: 0.88, elbowBend: 0.85, armRetract: 0.2 },
    end: { ...STAND, armElevate: 0.9, elbowBend: 0.08, armRetract: 0.18 },
  },
  trunk_stability: {
    start: { ...STAND, torsoLean: 0.02, hipBend: 0.1, kneeBend: 0.08, armElevate: 0.06 },
    end: { ...STAND, torsoLean: 0.08, hipBend: 0.14, kneeBend: 0.1, armElevate: 0.08 },
  },
  carry: {
    start: { ...STAND, armElevate: 0.02, elbowBend: 0.05, armRetract: 0.05 },
    end: {
      torsoLean: 0.04,
      hipBend: 0.14,
      kneeBend: 0.22,
      armElevate: 0.02,
      elbowBend: 0.05,
      armRetract: 0.05,
    },
  },
  shoulder_isolation: {
    // True lateral/front raise: sides → ~horizontal.
    start: { ...STAND, armElevate: 0.05, elbowBend: 0.08, armRetract: 0.08 },
    end: { ...STAND, armElevate: 0.52, elbowBend: 0.08, armRetract: 0.1 },
  },
  conditioning: {
    // Legs/torso carry the loop — pin arm elevate so it does not read as a swing.
    start: { ...STAND, kneeBend: 0.12, hipBend: 0.12, armElevate: 0.08, elbowBend: 0.1, armRetract: 0.08 },
    end: {
      torsoLean: 0.12,
      hipBend: 0.48,
      kneeBend: 0.55,
      armElevate: 0.08,
      elbowBend: 0.12,
      armRetract: 0.1,
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

  const kneeFlex = pose.kneeBend * 1.45; // radians-ish scale
  const hipFlex = pose.hipBend * 1.15 + pose.torsoLean * 0.35;
  const torsoAng = pose.torsoLean * 0.95; // lean forward from vertical

  // Ankle fixed; build up the chain — deep knee/hip flex shortens effective rise so hips drop clearly.
  const ankle = { x: cx + s * 0.02, y: groundY };
  const shinAng = -0.05 + kneeFlex * 0.18;
  const knee = {
    x: ankle.x - Math.sin(shinAng + kneeFlex * 0.45) * shin,
    y: ankle.y - Math.cos(shinAng + kneeFlex * 0.4) * shin * (1 - pose.kneeBend * 0.12),
  };
  const thighAng = torsoAng * 0.3 + hipFlex * 0.95;
  const hip = {
    x: knee.x - Math.sin(thighAng) * thigh * (0.72 + pose.hipBend * 0.12),
    y: knee.y - Math.cos(thighAng) * thigh * (0.88 - pose.kneeBend * 0.28 - pose.hipBend * 0.08),
  };

  const neck = rot(hip.x, hip.y, Math.PI + torsoAng, -torso);
  // Tip torso forward (viewer-right) with lean; rise shortens as cos falls.
  const neckX = hip.x + Math.sin(torsoAng) * torso * 0.85;
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

  // Arms are torso-relative: elevate 0 hangs along the torso (not world vertical),
  // so squat/hinge lean does not invent an arm pendulum vs the body.
  // rot(ang): 0 → +Y (down), π/2 → +X (forward for side-view facing right), π → −Y (up).
  const elevateAng = pose.armElevate * Math.PI * 0.92;
  // Retract pulls the upper arm rearward (row finish) without inventing a pendulum.
  const retractPull = pose.armRetract * 0.55;
  const upperAng = torsoAng + elevateAng - retractPull;
  const elbowFlexAng = pose.elbowBend * 1.35;

  const elbow = rot(shoulder.x, shoulder.y, upperAng, upperArm);
  // Straight arm continues along upperAng; flexion folds the forearm (curl / press bottom).
  const foldSign = pose.armElevate >= 0.35 ? -1 : 1;
  const wristAng = upperAng + foldSign * elbowFlexAng;
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
