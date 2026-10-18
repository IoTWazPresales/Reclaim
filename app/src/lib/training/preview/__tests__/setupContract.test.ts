import { describe, expect, it } from 'vitest';
import { prepareTrainingSetup, type TrainingSetupDraft } from '../../setupDraft';
import { dryRunTrainingGeneration, computePreviewSummary, generatePreview } from '../index';
import { buildFourWeekPlan } from '../../programPlanner';
import { programmeWeekProposal } from '../../programmeWeekProposal';

const base: TrainingSetupDraft = {
  goals: { build_muscle: 4, build_strength: 4, lose_fat: 1, get_fitter: 1 },
  selectedWeekdays: [1, 3, 5],
  equipment: ['barbell', 'bench', 'rack', 'dumbbells'],
  constraints: [],
  baselines: { bench_press: 60 },
  baselineReps: { bench_press: 8 },
  muscleFrequency: 'twice',
  experienceLevel: 'beginner',
  includeSkillWork: false,
  trainingMode: 'strength',
};

function confirmedProposal(draft: TrainingSetupDraft) {
  const { profile, snapshot, selectedWeekdaysJs } = prepareTrainingSetup(draft);
  const plan = buildFourWeekPlan(profile, selectedWeekdaysJs, new Date());
  return programmeWeekProposal(plan, 1, snapshot).get(plan.selectedWeekdays[0])!;
}

describe('R02 setup decision contract', () => {
  it.each([
    ['novice strength', base],
    ['advanced and skill enabled', { ...base, experienceLevel: 'advanced', includeSkillWork: true }],
    ['non-five-rep baseline and restrictions', { ...base, baselineReps: { bench_press: 10 }, constraints: ['no_overhead', 'shoulder_issues'] }],
    ['one day frequency fallback', { ...base, selectedWeekdays: [7], muscleFrequency: 'twice' }],
    ['running', { ...base, trainingMode: 'running', runningGoal: 'custom', runningDistanceKm: '8' }],
    ['hybrid', { ...base, trainingMode: 'hybrid', runningGoal: '10k' }],
  ] as Array<[string, TrainingSetupDraft]>)('%s preview matches the confirmed proposal', (_name, draft) => {
    const { snapshot, profile, profileWrite, programSnapshot, selectedWeekdaysJs } = prepareTrainingSetup(draft);
    expect(profile.goals).toEqual(snapshot.goals);
    expect(profile.baselines).toEqual(snapshot.baselines);
    expect(profile.constraints.baselineInputs).toEqual(snapshot.baselineInputs);
    expect(profile.equipment_access).toEqual(snapshot.equipment_access);
    expect(profile.constraints.preferences).toEqual(snapshot.constraints?.preferences);
    expect(profile.constraints.experienceLevel).toBe(snapshot.experienceLevel);
    expect(profile.constraints.trainingMode).toBe(snapshot.trainingMode);
    expect(profile.constraints.runningGoal).toBe(snapshot.runningGoal);
    expect(profile.constraints.runningDistanceKm).toBe(snapshot.runningDistanceKm);
    expect(profileWrite.constraints).toEqual(profile.constraints);
    expect(profileWrite.baselines).toEqual(snapshot.baselines);
    expect(programSnapshot).toMatchObject(snapshot);
    expect(programSnapshot.selected_weekdays_js).toEqual(selectedWeekdaysJs);
    expect(selectedWeekdaysJs).toEqual(draft.selectedWeekdays.map(day => day === 7 ? 0 : day).sort((a, b) => a - b));
    const preview = dryRunTrainingGeneration(draft);
    const confirmed = confirmedProposal(draft);
    expect(preview && { ...preview, id: '', createdAt: '' }).toEqual(confirmed && { ...confirmed, id: '', createdAt: '' });
  });

  it('uses entered reps for the same estimated baseline in preview and confirmation', () => {
    const eight = prepareTrainingSetup(base).snapshot.baselines?.barbell_bench_press;
    const five = prepareTrainingSetup({ ...base, baselineReps: { bench_press: 5 } }).snapshot.baselines?.barbell_bench_press;
    expect(eight).toBeCloseTo(76);
    expect(five).toBeCloseTo(70);
    expect(eight).not.toBe(five);
    expect(prepareTrainingSetup(base).snapshot.baselineInputs?.bench_press).toEqual({ weightKg: 60, reps: 8 });
  });

  it('preserves skill and frequency preferences in the programme snapshot', () => {
    const draft = { ...base, includeSkillWork: true, muscleFrequency: 'once' as const, selectedWeekdays: [1, 4] };
    const { snapshot, profile } = prepareTrainingSetup(draft);
    expect(snapshot.constraints?.preferences).toEqual({ muscle_frequency_preference: 'auto', includeSkillWork: true });
    expect(profile.constraints.preferences).toEqual(snapshot.constraints?.preferences);
  });
});

