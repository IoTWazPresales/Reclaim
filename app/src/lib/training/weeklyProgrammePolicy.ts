import { BALANCED_SLOT_POLICIES, type BalancedSlot } from './balancedHypertrophy';

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

/** Objectives of an approved weekly strategy, or undefined when it is not approved. */
export function weeklyObjectivesFor(strategyId: string): WeeklyObjectivePolicy[] | undefined {
  if (strategyId === UPPER_LOWER_STRATEGY_ID) return UPPER_LOWER_WEEKLY_OBJECTIVES[2];
  const match = /^balanced-v1:([2-6])$/.exec(strategyId);
  return match ? BALANCED_WEEKLY_OBJECTIVES[Number(match[1])] : undefined;
}
