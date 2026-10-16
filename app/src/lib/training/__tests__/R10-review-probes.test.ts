import { describe, expect, it } from 'vitest';
import catalogData from '../catalog/exercises.v1.json';
import { prepareTrainingSetup, type TrainingSetupDraft } from '../setupDraft';
import { buildFourWeekPlan, generateProgramDays } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { buildProgramDaySession } from '../buildProgramDaySession';
import { programDayInput } from '../programmeProjection';
import { scheduledRunOnStoredPlan } from '../whyThisSession';
import type { Exercise } from '../types';

// Independently authored reviewer probes: public routes, actual catalogue,
// literal constraint expectations. No compiler/validator declarations as oracle.
const catalog = catalogData as Exercise[];
const fullEquipment = [...new Set(catalog.flatMap(e => [...e.equipment, ...(e.equipmentAll ?? []), ...(e.equipmentAny ?? [])]))];
function fixture(goal: 'build_muscle' | 'build_strength' | 'lose_fat' | 'get_fitter', frequency: 'once' | 'twice' = 'once') {
  const input: TrainingSetupDraft = {
    goals: { build_muscle: 0, build_strength: 0, lose_fat: 0, get_fitter: 0, [goal]: 100 },
    selectedWeekdays: [1, 3, 5], equipment: fullEquipment, constraints: [],
    baselines: {}, baselineReps: {}, muscleFrequency: frequency,
    experienceLevel: 'beginner', trainingMode: 'strength', includeSkillWork: false,
  };
  return prepareTrainingSetup(input);
}

describe('R10 independent reviewer adversarial probes', () => {
  for (const goal of ['build_muscle', 'build_strength', 'lose_fat', 'get_fitter'] as const) {
    it(`${goal} once-frequency legacy programme respects every forbidden/disliked/injury match`, () => {
      const setup = fixture(goal);
      setup.snapshot.constraints = { ...setup.snapshot.constraints,
        injuries: ['shoulder_impingement'], forbiddenMovements: ['vertical_press'],
        preferences: { ...setup.snapshot.constraints?.preferences, hatesExercises: ['dumbbell_curl', 'barbell_row'] },
      };
      const profile = { ...setup.profile, ...setup.snapshot };
      const plan = buildFourWeekPlan(profile, setup.selectedWeekdaysJs, new Date(2026, 9, 12));
      for (const week of [1, 2, 3, 4]) {
        expect(plan.weeks[week - 1].compilation?.policyStatus).toBe('legacy_pending_review');
        const proposals = programmeWeekProposal(plan, week, setup.snapshot);
        for (const session of proposals.values()) {
          for (const actual of session.exercises) {
            const record = catalog.find(e => e.id === actual.exerciseId)!;
            expect(record.contraindications).not.toContain('shoulder_impingement');
            expect(record.intents).not.toContain('vertical_press');
            expect(['dumbbell_curl', 'barbell_row']).not.toContain(record.id);
            expect(actual.plannedSets.every(s => Number.isFinite(s.suggestedWeight) && s.suggestedWeight >= 0)).toBe(true);
          }
          if (!session.exercises.length) expect(session.programmeValidation?.status).toBe('infeasible');
        }
      }
    });
  }

  it('hybrid 4–6-day separate run flags survive saved programme and actual calendar reconstruction', () => {
    for (const n of [4, 5, 6]) {
      const setup = fixture('build_muscle', 'twice');
      const profile = { ...setup.profile, trainingMode: 'hybrid' as const };
      const snapshot = { ...setup.snapshot, trainingMode: 'hybrid' as const };
      const selected = Array.from({ length: n }, (_, i) => i + 1);
      const saved = JSON.parse(JSON.stringify(buildFourWeekPlan(profile, selected, new Date(2026, 9, 12))));
      const rows = generateProgramDays('review-programme', 'review-user', saved, new Date(2026, 9, 12));
      for (const week of [1, 2, 3, 4]) {
        const planned = saved.weeks.find((w: { weekIndex: number }) => w.weekIndex === week);
        const flagged = Object.entries(planned.days).filter(([, d]) => (d as { scheduledRun?: boolean }).scheduledRun);
        expect(flagged.length).toBeGreaterThan(0);
        for (const [day, declaration] of flagged) {
          expect(['upper', 'push', 'pull']).toContain((declaration as { template: string }).template);
          const row = rows.find(r => r.week_index === week && r.day_index === Number(day))!;
          const resolved = programDayInput(row, saved);
          expect(scheduledRunOnStoredPlan(saved, row.week_index, row.day_index)).toBe(true);
          const deliveredStrength = buildProgramDaySession(resolved, snapshot);
          expect(deliveredStrength.exercises.length).toBeGreaterThan(0);
          // The secondary run is calendar metadata, not a run in this strength map.
          // No claim of runtime run start, completion or tolerance-based progression.
        }
      }
    }
  });

  it('five-day chest follow-up is isolation and no own baseline leaks into uncalibrated fly load', () => {
    const setup = fixture('build_muscle', 'twice');
    const goals = { build_muscle: 0.5, build_strength: 0.5, lose_fat: 0, get_fitter: 0 };
    const profile = { ...setup.profile, goals, baselines: { barbell_bench_press: 150 } };
    const snapshot = { ...setup.snapshot, goals, baselines: { barbell_bench_press: 150 } };
    const plan = buildFourWeekPlan(profile, [1, 2, 3, 4, 5], new Date(2026, 9, 12));
    const flyIds = ['dumbbell_flyes', 'cable_chest_flyes', 'pec_deck'];
    for (const week of [1, 2, 3, 4]) {
      const delivered = programmeWeekProposal(plan, week, snapshot);
      for (const day of [1, 3]) {
        const chest = delivered.get(day)!.exercises.filter(e => e.exercise.musclesPrimary.some(m => ['pectorals', 'upper_pectorals', 'lower_pectorals'].includes(m)));
        expect(chest.length).toBe(2);
        expect(chest[0].exerciseId).toBe('barbell_bench_press');
        expect(flyIds).toContain(chest[1].exerciseId);
        expect(chest[1].plannedSets.every(s => s.suggestedWeight === 0)).toBe(true);
        expect(chest[1].decisionTrace.progressionReason?.toLowerCase()).toContain('choose a load');
      }
    }
  });
});
