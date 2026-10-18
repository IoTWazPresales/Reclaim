import { describe, expect, it } from 'vitest';
import { prepareTrainingSetup, type TrainingSetupDraft } from '../../setupDraft';
import { buildFourWeekPlan } from '../../programPlanner';
import { programmeWeekProposal } from '../../programmeWeekProposal';
import { computePreviewSummary, generatePreview } from '../index';
import { materializePlannedSessionItems, plannedItemsForSession } from '../../buildProgramDaySession';

// Independent review probe only: excluded from the committed R02 source manifest.
const base: TrainingSetupDraft = {
  goals: { build_muscle: 4, build_strength: 4, lose_fat: 1, get_fitter: 1 },
  selectedWeekdays: [7, 1, 3], equipment: [], constraints: [], baselines: {},
  trainingMode: 'running', runningGoal: '5k', experienceLevel: 'advanced',
};
const roundTrip = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

describe('Independent R02 corrected source probes', () => {
  it.each(['5k', '10k', 'custom'] as const)('preserves every scheduled run across JSON serialization for %s', runningGoal => {
    const draft = freezeDeep({ ...base, runningGoal, runningDistanceKm: '123.5' });
    const before = JSON.stringify(draft);
    const prepared = prepareTrainingSetup(draft);
    const persisted = roundTrip(prepared.programSnapshot);
    const profileWrite = roundTrip(prepared.profileWrite);
    const programme = buildFourWeekPlan(profileWrite as typeof prepared.profile, prepared.selectedWeekdaysJs, new Date());
    expect(programme.selectedWeekdays).toEqual([1, 3, 7]);
    for (const [index, minutes] of [20, 20, 30, 30].entries()) {
      const confirmed = programmeWeekProposal(programme, index + 1, persisted);
      expect(confirmed.size).toBe(3);
      for (const day of [1, 3, 7]) {
        const summary = generatePreview(draft, { weekIndex: index + 1, targetWeekday: day });
        expect(summary?.runningDurationMinutes).toBe(minutes);
        expect(summary).toEqual(computePreviewSummary(confirmed.get(day)!));
      }
    }
    expect(JSON.stringify(draft)).toBe(before);
  });

  it('leaves prior proposals and frozen lifting prescriptions unchanged during later previews', () => {
    const draft: TrainingSetupDraft = { ...base, trainingMode: 'strength', selectedWeekdays: [1, 2, 3, 4, 5],
      muscleFrequency: 'once', equipment: ['barbell', 'bench', 'rack', 'dumbbells'],
      baselines: { bench_press: 60 }, baselineReps: { bench_press: 8 } };
    const prepared = prepareTrainingSetup(draft);
    const programme = buildFourWeekPlan(prepared.profile, prepared.selectedWeekdaysJs, new Date());
    const old = programmeWeekProposal(programme, 1, prepared.programSnapshot).get(1)!;
    const items = freezeDeep(materializePlannedSessionItems('review-probe', old));
    const before = JSON.stringify({ programme, old, items });
    const later = prepareTrainingSetup({ ...draft, baselineReps: { bench_press: 12 } });
    const rebuilt = programmeWeekProposal(buildFourWeekPlan(later.profile, later.selectedWeekdaysJs), 1, later.snapshot).get(1)!;
    expect(later.snapshot.baselines).not.toEqual(prepared.snapshot.baselines);
    for (const state of [{ startedAt: '2026-10-01T00:00:00Z', notificationMode: 'normal' as const },
      { startedAt: null, notificationMode: 'guided' as const }]) {
      expect(plannedItemsForSession({ ...state, sessionId: 'review-probe', frozenItems: items, rebuiltPlan: rebuilt })).toBe(items);
    }
    generatePreview({ ...base, runningGoal: 'custom', runningDistanceKm: '99' }, { weekIndex: 4 });
    expect(JSON.stringify({ programme, old, items })).toBe(before);
  });
});
