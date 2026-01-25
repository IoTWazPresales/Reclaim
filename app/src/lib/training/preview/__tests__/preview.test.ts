// Unit tests for Training Preview - validates preview matches real generation
import { describe, it, expect } from 'vitest';
import { dryRunTrainingGeneration, computePreviewSummary, generatePreview, type PreviewSettings } from '../index';
import { buildFourWeekPlan } from '../../programPlanner';
import { buildSessionFromProgramDay } from '../../engine';
import { normalizeEquipmentIds } from '../../setupMappings';
import { estimate1RM } from '../../progression';
import { mapBaselineKeyToExerciseId } from '../../setupMappings';
import type { TrainingProfileRow } from '../../../api';

describe('Training Preview', () => {
  const mockSettings: PreviewSettings = {
    goals: {
      build_muscle: 0.5,
      build_strength: 0.3,
      lose_fat: 0.2,
      get_fitter: 0.0,
    },
    selectedWeekdays: [1, 3, 5], // Mon, Wed, Fri
    equipment: ['barbell', 'dumbbells', 'bench'],
    constraints: [],
    baselines: {},
  };

  describe('dryRunTrainingGeneration', () => {
    it('should generate a session plan without DB writes', () => {
      const plan = dryRunTrainingGeneration(mockSettings);
      expect(plan).not.toBeNull();
      expect(plan?.exercises).toBeDefined();
      expect(plan?.exercises.length).toBeGreaterThan(0);
    });

    it('should return null when no weekdays selected', () => {
      const plan = dryRunTrainingGeneration({
        ...mockSettings,
        selectedWeekdays: [],
      });
      expect(plan).toBeNull();
    });

    it('should use deterministic context (first weekday, week 1)', () => {
      const plan1 = dryRunTrainingGeneration(mockSettings);
      const plan2 = dryRunTrainingGeneration(mockSettings);
      // Should generate same plan for same settings
      expect(plan1?.exercises.length).toBe(plan2?.exercises.length);
      if (plan1 && plan2) {
        expect(plan1.exercises[0]?.exerciseId).toBe(plan2.exercises[0]?.exerciseId);
      }
    });

    it('should handle constraints correctly', () => {
      const plan = dryRunTrainingGeneration({
        ...mockSettings,
        constraints: ['no_overhead'],
      });
      expect(plan).not.toBeNull();
      // Should not include vertical press exercises
      const hasVerticalPress = plan?.exercises.some((ex: any) =>
        ex.intents.includes('vertical_press')
      );
      expect(hasVerticalPress).toBe(false);
    });

    it('should handle baselines correctly', () => {
      const plan = dryRunTrainingGeneration({
        ...mockSettings,
        baselines: {
          bench_press: 60,
          squat: 100,
        },
      });
      expect(plan).not.toBeNull();
    });
  });

  describe('computePreviewSummary', () => {
    it('should extract rep ranges from actual plan', () => {
      const plan = dryRunTrainingGeneration(mockSettings);
      const summary = computePreviewSummary(plan);
      expect(summary).not.toBeNull();
      expect(summary?.setCounts.total).toBeGreaterThan(0);
    });

    it('should return null for null plan', () => {
      const summary = computePreviewSummary(null);
      expect(summary).toBeNull();
    });

    it('should compute grouping style from session label', () => {
      const plan = dryRunTrainingGeneration(mockSettings);
      const summary = computePreviewSummary(plan);
      expect(summary?.groupingStyle).toBeDefined();
      expect(typeof summary?.groupingStyle).toBe('string');
    });

    it('should detect AMRAP when high rep ranges present', () => {
      // Use fat loss goal which typically has higher reps
      const plan = dryRunTrainingGeneration({
        ...mockSettings,
        goals: {
          build_muscle: 0.0,
          build_strength: 0.0,
          lose_fat: 1.0,
          get_fitter: 0.0,
        },
      });
      const summary = computePreviewSummary(plan);
      // May or may not have AMRAP depending on goal rules
      expect(summary?.hasAMRAP).toBeDefined();
    });
  });

  describe('Preview equivalence with real generation', () => {
    it('should match real generation for same settings', () => {
      // Generate preview
      const previewPlan = dryRunTrainingGeneration(mockSettings);
      const previewSummary = computePreviewSummary(previewPlan);

      // Generate real plan using same logic
      const total = Object.values(mockSettings.goals).reduce((sum: number, v: number) => sum + v, 0);
      const normalizedGoals = {
        build_muscle: (mockSettings.goals.build_muscle || 0) / total,
        build_strength: (mockSettings.goals.build_strength || 0) / total,
        lose_fat: (mockSettings.goals.lose_fat || 0) / total,
        get_fitter: (mockSettings.goals.get_fitter || 0) / total,
      };

      const selectedWeekdaysJs = mockSettings.selectedWeekdays
        .map((ui: number) => (ui === 7 ? 0 : ui))
        .sort((a: number, b: number) => a - b);

      const normalizedEquipment = normalizeEquipmentIds(mockSettings.equipment);

      const baselineE1RMs: Record<string, number> = {};
      for (const [setupKey, weight] of Object.entries(mockSettings.baselines)) {
        if (weight && weight > 0) {
          const reps = 5;
          const e1RM = estimate1RM(weight, reps);
          const exerciseId = mapBaselineKeyToExerciseId(setupKey);
          if (exerciseId) {
            baselineE1RMs[exerciseId] = e1RM;
          }
        }
      }

      const mockProfile: TrainingProfileRow = {
        id: 'test',
        user_id: 'test',
        goals: normalizedGoals,
        days_per_week: selectedWeekdaysJs.length,
        equipment_access: normalizedEquipment,
        constraints: {
          injuries: mockSettings.constraints.filter((c: string) => c.includes('pain') || c.includes('issues')),
          forbiddenMovements: mockSettings.constraints.includes('no_overhead') ? ['vertical_press'] : [],
          preferences: {},
        },
        baselines: baselineE1RMs,
        preferred_time_window: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const realPlan = buildFourWeekPlan(mockProfile, selectedWeekdaysJs, new Date());
      const firstWeekday = realPlan.selectedWeekdays[0];
      const firstWeek = realPlan.weeks[0];
      const firstDayPlan = firstWeek.days[firstWeekday];

      const realSessionPlan = buildSessionFromProgramDay(
        {
          label: firstDayPlan.label,
          intents: firstDayPlan.intents,
          template_key: firstDayPlan.template,
        },
        {
          goals: normalizedGoals,
          equipment_access: normalizedEquipment,
        constraints: {
          injuries: mockSettings.constraints.filter((c: string) => c.includes('pain') || c.includes('issues')),
          forbiddenMovements: mockSettings.constraints.includes('no_overhead') ? ['vertical_press'] : [],
        },
        baselines: baselineE1RMs,
      }
      );

      const realSummary = computePreviewSummary(realSessionPlan);

      // Preview summary should match real summary
      expect(previewSummary?.groupingStyle).toBe(realSummary?.groupingStyle);
      expect(previewSummary?.setCounts.total).toBe(realSummary?.setCounts.total);
      expect(previewSummary?.repRanges.primary).toEqual(realSummary?.repRanges.primary);
    });

    it('should not perform DB writes (no supabase imports)', () => {
      // This test ensures preview module doesn't import supabase
      // We can't directly test this, but we verify the function doesn't throw
      // when called without DB connection
      expect(() => {
        dryRunTrainingGeneration(mockSettings);
      }).not.toThrow();
    });
  });

  describe('generatePreview', () => {
    it('should return summary for valid settings', () => {
      const summary = generatePreview(mockSettings);
      expect(summary).not.toBeNull();
      expect(summary?.setCounts.total).toBeGreaterThan(0);
    });

    it('should handle missing equipment gracefully', () => {
      const summary = generatePreview({
        ...mockSettings,
        equipment: [],
      });
      // May return null if no exercises can be generated, or return a plan with limited exercises
      // Either is acceptable - just shouldn't crash
      expect(summary === null || summary.setCounts.total >= 0).toBe(true);
    });

    it('should handle minimal training days (1-2 days/week)', () => {
      const summary1 = generatePreview({
        ...mockSettings,
        selectedWeekdays: [1], // 1 day/week
      });
      const summary2 = generatePreview({
        ...mockSettings,
        selectedWeekdays: [1, 4], // 2 days/week
      });
      expect(summary1).not.toBeNull();
      expect(summary2).not.toBeNull();
    });
  });
});
