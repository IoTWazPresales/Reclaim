import { describe, expect, it } from 'C:/Reclaim-R08-verify-20261015/app/node_modules/vitest';
import { prescribeReplacement, replacementCandidates, replacementEligibility } from 'C:/Reclaim-R08-verify-20261015/app/src/lib/training/exerciseSubstitution';
import { getExerciseById, listExercises } from 'C:/Reclaim-R08-verify-20261015/app/src/lib/training/engine';
import { evaluateExerciseEligibility } from 'C:/Reclaim-R08-verify-20261015/app/src/lib/training/exerciseEligibility';
import { getExerciseLoadingProfile } from 'C:/Reclaim-R08-verify-20261015/app/src/lib/training/exerciseLoadingProfile';
import { completedPerformanceHistory, PERFORMANCE_HISTORY_SOURCE } from 'C:/Reclaim-R08-verify-20261015/app/src/lib/training/performanceHistory';
import { historyItem } from 'C:/Reclaim-R08-verify-20261015/app/src/lib/training/__tests__/fixtures/performanceHistory';
import type { TrainingSessionItemRow } from 'C:/Reclaim-R08-verify-20261015/app/src/lib/api';
import type { TrainingProfileSnapshot } from 'C:/Reclaim-R08-verify-20261015/app/src/lib/training/types';

const profile: TrainingProfileSnapshot = {
  goals: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 },
  equipment_access: [...new Set(listExercises().flatMap(e => [...e.equipment, ...(e.equipmentAll ?? []), ...(e.equipmentAny ?? [])]))],
  constraints: { preferences: { includeSkillWork: true } }, experienceLevel: 'intermediate',
  baselines: { barbell_bench_press: 150 },
};
function item(id = 'barbell_bench_press'): TrainingSessionItemRow {
  return { id: 'review-item', session_id: 'review-session', exercise_id: id, skipped: false,
    planned: { priority: 'primary', intents: getExerciseById(id)!.intents, sets: [1,2,3].map(setIndex => ({ setIndex, targetReps: 99, suggestedWeight: 999, restSeconds: 999 })) },
    performed: { sets: [] },
  } as TrainingSessionItemRow;
}

describe('fresh reviewer adversarial substitution probes', () => {
  it('every offered catalogue alternative passes shared hard constraints across all original exercises', () => {
    for (const original of listExercises()) {
      const before = item(original.id);
      const restricted = { ...profile, constraints: { injuries: ['shoulder', 'knee', 'lower_back'], preferences: { hatesExercises: ['push_ups', 'dumbbell_bench_press'], includeSkillWork: false } } } as TrainingProfileSnapshot;
      for (const candidate of replacementCandidates(before, restricted)) {
        expect(evaluateExerciseEligibility(candidate, restricted).eligible).toBe(true);
        expect(candidate.id).not.toBe(original.id);
      }
    }
  });
  it('all replacements build fresh targets and preserve the original immutable record', () => {
    let count = 0;
    for (const original of listExercises()) {
      const before = item(original.id);
      const frozen = structuredClone(before);
      for (const candidate of replacementCandidates(before, profile)) {
        const planned = prescribeReplacement(before, candidate, profile);
        expect(planned.sets).toHaveLength(before.planned.sets.length);
        expect(planned.sets.every(set => set.targetReps !== 99 && set.suggestedWeight !== 999)).toBe(true);
        expect(planned.decisionTrace.originalPlanned).toEqual(before.planned);
        expect(planned.decisionTrace.replacementScope).toBe('session');
        expect(planned.decisionTrace.loadDisplayMode).toBe(getExerciseLoadingProfile(candidate).loadDisplayMode);
        expect(before).toEqual(frozen);
        count++;
      }
    }
    expect(count).toBeGreaterThan(100);
  });
  it('blocks original identity changes after even a zero-rep recorded set', () => {
    const partial = item();
    partial.performed!.sets.push({ setIndex: 1, weight: 0, reps: 0, completedAt: '2026-10-15T08:00:00Z' });
    expect(replacementCandidates(partial, profile)).toEqual([]);
    expect(replacementEligibility(partial, getExerciseById('push_ups')!, profile).length).toBeGreaterThan(0);
  });
  it('does not treat another exercise baseline as dumbbell calibration', () => {
    const planned = prescribeReplacement(item(), getExerciseById('dumbbell_bench_press')!, profile);
    expect(planned.decisionTrace.loadCalibration).toBe('uncalibrated');
    expect(planned.sets.every(set => set.suggestedWeight === 0)).toBe(true);
  });
  it('fails calibration closed when qualified latest history disagrees with the recent timeline', () => {
    const id = 'dumbbell_bench_press';
    const recent = completedPerformanceHistory([historyItem(id, '2026-10-01', 8, 20)], 3);
    const inconsistent = {
      ...profile,
      performanceHistory: { source: PERFORMANCE_HISTORY_SOURCE, status: 'available' as const, requestedExerciseIds: [id] },
      lastSessionPerformance: { [id]: recent[id][0] },
      recentSessionPerformance: { [id]: [] },
    };
    const planned = prescribeReplacement(item(), getExerciseById(id)!, inconsistent);
    expect(planned.decisionTrace.loadCalibration).toBe('uncalibrated');
    expect(planned.sets.every(set => set.suggestedWeight === 0)).toBe(true);
  });
});