// RD-006: compare real preview and confirmation adapters without changing policy.
describe('R02 timed running preview correction', () => {
  it.each([1, 2, 3, 4])('preserves prescribed minutes and confirmation parity in week %i', weekIndex => {
    const draft: TrainingSetupDraft = { ...base, trainingMode: 'running', runningGoal: '5k' };
    const { profile, snapshot, selectedWeekdaysJs } = prepareTrainingSetup(draft);
    const programme = buildFourWeekPlan(profile, selectedWeekdaysJs, new Date());
    const confirmed = programmeWeekProposal(programme, weekIndex, snapshot).get(programme.selectedWeekdays[0])!;
    const preview = dryRunTrainingGeneration(draft, { weekIndex })!;
    expect(preview.template).toBe('run');
    expect(preview.exercises).toEqual([]);
    expect(preview.estimatedDurationMinutes).toBe(weekIndex < 3 ? 20 : 30);
    expect(preview.constraints.timeBudgetMinutes).toBe(preview.estimatedDurationMinutes);
    expect(computePreviewSummary(preview)).toEqual(computePreviewSummary(confirmed));
    expect(generatePreview(draft, { weekIndex })?.runningDurationMinutes).toBe(confirmed.estimatedDurationMinutes);
    for (const goal of [{ runningGoal: '10k' as const }, { runningGoal: 'custom' as const, runningDistanceKm: '42' }]) {
      expect(generatePreview({ ...draft, ...goal }, { weekIndex })?.runningDurationMinutes).toBe(confirmed.estimatedDurationMinutes);
    }
  });

  it('keeps empty strength sessions and invalid timed runs unavailable', () => {
    const run = dryRunTrainingGeneration({ ...base, trainingMode: 'running' })!;
    expect(computePreviewSummary({ ...run, template: 'full_body' })).toBeNull();
    for (const estimatedDurationMinutes of [0, -1, NaN, Infinity]) {
      expect(computePreviewSummary({ ...run, estimatedDurationMinutes })).toBeNull();
    }
    expect(computePreviewSummary({ ...run, programmeValidation: { policyVersion: 'test', status: 'infeasible', issues: [] } })).toBeNull();
  });

  it('keeps unavailable programmes distinct from valid runs', () => {
    expect(generatePreview({ ...base, trainingMode: 'running', selectedWeekdays: [] })).toBeNull();
    expect(generatePreview({ ...base, trainingMode: 'running' }, { weekIndex: 5 })).toBeNull();
    expect(generatePreview({ ...base, trainingMode: 'running' }, { targetWeekday: 2 })).toBeNull();
    // Existing R05 policy rejects hybrid two/three-day programmes.
    expect(generatePreview({ ...base, trainingMode: 'hybrid' })).toBeNull();
  });

  it.each(['strength', 'hybrid'] as const)('keeps %s lifting summaries and confirmation parity', trainingMode => {
    const draft = { ...base, trainingMode, muscleFrequency: 'once' as const, selectedWeekdays: [1, 2, 3, 4, 5] };
    const summary = generatePreview(draft);
    expect(summary).not.toBeNull();
    expect(summary?.runningDurationMinutes).toBeNull();
    expect(summary?.setCounts.total).toBeGreaterThan(0);
    expect(summary).toEqual(computePreviewSummary(confirmedProposal(draft)));
  });
});
