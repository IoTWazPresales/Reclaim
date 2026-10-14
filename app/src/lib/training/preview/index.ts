// Training Preview - Dry-run generation for outcome preview
// This module provides a pure function to generate a training session plan
// WITHOUT any DB writes or side effects, for preview purposes only.

import { buildFourWeekPlan } from '../programPlanner';
import { buildProgramDaySession } from '../buildProgramDaySession';
import { prepareTrainingSetup, type TrainingSetupDraft } from '../setupDraft';
import type { SessionPlan, PlannedExercise, PlannedSet } from '../types';

export type PreviewSettings = TrainingSetupDraft;

export interface PreviewContext {
  // Deterministic context for dry-run
  // Use first scheduled weekday from selectedWeekdays, Week 1
  targetWeekday: number; // UI weekday (1-7)
  weekIndex: number; // 1-4, default to 1
}

export interface PreviewSummary {
  repRanges: {
    primary: [number, number] | null;
    accessory: [number, number] | null;
    isolation: [number, number] | null;
  };
  setCounts: {
    primary: number;
    accessory: number;
    isolation: number;
    total: number;
  };
  groupingStyle: string; // e.g., "Upper/Lower", "Push/Pull/Legs", "Full Body"
  hasAMRAP: boolean;
  exampleSnippet: string; // Deterministic example from generated output
}

/**
 * Dry-run training generation - NO DB writes, NO side effects
 * Uses the SAME generator as real generation for accurate preview
 */
export function dryRunTrainingGeneration(
  settings: PreviewSettings,
  context?: Partial<PreviewContext>
): SessionPlan | null {
  try {
    const { snapshot, profile, selectedWeekdaysJs } = prepareTrainingSetup(settings);
    if (selectedWeekdaysJs.length === 0) return null;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const plan = buildFourWeekPlan(profile, selectedWeekdaysJs, startDate);

    // Determine target day: use first weekday from selectedWeekdays (UI format 1-7), Week 1
    // Note: plan.selectedWeekdays are in UI format (1-7) as returned by buildFourWeekPlan
    const targetWeekday = context?.targetWeekday ?? plan.selectedWeekdays[0];
    const weekIndex = context?.weekIndex ?? 1;

    const weekPlan = plan.weeks[weekIndex - 1];
    const dayPlan = weekPlan.days[targetWeekday];

    if (!dayPlan) {
      return null; // Day not in plan
    }

    // Same product wrapper as TrainingScreen. Preview does not write a session.
    const sessionPlan = buildProgramDaySession(
      {
        label: dayPlan.label,
        intents: dayPlan.intents,
        template_key: dayPlan.template,
        weekIndex,
        allocation: dayPlan.allocation,
      },
      snapshot
    );

    return sessionPlan;
  } catch (error) {
    // Preview failures should not crash the UI
    console.warn('[Preview] Dry-run generation failed:', error);
    return null;
  }
}

/**
 * Compute preview summary from actual SessionPlan output
 * This ensures preview NEVER contradicts real generation
 */
export function computePreviewSummary(plan: SessionPlan | null): PreviewSummary | null {
  if (!plan || !plan.exercises || plan.exercises.length === 0) {
    return null;
  }

  // Extract rep ranges from actual planned sets
  const repRangesByPriority: Record<string, number[]> = {
    primary: [],
    accessory: [],
    isolation: [],
  };

  const setCountsByPriority: Record<string, number> = {
    primary: 0,
    accessory: 0,
    isolation: 0,
  };

  let hasAMRAP = false;

  for (const exercise of plan.exercises) {
    const priority = exercise.priority;
    const sets = exercise.plannedSets || [];

    // Count sets
    setCountsByPriority[priority] += sets.length;

    // Collect rep ranges
    for (const set of sets) {
      repRangesByPriority[priority].push(set.targetReps);
    }
  }

  // Compute min/max rep ranges per priority
  const computeRange = (reps: number[]): [number, number] | null => {
    if (reps.length === 0) return null;
    const min = Math.min(...reps);
    const max = Math.max(...reps);
    return [min, max];
  };

  // Infer grouping style from session label or template
  let groupingStyle = 'Custom';
  if (plan.sessionLabel) {
    groupingStyle = plan.sessionLabel;
  } else {
    // Infer from template
    const templateLabels: Record<string, string> = {
      push: 'Push/Pull/Legs',
      pull: 'Push/Pull/Legs',
      legs: 'Push/Pull/Legs',
      upper: 'Upper/Lower',
      lower: 'Upper/Lower',
      full_body: 'Full Body',
      conditioning: 'Conditioning',
    };
    groupingStyle = templateLabels[plan.template] || 'Custom';
  }

  // Extract deterministic example snippet (first exercise, first set)
  const firstExercise = plan.exercises[0];
  const exampleSnippet = firstExercise
    ? `${firstExercise.exercise.name}: ${firstExercise.plannedSets[0]?.targetReps || 0} reps @ ${firstExercise.plannedSets[0]?.suggestedWeight || 0}kg`
    : 'No exercises generated';

  return {
    repRanges: {
      primary: computeRange(repRangesByPriority.primary),
      accessory: computeRange(repRangesByPriority.accessory),
      isolation: computeRange(repRangesByPriority.isolation),
    },
    setCounts: {
      primary: setCountsByPriority.primary,
      accessory: setCountsByPriority.accessory,
      isolation: setCountsByPriority.isolation,
      total: plan.exercises.reduce((sum, ex) => sum + (ex.plannedSets?.length || 0), 0),
    },
    groupingStyle,
    hasAMRAP,
    exampleSnippet,
  };
}

/**
 * Main entry point: generate preview from settings
 */
export function generatePreview(settings: PreviewSettings, context?: Partial<PreviewContext>): PreviewSummary | null {
  const plan = dryRunTrainingGeneration(settings, context);
  return computePreviewSummary(plan);
}
