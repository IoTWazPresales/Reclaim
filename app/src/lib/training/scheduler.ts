// Training Scheduler Integration - Generate weekly plan and create routine suggestions
import { getLocalDateKey, upsertRoutineSuggestionRemote, type RoutineSuggestionState } from '../routines';
import type { TrainingProfileRow } from '../api';
import type { SessionTemplate } from './types';

/**
 * Determine session template based on days per week and goal bias
 */
export function determineWeeklySplit(
  daysPerWeek: number,
  goals: Record<string, number>,
): { template: SessionTemplate; days: number[] }[] {
  // Determine dominant goal
  const goalEntries = Object.entries(goals).filter(([, w]) => w && w > 0);
  if (goalEntries.length === 0) {
    goalEntries.push(['build_muscle', 0.5]);
  }
  goalEntries.sort(([, a], [, b]) => b - a);
  const dominantGoal = goalEntries[0][0];

  // 2 days: Full body A/B
  if (daysPerWeek === 2) {
    return [
      { template: 'full_body' as SessionTemplate, days: [1, 4] }, // Mon, Thu
    ];
  }

  // 3 days: Full body or Upper/Lower or PPL depending on goals
  if (daysPerWeek === 3) {
    if (dominantGoal === 'build_strength') {
      // Full body for strength
      return [{ template: 'full_body' as SessionTemplate, days: [1, 3, 5] }]; // Mon, Wed, Fri
    } else if (dominantGoal === 'lose_fat' || dominantGoal === 'get_fitter') {
      // Upper/Lower for conditioning
      return [
        { template: 'upper' as SessionTemplate, days: [1, 5] }, // Mon, Fri
        { template: 'lower' as SessionTemplate, days: [3] }, // Wed
      ];
    } else {
      // PPL for hypertrophy
      return [
        { template: 'push' as SessionTemplate, days: [1] }, // Mon
        { template: 'pull' as SessionTemplate, days: [3] }, // Wed
        { template: 'legs' as SessionTemplate, days: [5] }, // Fri
      ];
    }
  }

  // 4 days: Upper/Lower split
  if (daysPerWeek === 4) {
    return [
      { template: 'upper' as SessionTemplate, days: [1, 4] }, // Mon, Thu
      { template: 'lower' as SessionTemplate, days: [2, 5] }, // Tue, Fri
    ];
  }

  // 5+ days: PPL + accessories
  return [
    { template: 'push' as SessionTemplate, days: [1, 4] }, // Mon, Thu
    { template: 'pull' as SessionTemplate, days: [2, 5] }, // Tue, Fri
    { template: 'legs' as SessionTemplate, days: [3] }, // Wed
    { template: 'conditioning' as SessionTemplate, days: [6] }, // Sat (optional)
  ];
}

/**
 * Generate routine template ID for training session
 */
export function getTrainingRoutineTemplateId(template: SessionTemplate): string {
  return `training_${template}`;
}

/**
 * Create routine suggestions for the week based on training profile
 */
export async function generateWeeklyTrainingPlan(profile: TrainingProfileRow): Promise<void> {
  const split = determineWeeklySplit(profile.days_per_week, profile.goals);
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday

  // Get time window
  const timeWindow = profile.preferred_time_window || {};
  const isMorning = timeWindow.morning || false;
  const isEvening = timeWindow.evening || false;
  const startRange = timeWindow.startRange || (isMorning ? 6 : 17);
  const endRange = timeWindow.endRange || (isMorning ? 10 : 21);

  // Generate suggestions for each day in the split
  for (const { template, days } of split) {
    for (const dayOffset of days) {
      const targetDate = new Date(currentWeekStart);
      targetDate.setDate(currentWeekStart.getDate() + dayOffset - 1);
      const dateStr = getLocalDateKey(targetDate);

      // Calculate suggested time (middle of window)
      const suggestedHour = Math.floor((startRange + endRange) / 2);
      const suggestedMinute = ((startRange + endRange) / 2) % 1 === 0 ? 0 : 30;
      const suggestedStart = new Date(targetDate);
      suggestedStart.setHours(suggestedHour, suggestedMinute, 0, 0);
      const suggestedEnd = new Date(suggestedStart);
      suggestedEnd.setMinutes(suggestedEnd.getMinutes() + 60); // 60 min session

      const templateId = getTrainingRoutineTemplateId(template);

      await upsertRoutineSuggestionRemote({
        routine_template_id: templateId,
        date: dateStr,
        state: 'suggested' as RoutineSuggestionState,
        suggested_start_ts: suggestedStart.toISOString(),
        suggested_end_ts: suggestedEnd.toISOString(),
        reason: `Scheduled ${template} session based on your training plan.`,
      });
    }
  }
}

/**
 * Find next available slot if conflict exists
 */
export function findNextAvailableSlot(
  preferredDate: Date,
  preferredStart: Date,
  preferredEnd: Date,
): { start: Date; end: Date } {
  // Try same day, 1 hour later
  let candidate = new Date(preferredStart);
  candidate.setHours(candidate.getHours() + 1);

  // If that's still in window, use it
  const windowEnd = new Date(preferredDate);
  windowEnd.setHours(22, 0, 0, 0); // 10 PM cutoff
  if (candidate < windowEnd) {
    const end = new Date(candidate);
    end.setMinutes(end.getMinutes() + 60);
    return { start: candidate, end };
  }

  // Otherwise, try next day at preferred time
  const nextDay = new Date(preferredDate);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(preferredStart.getHours(), preferredStart.getMinutes(), 0, 0);
  const nextEnd = new Date(nextDay);
  nextEnd.setMinutes(nextEnd.getMinutes() + 60);
  return { start: nextDay, end: nextEnd };
}

/**
 * Get scheduled template for today
 */
export async function getScheduledTemplateForToday(): Promise<SessionTemplate | null> {
  const today = getLocalDateKey();
  const { fetchRoutineSuggestionsRemote } = await import('../routines');
  const suggestions = await fetchRoutineSuggestionsRemote(today);

  // Find training suggestion
  const trainingSuggestion = suggestions.find((s) => s.routine_template_id.startsWith('training_'));
  if (!trainingSuggestion) return null;

  // Extract template from ID
  const templateId = trainingSuggestion.routine_template_id.replace('training_', '');
  return templateId as SessionTemplate;
}
