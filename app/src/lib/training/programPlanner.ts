// Training Program Planner - Generates deterministic 4-week training blocks
import { type TrainingProfileRow } from '../api';
import type { MovementIntent, SessionTemplate, TrainingGoal } from './types';
import { formatLocalDateYYYYMMDD } from './dateUtils';

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
 * @param selectedWeekdays - Array of weekday numbers (JS format: 0=Sun, 1=Mon, ..., 6=Sat)
 * @param startDate - Program start date
 * @returns 4-week program plan
 */
export function buildFourWeekPlan(
  profile: TrainingProfileRow,
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
  const goalEntries = Object.entries(goals).sort((a, b) => (b[1] as number) - (a[1] as number));
  const primaryGoal = goalEntries[0]?.[0] as TrainingGoal;
  const secondaryGoal = goalEntries[1]?.[0] as TrainingGoal;

  // Extract muscle frequency preference from profile
  // Check both direct property (for preview) and constraints.preferences (for real profiles)
  const muscleFrequency = (profile as any).muscle_frequency_preference || 
    profile.constraints?.preferences?.muscle_frequency_preference || 
    'auto';
  
  // Validate frequency value
  const validFrequency: 'once' | 'twice' | 'auto' = 
    (muscleFrequency === 'once' || muscleFrequency === 'twice' || muscleFrequency === 'auto') 
      ? muscleFrequency 
      : 'auto';

  // FIX: Convert JS weekdays (0-6) to UI weekdays (1-7) for consistent handling
  // JS: 0=Sun, 1=Mon, ..., 6=Sat
  // UI: 1=Mon, 2=Tue, ..., 7=Sun
  const uiWeekdays = selectedWeekdays.map((js) => (js === 0 ? 7 : js)).sort((a, b) => a - b);
  const daysPerWeek = uiWeekdays.length;

  // Determine split based on days per week, goals, and muscle frequency preference
  const split = determineSplit(daysPerWeek, primaryGoal, secondaryGoal, validFrequency);

  // Build weekly structure (same structure for all 4 weeks)
  const weeklyDayPlans: Record<number, ProgramDayPlan> = {};

  for (let i = 0; i < uiWeekdays.length; i++) {
    const weekday = uiWeekdays[i];
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
    selectedWeekdays: uiWeekdays, // Store as UI weekdays (1-7) for generateProgramDays
    goals,
  };
}

/**
 * Determine split/session structure based on training frequency and goals
 * 
 * @param daysPerWeek - Number of training days per week
 * @param primaryGoal - Primary training goal
 * @param secondaryGoal - Secondary training goal
 * @param muscleFrequency - Muscle frequency preference: 'once' (hit each muscle group once/week), 'twice' (twice/week), or 'auto' (let algorithm decide)
 * @returns Array of program day plans
 */
