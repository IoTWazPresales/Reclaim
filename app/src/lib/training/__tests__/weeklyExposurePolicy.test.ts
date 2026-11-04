import { describe, expect, it } from 'vitest';
import catalogData from '../catalog/exercises.v1.json';
import { blendedCount, blendedReps, buildBalancedProgramSession, normaliseGoalWeights, setsForDose, setsForSlot, BALANCED_DAY_POLICIES } from '../balancedHypertrophy';
import { declareExposurePolicies, defineWeeklyRequirements, exposureDose, exposureRole } from '../weeklyProgramme';
import { BALANCED_WEEKLY_OBJECTIVES } from '../weeklyProgrammePolicy';
import { V3_WEEKLY_POLICY_VERSION, WEEKLY_POLICY_VERSION } from '../weeklyProgrammeTypes';
import { buildFourWeekPlan } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { getRepRange } from '../progression';
import { suggestPrescription } from '../engine';
import type { Exercise, GoalWeights, TrainingProfileSnapshot } from '../types';
import type { TrainingProfileRow } from '../../api';

const catalog = catalogData as Exercise[];
const fullEquipment = [...new Set(catalog.flatMap((exercise) => [...exercise.equipment, ...(exercise.equipmentAll ?? []), ...(exercise.equipmentAny ?? [])]))];
// The operator's saved equipment (read-only, 2026-11-04): no leg-curl or leg-extension machine.
const warrenEquipment = ['barbell', 'dumbbells', 'bench', 'cable_machine', 'pull_up_bar', 'leg_press_machine', 'hack_squat_machine', 't_bar_row_machine', 'chest_press_machine', 'dip_station', 'trap_bar', 'ez_bar', 'smith_machine', 'cardio', 'rack'];
const warrenGoals = { lose_fat: 0, get_fitter: 0, build_muscle: 0.5037005651933169, build_strength: 0.4962994348066832 };
const warrenBaselines = { squat: 116.66666666666667, deadlift: 128.33333333333334, barbell_row: 87.5, overhead_press: 105, barbell_bench_press: 122.50000000000001 };

function snapshot(goals: GoalWeights, equipment = fullEquipment, baselines: Record<string, number> = warrenBaselines): TrainingProfileSnapshot {
  return { goals: goals as TrainingProfileSnapshot['goals'], equipment_access: equipment, baselines, experienceLevel: 'advanced', trainingMode: 'strength',
    constraints: { injuries: [], forbiddenMovements: [], preferences: { muscle_frequency_preference: 'twice' } } };
}
function plan(profile: TrainingProfileSnapshot, days: number) {
  return buildFourWeekPlan({ ...profile, constraints: { ...profile.constraints, trainingMode: 'strength' } } as unknown as TrainingProfileRow, Array.from({ length: days }, (_, index) => index + 1));
}
const allSlots = (built: ReturnType<typeof plan>) => Object.values(built.weeks[0].days).flatMap((day) => day.allocation?.slots ?? []);

describe('goal-share normalisation (0.05 grid)', () => {
  it('a ~1% slider change cannot flip set counts', () => {
    expect(normaliseGoalWeights(warrenGoals)).toEqual({ build_muscle: 0.5, build_strength: 0.5 });
    expect(normaliseGoalWeights({ build_muscle: 0.4963, build_strength: 0.5037 })).toEqual({ build_muscle: 0.5, build_strength: 0.5 });
    expect(normaliseGoalWeights({ build_muscle: 46, build_strength: 46, lose_fat: 8 })).toEqual({ build_muscle: 0.45, build_strength: 0.45, lose_fat: 0.1 });
    const shares = normaliseGoalWeights(warrenGoals);
    expect(blendedCount(shares, 'primary', 'sets')).toBe(4);
    // The unrounded blend is the defect: 0.5037 x 3 + 0.4963 x 4 = 3.496 -> 3.
    expect(blendedCount(warrenGoals, 'primary', 'sets')).toBe(3);
  });

  it('keeps pure goals and falls back when every share would round away', () => {
    expect(normaliseGoalWeights({ build_muscle: 1 })).toEqual({ build_muscle: 1 });
    expect(normaliseGoalWeights({ build_strength: 0.3 })).toEqual({ build_strength: 1 });
    expect(normaliseGoalWeights({})).toEqual({});
  });
});

