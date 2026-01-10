// Training Program Planner - Generates deterministic 4-week training blocks
import { TrainingProfile } from '../api';
import type { MovementIntent, SessionTemplate, TrainingGoal } from './types';

export type ProgramDayPlan = {
  weekday: number; // 1=Monday, 7=Sunday
  label: string; // e.g., "Upper Strength", "Lower Hypertrophy"
  intents: MovementIntent[];
  template: SessionTemplate;
};

export type WeekPlan = {
  weekIndex: number;
  days: Record<number, ProgramDayPlan>; // weekday -> plan
};

export type FourWeekProgramPlan = {
  weeks: WeekPlan[];
  selectedWeekdays: number[];
  goals: Record<TrainingGoal, number>;
};

/**
 * Build a deterministic 4-week training program plan
 * Structure is frozen: same day-of-week always gets same session type within the block
 * 
 * @param profile - User's training profile
 * @param selectedWeekdays - Array of weekday numbers (1=Mon, 7=Sun)
 * @param startDate - Program start date
 * @returns 4-week program plan
 */
export function buildFourWeekPlan(
  profile: TrainingProfile,
  selectedWeekdays: number[],
  startDate: Date = new Date(),
): FourWeekProgramPlan {
  const goals = profile.goals || {
    build_muscle: 0.5,
    build_strength: 0.3,
    lose_fat: 0.2,
    get_fitter: 0.0,
  };

  // Determine primary and secondary goals
  const goalEntries = Object.entries(goals).sort((a, b) => b[1] - a[1]);
  const primaryGoal = goalEntries[0][0] as TrainingGoal;
  const secondaryGoal = goalEntries[1]?.[0] as TrainingGoal;

  // Sort weekdays
  const sortedWeekdays = [...selectedWeekdays].sort((a, b) => a - b);
  const daysPerWeek = sortedWeekdays.length;

  // Determine split based on days per week and goals
  const split = determineSplit(daysPerWeek, primaryGoal, secondaryGoal);

  // Build weekly structure (same structure for all 4 weeks)
  const weeklyDayPlans: Record<number, ProgramDayPlan> = {};

  for (let i = 0; i < sortedWeekdays.length; i++) {
    const weekday = sortedWeekdays[i];
    const dayPlan = split[i % split.length]; // Cycle through split if needed
    weeklyDayPlans[weekday] = dayPlan;
  }

  // Replicate for 4 weeks
  const weeks: WeekPlan[] = [];
  for (let weekIndex = 1; weekIndex <= 4; weekIndex++) {
    weeks.push({
      weekIndex,
      days: { ...weeklyDayPlans },
    });
  }

  return {
    weeks,
    selectedWeekdays: sortedWeekdays,
    goals,
  };
}

/**
 * Determine split/session structure based on training frequency and goals
 */
