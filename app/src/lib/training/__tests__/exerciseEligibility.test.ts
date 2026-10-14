import { describe, expect, it } from 'vitest';
import catalogueData from '../catalog/exercises.v1.json';
import { evaluateExerciseCandidates, evaluateExerciseEligibility as evaluate } from '../exerciseEligibility';
import type { Exercise, TrainingProfileSnapshot } from '../types';

const catalogue = catalogueData as Exercise[];
const exercise = (id: string): Exercise => {
  const found = catalogue.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown fixture exercise: ${id}`);
  return found;
};
const profile = (equipment_access: string[] = [], extra: Partial<TrainingProfileSnapshot> = {}): TrainingProfileSnapshot => ({
  goals: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 }, equipment_access, ...extra,
});

describe('shared catalogue exercise eligibility', () => {
  it.each([
    ['one_arm_row', ['dumbbells'], true],
    ['dumbbell_curl', ['dumbbell'], true],
    ['one_arm_row', [' DUMBBELLS '], true],
    ['kettlebell_swing', ['kettlebells'], true],
    ['farmer_walk', ['kettlebell'], true],
    ['dumbbell_bench_press', ['dumbbell', 'bench'], true],
    ['dumbbell_bench_press', ['dumbbells'], false],
    ['concentration_curl', ['dumbbells', 'bench'], true],
    ['leg_press', ['machine'], false],
    ['l_sit', [], false],
    ['l_sit', ['floor'], true],
    ['plank', [], true],
    ['running', ['floor'], false],
  ])('%s with %j => %s', (id, equipment, eligible) => {
    expect(evaluate(exercise(id as string), profile(equipment as string[])).eligible).toBe(eligible);
  });

  it('keeps legacy ANY semantics rather than silently repairing catalogue requirements', () => {
    expect(evaluate(exercise('weighted_pull_ups'), profile(['weight_belt'])).eligible).toBe(true);
    expect(evaluate(exercise('romanian_deadlift'), profile(['dumbbell'])).eligible).toBe(true);
  });

  it('reports missing ALL equipment and does not fall back to the legacy field', () => {
    const result = evaluate(exercise('dumbbell_bench_press'), profile(['dumbbells']));
    expect(result.diagnostics).toEqual([{ code: 'equipment_all', missing: ['bench'] }]);
    expect(result.reasons).toEqual(['equipment_all:bench']);
  });

  it('enforces explicit ALL and ANY together (synthetic requirement shape, absent from current catalogue)', () => {
    const fixture = { ...exercise('dumbbell_bench_press'), equipment: ['floor'], equipmentAll: ['bench'], equipmentAny: ['dumbbell', 'kettlebell'] };
    expect(evaluate(fixture, profile(['bench', 'kettlebells'])).eligible).toBe(true);
    expect(evaluate(fixture, profile(['floor'])).diagnostics).toEqual([
      { code: 'equipment_all', missing: ['bench'] },
      { code: 'equipment_any', requiredAny: ['dumbbells', 'kettlebells'] },
    ]);
    expect(evaluate({ ...fixture, equipmentAll: [], equipmentAny: [] }, profile()).diagnostics)
      .toEqual([{ code: 'equipment_unavailable', requiredAny: ['floor'] }]);
  });

  it('returns all exact injury, forbidden and exclusion matches without mutating inputs', () => {
    const input = profile([], { constraints: { injuries: ['shoulder_impingement', 'rotator_cuff_injury'],
      forbiddenMovements: ['horizontal_press'], preferences: { hatesExercises: ['barbell_bench_press'] } } });
    const before = JSON.stringify({ input, catalogue });
    const result = evaluate(exercise('barbell_bench_press'), input, { excludedExerciseIds: ['barbell_bench_press'] });
    expect(result.eligible).toBe(false);
    expect(result.diagnostics).toEqual([
      { code: 'equipment_all', missing: ['barbell', 'bench'] },
      { code: 'contraindication', injuries: ['shoulder_impingement', 'rotator_cuff_injury'] },
      { code: 'forbidden_movement', intents: ['horizontal_press'] },
      { code: 'excluded_exercise', exerciseId: 'barbell_bench_press', source: 'hatesExercises' },
      { code: 'excluded_exercise', exerciseId: 'barbell_bench_press', source: 'excludedExerciseIds' },
    ]);
    expect(JSON.stringify({ input, catalogue })).toBe(before);
    // No fuzzy injury taxonomy or exercise-name matching is invented.
    expect(evaluate(exercise('plank'), profile([], { constraints: { injuries: ['back pain'] } })).eligible).toBe(true);
  });

  it('preserves the opt-in, same-lift rack exception and records its unresolved provenance', () => {
    const input = profile(['barbell'], { baselines: { squat: 100 } });
    expect(evaluate(exercise('squat'), input).eligible).toBe(false);
    const result = evaluate(exercise('squat'), input, { allowEnteredRackException: true });
    expect(result.eligible).toBe(true);
    expect(result.policyExceptions).toEqual([{ code: 'entered_rack_exception', waivedEquipment: ['rack'], exerciseId: 'squat', baseline: 100,
      pendingDecision: 'D-P2-06', provenance: 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09' }]);
    expect(result.warnings).toHaveLength(1);
    expect(evaluate(exercise('front_squat'), input, { allowEnteredRackException: true }).eligible).toBe(false);
    expect(evaluate(exercise('squat'), profile(['barbell', 'rack'], { baselines: { squat: 100 } }), { allowEnteredRackException: true }).policyExceptions).toEqual([]);
  });

  it.each([0, -1, NaN, Infinity])('does not use invalid baseline %s to waive a rack', (baseline) => {
    expect(evaluate(exercise('squat'), profile(['barbell'], { baselines: { squat: baseline } }), { allowEnteredRackException: true }).eligible).toBe(false);
  });

  it('never waives non-rack equipment or other restrictions', () => {
    const options = { allowEnteredRackException: true };
    expect(evaluate(exercise('squat'), profile([], { baselines: { squat: 100 } }), options).policyExceptions).toEqual([]);
    const input = profile(['barbell'], { baselines: { squat: 100 }, constraints: { injuries: ['knee_injury'], forbiddenMovements: ['knee_dominant'], preferences: { hatesExercises: ['squat'] } } });
    const result = evaluate(exercise('squat'), input, options);
    expect(result.eligible).toBe(false);
    expect(result.policyExceptions).toHaveLength(1);
    expect(result.diagnostics.map((item) => item.code)).toEqual(['contraindication', 'forbidden_movement', 'excluded_exercise']);
  });

  it('preserves the skill opt-in and does not treat it as an injury waiver', () => {
    expect(evaluate(exercise('handstand'), profile(), { selectionIntent: 'vertical_press' }).diagnostics).toEqual([{ code: 'skill_not_enabled', intents: ['vertical_press'] }]);
    expect(evaluate(exercise('handstand'), profile(), { selectionIntent: 'trunk_stability' }).eligible).toBe(true);
    expect(evaluate(exercise('handstand'), profile()).eligible).toBe(true);
    expect(evaluate(exercise('handstand'), profile([], { constraints: { preferences: { includeSkillWork: true } } }), { selectionIntent: 'vertical_press' }).eligible).toBe(true);
    expect(evaluate(exercise('handstand'), profile([], { constraints: { preferences: { includeSkillWork: true }, injuries: ['wrist_injury'] } })).eligible).toBe(false);
  });

  it('retains rejected candidates when dislikes remove the entire supplied pool', () => {
    const candidates = ['one_arm_row', 'barbell_row'].map(exercise);
    const results = evaluateExerciseCandidates(candidates, profile(['dumbbells'], { constraints: { preferences: { hatesExercises: ['one_arm_row'] } } }));
    expect(results.filter((entry) => entry.eligibility.eligible)).toEqual([]);
    expect(results.map((entry) => [entry.exercise.id, entry.eligibility.reasons])).toEqual([
      ['one_arm_row', ['excluded_exercise']], ['barbell_row', ['equipment_unavailable']],
    ]);
  });

  it.each([
    { equipment: ['floor'], ids: 'plank burpees dead_bug russian_twist push_ups pike_push_ups nordic_curls diamond_push_ups side_plank bird_dog jumping_jacks mountain_climbers pistol_squat cossack_squat handstand_push_ups reverse_crunch bear_crawl crab_walk l_sit planche handstand' },
    { equipment: ['dumbbells'], ids: 'romanian_deadlift dumbbell_curl plank farmer_walk burpees lateral_raises lunges overhead_tricep_extension hammer_curl dead_bug russian_twist push_ups arnold_press pike_push_ups front_raises rear_delt_flyes one_arm_row goblet_squat reverse_lunges single_leg_rdl nordic_curls diamond_push_ups skull_crushers side_plank bird_dog suitcase_carry waiters_walk jumping_jacks mountain_climbers thruster turkish_get_up clean_and_press pistol_squat cossack_squat calf_raises shrugs upright_row handstand_push_ups reverse_crunch bear_crawl crab_walk handstand' },
  ])('partitions every actual catalogue row for $equipment with exact feasible IDs', ({ equipment, ids }) => {
    const results = evaluateExerciseCandidates(catalogue, profile(equipment));
    expect(catalogue).toHaveLength(137);
    expect(results.map((entry) => entry.exercise.id)).toEqual(catalogue.map((entry) => entry.id));
    expect(results.filter((entry) => entry.eligibility.eligible).map((entry) => entry.exercise.id)).toEqual(ids.split(' '));
    for (const entry of results.filter((entry) => !entry.eligibility.eligible)) {
      expect(entry.eligibility.diagnostics.some((diagnostic) => diagnostic.code.startsWith('equipment_'))).toBe(true);
    }
  });

  it('can feed both generation and replacement filtering without ranking or prescribing', () => {
    const input = profile(['dumbbell', 'floor'], { constraints: { injuries: ['lower_back_injury'] } });
    const weeklyPool = evaluateExerciseCandidates(catalogue, input);
    const replacementPool = evaluateExerciseCandidates(catalogue, input, { excludedExerciseIds: ['dumbbell_curl'] });
    expect(replacementPool.filter((entry) => entry.eligibility.eligible).map((entry) => entry.exercise.id))
      .toEqual(weeklyPool.filter((entry) => entry.eligibility.eligible && entry.exercise.id !== 'dumbbell_curl').map((entry) => entry.exercise.id));
    for (const entry of replacementPool.filter((entry) => entry.eligibility.eligible)) {
      expect(entry.exercise.contraindications).not.toContain('lower_back_injury');
      expect(evaluate(entry.exercise, input).eligible).toBe(true);
    }
  });
});
