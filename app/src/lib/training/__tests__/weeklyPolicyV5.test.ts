/**
 * Weekly policy v5 (ROUTINE_AUDIT.md, weekly policy v5 2026-11-05).
 * The operator profile is a test fixture only; production code never reads it.
 */
import { describe, expect, it } from 'vitest';
import catalogData from '../catalog/exercises.v1.json';
import type { TrainingSessionItemRow } from '@/lib/api';
import { BALANCED_SLOT_POLICIES } from '../balancedHypertrophy';
import { buildFourWeekPlan, type FourWeekProgramPlan } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { capNewSession } from '../sessionCapPolicy';
import { estimateExerciseSeconds, estimateSessionMinutes } from '../sessionDurationEstimate';
import { prescribeReplacement } from '../exerciseSubstitution';
import { formatPlannedSetSummary, formatRepTarget } from '../loadDisplayFormat';
import { formatWeeklyMuscleSetLine } from '../weeklyVolumeSummary';
import { compileProgrammeWeek, defineWeeklyRequirements, resolveWeeklyObjectives, v5OrderTier } from '../weeklyProgramme';
import {
  BALANCED_WEEKLY_OBJECTIVES, DEADLIFT_VARIANT_IDS, UPPER_LOWER_STRATEGY_ID, V5_BALANCED_WEEKLY_OBJECTIVES, V5_CORE_ANTI_ROTATION_CANDIDATES,
  V5_CORE_FLEXION_CANDIDATES, V5_SESSION_CAPS, V5_UPPER_LOWER_WEEKLY_OBJECTIVES, deadliftVariantMisplaced, weeklyObjectivesFor,
} from '../weeklyProgrammePolicy';
import { validateProgrammeWeek } from '../weeklyProgrammeValidator';
import { V4_WEEKLY_POLICY_VERSION, WEEKLY_POLICY_VERSION } from '../weeklyProgrammeTypes';
import type { AllocatedSlot } from '../weeklyProgrammeTypes';
import type { Exercise, PlannedExercise, SessionPlan } from '../types';
import { OPERATOR_BASELINES, OPERATOR_EQUIPMENT, operatorPlan, operatorSnapshot, type OperatorVariant } from './fixtures/operatorProfile';

const catalog = catalogData as Exercise[];
const LEG_CURL = [...OPERATOR_EQUIPMENT, 'leg_curl_machine'];
const CASES: Array<[string, number, OperatorVariant]> = [
  ['2-day auto', 2, {}], ['2-day full body', 2, { splitPreference: 'full_body' }], ['2-day upper/lower', 2, { splitPreference: 'upper_lower' }],
  ['3-day', 3, {}], ['4-day', 4, {}], ['5-day', 5, {}], ['6-day', 6, {}],
];

function week(plan: FourWeekProgramPlan) {
  const proposals = programmeWeekProposal(plan, 1, plan.programme!.input);
  const days = Object.entries(plan.weeks[0].days).map(([key, day]) => ({ key: Number(key), day, session: proposals.get(Number(key))!, slots: day.allocation!.slots }));
  return { proposals, days, slots: days.flatMap((entry) => entry.slots) };
}
const slotFor = (slots: AllocatedSlot[], item: PlannedExercise) => slots.find((slot) => slot.exerciseId === item.exerciseId)!;
const byRequirement = (slots: AllocatedSlot[], id: string) => slots.filter((slot) => slot.requirementId === id).map((slot) => slot.exerciseId);