describe('accessory dose uses the slot priority', () => {
  const shares = { build_muscle: 0.5, build_strength: 0.5 };
  it('follow-up accessories get accessory sets, reps and rest; fly stays isolation', () => {
    const pulldown = BALANCED_WEEKLY_OBJECTIVES[5].find((row) => row.id === 'pulldown')!;
    const fly = BALANCED_WEEKLY_OBJECTIVES[5].find((row) => row.id === 'fly')!;
    expect(exposureDose(pulldown, 0, shares)).toEqual({ setCount: 3, reps: 9, restSeconds: 90, priority: 'accessory', repRange: [7, 12] });
    expect(exposureDose(fly, 0, shares)).toEqual({ setCount: 2, reps: 12, restSeconds: 55, priority: 'isolation', repRange: [9, 16] });
    // v3 replay keeps the old collapse to the isolation blend.
    expect(exposureDose(pulldown, 0, shares, V3_WEEKLY_POLICY_VERSION)).toEqual({ setCount: 2, reps: 12, restSeconds: 55, priority: 'accessory' });
  });

  it('the non-weekly historical path uses the same dose as the weekly compiler', () => {
    const profile = snapshot(warrenGoals);
    const session = buildBalancedProgramSession({ label: 'Pull (Back/Arms)', intents: ['vertical_pull', 'horizontal_pull', 'elbow_flexion'], template: 'pull', profile,
      loading: (exercise, reps, priority, setCount) => suggestPrescription({ exercise, plannedReps: reps, priority, plannedSetCount: setCount, goalWeights: profile.goals, userState: { experienceLevel: 'advanced', estimated1RM: {} } }) })!;
    const byPolicy = BALANCED_DAY_POLICIES.fivePull;
    session.exercises.forEach((item, index) => {
      const slot = byPolicy[index];
      expect(item.plannedSets).toHaveLength(setsForSlot(shares, slot));
      expect(item.plannedSets[0].restSeconds).toBe(blendedCount(shares, slot.priority, 'rest'));
    });
    const rowFollow = session.exercises[1];
    expect(rowFollow.priority).toBe('accessory');
    expect(rowFollow.plannedSets).toHaveLength(3);
    expect(rowFollow.plannedSets[0].targetReps).toBe(blendedReps(shares, 'accessory'));
  });
});

describe('mixed strength + muscle exposures', () => {
  it('first own-load exposure trains strength; the repeat and heavy variants train hypertrophy', () => {
    const objectives = BALANCED_WEEKLY_OBJECTIVES[5];
    const shares = normaliseGoalWeights(warrenGoals);
    const bench = objectives.find((row) => row.id === 'bench')!;
    expect(exposureRole(bench, 0, shares)).toBe('strength');
    expect(exposureRole(bench, 1, shares)).toBe('hypertrophy');
    for (const id of ['squat', 'deadlift', 'ohp', 'row-heavy', 'pullUp']) expect(exposureRole(objectives.find((row) => row.id === id)!, 0, shares)).toBe('strength');
    for (const id of ['hingeHeavy', 'quadHeavy']) expect(exposureRole(objectives.find((row) => row.id === id)!, 0, shares)).toBe('hypertrophy');
    expect(exposureRole(BALANCED_WEEKLY_OBJECTIVES[6].find((row) => row.id === 'incline')!, 0, shares)).toBe('hypertrophy');
    for (const id of ['pulldown', 'fly', 'lateral', 'row-follow']) expect(exposureRole(objectives.find((row) => row.id === id)!, 0, shares)).toBeUndefined();
    expect(exposureDose(bench, 0, warrenGoals)).toEqual({ setCount: 4, reps: 5, restSeconds: 180, priority: 'primary', repRange: [3, 6], exposure: 'strength' });
    expect(exposureDose(bench, 1, warrenGoals)).toEqual({ setCount: 4, reps: 8, restSeconds: 90, priority: 'primary', repRange: [6, 12], exposure: 'hypertrophy' });
  });

  it('applies only when both goals hold at least 0.3 of the mix', () => {
    const bench = BALANCED_WEEKLY_OBJECTIVES[5].find((row) => row.id === 'bench')!;
    expect(exposureRole(bench, 0, normaliseGoalWeights({ build_muscle: 0.7, build_strength: 0.3 }))).toBe('strength');
    expect(exposureRole(bench, 0, normaliseGoalWeights({ build_muscle: 0.75, build_strength: 0.25 }))).toBeUndefined();
    expect(exposureRole(bench, 0, normaliseGoalWeights({ build_muscle: 0.4, build_strength: 0.4, lose_fat: 0.1, get_fitter: 0.1 }))).toBe('strength');
  });

  for (const days of [2, 3, 4, 5, 6]) it(`${days} days: weekly targetSets is the sum of declared exposure sets`, () => {
    const profile = snapshot(warrenGoals);
    const policies = declareExposurePolicies(days, profile);
    for (const requirement of defineWeeklyRequirements(days, profile)) {
      expect(requirement.exposureSetCounts).toEqual(requirement.exposureSlotIds.map((slotId) => policies[slotId].setCount));
      expect(requirement.targetSets).toBe(requirement.exposureSetCounts!.reduce((total, count) => total + count, 0));
    }
  });
});