function determineSplit(
  daysPerWeek: number,
  primaryGoal: TrainingGoal,
  secondaryGoal: TrainingGoal,
  muscleFrequency: 'once' | 'twice' | 'auto' = 'auto',
): ProgramDayPlan[] {
  const isMuscleOrStrengthFocused =
    primaryGoal === 'build_muscle' || primaryGoal === 'build_strength';

  // Handle infeasible frequency preferences by falling back to 'auto'
  let effectiveFrequency = muscleFrequency;
  if (muscleFrequency === 'once' && daysPerWeek < 3) {
    console.warn(`[determineSplit] Once-per-week frequency requires at least 3 days/week. Falling back to 'auto'.`);
    effectiveFrequency = 'auto';
  } else if (muscleFrequency === 'twice' && daysPerWeek < 2) {
    console.warn(`[determineSplit] Twice-per-week frequency requires at least 2 days/week. Falling back to 'auto'.`);
    effectiveFrequency = 'auto';
  }

  // 2 days per week: Upper/Lower (supports twice/week naturally)
  if (daysPerWeek === 2) {
    // Upper/Lower naturally hits each muscle group twice per week (once per session)
    return [
      {
        weekday: 0, // placeholder, will be overridden
        label: 'Upper Body',
        intents: ['horizontal_press', 'vertical_pull', 'horizontal_pull', 'vertical_press'],
        template: 'upper',
      },
      {
        weekday: 0,
        label: 'Lower Body',
        intents: ['knee_dominant', 'hip_hinge', 'trunk_stability'],
        template: 'lower',
      },
    ];
  }

  // 3 days per week: Push/Pull/Legs (once/week) or Full Body x3 (twice/week)
  if (daysPerWeek === 3) {
    // If user wants twice/week, prefer Full Body (hits all muscle groups each session)
    if (effectiveFrequency === 'twice' && !isMuscleOrStrengthFocused) {
      return [
        {
          weekday: 0,
          label: 'Full Body Strength',
          intents: ['horizontal_press', 'vertical_pull', 'knee_dominant'],
          template: 'full_body',
        },
        {
          weekday: 0,
          label: 'Full Body Power',
          intents: ['vertical_press', 'hip_hinge', 'trunk_stability'],
          template: 'full_body',
        },
        {
          weekday: 0,
          label: 'Full Body Conditioning',
          intents: ['carry', 'trunk_stability', 'conditioning'],
          template: 'full_body',
        },
      ];
    }
    
    // Default: Push/Pull/Legs (once/week) for muscle/strength focused, Full Body for others
    if (isMuscleOrStrengthFocused) {
      return [
        {
          weekday: 0,
          label: 'Push (Chest/Shoulders/Triceps)',
          intents: ['horizontal_press', 'vertical_press', 'elbow_extension'],
          template: 'push',
        },
        {
          weekday: 0,
          label: 'Pull (Back/Biceps)',
          intents: ['vertical_pull', 'horizontal_pull', 'elbow_flexion'],
          template: 'pull',
        },
        {
          weekday: 0,
          label: 'Legs (Quads/Hamstrings/Glutes)',
          intents: ['knee_dominant', 'hip_hinge'],
          template: 'legs',
        },
      ];
    } else {
      return [
        {
          weekday: 0,
          label: 'Full Body Strength',
          intents: ['horizontal_press', 'vertical_pull', 'knee_dominant'],
          template: 'full_body',
        },
        {
          weekday: 0,
          label: 'Full Body Power',
          intents: ['vertical_press', 'hip_hinge', 'trunk_stability'],
          template: 'full_body',
        },
        {
          weekday: 0,
          label: 'Conditioning',
          intents: ['carry', 'trunk_stability', 'conditioning'],
          template: 'conditioning',
        },
      ];
    }
  }

  // 4 days per week: Upper/Lower x2 (supports twice/week naturally) or Push/Pull/Legs + Upper (once/week)
  if (daysPerWeek === 4) {
    // If user wants once/week, prefer Push/Pull/Legs + Upper variant
    if (effectiveFrequency === 'once' && isMuscleOrStrengthFocused) {
      return [
        {
          weekday: 0,
          label: 'Push (Chest/Shoulders/Triceps)',
          intents: ['horizontal_press', 'vertical_press', 'elbow_extension'],
          template: 'push',
        },
        {
          weekday: 0,
          label: 'Pull (Back/Biceps)',
          intents: ['vertical_pull', 'horizontal_pull', 'elbow_flexion'],
          template: 'pull',
        },
        {
          weekday: 0,
          label: 'Legs (Quads/Hamstrings/Glutes)',
          intents: ['knee_dominant', 'hip_hinge'],
          template: 'legs',
        },
        {
          weekday: 0,
          label: 'Upper (Arms Focus)',
          intents: ['vertical_press', 'horizontal_pull', 'elbow_extension', 'elbow_flexion'],
          template: 'upper',
        },
      ];
    }
    
    // Default: Upper/Lower x2 (hits each muscle group twice per week)
    return [
      {
        weekday: 0,
        label: 'Upper Strength',
        intents: ['horizontal_press', 'vertical_pull', 'elbow_extension'],
        template: 'upper',
      },
      {
        weekday: 0,
        label: 'Lower Power',
        intents: ['knee_dominant', 'hip_hinge', 'trunk_stability'],
        template: 'lower',
      },
      {
        weekday: 0,
        label: 'Upper Hypertrophy',
        intents: ['vertical_press', 'horizontal_pull', 'elbow_flexion'],
        template: 'upper',
      },
      {
        weekday: 0,
        label: 'Lower Strength',
        intents: ['hip_hinge', 'knee_dominant'],
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
        intents: ['horizontal_press', 'vertical_press', 'elbow_extension'],
        template: 'push',
      },
      {
        weekday: 0,
        label: 'Pull (Back Focus)',
        intents: ['vertical_pull', 'horizontal_pull', 'elbow_flexion'],
        template: 'pull',
      },
      {
        weekday: 0,
        label: 'Legs (Quad Focus)',
        intents: ['knee_dominant', 'trunk_stability'],
        template: 'legs',
      },
      {
        weekday: 0,
        label: 'Upper (Shoulders/Arms)',
          intents: ['vertical_press', 'horizontal_pull', 'elbow_extension'],
        template: 'upper',
      },
      {
        weekday: 0,
        label: 'Legs (Posterior Chain)',
        intents: ['hip_hinge', 'trunk_stability'],
        template: 'legs',
      },
    ];
  }

  // 6+ days per week: Push/Pull/Legs x2
  return [
    {
      weekday: 0,
      label: 'Push A (Strength)',
      intents: ['horizontal_press', 'vertical_press', 'elbow_extension'],
      template: 'push',
    },
    {
      weekday: 0,
      label: 'Pull A (Strength)',
      intents: ['vertical_pull', 'horizontal_pull', 'elbow_flexion'],
      template: 'pull',
    },
    {
      weekday: 0,
      label: 'Legs A (Quad Focus)',
      intents: ['knee_dominant', 'trunk_stability'],
      template: 'legs',
    },
    {
      weekday: 0,
      label: 'Push B (Hypertrophy)',
      intents: ['vertical_press', 'horizontal_press', 'elbow_extension'],
      template: 'push',
    },
    {
      weekday: 0,
      label: 'Pull B (Hypertrophy)',
      intents: ['horizontal_pull', 'vertical_pull', 'elbow_flexion'],
      template: 'pull',
    },
    {
      weekday: 0,
      label: 'Legs B (Posterior)',
      intents: ['hip_hinge', 'knee_dominant', 'trunk_stability'],
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
  
  // Normalize startDate to Monday of the week (weekday 1)
  // This ensures consistent date calculation regardless of when startDate falls
  const normalizedStart = new Date(startDate);
  normalizedStart.setHours(0, 0, 0, 0);
  const startWeekday = normalizedStart.getDay() === 0 ? 7 : normalizedStart.getDay(); // Convert Sunday 0 -> 7
  const daysToMonday = startWeekday === 1 ? 0 : 1 - startWeekday; // Days to subtract to get to Monday
  normalizedStart.setDate(normalizedStart.getDate() + daysToMonday);

  for (let weekIndex = 1; weekIndex <= 4; weekIndex++) {
    const weekPlan = plan.weeks[weekIndex - 1];

    // FIX: Iterate over selectedWeekdays instead of Object.entries to guarantee
    // we only process weekdays that were actually selected by the user.
    // This prevents scheduling sessions on Sunday (or any other day) when not selected.
    for (const weekday of plan.selectedWeekdays) {
      const dayPlan = weekPlan.days[weekday];
      
      // Skip if no plan exists for this weekday (defensive check)
      if (!dayPlan) {
        console.warn(`[generateProgramDays] No day plan for weekday ${weekday} in week ${weekIndex}, skipping`);
        continue;
      }
      
      // Calculate date: start from normalized Monday, add weeks, then add days to reach target weekday
      const dayDate = new Date(normalizedStart);
      dayDate.setDate(normalizedStart.getDate() + (weekIndex - 1) * 7 + (weekday - 1)); // weekday - 1 because Monday is day 0 of the week
      
      // Validation: ensure the calculated date's weekday matches the expected weekday
      const calculatedWeekday = dayDate.getDay() === 0 ? 7 : dayDate.getDay();
      if (calculatedWeekday !== weekday) {
        throw new Error(
          `Weekday mismatch: Expected weekday ${weekday} but calculated date ${formatLocalDateYYYYMMDD(dayDate)} has weekday ${calculatedWeekday}. ` +
          `This indicates a bug in date calculation. Start date: ${formatLocalDateYYYYMMDD(startDate)}, Normalized: ${formatLocalDateYYYYMMDD(normalizedStart)}, Week: ${weekIndex}`
        );
      }

      // NO `id` field - DB generates UUID automatically
      // CRITICAL: Use local date formatting to prevent weekday drift in timezones ahead of UTC
      // See dateUtils.ts for rationale
      programDays.push({
        program_id: programId,
        user_id: userId,
        date: formatLocalDateYYYYMMDD(dayDate),
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