describe('v5 identity and frozen tables', () => {
  it('new builds are weekly-20261105-v5; frozen v4 tables and slot policies are unchanged', () => {
    expect(WEEKLY_POLICY_VERSION).toBe('weekly-20261105-v5');
    expect(operatorPlan(5).programme!.policyVersion).toBe(WEEKLY_POLICY_VERSION);
    expect(BALANCED_SLOT_POLICIES.hingeHeavy.candidates).toEqual(['romanian_deadlift', 'leg_curls']);
    expect(BALANCED_SLOT_POLICIES.hingeFollow.candidates).toEqual(['leg_curls', 'romanian_deadlift']);
    expect(weeklyObjectivesFor('balanced-v1:5', V4_WEEKLY_POLICY_VERSION)).toBe(BALANCED_WEEKLY_OBJECTIVES[5]);
    expect(weeklyObjectivesFor('balanced-v1:5', WEEKLY_POLICY_VERSION)).toBe(V5_BALANCED_WEEKLY_OBJECTIVES[5]);
    expect(weeklyObjectivesFor(UPPER_LOWER_STRATEGY_ID, WEEKLY_POLICY_VERSION)).toBe(V5_UPPER_LOWER_WEEKLY_OBJECTIVES);
  });
});

describe('V5-1 hinge slots and deadlift variants', () => {
  it('operator equipment (no leg-curl machine): Tue RDL + single-leg RDL; Fri deadlift + single-leg RDL or hip thrust', () => {
    const { days, slots } = week(operatorPlan(5));
    const tue = days.find((entry) => entry.key === 2)!.slots;
    const fri = days.find((entry) => entry.key === 5)!.slots;
    expect(byRequirement(tue, 'hingeHeavy')).toEqual(['romanian_deadlift']);
    expect(byRequirement(tue, 'hingeFollow')).toEqual(['single_leg_rdl']);
    expect(byRequirement(fri, 'deadlift')).toEqual(['deadlift']);
    expect(['single_leg_rdl', 'hip_thrust']).toContain(byRequirement(fri, 'hingeFollow')[0]);
    expect(slots.filter((slot) => slot.exerciseId === 'deadlift')).toHaveLength(1);
    expect(slots.some((slot) => slot.exerciseId === 'sumo_deadlift' || slot.exerciseId === 'trap_bar_deadlift')).toBe(false);
  });

  it('with a leg-curl machine, the Tuesday follow-up is leg curls; Friday keeps a listed follow-up (variety rule, see report)', () => {
    const { days } = week(operatorPlan(5, { equipment: LEG_CURL }));
    expect(byRequirement(days.find((entry) => entry.key === 2)!.slots, 'hingeFollow')).toEqual(['leg_curls']);
    // The existing accessory-variety rule demotes a repeat of the same no-own-load
    // requirement, so Friday picks the next listed candidate rather than leg curls again.
    expect(['leg_curls', 'single_leg_rdl', 'hip_thrust']).toContain(byRequirement(days.find((entry) => entry.key === 5)!.slots, 'hingeFollow')[0]);
  });

  for (const [name, days, variant] of CASES) it(`${name}: deadlift variants fill only the deadlift requirement; hinge slots use their lists`, () => {
    for (const equipment of [OPERATOR_EQUIPMENT, LEG_CURL]) {
      const { slots } = week(operatorPlan(days, { ...variant, equipment }));
      for (const slot of slots) {
        if (slot.requirementId !== 'deadlift') for (const id of [slot.exerciseId!, ...slot.candidateExerciseIds]) expect(DEADLIFT_VARIANT_IDS).not.toContain(id);
        if (slot.requirementId === 'hingeHeavy') expect(['romanian_deadlift', 'good_mornings', 'hip_thrust']).toContain(slot.exerciseId);
        if (slot.requirementId === 'hingeFollow') expect(['leg_curls', 'single_leg_rdl', 'hip_thrust']).toContain(slot.exerciseId);
      }
      expect(slots.some((slot) => slot.exerciseId === 'sumo_deadlift' || slot.exerciseId === 'trap_bar_deadlift')).toBe(false);
    }
  });

  it('two-day Upper/Lower: the Lower day has no conventional deadlift', () => {
    const { days } = week(operatorPlan(2, { splitPreference: 'upper_lower' }));
    const lower = days.find((entry) => entry.day.template === 'lower')!;
    expect(lower.slots.some((slot) => slot.exerciseId === 'deadlift')).toBe(false);
    expect(byRequirement(lower.slots, 'hingeHeavy')).toEqual(['romanian_deadlift']);
  });

  it('a baseline on sumo deadlift never places it outside the deadlift slot', () => {
    const { slots } = week(operatorPlan(5, { baselines: { ...OPERATOR_BASELINES, sumo_deadlift: 160, trap_bar_deadlift: 150 } }));
    expect(slots.filter((slot) => slot.exerciseId && DEADLIFT_VARIANT_IDS.includes(slot.exerciseId)).map((slot) => slot.requirementId)).toEqual(['deadlift']);
  });

  it('R05 rejects a deadlift variant in a non-deadlift slot (v5 only)', () => {
    const plan = operatorPlan(5);
    const tue = plan.weeks[0].days[2].allocation!;
    const heavy = tue.slots.find((slot) => slot.requirementId === 'hingeHeavy')!;
    heavy.exerciseId = 'sumo_deadlift';
    heavy.candidateExerciseIds = [...heavy.candidateExerciseIds, 'sumo_deadlift'];
    plan.weeks[0].compilation!.days[2] = tue;
    const validation = [...programmeWeekProposal(plan, 1, plan.programme!.input).values()][0].weeklyValidation!;
    expect(validation.issues.some((issue) => issue.code === 'deadlift_variant_misplaced')).toBe(true);
    expect(deadliftVariantMisplaced('sumo_deadlift', 'hingeHeavy', V4_WEEKLY_POLICY_VERSION)).toBe(false);
    expect(deadliftVariantMisplaced('trap_bar_deadlift', 'deadlift', WEEKLY_POLICY_VERSION)).toBe(false);
    expect(validateProgrammeWeek).toBeTypeOf('function');
  });

  it('a follow-up hinge with no eligible candidate folds into that day’s heavy hinge (<= 5 sets) with one warning, never an empty slot', () => {
    // No leg-curl machine, no dumbbell/kettlebell, no bench: no hinge follow-up candidate is eligible.
    const equipment = ['barbell', 'rack', 'cable_machine', 'pull_up_bar', 'leg_press_machine', 'hack_squat_machine'];
    const profile = operatorSnapshot({ equipment });
    const objectives = resolveWeeklyObjectives('balanced-v1:5', WEEKLY_POLICY_VERSION, profile)!;
    expect(objectives.some((objective) => objective.id === 'hingeFollow')).toBe(false);
    const requirements = defineWeeklyRequirements(5, profile, WEEKLY_POLICY_VERSION);
    expect(requirements.find((row) => row.id === 'hingeHeavy')!.exposureSetCounts).toEqual([V5_SESSION_CAPS.perExerciseSets]);
    expect(requirements.find((row) => row.id === 'deadlift')!.exposureSetCounts).toEqual([V5_SESSION_CAPS.perExerciseSets]);
    const plan = operatorPlan(5, { equipment });
    const compiled = plan.weeks[0].compilation!;
    expect(Object.values(compiled.days).flatMap((day) => day.slots).some((slot) => slot.requirementId === 'hingeFollow')).toBe(false);
    expect(compiled.issues.filter((issue) => issue.code === 'hinge_follow_folded')).toHaveLength(2);
    expect(compiled.issues.find((issue) => issue.code === 'hinge_follow_folded')!.severity).toBe('warning');
    // The v4 week with the same equipment is unchanged by the fold.
    const v4 = operatorPlan(5, { equipment }, { policyVersion: V4_WEEKLY_POLICY_VERSION });
    expect(v4.weeks[0].compilation!.issues.some((issue) => issue.code === 'hinge_follow_folded')).toBe(false);
  });
});

