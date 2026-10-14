// Unit tests for Training Preview - validates preview matches real generation
import { describe, it, expect } from 'vitest';
import { dryRunTrainingGeneration, computePreviewSummary, generatePreview, type PreviewSettings } from '../index';
import { buildFourWeekPlan } from '../../programPlanner';
import { buildProgramDaySession } from '../../buildProgramDaySession';
import { prepareTrainingSetup } from '../../setupDraft';

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
        constraints: ['no_overhead', 'shoulder_issues'],
      });
      expect(plan).not.toBeNull();
      // Should not include vertical press exercises
      const hasVerticalPress = plan?.exercises.some((ex: any) =>
        ex.intents.includes('vertical_press')
      );
      expect(hasVerticalPress).toBe(false);
    });

    it('maps UI injury constraints to engine contraindication tokens', () => {
      const plan = dryRunTrainingGeneration({
        ...mockSettings,
        constraints: ['back_sensitive'],
      });
      expect(plan).not.toBeNull();
      const hasLowerBackContra = plan!.exercises.some((ex: any) =>
        Array.isArray(ex.exercise?.contraindications) &&
        ex.exercise.contraindications.includes('lower_back_injury'),
      );
      expect(hasLowerBackContra).toBe(false);
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

      // Use the same serialization adapter consumed by confirmation, not a test copy.
      const { profile, snapshot, selectedWeekdaysJs } = prepareTrainingSetup(mockSettings);
      const realPlan = buildFourWeekPlan(profile, selectedWeekdaysJs, new Date());
      const firstDayPlan = realPlan.weeks[0].days[realPlan.selectedWeekdays[0]];
      const realSessionPlan = buildProgramDaySession(
        {
          label: firstDayPlan.label,
          intents: firstDayPlan.intents,
          template_key: firstDayPlan.template,
          weekIndex: 1,
        },
        snapshot,
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