describe('caps and R05 across goal mixes', () => {
  const mixes: Array<[string, GoalWeights]> = [
    ['pure muscle', { build_muscle: 1 }], ['pure strength', { build_strength: 1 }], ['50/50', { build_muscle: 0.5, build_strength: 0.5 }],
    ['operator 0.5037/0.4963', warrenGoals], ['46/46/8', { build_muscle: 0.46, build_strength: 0.46, lose_fat: 0.08 }],
    ['40/40/10/10', { build_muscle: 0.4, build_strength: 0.4, lose_fat: 0.1, get_fitter: 0.1 }], ['70/30', { build_muscle: 0.7, build_strength: 0.3 }],
  ];
  for (const [name, goals] of mixes) for (const days of [2, 3, 4, 5, 6]) it(`${name}, ${days} days: feasible, capped and R05 error-free`, () => {
    const profile = snapshot(goals);
    const built = plan(profile, days);
    expect(built.weeks[0].compilation!.status).toBe('feasible');
    const proposals = programmeWeekProposal(built, 1, built.programme!.input);
    for (const session of proposals.values()) {
      const owners: Record<string, number> = {};
      const slots = Object.values(built.weeks[0].days).flatMap((day) => day.allocation?.slots ?? []);
      for (const item of session.exercises) {
        expect(item.plannedSets.length).toBeLessThanOrEqual(5);
        const owner = slots.find((slot) => slot.exerciseId === item.exerciseId)!.owner;
        owners[owner] = (owners[owner] ?? 0) + item.plannedSets.length;
      }
      for (const total of Object.values(owners)) expect(total).toBeLessThanOrEqual(10);
      expect(session.exercises.reduce((total, item) => total + item.plannedSets.length, 0)).toBeLessThanOrEqual(24);
      expect(session.estimatedDurationMinutes).toBeLessThanOrEqual(60);
      expect(session.weeklyValidation!.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    }
  });
});

describe('pure goals keep the single-goal prescription', () => {
  for (const goals of [{ build_muscle: 1 }, { build_strength: 1 }] as GoalWeights[]) for (const days of [2, 3, 4, 5, 6]) it(`${Object.keys(goals)[0]} ${days} days: no exposure roles; heavy, isolation and support doses unchanged from v3`, () => {
    const profile = snapshot(goals);
    for (const objective of BALANCED_WEEKLY_OBJECTIVES[days]) objective.positions.forEach((_, position) => {
      const v4 = exposureDose(objective, position, goals);
      const v3 = exposureDose(objective, position, goals, V3_WEEKLY_POLICY_VERSION);
      expect(v4.exposure).toBeUndefined();
      expect(v4.repRange).toEqual(getRepRange(objective.slot.priority, goals));
      if (objective.slot.priority === 'accessory') {
        // The only intended pure-goal change: an accessory is no longer dosed as an isolation.
        expect(v4).toMatchObject({ setCount: blendedCount(goals, 'accessory', 'sets'), reps: blendedReps(goals, 'accessory'), restSeconds: blendedCount(goals, 'accessory', 'rest') });
      } else {
        expect({ setCount: v4.setCount, reps: v4.reps, restSeconds: v4.restSeconds }).toEqual({ setCount: v3.setCount, reps: v3.reps, restSeconds: v3.restSeconds });
      }
    });
    expect(allSlots(plan(profile, days)).some((slot) => slot.exposure)).toBe(false);
  });
});

describe('saved v3 programmes replay unchanged', () => {
  it('declares the exact v3 requirements and exposure policies, including the unrounded blend', () => {
    const profile = snapshot(warrenGoals);
    const requirements = defineWeeklyRequirements(5, profile, V3_WEEKLY_POLICY_VERSION);
    const bench = requirements.find((row) => row.id === 'bench')!;
    expect(bench).toEqual({ id: 'bench', owner: 'pectorals', dose: 'heavy', targetSets: 2 * setsForDose(warrenGoals, 'heavy'), targetExposures: 2, positions: [[0, 0], [2, 0]], exposureSlotIds: ['0:0', '2:0'], provenance: 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09; rules/rules.v1.json goal blend' });
    expect(bench.targetSets).toBe(6);
    const policies = declareExposurePolicies(5, profile, V3_WEEKLY_POLICY_VERSION);
    expect(policies['0:0']).toMatchObject({ reps: blendedReps(warrenGoals, 'primary'), restSeconds: blendedCount(warrenGoals, 'primary', 'rest') });
    expect(policies['0:0']).not.toHaveProperty('setCount');
    expect(policies['0:3']).toMatchObject({ priority: 'accessory', reps: blendedReps(warrenGoals, 'isolation') });
  });

  it('new builds carry policy v4', () => {
    const built = plan(snapshot(warrenGoals), 5);
    expect(built.programme!.policyVersion).toBe(WEEKLY_POLICY_VERSION);
    expect(Object.values(built.weeks[0].days).every((day) => day.allocation?.policyVersion === WEEKLY_POLICY_VERSION)).toBe(true);
  });
});

describe('exercise ranking (operator five-day week)', () => {
  const byDay = (built: ReturnType<typeof plan>) => Object.fromEntries(Object.entries(built.weeks[0].days).map(([day, value]) => [day, Object.fromEntries((value.allocation?.slots ?? []).map((slot) => [slot.requirementId, slot.exerciseId]))]));
  const count = (built: ReturnType<typeof plan>, id: string) => allSlots(built).filter((slot) => slot.exerciseId === id).length;

  it('conventional deadlift and back squat once each; rows vary; Friday quad heavy follows equipment', () => {
    const built = plan(snapshot(warrenGoals, warrenEquipment), 5);
    const days = byDay(built);
    expect(count(built, 'deadlift')).toBe(1);
    expect(days[5].deadlift).toBe('deadlift');
    expect(count(built, 'squat')).toBe(1);
    expect(days[2].squat).toBe('squat');
    expect(['hack_squat', 'leg_press']).toContain(days[5].quadHeavy);
    expect(days[4]['row-follow']).not.toBe('barbell_row');
    expect(days[1]['row-heavy']).toBe('barbell_row');
    expect(days[1].bench).toBe('barbell_bench_press');
    expect(days[3].bench).toBe('barbell_bench_press');
    // No leg-curl machine: RDL is the only eligible hinge follow-up, so Tuesday's
    // heavy hinge is an owner-led off-list fill, never the reserved deadlift.
    expect(days[2].hingeFollow).toBe('romanian_deadlift');
    expect(days[2].hingeHeavy).not.toBe('deadlift');
  });

  it('with a leg-curl machine, Tuesday hinge is RDL and the follow-up is leg curl', () => {
    const built = plan(snapshot(warrenGoals, [...warrenEquipment, 'leg_curl_machine', 'leg_extension_machine']), 5);
    const days = byDay(built);
    expect(days[2].hingeHeavy).toBe('romanian_deadlift');
    expect(days[2].hingeFollow).toBe('leg_curls');
    expect(count(built, 'deadlift')).toBe(1);
    expect(count(built, 'squat')).toBe(1);
  });

  it('slot order outranks a baseline on an off-list lift', () => {
    const built = plan(snapshot(warrenGoals, [...warrenEquipment, 'leg_curl_machine'], { ...warrenBaselines, sumo_deadlift: 140 }), 5);
    expect(byDay(built)[2].hingeHeavy).toBe('romanian_deadlift');
  });
});