describe('V5-2 no session time cap and no session total-set cap', () => {
  it('a v5 week whose sessions exceed 60 min and 24 sets compiles feasible with zero trims and zero budget issues', () => {
    const { days } = week(operatorPlan(2, { splitPreference: 'full_body' }));
    const budgetCodes = ['session_set_budget', 'session_minute_budget', 'allocation_budget_exceeded', 'volume_cap_shortfall', 'session_time_budget', 'legacy_budget_trim'];
    expect(days.some((entry) => entry.session.estimatedDurationMinutes > 60)).toBe(true);
    expect(days.some((entry) => entry.session.exercises.reduce((n, item) => n + item.plannedSets.length, 0) > 24)).toBe(true);
    for (const entry of days) {
      expect(entry.session.programmeValidation!.status).toBe('feasible');
      for (const issue of [...entry.session.programmeValidation!.issues, ...entry.session.weeklyValidation!.issues]) expect(budgetCodes).not.toContain(issue.code);
      expect(entry.session.weeklyValidation!.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
      for (const item of entry.session.exercises) expect(item.plannedSets).toHaveLength(slotFor(entry.slots, item).setCount);
    }
  });

  it('capNewSession: v5 owner caps only; earlier callers keep every limit', () => {
    const exercise = catalog.find((entry) => entry.id === 'lateral_raises')!;
    const item = (id: string, sets: number): PlannedExercise => ({ exerciseId: id, exercise: { ...exercise, id }, orderIndex: 0, priority: 'isolation', intents: exercise.intents,
      plannedSets: Array.from({ length: sets }, (_, index) => ({ setIndex: index + 1, targetReps: 12, suggestedWeight: 0, restSeconds: 55 })),
      decisionTrace: { intent: exercise.intents, goalBias: {}, constraintsApplied: [], selectionReason: '', rankedAlternatives: [], confidence: 1 } } as PlannedExercise);
    const items = Array.from({ length: 8 }, (_, index) => item(`x${index}`, 4));
    const owners = items.map((_, index) => `owner${index}`);
    const v5 = capNewSession(items, undefined, undefined, owners, undefined, V5_SESSION_CAPS);
    expect(v5.exercises.reduce((n, entry) => n + entry.plannedSets.length, 0)).toBe(32);
    expect(v5.issues).toEqual([]);
    const legacy = capNewSession(items, undefined, 60, owners);
    expect(legacy.exercises.reduce((n, entry) => n + entry.plannedSets.length, 0)).toBeLessThanOrEqual(24);
    const capped = capNewSession([item('a', 7), item('b', 4), item('c', 4)], undefined, undefined, ['same', 'same', 'same'], undefined, V5_SESSION_CAPS);
    expect(capped.exercises.map((entry) => entry.plannedSets.length)).toEqual([5, 4, 1]);
    expect(capped.issues.map((issue) => issue.code)).toEqual(['volume_cap_shortfall', 'volume_cap_shortfall']);
  });
});

describe('V5-5 realistic duration estimate (display only)', () => {
  it('per exercise: warm-ups x 60 s + sets x (reps x 3 s + 15 s) [x2 per side] + (sets - 1) x rest + 120 s', () => {
    const bench = catalog.find((entry) => entry.id === 'barbell_bench_press')!;
    const lunge = catalog.find((entry) => entry.id === 'lunges')!;
    const sets = (n: number, reps: number, rest: number) => Array.from({ length: n }, (_, index) => ({ setIndex: index + 1, targetReps: reps, suggestedWeight: 0, restSeconds: rest }));
    expect(estimateExerciseSeconds({ exercise: bench, plannedSets: sets(4, 5, 180), warmupSets: [{ weight: 40, reps: 5 }, { weight: 60, reps: 5 }, { weight: 80, reps: 5 }] })).toBe(3 * 60 + 4 * (5 * 3 + 15) + 3 * 180 + 120);
    expect(estimateExerciseSeconds({ exercise: lunge, plannedSets: sets(3, 9, 90) })).toBe(3 * (9 * 3 + 15) * 2 + 2 * 90 + 120);
    expect(estimateSessionMinutes([])).toBe(0);
  });

  it('v5 sessions report the estimate as both duration and time budget', () => {
    for (const entry of week(operatorPlan(5)).days) {
      expect(entry.session.estimatedDurationMinutes).toBe(estimateSessionMinutes(entry.session.exercises));
      expect(entry.session.constraints.timeBudgetMinutes).toBe(entry.session.estimatedDurationMinutes);
    }
  });
});

describe('V5-3/V5-4/V5-7 roles, rest and in-day order', () => {
  for (const [name, days, variant] of CASES) it(`${name}: order is strength, hypertrophy, accessory compound, isolation/support, core; rest by role; warm-ups only first`, () => {
    const { days: entries } = week(operatorPlan(days, variant));
    for (const entry of entries) {
      const tiers = entry.session.exercises.map((item) => v5OrderTier(slotFor(entry.slots, item)));
      expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
      const coreAt = entry.session.exercises.findIndex((item) => slotFor(entry.slots, item).owner === 'core');
      if (coreAt >= 0) expect(coreAt).toBe(entry.session.exercises.length - 1);
      entry.session.exercises.forEach((item, index) => {
        const slot = slotFor(entry.slots, item);
        const rest = item.plannedSets[0].restSeconds;
        if (slot.exposure === 'strength') { expect(rest).toBe(180); expect(item.plannedSets[0].targetReps).toBe(5); expect(item.plannedSets[0].suggestedWeight).toBeGreaterThan(0); }
        if (slot.exposure === 'hypertrophy') { expect(rest).toBe(120); expect(item.plannedSets[0].targetReps).toBe(8); }
        if (!slot.exposure && slot.priority === 'accessory') expect(rest).toBe(90);
        if (slot.priority === 'isolation') expect(rest).toBe(55);
        if (index > 0) expect(item.warmupSets ?? []).toEqual([]);
      });
    }
  });

  it('pull-ups without an added-load path are a hypertrophy exposure: 4 x 8, 120 s, bodyweight', () => {
    const thu = week(operatorPlan(5)).days.find((entry) => entry.key === 4)!;
    const pull = thu.session.exercises[0];
    expect(pull.exerciseId).toBe('pull_ups');
    expect(slotFor(thu.slots, pull).exposure).toBe('hypertrophy');
    expect(pull.plannedSets.map((set) => [set.targetReps, set.restSeconds, set.suggestedWeight])).toEqual(Array(4).fill([8, 120, 0]));
  });

  it('an entered, eligible weighted pull-up gives the pull-up slot a strength role', () => {
    const slots = week(operatorPlan(5, { baselines: { ...OPERATOR_BASELINES, weighted_pull_ups: 20 } })).slots;
    const pull = slots.find((slot) => slot.requirementId === 'pullUp')!;
    expect(pull.exerciseId).toBe('weighted_pull_ups');
    expect(pull.exposure).toBe('strength');
    expect(pull.reps).toBe(5);
  });
});

describe('V5-6 core', () => {
  const coreDays: Array<[string, number, OperatorVariant, number[]]> = [
    ['2-day', 2, {}, [0, 1]], ['2-day upper/lower', 2, { splitPreference: 'upper_lower' }, [0, 1]], ['3-day', 3, {}, [0, 2]],
    ['4-day', 4, {}, [0, 2, 3]], ['5-day', 5, {}, [0, 2, 3]], ['6-day', 6, {}, [1, 3, 5]],
  ];
  for (const [name, days, variant, ordinals] of coreDays) it(`${name}: core on policy days ${ordinals.join(', ')}, last, alternating type, explicit lists only`, () => {
    const { days: entries } = week(operatorPlan(days, variant));
    const ordered = entries.sort((a, b) => a.key - b.key);
    const core = ordered.flatMap((entry, ordinal) => entry.slots.filter((slot) => slot.owner === 'core').map((slot) => ({ ordinal, slot })));
    expect(core.map((entry) => entry.ordinal)).toEqual(ordinals);
    core.forEach(({ slot }, index) => {
      expect(slot.requirementId).toBe(index % 2 === 0 ? 'core-flexion' : 'core-antirotation');
      expect(slot.setCount).toBe(3);
      expect(slot.intent).toBe('trunk_stability');
      const list = slot.requirementId === 'core-flexion' ? V5_CORE_FLEXION_CANDIDATES : V5_CORE_ANTI_ROTATION_CANDIDATES;
      for (const id of slot.candidateExerciseIds) expect(list).toContain(id);
    });
  });

  it('five-day weekly line shows Core 9', () => {
    const { proposals } = week(operatorPlan(5));
    expect(formatWeeklyMuscleSetLine([...proposals.values()])).toContain('Core 9');
  });
});

describe('V5-8 two-day policies', () => {
  it('Auto and Full body two-day are the same genuine 2x full body', () => {
    const auto = operatorPlan(2);
    const full = operatorPlan(2, { splitPreference: 'full_body' });
    expect(JSON.stringify(full.weeks)).toBe(JSON.stringify(auto.weeks));
    const [a, b] = Object.values(auto.weeks[0].days).map((day) => day.allocation!.slots.map((slot) => [slot.requirementId, slot.exposure ?? '']));
    expect(a).toEqual([['squat', 'strength'], ['bench', 'strength'], ['row-heavy', 'strength'], ['hingeHeavy', 'hypertrophy'], ['lateral', ''], ['curl', ''], ['core-flexion', '']]);
    expect(b).toEqual([['deadlift', 'strength'], ['bench', 'hypertrophy'], ['quadHeavy', 'hypertrophy'], ['pullUp', 'hypertrophy'], ['fly', ''], ['pushdown', ''], ['core-antirotation', '']]);
  });

  it('Upper/Lower: Upper has no pushdown; Lower is squat, RDL, quad follow, hinge follow, calf, core', () => {
    const [upper, lower] = Object.values(operatorPlan(2, { splitPreference: 'upper_lower' }).weeks[0].days).map((day) => day.allocation!.slots.map((slot) => slot.requirementId));
    expect(upper).toEqual(['bench', 'row-heavy', 'ohp', 'pulldown', 'fly', 'lateral', 'curl', 'core-flexion']);
    expect(lower).toEqual(['squat', 'hingeHeavy', 'quadFollow', 'hingeFollow', 'calf', 'core-antirotation']);
  });

  it('three- and four-day split preferences resolve to v5 tables', () => {
    for (const [days, preference] of [[3, 'full_body'], [4, 'upper_lower']] as const) {
      const plan = operatorPlan(days, { splitPreference: preference });
      expect(plan.weeks[0].compilation!.policyVersion).toBe(WEEKLY_POLICY_VERSION);
      expect(plan.weeks[0].compilation!.requirements.some((row) => row.owner === 'core')).toBe(true);
    }
  });
});

describe('operator five-day verification target (fixture)', () => {
  it('matches the reviewed week where the general rules agree', () => {
    const { days } = week(operatorPlan(5));
    const show = (key: number) => days.find((entry) => entry.key === key)!.session.exercises.map((item) => `${item.exerciseId} ${item.plannedSets.length}x${item.plannedSets[0].targetReps}@${item.plannedSets[0].suggestedWeight}/${item.plannedSets[0].restSeconds}`);
    expect(show(1)).toEqual(['barbell_bench_press 4x5@97.5/180', 'barbell_row 4x5@70/180', 'lat_pulldown 3x9@0/90', 'dumbbell_flyes 2x12@0/55', 'lateral_raises 3x12@0/55', 'barbell_curl 3x12@25/55', 'cable_crunch 3x12@0/55']);
    expect(show(2)).toEqual(['squat 4x5@90/180', 'romanian_deadlift 4x8@0/120', 'hack_squat 3x9@0/90', 'single_leg_rdl 3x9@0/90', 'calf_raises 3x12@0/55']);
    expect(show(3).slice(0, 2)).toEqual(['overhead_press 4x5@85/180', 'barbell_bench_press 4x8@90/120']);
    expect(show(3).at(-1)).toBe('pallof_press 3x12@0/55');
    expect(show(4)[0]).toBe('pull_ups 4x8@0/120');
    expect(show(4).at(-1)).toBe('hanging_leg_raise 3x12@0/55');
    expect(show(5).slice(0, 2)).toEqual(['deadlift 4x5@100/180', 'leg_press 4x8@0/120']);
    const owners: Record<string, number> = {};
    for (const entry of days) for (const item of entry.session.exercises) { const owner = slotFor(entry.slots, item).owner; owners[owner] = (owners[owner] ?? 0) + item.plannedSets.length; }
    expect({ pectorals: owners.pectorals, lats: owners.lats, quadriceps: owners.quadriceps, hamstrings: owners.hamstrings, core: owners.core }).toEqual({ pectorals: 12, lats: 14, quadriceps: 14, hamstrings: 14, core: 9 });
  });
});

describe('per-side display (repsPerSide)', () => {
  it('every unilateral exercise, plus Pallof press and dead bug, counts reps per side', () => {
    for (const exercise of catalog) if (exercise.unilateral) expect(exercise.repsPerSide, exercise.id).toBe(true);
    const perSide = catalog.filter((exercise) => exercise.repsPerSide).map((exercise) => exercise.id).sort();
    expect(perSide).toEqual([...catalog.filter((exercise) => exercise.unilateral).map((exercise) => exercise.id), 'pallof_press', 'dead_bug'].sort());
  });

  it('formats "N per side" from catalogue data', () => {
    const lunge = catalog.find((entry) => entry.id === 'lunges')!;
    const bench = catalog.find((entry) => entry.id === 'barbell_bench_press')!;
    expect(formatRepTarget(lunge, 9)).toBe('9 per side');
    expect(formatRepTarget(bench, 5)).toBe('5 reps');
    expect(formatPlannedSetSummary(lunge, { targetReps: 9, suggestedWeight: 20 })).toContain('9 per side');
    expect(formatPlannedSetSummary(catalog.find((entry) => entry.id === 'pallof_press')!, { targetReps: 12, suggestedWeight: 0, loadRequiresConfirmation: true })).toBe('12 per side · weight confirmation required');
  });
});

describe('mid-session replacement inherits the planned exposure', () => {
  const plan = operatorPlan(5);
  const proposals = programmeWeekProposal(plan, 1, plan.programme!.input);
  const asItem = (session: SessionPlan, exerciseId: string): TrainingSessionItemRow => {
    const planned = session.exercises.find((item) => item.exerciseId === exerciseId)!;
    return { id: 'item', session_id: 'session', exercise_id: exerciseId, order_index: planned.orderIndex, skipped: false, performed: null, created_at: '2026-11-05T10:00:00Z', autoregulation_adjustments: null,
      planned: { sets: planned.plannedSets, priority: planned.priority, intents: planned.intents, decisionTrace: planned.decisionTrace } } as TrainingSessionItemRow;
  };
  const dumbbellBench = catalog.find((entry) => entry.id === 'dumbbell_bench_press')!;
  it('bench on the strength day -> 5 reps / 180 s', () => {
    const replaced = prescribeReplacement(asItem(proposals.get(1)!, 'barbell_bench_press'), dumbbellBench, operatorSnapshot());
    expect(replaced.sets.map((set) => [set.targetReps, set.restSeconds])).toEqual(Array(4).fill([5, 180]));
    expect(replaced.decisionTrace.prescriptionContext?.repRange).toEqual([3, 6]);
  });
  it('bench on the volume day -> 8 reps / 120 s', () => {
    const replaced = prescribeReplacement(asItem(proposals.get(3)!, 'barbell_bench_press'), dumbbellBench, operatorSnapshot());
    expect(replaced.sets.map((set) => [set.targetReps, set.restSeconds])).toEqual(Array(4).fill([8, 120]));
    expect(replaced.decisionTrace.prescriptionContext?.repRange).toEqual([6, 12]);
  });
});

describe('compiler API', () => {
  it('compiles a frozen version on request without changing the current default', () => {
    const plan = operatorPlan(5);
    const calendar = Object.values(plan.weeks[0].days);
    expect(compileProgrammeWeek(calendar, plan.programme!.input, { daysPerWeek: 5, strategyId: 'balanced-v1:5' }).policyVersion).toBe(WEEKLY_POLICY_VERSION);
    expect(compileProgrammeWeek(calendar, plan.programme!.input, { daysPerWeek: 5, strategyId: 'balanced-v1:5' }, V4_WEEKLY_POLICY_VERSION).policyVersion).toBe(V4_WEEKLY_POLICY_VERSION);
    expect(buildFourWeekPlan).toBeTypeOf('function');
  });
});