function determineSplit(
  daysPerWeek: number,
  primaryGoal: TrainingGoal,
  secondaryGoal: TrainingGoal,
): ProgramDayPlan[] {
  const isMuscleOrStrengthFocused =
    primaryGoal === 'build_muscle' || primaryGoal === 'build_strength';

  // 2 days per week: Upper/Lower or Full Body
  if (daysPerWeek === 2) {
    return [
      {
        weekday: 0, // placeholder, will be overridden
        label: 'Upper Body',
        intents: ['horizontal_push', 'vertical_pull', 'horizontal_pull', 'vertical_push'],
        template: 'upper',
      },
      {
        weekday: 0,
        label: 'Lower Body',
        intents: ['knee_dominant', 'hip_hinge', 'core'],
        template: 'lower',
      },
    ];
  }

  // 3 days per week: Push/Pull/Legs or Full Body x3
  if (daysPerWeek === 3) {
    if (isMuscleOrStrengthFocused) {
      return [
        {
          weekday: 0,
          label: 'Push (Chest/Shoulders/Triceps)',
          intents: ['horizontal_push', 'vertical_push', 'accessory_push'],
          template: 'push',
        },
        {
          weekday: 0,
          label: 'Pull (Back/Biceps)',
          intents: ['vertical_pull', 'horizontal_pull', 'accessory_pull'],
          template: 'pull',
        },
        {
          weekday: 0,
          label: 'Legs (Quads/Hamstrings/Glutes)',
          intents: ['knee_dominant', 'hip_hinge', 'unilateral'],
          template: 'legs',
        },
      ];
    } else {
      return [
        {
          weekday: 0,
          label: 'Full Body Strength',
          intents: ['horizontal_push', 'vertical_pull', 'knee_dominant'],
          template: 'full_body',
        },
        {
          weekday: 0,
          label: 'Full Body Power',
          intents: ['vertical_push', 'hip_hinge', 'core'],
          template: 'full_body',
        },
        {
          weekday: 0,
          label: 'Conditioning',
          intents: ['carry', 'core', 'conditioning'],
          template: 'conditioning',
        },
      ];
    }
  }

  // 4 days per week: Upper/Lower x2
  if (daysPerWeek === 4) {
    return [
      {
        weekday: 0,
        label: 'Upper Strength',
        intents: ['horizontal_push', 'vertical_pull', 'accessory_push'],
        template: 'upper',
      },
      {
        weekday: 0,
        label: 'Lower Power',
        intents: ['knee_dominant', 'hip_hinge', 'core'],
        template: 'lower',
      },
      {
        weekday: 0,
        label: 'Upper Hypertrophy',
        intents: ['vertical_push', 'horizontal_pull', 'accessory_pull'],
        template: 'upper',
      },
      {
        weekday: 0,
        label: 'Lower Strength',
        intents: ['hip_hinge', 'knee_dominant', 'unilateral'],
        template: 'lower',
      },
    ];
  }

  // 5 days per week: Push/Pull/Legs/Upper/Lower
  if (daysPerWeek === 5) {
    return [
      {
        weekday: 0,
        label: 'Push (Chest Focus)',
        intents: ['horizontal_push', 'vertical_push', 'accessory_push'],
        template: 'push',
      },
      {
        weekday: 0,
        label: 'Pull (Back Focus)',
        intents: ['vertical_pull', 'horizontal_pull', 'accessory_pull'],
        template: 'pull',
      },
      {
        weekday: 0,
        label: 'Legs (Quad Focus)',
        intents: ['knee_dominant', 'unilateral', 'core'],
        template: 'legs',
      },
      {
        weekday: 0,
        label: 'Upper (Shoulders/Arms)',
        intents: ['vertical_push', 'horizontal_pull', 'accessory_push'],
        template: 'upper',
      },
      {
        weekday: 0,
        label: 'Legs (Posterior Chain)',
        intents: ['hip_hinge', 'unilateral', 'core'],
        template: 'legs',
      },
    ];
  }

  // 6+ days per week: Push/Pull/Legs x2
  return [
    {
      weekday: 0,
      label: 'Push A (Strength)',
      intents: ['horizontal_push', 'vertical_push', 'accessory_push'],
      template: 'push',
    },
    {
      weekday: 0,
      label: 'Pull A (Strength)',
      intents: ['vertical_pull', 'horizontal_pull', 'accessory_pull'],
      template: 'pull',
    },
    {
      weekday: 0,
      label: 'Legs A (Quad Focus)',
      intents: ['knee_dominant', 'unilateral', 'core'],
      template: 'legs',
    },
    {
      weekday: 0,
      label: 'Push B (Hypertrophy)',
      intents: ['vertical_push', 'horizontal_push', 'accessory_push'],
      template: 'push',
    },
    {
      weekday: 0,
      label: 'Pull B (Hypertrophy)',
      intents: ['horizontal_pull', 'vertical_pull', 'accessory_pull'],
      template: 'pull',
    },
    {
      weekday: 0,
      label: 'Legs B (Posterior)',
      intents: ['hip_hinge', 'knee_dominant', 'core'],
      template: 'legs',
    },
  ];
}

/**
 * Get the next training date for a given weekday
 */
export function getNextDateForWeekday(weekday: number, fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  date.setHours(0, 0, 0, 0);
  
  const currentWeekday = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday from 0 to 7
  const daysUntilTarget = weekday >= currentWeekday 
    ? weekday - currentWeekday 
    : 7 - currentWeekday + weekday;
  
  date.setDate(date.getDate() + daysUntilTarget);
  return date;
}

/**
 * Generate program day records for a 4-week block
 * NOTE: Do NOT include `id` - the DB generates UUIDs automatically
 */
export function generateProgramDays(
  programId: string,
  userId: string,
  plan: FourWeekProgramPlan,
  startDate: Date,
): Array<{
  program_id: string;
  user_id: string;
  date: string;
  week_index: number;
  day_index: number;
  label: string;
  intents: MovementIntent[];
  template_key: SessionTemplate;
}> {
  const programDays: Array<{
    program_id: string;
    user_id: string;
    date: string;
    week_index: number;
    day_index: number;
    label: string;
    intents: MovementIntent[];
    template_key: SessionTemplate;
  }> = [];
  const baseDate = new Date(startDate);
  baseDate.setHours(0, 0, 0, 0);

  for (let weekIndex = 1; weekIndex <= 4; weekIndex++) {
    const weekPlan = plan.weeks[weekIndex - 1];

    for (const [weekdayStr, dayPlan] of Object.entries(weekPlan.days)) {
      const weekday = parseInt(weekdayStr, 10);
      
      // Calculate date for this day
      const dayDate = new Date(baseDate);
      dayDate.setDate(baseDate.getDate() + (weekIndex - 1) * 7);
      
      // Adjust to correct weekday within the week
      const currentWeekday = dayDate.getDay() === 0 ? 7 : dayDate.getDay();
      const daysToAdd = weekday - currentWeekday;
      dayDate.setDate(dayDate.getDate() + daysToAdd);

      // NO `id` field - DB generates UUID automatically
      programDays.push({
        program_id: programId,
        user_id: userId,
        date: dayDate.toISOString().split('T')[0],
        week_index: weekIndex,
        day_index: weekday,
        label: dayPlan.label,
        intents: dayPlan.intents,
        template_key: dayPlan.template,
      });
    }
  }

  return programDays;
}
