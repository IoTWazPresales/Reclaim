import { BALANCED_SLOT_POLICIES, type BalancedSlot } from './balancedHypertrophy';
import { usesV5WeeklyPolicy } from './weeklyProgrammeTypes';

/** Weekly objectives transcribed from ROUTINE_AUDIT.md balanced week 2026-10-09.
 * Positions are accepted schedule constraints, not new frequency recommendations.
 * This table is independent of selected calendar days and exercise availability. */
export type WeeklyObjectivePolicy = { id: string; owner: string; slot: BalancedSlot; positions: Array<[number, number]> };
export const BALANCED_WEEKLY_OBJECTIVES: Record<number, WeeklyObjectivePolicy[]> = {
  2: [
    { id: 'bench', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['bench'], positions: [[0, 0]] },
    { id: 'fly', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['fly'], positions: [[0, 1]] },
    { id: 'squat', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['squat'], positions: [[0, 2]] },
    { id: 'quadFollow', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['quadFollow'], positions: [[0, 3]] },
    { id: 'lateral', owner: 'lateral_deltoids', slot: BALANCED_SLOT_POLICIES['lateral'], positions: [[0, 4]] },
    { id: 'pushdown', owner: 'triceps', slot: BALANCED_SLOT_POLICIES['pushdown'], positions: [[0, 5]] },
    { id: 'row-heavy', owner: 'lats', slot: BALANCED_SLOT_POLICIES['row-heavy'], positions: [[1, 0]] },
    { id: 'pulldown', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pulldown'], positions: [[1, 1]] },
    { id: 'deadlift', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['deadlift'], positions: [[1, 2]] },
    { id: 'hingeFollow', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeFollow'], positions: [[1, 3]] },
    { id: 'curl', owner: 'biceps', slot: BALANCED_SLOT_POLICIES['curl'], positions: [[1, 4]] },
    { id: 'ohp', owner: 'anterior_deltoids', slot: BALANCED_SLOT_POLICIES['ohp'], positions: [[1, 5]] },
  ],
  3: [
    { id: 'bench', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['bench'], positions: [[0, 0], [2, 0]] },
    { id: 'fly', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['fly'], positions: [[0, 1]] },
    { id: 'squat', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['squat'], positions: [[0, 2], [2, 2]] },
    { id: 'quadFollow', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['quadFollow'], positions: [[0, 3]] },
    { id: 'lateral', owner: 'lateral_deltoids', slot: BALANCED_SLOT_POLICIES['lateral'], positions: [[0, 4]] },
    { id: 'pushdown', owner: 'triceps', slot: BALANCED_SLOT_POLICIES['pushdown'], positions: [[0, 5]] },
    { id: 'row-heavy', owner: 'lats', slot: BALANCED_SLOT_POLICIES['row-heavy'], positions: [[1, 0]] },
    { id: 'pulldown', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pulldown'], positions: [[1, 1]] },
    { id: 'deadlift', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['deadlift'], positions: [[1, 2]] },
    { id: 'hingeFollow', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeFollow'], positions: [[1, 3]] },
    { id: 'curl', owner: 'biceps', slot: BALANCED_SLOT_POLICIES['curl'], positions: [[1, 4]] },
    { id: 'calf', owner: 'calves', slot: BALANCED_SLOT_POLICIES['calf'], positions: [[1, 5]] },
    { id: 'pullUp', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pullUp'], positions: [[2, 1]] },
    { id: 'hingeHeavy', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeHeavy'], positions: [[2, 3]] },
    { id: 'ohp', owner: 'anterior_deltoids', slot: BALANCED_SLOT_POLICIES['ohp'], positions: [[2, 4]] },
    { id: 'face', owner: 'rear_deltoids', slot: BALANCED_SLOT_POLICIES['face'], positions: [[2, 5]] },
  ],
  4: [
    { id: 'bench', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['bench'], positions: [[0, 0], [2, 0]] },
    { id: 'fly', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['fly'], positions: [[0, 1], [2, 1]] },
    { id: 'row-heavy', owner: 'lats', slot: BALANCED_SLOT_POLICIES['row-heavy'], positions: [[0, 2]] },
    { id: 'pulldown', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pulldown'], positions: [[0, 3]] },
    { id: 'lateral', owner: 'lateral_deltoids', slot: BALANCED_SLOT_POLICIES['lateral'], positions: [[0, 4]] },
    { id: 'pushdown', owner: 'triceps', slot: BALANCED_SLOT_POLICIES['pushdown'], positions: [[0, 5]] },
    { id: 'squat', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['squat'], positions: [[1, 0]] },
    { id: 'quadFollow', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['quadFollow'], positions: [[1, 1], [3, 3]] },
    { id: 'hingeHeavy', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeHeavy'], positions: [[1, 2]] },
    { id: 'hingeFollow', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeFollow'], positions: [[1, 3], [3, 1]] },
    { id: 'calf', owner: 'calves', slot: BALANCED_SLOT_POLICIES['calf'], positions: [[1, 4], [3, 4]] },
    { id: 'ohp', owner: 'anterior_deltoids', slot: BALANCED_SLOT_POLICIES['ohp'], positions: [[2, 2]] },
    { id: 'pullUp', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pullUp'], positions: [[2, 3]] },
    { id: 'row-follow', owner: 'lats', slot: BALANCED_SLOT_POLICIES['row-follow'], positions: [[2, 4]] },
    { id: 'curl', owner: 'biceps', slot: BALANCED_SLOT_POLICIES['curl'], positions: [[2, 5]] },
    { id: 'face', owner: 'rear_deltoids', slot: BALANCED_SLOT_POLICIES['face'], positions: [[2, 6]] },
    { id: 'deadlift', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['deadlift'], positions: [[3, 0]] },
    { id: 'quadHeavy', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['quadHeavy'], positions: [[3, 2]] },
  ],
  5: [
    { id: 'bench', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['bench'], positions: [[0, 0], [2, 0]] },
    { id: 'fly', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['fly'], positions: [[0, 1], [2, 1]] },
    { id: 'row-heavy', owner: 'lats', slot: BALANCED_SLOT_POLICIES['row-heavy'], positions: [[0, 2]] },
    { id: 'pulldown', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pulldown'], positions: [[0, 3]] },
    { id: 'lateral', owner: 'lateral_deltoids', slot: BALANCED_SLOT_POLICIES['lateral'], positions: [[0, 4], [2, 3]] },
    { id: 'curl', owner: 'biceps', slot: BALANCED_SLOT_POLICIES['curl'], positions: [[0, 5], [3, 2]] },
    { id: 'squat', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['squat'], positions: [[1, 0]] },
    { id: 'quadFollow', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['quadFollow'], positions: [[1, 1], [4, 3]] },
    { id: 'hingeHeavy', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeHeavy'], positions: [[1, 2]] },
    { id: 'hingeFollow', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeFollow'], positions: [[1, 3], [4, 1]] },
    { id: 'calf', owner: 'calves', slot: BALANCED_SLOT_POLICIES['calf'], positions: [[1, 4], [4, 4]] },
    { id: 'ohp', owner: 'anterior_deltoids', slot: BALANCED_SLOT_POLICIES['ohp'], positions: [[2, 2]] },
    { id: 'pushdown', owner: 'triceps', slot: BALANCED_SLOT_POLICIES['pushdown'], positions: [[2, 4], [4, 5]] },
    { id: 'face', owner: 'rear_deltoids', slot: BALANCED_SLOT_POLICIES['face'], positions: [[2, 5], [3, 3]] },
    { id: 'pullUp', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pullUp'], positions: [[3, 0]] },
    { id: 'row-follow', owner: 'lats', slot: BALANCED_SLOT_POLICIES['row-follow'], positions: [[3, 1]] },
    { id: 'shrug', owner: 'traps', slot: BALANCED_SLOT_POLICIES['shrug'], positions: [[3, 4]] },
    { id: 'deadlift', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['deadlift'], positions: [[4, 0]] },
    { id: 'quadHeavy', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['quadHeavy'], positions: [[4, 2]] },
  ],
  6: [
    { id: 'bench', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['bench'], positions: [[0, 0]] },
    { id: 'fly', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['fly'], positions: [[0, 1], [3, 1]] },
    { id: 'ohp', owner: 'anterior_deltoids', slot: BALANCED_SLOT_POLICIES['ohp'], positions: [[0, 2]] },
    { id: 'lateral', owner: 'lateral_deltoids', slot: BALANCED_SLOT_POLICIES['lateral'], positions: [[0, 3], [3, 2]] },
    { id: 'pushdown', owner: 'triceps', slot: BALANCED_SLOT_POLICIES['pushdown'], positions: [[0, 4], [3, 3]] },
    { id: 'row-heavy', owner: 'lats', slot: BALANCED_SLOT_POLICIES['row-heavy'], positions: [[1, 0]] },
    { id: 'pulldown', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pulldown'], positions: [[1, 1]] },
    { id: 'curl', owner: 'biceps', slot: BALANCED_SLOT_POLICIES['curl'], positions: [[1, 2], [4, 2]] },
    { id: 'face', owner: 'rear_deltoids', slot: BALANCED_SLOT_POLICIES['face'], positions: [[1, 3], [4, 3]] },
    { id: 'shrug', owner: 'traps', slot: BALANCED_SLOT_POLICIES['shrug'], positions: [[1, 4]] },
    { id: 'squat', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['squat'], positions: [[2, 0]] },
    { id: 'quadFollow', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['quadFollow'], positions: [[2, 1], [5, 3]] },
    { id: 'hingeHeavy', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeHeavy'], positions: [[2, 2]] },
    { id: 'hingeFollow', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeFollow'], positions: [[2, 3], [5, 1]] },
    { id: 'calf', owner: 'calves', slot: BALANCED_SLOT_POLICIES['calf'], positions: [[2, 4], [5, 4]] },
    { id: 'incline', owner: 'upper_pectorals', slot: BALANCED_SLOT_POLICIES['incline'], positions: [[3, 0]] },
    { id: 'pullUp', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pullUp'], positions: [[4, 0]] },
    { id: 'row-follow', owner: 'lats', slot: BALANCED_SLOT_POLICIES['row-follow'], positions: [[4, 1]] },
    { id: 'deadlift', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['deadlift'], positions: [[5, 0]] },
    { id: 'quadHeavy', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['quadHeavy'], positions: [[5, 2]] },
  ],
};

/** 2026-11-04 split preference (ROUTINE_AUDIT.md, split preference 2026-11-04).
 * Two-day Upper/Lower: one upper and one lower day, each owner trained once a week. */
export const UPPER_LOWER_STRATEGY_ID = 'balanced-v1:2-upper-lower';
export const UPPER_LOWER_WEEKLY_OBJECTIVES: Record<number, WeeklyObjectivePolicy[]> = {
  2: [
    { id: 'bench', owner: 'pectorals', slot: BALANCED_SLOT_POLICIES['bench'], positions: [[0, 0]] },
    { id: 'row-heavy', owner: 'lats', slot: BALANCED_SLOT_POLICIES['row-heavy'], positions: [[0, 1]] },
    { id: 'ohp', owner: 'anterior_deltoids', slot: BALANCED_SLOT_POLICIES['ohp'], positions: [[0, 2]] },
    { id: 'pulldown', owner: 'lats', slot: BALANCED_SLOT_POLICIES['pulldown'], positions: [[0, 3]] },
    { id: 'lateral', owner: 'lateral_deltoids', slot: BALANCED_SLOT_POLICIES['lateral'], positions: [[0, 4]] },
    { id: 'curl', owner: 'biceps', slot: BALANCED_SLOT_POLICIES['curl'], positions: [[0, 5]] },
    { id: 'pushdown', owner: 'triceps', slot: BALANCED_SLOT_POLICIES['pushdown'], positions: [[0, 6]] },
    { id: 'squat', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['squat'], positions: [[1, 0]] },
    { id: 'hingeHeavy', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeHeavy'], positions: [[1, 1]] },
    { id: 'quadFollow', owner: 'quadriceps', slot: BALANCED_SLOT_POLICIES['quadFollow'], positions: [[1, 2]] },
    { id: 'hingeFollow', owner: 'hamstrings', slot: BALANCED_SLOT_POLICIES['hingeFollow'], positions: [[1, 3]] },
    { id: 'calf', owner: 'calves', slot: BALANCED_SLOT_POLICIES['calf'], positions: [[1, 4]] },
  ],
};

/** Day strategy keys for each approved weekly strategy, in calendar order. */
export const WEEKLY_STRATEGY_DAY_KEYS: Record<string, string[]> = {
  'balanced-v1:2': ['twoA', 'twoB'],
  'balanced-v1:3': ['threeA', 'threeB', 'threeC'],
  'balanced-v1:4': ['fourUpperA', 'fourLowerA', 'fourUpperB', 'fourLowerB'],
  'balanced-v1:5': ['fiveUpper', 'fiveSquat', 'fivePush', 'fivePull', 'fiveDead'],
  'balanced-v1:6': ['sixPushA', 'sixPullA', 'sixLegsA', 'sixPushB', 'sixPullB', 'sixLegsB'],
  [UPPER_LOWER_STRATEGY_ID]: ['twoUpper', 'twoLower'],
};

/* ------------------------------------------------------------------------
 * Weekly policy v5 (weekly-20261105-v5). ROUTINE_AUDIT.md, "Weekly policy v5
 * (2026-11-05)", entries V5-1 .. V5-8. New builds only: the v2/v3/v4 tables
 * above are frozen for saved programmes and are never edited.
 * Every v5 number and candidate list lives in this section.
 * --------------------------------------------------------------------- */

/** V5-1: conventional, sumo and trap-bar deadlifts fill only the deadlift requirement. */
export const DEADLIFT_VARIANT_IDS: readonly string[] = ['deadlift', 'sumo_deadlift', 'trap_bar_deadlift'];
export const V5_DEADLIFT_REQUIREMENT_ID = 'deadlift';
/** V5-1, enforced by the compiler and independently by R05. */
export function deadliftVariantMisplaced(exerciseId: string, requirementId: string, policyVersion: string | undefined): boolean {
  return usesV5WeeklyPolicy(policyVersion) && DEADLIFT_VARIANT_IDS.includes(exerciseId) && requirementId !== V5_DEADLIFT_REQUIREMENT_ID;
}
/** V5-1: a follow-up hinge with no eligible candidate folds into that day's heavy hinge. */
export const V5_HINGE_FOLLOW_REQUIREMENT_ID = 'hingeFollow';
export const V5_HEAVY_HINGE_REQUIREMENT_IDS: readonly string[] = ['hingeHeavy', 'deadlift'];

/** V5-2 (D-P2-01 amendment, Warren-approved 2026-11-05): the only binding session caps. */
export const V5_SESSION_CAPS = { perExerciseSets: 5, perOwnerSessionSets: 10 } as const;

/** V5-3: a hypertrophy exposure of a compound slot rests 120 s (Schoenfeld et al. 2016). */
export const V5_HYPERTROPHY_EXPOSURE_REST_SECONDS = 120;

/** V5-4: in-day order tiers. Lower runs first; the position index breaks ties. */
export const V5_ORDER_TIERS = { strength: 0, hypertrophy: 1, accessoryCompound: 2, isolationSupport: 3, core: 4 } as const;

/** V5-5: realistic display estimate, in seconds. Display only; never trims or warns. */
export const V5_DURATION_ESTIMATE = {
  warmupSetSeconds: 60,
  secondsPerRep: 3,
  setSetupSeconds: 15,
  unilateralWorkMultiplier: 2,
  transitionSeconds: 120,
} as const;

/** V5-6: core owner and explicit candidate lists (no compatible() fallback). */
export const V5_CORE_OWNER = 'core';
export const V5_CORE_FLEXION_CANDIDATES: readonly string[] = ['cable_crunch', 'hanging_leg_raise', 'reverse_crunch', 'ab_wheel_rollout'];
export const V5_CORE_ANTI_ROTATION_CANDIDATES: readonly string[] = ['pallof_press', 'dead_bug'];

/** V5 slot identities. Unchanged v4 slots are copied, never shared by reference. */
const copy = (id: string): BalancedSlot => ({ ...BALANCED_SLOT_POLICIES[id], candidates: [...BALANCED_SLOT_POLICIES[id].candidates] });
export const V5_SLOT_POLICIES: Record<string, BalancedSlot> = {
  'bench': copy('bench'),
  'fly': copy('fly'),
  'squat': copy('squat'),
  'quadFollow': copy('quadFollow'),
  'quadHeavy': copy('quadHeavy'),
  'lateral': copy('lateral'),
  'pushdown': copy('pushdown'),
  'row-heavy': copy('row-heavy'),
  'row-follow': copy('row-follow'),
  'pulldown': copy('pulldown'),
  'deadlift': copy('deadlift'),
  'curl': copy('curl'),
  'ohp': copy('ohp'),
  'calf': copy('calf'),
  'face': copy('face'),
  'shrug': copy('shrug'),
  'incline': copy('incline'),
  /** V5-7: pull-ups take a strength role only with an entered added-load variant. */
  'pullUp': { ...copy('pullUp'), addedLoadCandidates: ['weighted_pull_ups'] },
  /** V5-1: RDL first, then non-deadlift hinge fallbacks only. */
  'hingeHeavy': { candidates: ['romanian_deadlift', 'good_mornings', 'hip_thrust'], dose: 'heavy', intent: 'hip_hinge', priority: 'primary', compound: true, load: 'none', explicitOnly: true },
  'hingeFollow': { candidates: ['leg_curls', 'single_leg_rdl', 'hip_thrust'], dose: 'follow', intent: 'hip_hinge', priority: 'accessory', compound: true, load: 'none', explicitOnly: true },
  'core-flexion': { candidates: [...V5_CORE_FLEXION_CANDIDATES], dose: 'support', intent: 'trunk_stability', priority: 'isolation', compound: false, load: 'none', explicitOnly: true },
  'core-antirotation': { candidates: [...V5_CORE_ANTI_ROTATION_CANDIDATES], dose: 'support', intent: 'trunk_stability', priority: 'isolation', compound: false, load: 'none', explicitOnly: true },
};

const V5_OWNERS: Record<string, string> = {
  'bench': 'pectorals', 'fly': 'pectorals', 'incline': 'upper_pectorals', 'squat': 'quadriceps', 'quadFollow': 'quadriceps', 'quadHeavy': 'quadriceps',
  'lateral': 'lateral_deltoids', 'pushdown': 'triceps', 'row-heavy': 'lats', 'row-follow': 'lats', 'pulldown': 'lats', 'pullUp': 'lats',
  'deadlift': 'hamstrings', 'hingeHeavy': 'hamstrings', 'hingeFollow': 'hamstrings', 'curl': 'biceps', 'ohp': 'anterior_deltoids',
  'calf': 'calves', 'face': 'rear_deltoids', 'shrug': 'traps', 'core-flexion': V5_CORE_OWNER, 'core-antirotation': V5_CORE_OWNER,
};
const v5 = (id: string, positions: Array<[number, number]>): WeeklyObjectivePolicy => ({ id, owner: V5_OWNERS[id], slot: V5_SLOT_POLICIES[id], positions });

/**
 * V5-4/V5-6/V5-8 tables. Position index is the in-day order (strength,
 * hypertrophy, accessory compound, isolation/support, core). Core: two days
 * one per day (A flexion, B anti-rotation); three days two; four to six days
 * three, non-consecutive where the day count allows, preferring upper/pull
 * days, alternating type.
 */
export const V5_BALANCED_WEEKLY_OBJECTIVES: Record<number, WeeklyObjectivePolicy[]> = {
  2: [
    v5('squat', [[0, 0]]), v5('bench', [[0, 1], [1, 1]]), v5('row-heavy', [[0, 2]]), v5('hingeHeavy', [[0, 3]]),
    v5('lateral', [[0, 4]]), v5('curl', [[0, 5]]), v5('core-flexion', [[0, 6]]),
    v5('deadlift', [[1, 0]]), v5('quadHeavy', [[1, 2]]), v5('pullUp', [[1, 3]]), v5('fly', [[1, 4]]),
    v5('pushdown', [[1, 5]]), v5('core-antirotation', [[1, 6]]),
  ],
  3: [
    v5('bench', [[0, 0], [2, 2]]), v5('squat', [[0, 1], [2, 3]]), v5('quadFollow', [[0, 2]]), v5('fly', [[0, 3]]),
    v5('lateral', [[0, 4]]), v5('pushdown', [[0, 5]]), v5('core-flexion', [[0, 6]]),
    v5('row-heavy', [[1, 0]]), v5('deadlift', [[1, 1]]), v5('pulldown', [[1, 2]]), v5('hingeFollow', [[1, 3]]),
    v5('curl', [[1, 4]]), v5('calf', [[1, 5]]),
    v5('ohp', [[2, 0]]), v5('pullUp', [[2, 1]]), v5('hingeHeavy', [[2, 4]]), v5('face', [[2, 5]]), v5('core-antirotation', [[2, 6]]),
  ],
  4: [
    v5('bench', [[0, 0], [2, 1]]), v5('row-heavy', [[0, 1]]), v5('pulldown', [[0, 2]]), v5('fly', [[0, 3], [2, 4]]),
    v5('lateral', [[0, 4]]), v5('pushdown', [[0, 5]]), v5('core-flexion', [[0, 6], [3, 5]]),
    v5('squat', [[1, 0]]), v5('hingeHeavy', [[1, 1]]), v5('quadFollow', [[1, 2], [3, 3]]), v5('hingeFollow', [[1, 3], [3, 2]]),
    v5('calf', [[1, 4], [3, 4]]),
    v5('ohp', [[2, 0]]), v5('pullUp', [[2, 2]]), v5('row-follow', [[2, 3]]), v5('curl', [[2, 5]]), v5('face', [[2, 6]]),
    v5('core-antirotation', [[2, 7]]),
    v5('deadlift', [[3, 0]]), v5('quadHeavy', [[3, 1]]),
  ],
  5: [
    v5('bench', [[0, 0], [2, 1]]), v5('row-heavy', [[0, 1]]), v5('pulldown', [[0, 2]]), v5('fly', [[0, 3], [2, 2]]),
    v5('lateral', [[0, 4], [2, 3]]), v5('curl', [[0, 5], [3, 2]]), v5('core-flexion', [[0, 6], [3, 5]]),
    v5('squat', [[1, 0]]), v5('hingeHeavy', [[1, 1]]), v5('quadFollow', [[1, 2], [4, 3]]), v5('hingeFollow', [[1, 3], [4, 2]]),
    v5('calf', [[1, 4], [4, 4]]),
    v5('ohp', [[2, 0]]), v5('pushdown', [[2, 4], [4, 5]]), v5('face', [[2, 5], [3, 3]]), v5('core-antirotation', [[2, 6]]),
    v5('pullUp', [[3, 0]]), v5('row-follow', [[3, 1]]), v5('shrug', [[3, 4]]),
    v5('deadlift', [[4, 0]]), v5('quadHeavy', [[4, 1]]),
  ],
  6: [
    v5('bench', [[0, 0]]), v5('ohp', [[0, 1]]), v5('fly', [[0, 2], [3, 1]]), v5('lateral', [[0, 3], [3, 2]]), v5('pushdown', [[0, 4], [3, 3]]),
    v5('row-heavy', [[1, 0]]), v5('pulldown', [[1, 1]]), v5('curl', [[1, 2], [4, 2]]), v5('face', [[1, 3], [4, 3]]), v5('shrug', [[1, 4]]),
    v5('core-flexion', [[1, 5], [5, 5]]),
    v5('squat', [[2, 0]]), v5('hingeHeavy', [[2, 1]]), v5('quadFollow', [[2, 2], [5, 3]]), v5('hingeFollow', [[2, 3], [5, 2]]), v5('calf', [[2, 4], [5, 4]]),
    v5('incline', [[3, 0]]), v5('core-antirotation', [[3, 4]]),
    v5('pullUp', [[4, 0]]), v5('row-follow', [[4, 1]]),
    v5('deadlift', [[5, 0]]), v5('quadHeavy', [[5, 1]]),
  ],
};

/** V5-8: two-day Upper/Lower. No pushdown on Upper; RDL is the only heavy hinge. */
export const V5_UPPER_LOWER_WEEKLY_OBJECTIVES: WeeklyObjectivePolicy[] = [
  v5('bench', [[0, 0]]), v5('row-heavy', [[0, 1]]), v5('ohp', [[0, 2]]), v5('pulldown', [[0, 3]]), v5('fly', [[0, 4]]),
  v5('lateral', [[0, 5]]), v5('curl', [[0, 6]]), v5('core-flexion', [[0, 7]]),
  v5('squat', [[1, 0]]), v5('hingeHeavy', [[1, 1]]), v5('quadFollow', [[1, 2]]), v5('hingeFollow', [[1, 3]]), v5('calf', [[1, 4]]),
  v5('core-antirotation', [[1, 5]]),
];

/** Objectives of an approved weekly strategy, or undefined when it is not approved.
 * The policy version selects the table: v5 tables for v5, frozen tables otherwise. */
export function weeklyObjectivesFor(strategyId: string, policyVersion?: string): WeeklyObjectivePolicy[] | undefined {
  const v5Tables = usesV5WeeklyPolicy(policyVersion);
  if (strategyId === UPPER_LOWER_STRATEGY_ID) return v5Tables ? V5_UPPER_LOWER_WEEKLY_OBJECTIVES : UPPER_LOWER_WEEKLY_OBJECTIVES[2];
  const match = /^balanced-v1:([2-6])$/.exec(strategyId);
  if (!match) return undefined;
  return (v5Tables ? V5_BALANCED_WEEKLY_OBJECTIVES : BALANCED_WEEKLY_OBJECTIVES)[Number(match[1])];
}
